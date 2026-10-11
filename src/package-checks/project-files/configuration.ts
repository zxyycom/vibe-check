import {
  hasRequiredAndOptionalRecordKeys,
  snapshotClosedArray,
  snapshotClosedRecord
} from "../../data-boundary/closed-values.ts";

/** Check authoring 的文件范围；显式 patterns 完整替换 owning Check 默认。 */
export interface ProjectFileSelectionOptions {
  readonly patterns?: readonly string[];
  /** 省略或 true 启用固定默认排除，只有 false 关闭。 */
  readonly useDefaultExcludes?: boolean;
}

/** 同步文件收集的完整选择；patterns 必填，默认防呆不属于用户规则。 */
export interface ProjectFileSelection {
  readonly patterns: readonly string[];
  readonly useDefaultExcludes?: boolean;
}

/** 固定、冻结的防呆路径基线；用户正规则不能绕过启用的这一层。 */
export const DEFAULT_PROJECT_FILE_EXCLUDES: readonly string[] = Object.freeze([
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
]);

/** 所有普通路径的冻结基线；各 Check 可派生更精准的 patterns。 */
export const defaultProjectFileSelection: ProjectFileSelection = Object.freeze({
  patterns: Object.freeze(["**/*"]),
  useDefaultExcludes: true
});

/** 对 closed authoring selection 建立 detached、冻结的完整快照。 */
export function resolveProjectFileSelection(
  value: unknown,
  defaults: ProjectFileSelection = defaultProjectFileSelection
): ProjectFileSelection | undefined {
  const selection = snapshotClosedRecord(value);
  if (
    selection === undefined ||
    !hasRequiredAndOptionalRecordKeys(selection, {
      optional: ["patterns", "useDefaultExcludes"],
      required: []
    })
  )
    return undefined;

  const patterns =
    selection.patterns === undefined
      ? Object.freeze([...defaults.patterns])
      : snapshotStringPatterns(selection.patterns);
  const useDefaultExcludes = resolveDefaultExcludes(selection, defaults);
  if (patterns === undefined || useDefaultExcludes === undefined) return undefined;
  return Object.freeze({ patterns, useDefaultExcludes });
}

/** 公开完整 selection 的校验；不补 patterns 默认值。 */
export function snapshotCompleteProjectFileSelection(
  value: unknown
): ProjectFileSelection | undefined {
  const selection = snapshotClosedRecord(value);
  if (
    selection === undefined ||
    !hasRequiredAndOptionalRecordKeys(selection, {
      required: ["patterns"],
      optional: ["useDefaultExcludes"]
    })
  )
    return undefined;
  if (snapshotStringPatterns(selection.patterns) === undefined) return undefined;
  return resolveProjectFileSelection(selection);
}

export function validProjectFileSelection(value: unknown): value is ProjectFileSelection {
  return snapshotCompleteProjectFileSelection(value) !== undefined;
}

export function snapshotDefaultProjectFileSelection(): ProjectFileSelection {
  return snapshotProjectFileSelection(defaultProjectFileSelection);
}

export function snapshotProjectFileSelection(
  selection: ProjectFileSelection
): ProjectFileSelection {
  return Object.freeze({
    patterns: Object.freeze([...selection.patterns]),
    useDefaultExcludes: selection.useDefaultExcludes ?? true
  });
}

function snapshotStringPatterns(value: unknown): readonly string[] | undefined {
  const items = snapshotClosedArray(value);
  return items?.every((item): item is string => typeof item === "string" && item.length > 0) ===
    true
    ? Object.freeze([...items])
    : undefined;
}

function resolveDefaultExcludes(
  selection: Readonly<Record<string, unknown>>,
  defaults: ProjectFileSelection
): boolean | undefined {
  if (!Object.hasOwn(selection, "useDefaultExcludes")) return defaults.useDefaultExcludes ?? true;
  return typeof selection.useDefaultExcludes === "boolean"
    ? selection.useDefaultExcludes
    : undefined;
}
