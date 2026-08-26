import { canonicalizeJsonObject } from "../data-boundary/canonical-data.ts";
import type { CheckOutcome } from "../check/check.ts";
import { validateCheckDescriptor } from "../check/descriptor-validation.ts";
import type { CoreCheck, CoreRecord, CoreSnapshot } from "./facts.ts";
import { snapshotClosedArray, snapshotClosedRecord } from "../data-boundary/closed-values.ts";

export interface ValidationIssue {
  readonly path: string;
  readonly code:
    | "duplicate"
    | "identity-mismatch"
    | "invalid-value"
    | "missing-field"
    | "unknown-field";
  readonly message: string;
}

export type ValidationResult<T> = Readonly<
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: readonly [ValidationIssue, ...ValidationIssue[]] }
>;

export function validateCoreSnapshot(value: unknown): ValidationResult<CoreSnapshot> {
  const snapshot = snapshotClosedRecord(value);
  if (snapshot === undefined || !hasExactKeys(snapshot, ["checks", "records"])) {
    return invalid("$", "Core snapshot must contain only checks and records");
  }
  const checksInput = snapshotClosedArray(snapshot.checks);
  const recordsInput = snapshotClosedArray(snapshot.records);
  if (checksInput === undefined || recordsInput === undefined) {
    return invalid("$", "Core snapshot entities must be dense arrays");
  }
  const checks = validateChecks(checksInput);
  if (!checks.ok) return checks;
  const reasonReferences = validateReasonReferences(checks.value);
  if (!reasonReferences.ok) return reasonReferences;
  const records = validateRecords(recordsInput, checks.value);
  if (!records.ok) return records;
  return accepted(Object.freeze({ checks: checks.value, records: records.value }));
}

function validateReasonReferences(checks: readonly CoreCheck[]): ValidationResult<void> {
  const knownCheckIds = new Set(checks.map((check) => check.checkId));
  for (const [index, check] of checks.entries()) {
    if (check.outcome.status !== "unavailable" || check.outcome.reason.checkIds === undefined)
      continue;
    const seen = new Set<string>();
    for (const checkId of check.outcome.reason.checkIds) {
      if (!knownCheckIds.has(checkId) || seen.has(checkId))
        return invalid(
          `$.checks[${index}].outcome.reason.checkIds`,
          "Unavailable reason references are invalid"
        );
      seen.add(checkId);
    }
  }
  return accepted(undefined);
}

function validateChecks(values: readonly unknown[]): ValidationResult<readonly CoreCheck[]> {
  const checks: CoreCheck[] = [];
  const checkIds = new Set<string>();
  let previousCheckId: string | undefined;
  for (const [index, value] of values.entries()) {
    const check = snapshotClosedRecord(value);
    if (check === undefined || !hasExactKeys(check, ["checkId", "displayName", "outcome"])) {
      return invalid(`$.checks[${index}]`, "Core Check must be closed");
    }
    const definition = validateCheckDescriptor({
      checkId: check.checkId,
      displayName: check.displayName
    });
    if (!definition.ok) return definition;
    if (checkIds.has(definition.value.checkId)) {
      return invalid(`$.checks[${index}].checkId`, "Duplicate Core Check checkId", "duplicate");
    }
    if (
      previousCheckId !== undefined &&
      compareText(previousCheckId, definition.value.checkId) >= 0
    ) {
      return invalid(`$.checks[${index}].checkId`, "Core Checks must be sorted by checkId");
    }
    const outcome = validateOutcome(check.outcome, `$.checks[${index}].outcome`);
    if (!outcome.ok) return outcome;
    checks.push(Object.freeze({ ...definition.value, outcome: outcome.value }));
    checkIds.add(definition.value.checkId);
    previousCheckId = definition.value.checkId;
  }
  return accepted(Object.freeze(checks));
}

