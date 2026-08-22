import { validateCoreSnapshot } from "../../check-record/validation.ts";
import { createRecordsFingerprintV4 } from "./records-fingerprint.ts";
import type { MachineRecordV4, MachineRunV4 } from "./schema.ts";
import { setInvariantFailure, type ValidationFailure } from "./validation-result.ts";

export function validatePublicationInvariants(
  run: MachineRunV4,
  records: readonly MachineRecordV4[]
): ValidationFailure | null {
  const checkOrder = validateCheckOrder(run);
  if (checkOrder !== null) return checkOrder;
  const recordOrder = validateRecordOrder(records);
  if (recordOrder !== null) return recordOrder;
  const ownership = validateRecordOwnership(run, records);
  if (ownership !== null) return ownership;
  const core = validateProjectedCore(run, records);
  if (core !== null) return core;
  return createRecordsFingerprintV4(records) === run.recordsFingerprint
    ? null
    : setInvariantFailure(
        "records-fingerprint",
        "records.ndjson",
        "Records fingerprint must match the complete canonical Record row set."
      );
}

function validateCheckOrder(run: MachineRunV4): ValidationFailure | null {
  let previous: string | undefined;
  for (const check of run.checks) {
    if (previous !== undefined && previous >= check.checkId) {
      return setInvariantFailure(
        "check-canonical-order",
        "run.json",
        "Checks must be uniquely sorted by checkId."
      );
    }
    previous = check.checkId;
  }
  return null;
}

function validateRecordOrder(records: readonly MachineRecordV4[]): ValidationFailure | null {
  let previous: readonly [string, string] | undefined;
  for (const [index, record] of records.entries()) {
    const current = [record.checkId, record.id] as const;
    if (
      previous !== undefined &&
      (previous[0] > current[0] || (previous[0] === current[0] && previous[1] >= current[1]))
    ) {
      return setInvariantFailure(
        "record-canonical-order",
        "records.ndjson",
        "Records must be uniquely sorted by the composite { checkId, id } identity.",
        index
      );
    }
    previous = current;
  }
  return null;
}

function validateRecordOwnership(
  run: MachineRunV4,
  records: readonly MachineRecordV4[]
): ValidationFailure | null {
  const knownChecks = new Set(run.checks.map((check) => check.checkId));
  const unknownIndex = records.findIndex((record) => !knownChecks.has(record.checkId));
  return unknownIndex === -1
    ? null
    : setInvariantFailure(
        "record-check-ownership",
        "records.ndjson",
        "Every Record must name a published owning Check.",
        unknownIndex
      );
}

function validateProjectedCore(
  run: MachineRunV4,
  records: readonly MachineRecordV4[]
): ValidationFailure | null {
  const snapshot = validateCoreSnapshot({
    checks: run.checks,
    records: records.map(({ schemaVersion: _schemaVersion, ...record }) => record)
  });
  return snapshot.ok
    ? null
    : setInvariantFailure("core-snapshot", "run.json", "Published Core facts are invalid.");
}
