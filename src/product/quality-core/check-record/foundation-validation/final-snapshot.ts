import {
  type CheckOutcome,
  type CoreCheck,
  type CoreSnapshot,
  type QualityRecord
} from "../model.ts";
import {
  accepted,
  acceptedDomain,
  compareCanonicalText,
  isRecord,
  issue,
  validateClosedRecord,
  type ValidationResult
} from "./common.ts";
import { validateMaterializedCheckDefinition } from "./definition.ts";
import { validateMaterializedQualityRecord } from "./quality-record.ts";

const SNAPSHOT_FIELDS = ["checks", "records"];
const CHECK_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

interface SnapshotHeader {
  readonly checks: readonly unknown[];
  readonly records: readonly unknown[];
}

function validateSnapshotHeader(value: unknown): ValidationResult<SnapshotHeader> {
  const closed = validateClosedRecord(value, "$", SNAPSHOT_FIELDS);
  if (!closed.ok) return closed;
  if (!Array.isArray(closed.value.checks) || !Array.isArray(closed.value.records)) {
    return issue("$", "invalid-value", "Snapshot checks and records must be arrays");
  }
  return accepted({ checks: closed.value.checks, records: closed.value.records });
}

function validateOutcome(value: unknown, path: string): ValidationResult<CheckOutcome> {
  if (!isRecord(value) || typeof value.status !== "string") {
    return issue(path, "invalid-value", "Check outcome must be a closed outcome object");
  }
  switch (value.status) {
    case "not-applicable":
      return validateNotApplicableOutcome(value, path);
    case "completed":
      return validateCompletedOutcome(value, path);
    case "unavailable":
      return validateUnavailableOutcome(value, path);
    default:
      return issue(`${path}.status`, "invalid-value", "Unknown Check outcome status");
  }
}

function validateNotApplicableOutcome(
  value: Readonly<Record<string, unknown>>,
  path: string
): ValidationResult<CheckOutcome> {
  const closed = validateClosedRecordWithOptional(value, path, {
    optional: ["reason"],
    required: ["status"]
  });
  if (!closed.ok) return closed;
  const reason = validateReason(closed.value.reason, `${path}.reason`, {
    allowCheckIds: false,
    optional: true
  });
  if (!reason.ok) return reason;
  return accepted<CheckOutcome>(reason.value === undefined
    ? { status: "not-applicable" }
    : { status: "not-applicable", reason: reason.value });
}

function validateCompletedOutcome(
  value: Readonly<Record<string, unknown>>,
  path: string
): ValidationResult<CheckOutcome> {
  const closed = validateClosedRecord(value, path, ["status", "verdict"]);
  if (!closed.ok) return closed;
  const verdict = closed.value.verdict;
  if (verdict !== "passed" && verdict !== "failed") {
    return issue(`${path}.verdict`, "invalid-value", "Completed Check verdict must be passed or failed");
  }
  return accepted<CheckOutcome>({ status: "completed", verdict });
}

function validateUnavailableOutcome(
  value: Readonly<Record<string, unknown>>,
  path: string
): ValidationResult<CheckOutcome> {
  const closed = validateClosedRecord(value, path, ["status", "reason"]);
  if (!closed.ok) return closed;
  const reason = validateReason(closed.value.reason, `${path}.reason`, {
    allowCheckIds: true,
    optional: false
  });
  if (!reason.ok) return issue(path, reason.issues[0]?.code ?? "invalid-value", reason.issues[0]?.message ?? "Invalid Check reason");
  if (reason.value === undefined) return issue(`${path}.reason`, "missing-field", "Unavailable Check requires a reason");
  return accepted<CheckOutcome>({ status: "unavailable", reason: reason.value });
}

function validateReason(
  value: unknown,
  path: string,
  options: Readonly<{ readonly allowCheckIds: boolean; readonly optional: boolean }>
): ValidationResult<Readonly<{ readonly code: string; readonly checkIds?: readonly string[] }> | undefined> {
  if (value === undefined && options.optional) return accepted(undefined);
  const closed = validateClosedRecordWithOptional(value, path, {
    optional: options.allowCheckIds ? ["checkIds"] : [],
    required: ["code"]
  });
  if (!closed.ok) return closed;
  if (typeof closed.value.code !== "string" || closed.value.code.length === 0) {
    return issue(`${path}.code`, "invalid-value", "Check reason code must be a non-empty string");
  }
  if (closed.value.checkIds === undefined) return accepted({ code: closed.value.code });
  if (!Array.isArray(closed.value.checkIds) || closed.value.checkIds.length === 0) {
    return issue(`${path}.checkIds`, "invalid-value", "Check reason checkIds must be a non-empty Check id array");
  }
  const checkIds: string[] = [];
  for (const checkId of closed.value.checkIds) {
    if (typeof checkId !== "string" || !CHECK_ID.test(checkId)) {
      return issue(`${path}.checkIds`, "invalid-value", "Check reason checkIds must be a non-empty Check id array");
    }
    checkIds.push(checkId);
  }
  return accepted({ code: closed.value.code, checkIds });
}

