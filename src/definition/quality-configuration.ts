import {
  WARNING_POLICIES,
  type CodeAreaDefinition,
  type CodeAreaWarningPolicy
} from "../checks/configuration/metric-contract.ts";
import { snapshotClosedArray, snapshotClosedRecord } from "../foundation/closed-values.ts";

/** Check callback 可读取的项目质量范围与命名 code areas。 */
export interface ProjectQualityConfiguration {
  /** 每个命名 code area 的 glob、说明和 warning policy。 */
  readonly codeAreas: Readonly<Record<string, CodeAreaDefinition>>;
  /** 从项目范围中排除的目录名。 */
  readonly excludeDirs: readonly string[];
  /** 识别 generated files 的 glob 集合。 */
  readonly generatedFiles: readonly string[];
  /** 允许进入项目范围的 glob 集合。 */
  readonly include: readonly string[];
}

export const NEUTRAL_QUALITY_CONFIGURATION: ProjectQualityConfiguration = deepFreeze({
  codeAreas: {
    project: {
      description: "This project",
      excludeGlobs: [],
      globs: ["**/*"],
      warningPolicy: "moderate"
    }
  },
  excludeDirs: [
    ".git",
    ".vibe-check",
    ".cache",
    ".venv",
    "artifacts",
    "build",
    "dist",
    "node_modules",
    "target",
    "vendor"
  ],
  generatedFiles: ["**/generated/**", "**/*.generated.*"],
  include: ["**/*"]
});

export function parseQualityConfiguration(value: unknown): ProjectQualityConfiguration | undefined {
  const root = exactKeys(value, ["codeAreas", "excludeDirs", "generatedFiles", "include"]);
  if (root === undefined) return undefined;
  const codeAreas = parseCodeAreas(root.codeAreas);
  const excludeDirs = parseStringArray(root.excludeDirs);
  const generatedFiles = parseStringArray(root.generatedFiles);
  const include = parseStringArray(root.include);
  if (
    codeAreas === undefined ||
    excludeDirs === undefined ||
    generatedFiles === undefined ||
    include === undefined
  ) {
    return undefined;
  }
  return deepFreeze({ codeAreas, excludeDirs, generatedFiles, include });
}

function parseCodeAreas(value: unknown): ProjectQualityConfiguration["codeAreas"] | undefined {
  const data = snapshotClosedRecord(value);
  if (data === undefined) return undefined;
  const areas: Record<string, CodeAreaDefinition> = {};
  for (const [name, candidate] of Object.entries(data)) {
    const area = exactKeys(candidate, ["description", "excludeGlobs", "globs", "warningPolicy"]);
    const excludeGlobs = area === undefined ? undefined : parseStringArray(area.excludeGlobs);
    const globs = area === undefined ? undefined : parseStringArray(area.globs);
    if (
      area === undefined ||
      excludeGlobs === undefined ||
      globs === undefined ||
      typeof area.description !== "string" ||
      !isWarningPolicy(area.warningPolicy)
    ) {
      return undefined;
    }
    Object.defineProperty(areas, name, {
      configurable: true,
      enumerable: true,
      value: Object.freeze({
        description: area.description,
        excludeGlobs,
        globs,
        warningPolicy: area.warningPolicy
      }),
      writable: true
    });
  }
  return Object.freeze(areas);
}

function parseStringArray(value: unknown): readonly string[] | undefined {
  const items = snapshotClosedArray(value);
  return items !== undefined && items.every((item) => typeof item === "string")
    ? Object.freeze([...items])
    : undefined;
}

function isWarningPolicy(value: unknown): value is CodeAreaWarningPolicy {
  return typeof value === "string" && WARNING_POLICIES.some((policy) => policy === value);
}

function exactKeys(
  value: unknown,
  keys: readonly string[]
): Readonly<Record<string, unknown>> | undefined {
  const data = snapshotClosedRecord(value);
  return data !== undefined &&
    Object.keys(data).length === keys.length &&
    keys.every((key) => Object.hasOwn(data, key))
    ? data
    : undefined;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}
