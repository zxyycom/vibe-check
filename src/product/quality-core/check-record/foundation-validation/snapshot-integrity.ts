import type {
  CheckRun,
  InvalidRecordEvidence,
  RecordConflictEvidence,
  SnapshotCompleteness,
  SnapshotIntegrity
} from "../model.ts";
import { isCheckRunId } from "../identity.ts";
import {
  accepted,
  acceptedDomain,
  compareCanonicalText,
  INVALID_RECORD_EVIDENCE_ID_PATTERN,
  isStableId,
  issue,
  RECORD_ID_PATTERN,
  validateClosedRecord,
  type ValidationResult
} from "./common.ts";

const BODY_FINGERPRINT_PATTERN = /^check-record\/v1\/body\/sha256:[a-f0-9]{64}$/;
const COMPLETENESS_FIELDS = [
  "status",
  "selectedRunCount",
  "completedRunCount",
  "failedRunCount",
  "plannedWorkCount",
  "acknowledgedWorkCount"
] as const;

interface ConflictEvidenceHeader {
  readonly kind: "record-conflict";
  readonly checkId: string;
  readonly checkRunId: string;
  readonly recordTypeId: string;
  readonly recordId: string;
  readonly bodyFingerprints: readonly unknown[];
}

function validateInvalidRecordEvidence(
  value: unknown,
  path: string
): ValidationResult<InvalidRecordEvidence> {
  const closed = validateClosedRecord(value, path, [
    "kind",
    "checkId",
    "checkRunId",
    "recordTypeId",
    "evidenceId"
  ]);
  if (!closed.ok) {
    return closed;
  }
  const evidence = closed.value;
  if (evidence.kind !== "invalid-record" || !isStableId(evidence.checkId)
    || !isCheckRunId(evidence.checkRunId) || !isStableId(evidence.recordTypeId)
    || typeof evidence.evidenceId !== "string"
    || !INVALID_RECORD_EVIDENCE_ID_PATTERN.test(evidence.evidenceId)) {
    return issue(path, "invalid-value", "Invalid invalid-record evidence");
  }
  return accepted({
    kind: "invalid-record",
    checkId: evidence.checkId,
    checkRunId: evidence.checkRunId,
    recordTypeId: evidence.recordTypeId,
    evidenceId: evidence.evidenceId
  });
}

function validateConflictEvidenceHeader(
  evidence: Readonly<Record<string, unknown>>,
  path: string
): ValidationResult<ConflictEvidenceHeader> {
  if (evidence.kind !== "record-conflict" || !isStableId(evidence.checkId)
    || !isCheckRunId(evidence.checkRunId) || !isStableId(evidence.recordTypeId)
    || typeof evidence.recordId !== "string" || !RECORD_ID_PATTERN.test(evidence.recordId)
    || !Array.isArray(evidence.bodyFingerprints) || evidence.bodyFingerprints.length < 2) {
    return issue(path, "invalid-value", "Invalid record-conflict evidence");
  }
  return accepted({
    kind: "record-conflict",
    checkId: evidence.checkId,
    checkRunId: evidence.checkRunId,
    recordTypeId: evidence.recordTypeId,
    recordId: evidence.recordId,
    bodyFingerprints: evidence.bodyFingerprints
  });
}

function validateBodyFingerprints(
  values: readonly unknown[],
  path: string
): ValidationResult<readonly string[]> {
  const fingerprints: string[] = [];
  for (const fingerprint of values) {
    if (typeof fingerprint !== "string" || !BODY_FINGERPRINT_PATTERN.test(fingerprint)) {
      return issue(`${path}.bodyFingerprints`, "invalid-value", "Conflict body fingerprints must be SHA-256 identities");
    }
    fingerprints.push(fingerprint);
  }
  const hasDuplicate = new Set(fingerprints).size !== fingerprints.length;
  const isOutOfOrder = fingerprints.some((fingerprint, index) => (
    index > 0 && fingerprints[index - 1]! >= fingerprint
  ));
  if (hasDuplicate || isOutOfOrder) {
    return issue(`${path}.bodyFingerprints`, "invalid-value", "Conflict body fingerprints must be distinct and canonically sorted");
  }
  return accepted(fingerprints);
}

function validateConflictEvidence(
  value: unknown,
  path: string
): ValidationResult<RecordConflictEvidence> {
  const closed = validateClosedRecord(value, path, [
    "kind",
    "checkId",
    "checkRunId",
    "recordTypeId",
    "recordId",
    "bodyFingerprints"
  ]);
  if (!closed.ok) {
    return closed;
  }
  const header = validateConflictEvidenceHeader(closed.value, path);
  if (!header.ok) {
    return header;
  }
  const fingerprints = validateBodyFingerprints(header.value.bodyFingerprints, path);
  if (!fingerprints.ok) {
    return fingerprints;
  }
  return acceptedDomain({
    kind: "record-conflict",
    checkId: header.value.checkId,
    checkRunId: header.value.checkRunId,
    recordTypeId: header.value.recordTypeId,
    recordId: header.value.recordId,
    bodyFingerprints: fingerprints.value
  });
}