function validateClosedRecordWithOptional(
  value: unknown,
  path: string,
  fields: Readonly<{ readonly optional: readonly string[]; readonly required: readonly string[] }>
): ValidationResult<Record<string, unknown>> {
  if (!isRecord(value)) return issue(path, "invalid-value", "Expected an object");
  const supported = new Set([...fields.required, ...fields.optional]);
  const unknownField = Object.keys(value).find((key) => !supported.has(key));
  if (unknownField !== undefined) return issue(path, "unknown-field", "Object contains an unsupported field");
  const missingField = fields.required.find((key) => !Object.hasOwn(value, key));
  return missingField === undefined
    ? accepted(value)
    : issue(`${path}.${missingField}`, "missing-field", `Missing field: ${missingField}`);
}

function validateCoreCheck(value: unknown, path: string): ValidationResult<CoreCheck> {
  const closed = validateClosedRecord(value, path, ["checkId", "displayName", "recordTypes", "outcome"]);
  if (!closed.ok) return closed;
  const definition = validateMaterializedCheckDefinition({
    checkId: closed.value.checkId,
    displayName: closed.value.displayName,
    recordTypes: closed.value.recordTypes
  });
  if (!definition.ok) {
    return issue(path, definition.issues[0].code, definition.issues[0].message);
  }
  const outcome = validateOutcome(closed.value.outcome, `${path}.outcome`);
  if (!outcome.ok) return outcome;
  return accepted({ ...definition.value, outcome: outcome.value });
}

interface ValidatedChecks {
  readonly checks: readonly CoreCheck[];
  readonly byCheckId: ReadonlyMap<string, CoreCheck>;
}

function validateChecks(values: readonly unknown[]): ValidationResult<ValidatedChecks> {
  const checks: CoreCheck[] = [];
  const byCheckId = new Map<string, CoreCheck>();
  let previousCheckId: string | undefined;
  for (let index = 0; index < values.length; index += 1) {
    const validated = validateCoreCheck(values[index], `$.checks[${index}]`);
    if (!validated.ok) return validated;
    const { checkId } = validated.value;
    if (byCheckId.has(checkId)) {
      return issue(`$.checks[${index}].checkId`, "duplicate", "Duplicate Core Check checkId");
    }
    if (previousCheckId !== undefined && compareCanonicalText(previousCheckId, checkId) >= 0) {
      return issue(`$.checks[${index}].checkId`, "invalid-value", "Core Checks must be sorted by checkId");
    }
    previousCheckId = checkId;
    byCheckId.set(checkId, validated.value);
    checks.push(validated.value);
  }
  return accepted({ checks, byCheckId });
}

function validateRecords(
  values: readonly unknown[],
  checks: ValidatedChecks
): ValidationResult<readonly QualityRecord[]> {
  const records: QualityRecord[] = [];
  const recordIds = new Set<string>();
  let previousRecordId: string | undefined;
  for (let index = 0; index < values.length; index += 1) {
    const rawRecord = values[index];
    const checkId = isRecord(rawRecord) ? rawRecord.checkId : undefined;
    const check = typeof checkId === "string" ? checks.byCheckId.get(checkId) : undefined;
    if (check === undefined) {
      return issue(`$.records[${index}].checkId`, "identity-mismatch", "Record has no owning Core Check");
    }
    if (check.outcome.status === "not-applicable") {
      return issue(`$.records[${index}].checkId`, "identity-mismatch", "Not-applicable Check cannot own records");
    }
    const validated = validateMaterializedQualityRecord(rawRecord, check);
    if (!validated.ok) {
      return issue(`$.records[${index}]`, validated.issues[0].code, validated.issues[0].message);
    }
    if (recordIds.has(validated.value.recordId)) {
      return issue(`$.records[${index}].recordId`, "duplicate", "Duplicate QualityRecord recordId");
    }
    if (previousRecordId !== undefined
      && compareCanonicalText(previousRecordId, validated.value.recordId) >= 0) {
      return issue(`$.records[${index}].recordId`, "invalid-value", "QualityRecords must be sorted by recordId");
    }
    previousRecordId = validated.value.recordId;
    recordIds.add(validated.value.recordId);
    records.push(validated.value);
  }
  return accepted(records);
}

export function validateMaterializedCoreSnapshot(value: unknown): ValidationResult<CoreSnapshot> {
  const header = validateSnapshotHeader(value);
  if (!header.ok) return header;
  const checks = validateChecks(header.value.checks);
  if (!checks.ok) return checks;
  const records = validateRecords(header.value.records, checks.value);
  if (!records.ok) return records;
  return acceptedDomain({ checks: checks.value.checks, records: records.value });
}
