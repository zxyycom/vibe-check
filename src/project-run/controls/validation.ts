import { snapshotClosedArray } from "../../data-boundary/closed-values.ts";
import { isOutputDirectory } from "../../project-definition/output-validation.ts";
import { isNonArrayRecord, isUnknownArray } from "../../data-boundary/value-shapes.ts";
import { parseOutputsOverride } from "./outputs-override-validation.ts";
import type { RunControlDiagnostic, RunControlValidationResult } from "./validation-result.ts";
import type { CheckAggregation, RunControls } from "./contract.ts";

const RUN_CONTROL_KEYS = [
  "checkArtifactBaseDirectory",
  "checkAggregation",
  "progressLogFile",
  "outputs",
  "flags",
  "projectRoot",
  "signal"
] as const;
const CHECK_AGGREGATION_MODES = ["all", "any"] as const;
const UNAVAILABLE_HANDLING = ["propagate", "fail", "exclude"] as const;
const NOT_APPLICABLE_HANDLING = ["exclude", "pass", "fail"] as const;
const EMPTY_AGGREGATION_RESULTS = ["passed", "failed", "not-applicable"] as const;

interface ParsedRunControlFields {
  readonly checkAggregation: CheckAggregation | undefined;
  readonly checkArtifactBaseDirectory: string | undefined;
  readonly flags: readonly string[];
  readonly outputs: RunControls["outputs"] | undefined;
  readonly progressLogFile: string | undefined;
  readonly projectRoot: string | undefined;
  readonly signal: AbortSignal | undefined;
}

export function validateRunControls(value: unknown = {}): RunControlValidationResult<RunControls> {
  try {
    return validateRunControlsValue(value);
  } catch {
    return invalidControls("controls");
  }
}

function validateRunControlsValue(value: unknown): RunControlValidationResult<RunControls> {
  const data = exactControlRecord(value);
  if (!data.ok) return data;
  const fields = parseRunControlFields(data.value);
  if (!fields.ok) return fields;
  return Object.freeze({ ok: true, value: runControlsFromFields(fields.value) });
}

function parseRunControlFields(
  data: Readonly<Record<string, unknown>>
): RunControlValidationResult<ParsedRunControlFields> {
  const checkArtifactBaseDirectory = optionalControl(
    data.checkArtifactBaseDirectory,
    parseOutputDirectory,
    "controls.checkArtifactBaseDirectory"
  );
  if (!checkArtifactBaseDirectory.ok) return checkArtifactBaseDirectory;
  const progressLogFile = optionalControl(
    data.progressLogFile,
    parseOutputDirectory,
    "controls.progressLogFile"
  );
  if (!progressLogFile.ok) return progressLogFile;
  const flags = parseFlags(data.flags);
  if (!flags.ok) return flags;
  const checkAggregation = parseOptionalCheckAggregation(data.checkAggregation);
  if (!checkAggregation.ok) return checkAggregation;
  const outputs = optionalControl(data.outputs, parseOutputsOverride, "controls.outputs");
  if (!outputs.ok) return outputs;
  const projectRoot = optionalControl(data.projectRoot, parseString, "controls.projectRoot");
  if (!projectRoot.ok) return projectRoot;
  const signal = optionalControl(data.signal, parseAbortSignal, "controls.signal");
  if (!signal.ok) return signal;
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      checkAggregation: checkAggregation.value,
      checkArtifactBaseDirectory: checkArtifactBaseDirectory.value,
      flags: flags.value,
      outputs: outputs.value,
      progressLogFile: progressLogFile.value,
      projectRoot: projectRoot.value,
      signal: signal.value
    })
  });
}

function runControlsFromFields(fields: ParsedRunControlFields): RunControls {
  return Object.freeze({
    ...(fields.checkArtifactBaseDirectory === undefined
      ? {}
      : { checkArtifactBaseDirectory: fields.checkArtifactBaseDirectory }),
    ...(fields.checkAggregation === undefined ? {} : { checkAggregation: fields.checkAggregation }),
    ...(fields.outputs === undefined ? {} : { outputs: fields.outputs }),
    ...(fields.progressLogFile === undefined ? {} : { progressLogFile: fields.progressLogFile }),
    flags: fields.flags,
    ...(fields.projectRoot === undefined ? {} : { projectRoot: fields.projectRoot }),
    ...(fields.signal === undefined ? {} : { signal: fields.signal })
  });
}

