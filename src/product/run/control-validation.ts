import { isNonArrayRecord, isStringArray } from "../foundation/type-guards.ts";
import { parseEffectsOverride } from "../definition/effect-validation.ts";
import type {
  ProjectDefinitionDiagnostic,
  RunControls,
  ValidationResult
} from "../definition/project.ts";
import { parseOperationalDependencies } from "../scanner-dependencies/index.ts";

const RUN_CONTROL_KEYS = [
  "changedFiles",
  "comparison",
  "effects",
  "operationalDependencies",
  "projectRoot",
  "signal"
] as const;

export function validateRunControls(value: unknown = {}): ValidationResult<RunControls> {
  try {
    return validateRunControlsValue(value);
  } catch {
    return invalidControls("controls");
  }
}

function validateRunControlsValue(value: unknown): ValidationResult<RunControls> {
  const data = exactControlRecord(value);
  if (!data.ok) return data;
  const changedFiles = optionalControl(data.value.changedFiles, parseStringArray, "controls.changedFiles");
  if (!changedFiles.ok) return changedFiles;
  const comparison = optionalControl(data.value.comparison, parseComparison, "controls.comparison");
  if (!comparison.ok) return comparison;
  const effects = optionalControl(data.value.effects, parseEffectsOverride, "controls.effects");
  if (!effects.ok) return effects;
  const dependencies = optionalControl(
    data.value.operationalDependencies,
    parseOperationalDependencies,
    "controls.operationalDependencies"
  );
  if (!dependencies.ok) return dependencies;
  const projectRoot = optionalControl(data.value.projectRoot, parseString, "controls.projectRoot");
  if (!projectRoot.ok) return projectRoot;
  const signal = optionalControl(data.value.signal, parseAbortSignal, "controls.signal");
  if (!signal.ok) return signal;
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      ...(changedFiles.value === undefined ? {} : { changedFiles: Object.freeze([...changedFiles.value]) }),
      ...(comparison.value === undefined ? {} : { comparison: comparison.value }),
      ...(effects.value === undefined ? {} : { effects: effects.value }),
      ...(dependencies.value === undefined ? {} : { operationalDependencies: dependencies.value }),
      ...(projectRoot.value === undefined ? {} : { projectRoot: projectRoot.value }),
      ...(signal.value === undefined ? {} : { signal: signal.value })
    })
  });
}

function exactControlRecord(value: unknown): ValidationResult<Readonly<Record<string, unknown>>> {
  if (!isNonArrayRecord(value)) return invalidControls("controls");
  const unknownKey = Object.keys(value).find((key) => !isRunControlKey(key));
  return unknownKey === undefined
    ? Object.freeze({ ok: true, value })
    : invalidRunControl(`controls.${unknownKey}`, "unknown-key");
}

function optionalControl<T>(
  value: unknown,
  parse: (candidate: unknown) => T | undefined,
  path: string
): ValidationResult<T | undefined> {
  if (value === undefined) return Object.freeze({ ok: true, value: undefined });
  const parsed = parse(value);
  return parsed === undefined
    ? invalidControls(path)
    : Object.freeze({ ok: true, value: parsed });
}

function parseStringArray(value: unknown): readonly string[] | undefined {
  return isStringArray(value) ? value : undefined;
}

function parseComparison(value: unknown): RunControls["comparison"] | undefined {
  const data = exactKeys(value, ["referenceName", "revision"]);
  return typeof data?.referenceName === "string" && typeof data.revision === "string"
    ? Object.freeze({ referenceName: data.referenceName, revision: data.revision })
    : undefined;
}

function isRunControlKey(value: string): boolean {
  return RUN_CONTROL_KEYS.some((key) => key === value);
}

function exactKeys(value: unknown, keys: readonly string[]): Readonly<Record<string, unknown>> | undefined {
  if (!isNonArrayRecord(value)) return undefined;
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
    ? value
    : undefined;
}

function isAbortSignal(value: unknown): value is AbortSignal {
  return isNonArrayRecord(value) && typeof value.aborted === "boolean"
    && typeof value.addEventListener === "function";
}

function parseAbortSignal(value: unknown): AbortSignal | undefined {
  return isAbortSignal(value) ? value : undefined;
}

function parseString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function invalidControls(path: string): ValidationResult<never> {
  return invalidRunControl(path, "invalid-value");
}

function invalidRunControl(
  path: string,
  reason: ProjectDefinitionDiagnostic["reason"]
): ValidationResult<never> {
  return Object.freeze({
    ok: false,
    error: Object.freeze({ kind: "invalid-run-controls", path, reason })
  });
}