function validateInvalidRecordEvidenceSet(
  values: readonly unknown[]
): ValidationResult<readonly InvalidRecordEvidence[]> {
  const evidence: InvalidRecordEvidence[] = [];
  for (let index = 0; index < values.length; index += 1) {
    const validated = validateInvalidRecordEvidence(values[index], `$.integrity.invalidRecords[${index}]`);
    if (!validated.ok) {
      return validated;
    }
    evidence.push(validated.value);
  }
  return accepted(evidence);
}

function validateConflictEvidenceSet(
  values: readonly unknown[]
): ValidationResult<readonly RecordConflictEvidence[]> {
  const evidence: RecordConflictEvidence[] = [];
  for (let index = 0; index < values.length; index += 1) {
    const validated = validateConflictEvidence(values[index], `$.integrity.conflicts[${index}]`);
    if (!validated.ok) {
      return validated;
    }
    evidence.push(validated.value);
  }
  return accepted(evidence);
}

function expectedIntegrityStatus(
  invalidRecords: readonly InvalidRecordEvidence[],
  conflicts: readonly RecordConflictEvidence[]
): SnapshotIntegrity["status"] {
  if (conflicts.length > 0) {
    return "conflicted";
  }
  return invalidRecords.length > 0 ? "invalid" : "valid";
}

function hasDuplicate(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

export function validateIntegrity(value: unknown): ValidationResult<SnapshotIntegrity> {
  const closed = validateClosedRecord(value, "$.integrity", ["status", "invalidRecords", "conflicts"]);
  if (!closed.ok) {
    return closed;
  }
  const integrity = closed.value;
  if (!Array.isArray(integrity.invalidRecords) || !Array.isArray(integrity.conflicts)) {
    return issue("$.integrity", "invalid-value", "Integrity evidence must use arrays");
  }
  const invalidRecords = validateInvalidRecordEvidenceSet(integrity.invalidRecords);
  if (!invalidRecords.ok) {
    return invalidRecords;
  }
  const conflicts = validateConflictEvidenceSet(integrity.conflicts);
  if (!conflicts.ok) {
    return conflicts;
  }
  const expectedStatus = expectedIntegrityStatus(invalidRecords.value, conflicts.value);
  if (integrity.status !== expectedStatus) {
    return issue("$.integrity.status", "invalid-value", `Integrity status must be ${expectedStatus}`);
  }
  if (hasDuplicate(invalidRecords.value.map((evidence) => evidence.evidenceId))) {
    return issue("$.integrity.invalidRecords", "duplicate", "Integrity evidence identities must be unique");
  }
  if (hasDuplicate(conflicts.value.map((evidence) => evidence.recordId))) {
    return issue("$.integrity.conflicts", "duplicate", "Conflict record identities must be unique");
  }
  return accepted({
    status: expectedStatus,
    invalidRecords: [...invalidRecords.value].sort(
      (left, right) => compareCanonicalText(left.evidenceId, right.evidenceId)
    ),
    conflicts: [...conflicts.value].sort(
      (left, right) => compareCanonicalText(left.recordId, right.recordId)
    )
  });
}

function deriveCompleteness(runs: readonly CheckRun[]): SnapshotCompleteness {
  const selectedRuns = runs.filter((run) => run.selection === "selected");
  return {
    status: selectedRuns.some((run) => run.status === "failed") ? "incomplete" : "complete",
    selectedRunCount: selectedRuns.length,
    completedRunCount: selectedRuns.filter((run) => run.status === "completed").length,
    failedRunCount: selectedRuns.filter((run) => run.status === "failed").length,
    plannedWorkCount: selectedRuns.reduce((sum, run) => sum + run.coverage.plannedWorkCount, 0),
    acknowledgedWorkCount: selectedRuns.reduce(
      (sum, run) => sum + run.coverage.acknowledgedWorkCount,
      0
    )
  };
}

export function validateCompleteness(
  value: unknown,
  runs: readonly CheckRun[]
): ValidationResult<SnapshotCompleteness> {
  const closed = validateClosedRecord(value, "$.completeness", COMPLETENESS_FIELDS);
  if (!closed.ok) {
    return closed;
  }
  const expected = deriveCompleteness(runs);
  for (const field of COMPLETENESS_FIELDS) {
    if (closed.value[field] !== expected[field]) {
      return issue(`$.completeness.${field}`, "invalid-value", "Completeness must equal manager-derived run facts");
    }
  }
  return accepted(expected);
}