function exactControlRecord(
  value: unknown
): RunControlValidationResult<Readonly<Record<string, unknown>>> {
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
): RunControlValidationResult<T | undefined> {
  if (value === undefined) return Object.freeze({ ok: true, value: undefined });
  const parsed = parse(value);
  return parsed === undefined ? invalidControls(path) : Object.freeze({ ok: true, value: parsed });
}

function parseFlags(value: unknown): RunControlValidationResult<readonly string[]> {
  if (value === undefined) return Object.freeze({ ok: true, value: Object.freeze([]) });
  if (!isUnknownArray(value)) return invalidControls("controls.flags");
  const flags: string[] = [];
  const length = value.length;
  for (let index = 0; index < length; index += 1) {
    if (!Object.hasOwn(value, index)) return invalidControls("controls.flags");
    const flag = value[index];
    if (typeof flag !== "string" || flag.length === 0) {
      return invalidControls("controls.flags");
    }
    flags.push(flag);
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze([...new Set(flags)].sort())
  });
}

function parseOptionalCheckAggregation(
  value: unknown
): RunControlValidationResult<CheckAggregation | undefined> {
  if (value === undefined) return Object.freeze({ ok: true, value: undefined });
  const data = exactKeys(value, ["checks", "mode", "unavailable", "notApplicable", "empty"]);
  if (data === undefined) return invalidControls("controls.checkAggregation");
  const checks =
    data.checks === "all" || data.checks === "effective"
      ? data.checks
      : parseClosedCheckIds(data.checks);
  if (checks === undefined) return invalidControls("controls.checkAggregation.checks");
  const mode = parseLiteral(data.mode, CHECK_AGGREGATION_MODES);
  const unavailable = parseLiteral(data.unavailable, UNAVAILABLE_HANDLING);
  const notApplicable = parseLiteral(data.notApplicable, NOT_APPLICABLE_HANDLING);
  const empty = parseLiteral(data.empty, EMPTY_AGGREGATION_RESULTS);
  if (
    mode === undefined ||
    unavailable === undefined ||
    notApplicable === undefined ||
    empty === undefined
  )
    return invalidControls("controls.checkAggregation");
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      checks,
      mode,
      unavailable,
      notApplicable,
      empty
    })
  });
}

function parseClosedCheckIds(value: unknown): readonly string[] | undefined {
  const values = snapshotClosedArray(value);
  if (values === undefined) return undefined;
  const checkIds: string[] = [];
  for (const checkId of values) {
    if (typeof checkId !== "string" || checkId.length === 0) return undefined;
    checkIds.push(checkId);
  }
  return Object.freeze(checkIds);
}

function parseLiteral<Value extends string>(
  value: unknown,
  allowed: readonly Value[]
): Value | undefined {
  return typeof value === "string" ? allowed.find((option) => option === value) : undefined;
}

function isRunControlKey(value: string): boolean {
  return RUN_CONTROL_KEYS.some((key) => key === value);
}

function exactKeys(
  value: unknown,
  keys: readonly string[]
): Readonly<Record<string, unknown>> | undefined {
  if (!isNonArrayRecord(value)) return undefined;
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
    ? value
    : undefined;
}

function isAbortSignal(value: unknown): value is AbortSignal {
  return (
    isNonArrayRecord(value) &&
    typeof value.aborted === "boolean" &&
    typeof value.addEventListener === "function"
  );
}

function parseAbortSignal(value: unknown): AbortSignal | undefined {
  return isAbortSignal(value) ? value : undefined;
}

function parseString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function parseOutputDirectory(value: unknown): string | undefined {
  return typeof value === "string" && isOutputDirectory(value) ? value : undefined;
}

function invalidControls(path: string): RunControlValidationResult<never> {
  return invalidRunControl(path, "invalid-value");
}

function invalidRunControl(
  path: string,
  reason: RunControlDiagnostic["reason"]
): RunControlValidationResult<never> {
  return Object.freeze({
    ok: false,
    error: Object.freeze({ kind: "invalid-run-controls", path, reason })
  });
}