function validateRecords(
  values: readonly unknown[],
  checks: readonly CoreCheck[]
): ValidationResult<readonly CoreRecord[]> {
  const ownerIds = new Set(checks.map((check) => check.checkId));
  const recordIdsByCheckId = new Map<string, Set<string>>();
  const records: CoreRecord[] = [];
  let previous: Readonly<{ readonly checkId: string; readonly id: string }> | undefined;
  for (const [index, value] of values.entries()) {
    const record = snapshotClosedRecord(value);
    if (record === undefined || !hasExactKeys(record, ["checkId", "id", "data"])) {
      return invalid(`$.records[${index}]`, "Core Record must be closed");
    }
    if (
      typeof record.checkId !== "string" ||
      !ownerIds.has(record.checkId) ||
      typeof record.id !== "string" ||
      record.id.length === 0
    ) {
      return invalid(`$.records[${index}]`, "Core Record identity is invalid", "identity-mismatch");
    }
    const data = canonicalizeJsonObject(record.data);
    if (data === undefined)
      return invalid(`$.records[${index}].data`, "Core Record data is invalid");
    const ids = recordIdsByCheckId.get(record.checkId) ?? new Set<string>();
    if (ids.has(record.id)) {
      return invalid(`$.records[${index}].id`, "Duplicate Check-local Record id", "duplicate");
    }
    if (
      previous !== undefined &&
      (compareText(previous.checkId, record.checkId) > 0 ||
        (previous.checkId === record.checkId && compareText(previous.id, record.id) >= 0))
    ) {
      return invalid(`$.records[${index}]`, "Core Records must be sorted by checkId then id");
    }
    ids.add(record.id);
    recordIdsByCheckId.set(record.checkId, ids);
    records.push(Object.freeze({ checkId: record.checkId, id: record.id, data }));
    previous = { checkId: record.checkId, id: record.id };
  }
  return accepted(Object.freeze(records));
}

function validateOutcome(value: unknown, path: string): ValidationResult<CheckOutcome> {
  const outcome = snapshotClosedRecord(value);
  if (outcome === undefined || typeof outcome.status !== "string") {
    return invalid(path, "Check outcome is invalid");
  }
  if (outcome.status === "passed" || outcome.status === "failed") {
    if (!hasExactKeys(outcome, ["status", "data"]))
      return invalid(path, "Final outcome is not closed");
    const data = canonicalizeJsonObject(outcome.data);
    return data === undefined
      ? invalid(`${path}.data`, "Final data is invalid")
      : accepted(Object.freeze({ status: outcome.status, data }));
  }
  if (outcome.status === "not-applicable") {
    if (!hasOptionalKeys(outcome, ["status"], ["reason"])) {
      return invalid(path, "Not-applicable outcome is not closed");
    }
    const reason = validateReason(outcome.reason, false);
    return reason === null
      ? invalid(`${path}.reason`, "Not-applicable reason is invalid")
      : accepted(
          Object.freeze(
            reason === undefined
              ? { status: "not-applicable" }
              : { status: "not-applicable", reason }
          )
        );
  }
  if (outcome.status === "unavailable") {
    if (!hasExactKeys(outcome, ["status", "reason"]))
      return invalid(path, "Unavailable outcome is not closed");
    const reason = validateReason(outcome.reason, true);
    return reason === null || reason === undefined
      ? invalid(`${path}.reason`, "Unavailable reason is invalid")
      : accepted(Object.freeze({ status: "unavailable", reason }));
  }
  return invalid(`${path}.status`, "Unknown Check outcome status");
}

function validateReason(
  value: unknown,
  allowCheckIds: boolean
): Readonly<{ readonly code: string; readonly checkIds?: readonly string[] }> | null | undefined {
  if (value === undefined) return undefined;
  const reason = snapshotClosedRecord(value);
  if (reason === undefined || typeof reason.code !== "string" || reason.code.length === 0)
    return null;
  if (!hasOptionalKeys(reason, ["code"], allowCheckIds ? ["checkIds"] : [])) return null;
  if (!Object.hasOwn(reason, "checkIds")) return Object.freeze({ code: reason.code });
  const checkIds = snapshotClosedArray(reason.checkIds);
  if (
    !allowCheckIds ||
    checkIds === undefined ||
    checkIds.length === 0 ||
    checkIds.some((checkId) => typeof checkId !== "string" || !isSettlementCheckReference(checkId))
  )
    return null;
  const normalizedCheckIds: string[] = [];
  for (const checkId of checkIds) {
    if (typeof checkId !== "string") return null;
    normalizedCheckIds.push(checkId);
  }
  return Object.freeze({ code: reason.code, checkIds: Object.freeze(normalizedCheckIds) });
}

function hasExactKeys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  return (
    Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
  );
}

function hasOptionalKeys(
  value: Readonly<Record<string, unknown>>,
  required: readonly string[],
  optional: readonly string[]
): boolean {
  const supported = new Set([...required, ...optional]);
  return (
    required.every((key) => Object.hasOwn(value, key)) &&
    Object.keys(value).every((key) => supported.has(key))
  );
}

function accepted<T>(value: T): ValidationResult<T> {
  return Object.freeze({ ok: true, value });
}

function invalid(
  path: string,
  message: string,
  code: ValidationIssue["code"] = "invalid-value"
): ValidationResult<never> {
  const issue = Object.freeze({ path, code, message }) satisfies ValidationIssue;
  const issues: readonly [ValidationIssue, ...ValidationIssue[]] = [issue];
  return Object.freeze({
    ok: false,
    issues: Object.freeze(issues)
  });
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function isSettlementCheckReference(value: string): boolean {
  return value.length > 0;
}
