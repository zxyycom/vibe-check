import {
  isNonArrayRecord,
  isStringArray,
  isUnknownArray
} from "../../data-boundary/value-shapes.ts";
import { parseOutputsOverride } from "./outputs-override-validation.ts";
import type { RunControlDiagnostic, RunControlValidationResult } from "./validation-result.ts";
import type { CheckAggregation, RunControls } from "./contract.ts";

const RUN_CONTROL_KEYS = [
  "checkAggregation",
  "changedFiles",
  "outputs",
  "flags",
  "projectRoot",
  "signal"
] as const;

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
  const changedFiles = optionalControl(
    data.value.changedFiles,
    parseStringArray,
    "controls.changedFiles"
  );
  if (!changedFiles.ok) return changedFiles;
  const flags = parseFlags(data.value.flags);
  if (!flags.ok) return flags;
  const checkAggregation = parseOptionalCheckAggregation(data.value.checkAggregation);
  if (!checkAggregation.ok) return checkAggregation;
  const outputs = optionalControl(data.value.outputs, parseOutputsOverride, "controls.outputs");
  if (!outputs.ok) return outputs;
  const projectRoot = optionalControl(data.value.projectRoot, parseString, "controls.projectRoot");
  if (!projectRoot.ok) return projectRoot;
  const signal = optionalControl(data.value.signal, parseAbortSignal, "controls.signal");
  if (!signal.ok) return signal;
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      ...(changedFiles.value === undefined
        ? {}
        : { changedFiles: Object.freeze([...changedFiles.value]) }),
      ...(checkAggregation.value === undefined ? {} : { checkAggregation: checkAggregation.value }),
      ...(outputs.value === undefined ? {} : { outputs: outputs.value }),
      flags: flags.value,
      ...(projectRoot.value === undefined ? {} : { projectRoot: projectRoot.value }),
      ...(signal.value === undefined ? {} : { signal: signal.value })
    })
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

function parseStringArray(value: unknown): readonly string[] | undefined {
  return isStringArray(value) ? value : undefined;
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
  const checks = data.checks === "all" ? "all" : parseClosedCheckIds(data.checks);
  if (checks === undefined) return invalidControls("controls.checkAggregation.checks");
  if (
    (data.mode !== "all" && data.mode !== "any") ||
    (data.unavailable !== "propagate" &&
      data.unavailable !== "fail" &&
      data.unavailable !== "exclude") ||
    (data.notApplicable !== "exclude" &&
      data.notApplicable !== "pass" &&
      data.notApplicable !== "fail") ||
    (data.empty !== "passed" && data.empty !== "failed" && data.empty !== "not-applicable")
  )
    return invalidControls("controls.checkAggregation");
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      checks,
      mode: data.mode,
      unavailable: data.unavailable,
      notApplicable: data.notApplicable,
      empty: data.empty
    })
  });
}

function parseClosedCheckIds(value: unknown): readonly string[] | undefined {
  if (!isUnknownArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return undefined;
  const keys = Reflect.ownKeys(value);
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  const length = lengthDescriptor?.value as unknown;
  if (
    lengthDescriptor === undefined ||
    lengthDescriptor.get !== undefined ||
    lengthDescriptor.set !== undefined ||
    lengthDescriptor.enumerable ||
    typeof length !== "number" ||
    !Number.isSafeInteger(length) ||
    length < 0 ||
    keys.length !== length + 1 ||
    !keys.includes("length")
  )
    return undefined;
  const checkIds: string[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      descriptor.enumerable !== true
    )
      return undefined;
    const checkId = descriptor.value as unknown;
    if (typeof checkId !== "string" || checkId.length === 0) return undefined;
    checkIds.push(checkId);
  }
  return Object.freeze(checkIds);
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
