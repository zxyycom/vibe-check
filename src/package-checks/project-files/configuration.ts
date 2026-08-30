import {
  hasRequiredAndOptionalRecordKeys,
  snapshotClosedArray,
  snapshotClosedRecord
} from "../../data-boundary/closed-values.ts";

export const PROJECT_FILE_SOURCES = Object.freeze(["filesystem", "git-worktree"] as const);

/** 文件选择可使用的显式候选来源。 */
export type ProjectFileSource = (typeof PROJECT_FILE_SOURCES)[number];

/** 读取项目文件的 Check 所拥有的文件选择输入。 */
export interface ProjectFileSelectionOptions {
  /** 候选文件来源；省略时使用不解释 `.gitignore` 的 `filesystem`。 */
  readonly source?: ProjectFileSource;
  /** 相对项目根目录且使用 `/` 的 glob；省略时使用 `defaultProjectFileSelection.include`，显式数组完整替换。 */
  readonly include?: readonly string[];
  /** 优先于 `include` 的 glob；省略时使用 `defaultProjectFileSelection.exclude`，显式数组完整替换。 */
  readonly exclude?: readonly string[];
}

/** Check execution 消费的完整项目文件选择。 */
export interface ProjectFileSelection {
  readonly exclude: readonly string[];
  readonly include: readonly string[];
  readonly source: ProjectFileSource;
}

/**
 * Package-provided Checks 共用的完整文件选择基线。
 *
 * 对象与数组均不可变；需要保留默认排除并追加项目规则时，使用对象与数组 spread 建立新值。
 */
export const defaultProjectFileSelection: ProjectFileSelection = deepFreeze({
  exclude: [
    "**/.cache/**",
    "**/.git",
    "**/.git/**",
    "**/.log/**",
    "**/.pytest_cache/**",
    "**/.tmp/**",
    "**/.venv/**",
    "**/.vibe-check/**",
    "**/__pycache__/**",
    "**/artifacts/**",
    "**/build/**",
    "**/coverage/**",
    "**/dist/**",
    "**/generated/**",
    "**/*.generated.*",
    "**/node_modules/**",
    "**/target/**",
    "**/tmp/**",
    "**/vendor/**",
    "**/venv/**"
  ],
  include: ["**/*"],
  source: "filesystem"
});

export function resolveProjectFileSelection(value: unknown): ProjectFileSelection | undefined {
  const selection = snapshotClosedRecord(value);
  if (
    selection === undefined ||
    !hasRequiredAndOptionalRecordKeys(selection, {
      optional: ["exclude", "include", "source"],
      required: []
    })
  ) {
    return undefined;
  }

  const exclude = resolveStringArray(selection.exclude, defaultProjectFileSelection.exclude);
  const include = resolveStringArray(selection.include, defaultProjectFileSelection.include);
  const source = selection.source ?? defaultProjectFileSelection.source;
  if (exclude === undefined || include === undefined || !isProjectFileSource(source)) {
    return undefined;
  }

  return Object.freeze({ exclude, include, source });
}

export function snapshotDefaultProjectFileSelection(): ProjectFileSelection {
  return Object.freeze({
    exclude: Object.freeze([...defaultProjectFileSelection.exclude]),
    include: Object.freeze([...defaultProjectFileSelection.include]),
    source: defaultProjectFileSelection.source
  });
}

export function validProjectFileSelection(value: unknown): value is ProjectFileSelection {
  const selection = exactRecord(value, ["exclude", "include", "source"]);
  return (
    selection !== undefined &&
    validStringArray(selection.exclude) &&
    validStringArray(selection.include) &&
    isProjectFileSource(selection.source)
  );
}

function isProjectFileSource(value: unknown): value is ProjectFileSource {
  return PROJECT_FILE_SOURCES.some((source) => source === value);
}

function resolveStringArray(
  value: unknown,
  fallback: readonly string[]
): readonly string[] | undefined {
  if (value === undefined) return Object.freeze([...fallback]);
  const items = snapshotClosedArray(value);
  if (items === undefined || !items.every(isString)) return undefined;
  return Object.freeze([...items]);
}

function validStringArray(value: unknown): boolean {
  const items = snapshotClosedArray(value);
  return items !== undefined && items.every(isString);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function exactRecord(
  value: unknown,
  keys: readonly string[]
): Readonly<Record<string, unknown>> | undefined {
  const record = snapshotClosedRecord(value);
  return record !== undefined &&
    Object.keys(record).length === keys.length &&
    keys.every((key) => Object.hasOwn(record, key))
    ? record
    : undefined;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}
