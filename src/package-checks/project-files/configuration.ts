import { snapshotClosedArray, snapshotClosedRecord } from "../../data-boundary/closed-values.ts";

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

export function validProjectFileSelection(value: unknown): value is ProjectFileSelection {
  const selection = exactRecord(value, ["excludeDirs", "generatedFiles", "include"]);
  return (
    selection !== undefined &&
    validStringArray(selection.excludeDirs) &&
    validStringArray(selection.generatedFiles) &&
    validStringArray(selection.include)
  );
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
