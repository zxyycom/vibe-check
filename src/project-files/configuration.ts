import { snapshotClosedArray, snapshotClosedRecord } from "../foundation/closed-values.ts";

export const CODE_AREA_WARNING_POLICIES = Object.freeze([
  "strict",
  "moderate",
  "relaxed",
  "watchlist-only",
  "exclude-warnings"
] as const);

export type CodeAreaWarningPolicy = (typeof CODE_AREA_WARNING_POLICIES)[number];

/** File classification policy consumed by checks that report code-area facts. */
export interface CodeAreaDefinition {
  readonly description: string;
  readonly excludeGlobs: readonly string[];
  readonly globs: readonly string[];
  readonly warningPolicy: CodeAreaWarningPolicy;
}

/** Complete repository-file selection owned by a check that performs file work. */
export interface ProjectFileSelection {
  readonly excludeDirs: readonly string[];
  readonly generatedFiles: readonly string[];
  readonly include: readonly string[];
}

export const DEFAULT_PROJECT_FILE_SELECTION: ProjectFileSelection = deepFreeze({
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

export const DEFAULT_CODE_AREAS: Readonly<Record<string, CodeAreaDefinition>> = deepFreeze({
  project: {
    description: "This project",
    excludeGlobs: [],
    globs: ["**/*"],
    warningPolicy: "moderate"
  }
});

export function validProjectFileSelection(value: unknown): value is ProjectFileSelection {
  const selection = exactRecord(value, ["excludeDirs", "generatedFiles", "include"]);
  return (
    selection !== undefined &&
    validStringArray(selection.excludeDirs) &&
    validStringArray(selection.generatedFiles) &&
    validStringArray(selection.include)
  );
}

export function validCodeAreas(
  value: unknown
): value is Readonly<Record<string, CodeAreaDefinition>> {
  const areas = snapshotClosedRecord(value);
  if (areas === undefined) return false;
  return Object.values(areas).every((candidate) => {
    const area = exactRecord(candidate, ["description", "excludeGlobs", "globs", "warningPolicy"]);
    return (
      area !== undefined &&
      typeof area.description === "string" &&
      validStringArray(area.excludeGlobs) &&
      validStringArray(area.globs) &&
      CODE_AREA_WARNING_POLICIES.some((policy) => policy === area.warningPolicy)
    );
  });
}

function validStringArray(value: unknown): boolean {
  const items = snapshotClosedArray(value);
  return items !== undefined && items.every((item) => typeof item === "string");
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
