import type {
  CheckDefinition,
  CheckRun,
  FinalCoreSnapshot,
  QualityRecord,
  RecordConflictEvidence,
  SnapshotIntegrity
} from "../model.ts";
import { createCatalogFingerprint } from "../identity.ts";
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
import { validateMaterializedCheckRun } from "./check-run.ts";
import { validateMaterializedQualityRecord } from "./quality-record.ts";
import { validateCompleteness, validateIntegrity } from "./snapshot-integrity.ts";

const CATALOG_FINGERPRINT_PATTERN = /^check-record\/v1\/catalog\/sha256:[a-f0-9]{64}$/;
const SNAPSHOT_FIELDS = [
  "catalogFingerprint",
  "definitions",
  "runs",
  "records",
  "integrity",
  "completeness"
];

interface SnapshotHeader {
  readonly catalogFingerprint: string;
  readonly definitions: readonly unknown[];
  readonly runs: readonly unknown[];
  readonly records: readonly unknown[];
  readonly integrity: unknown;
  readonly completeness: unknown;
}

interface ValidatedCatalog {
  readonly definitions: readonly CheckDefinition[];
  readonly checkIds: ReadonlySet<string>;
}

interface ValidatedRuns {
  readonly runs: readonly CheckRun[];
  readonly byCheckId: ReadonlyMap<string, CheckRun>;
}

function validateSnapshotHeader(value: unknown): ValidationResult<SnapshotHeader> {
  const closed = validateClosedRecord(value, "$", SNAPSHOT_FIELDS);
  if (!closed.ok) {
    return closed;
  }
  const snapshot = closed.value;
  if (typeof snapshot.catalogFingerprint !== "string"
    || !CATALOG_FINGERPRINT_PATTERN.test(snapshot.catalogFingerprint)
    || !Array.isArray(snapshot.definitions)
    || !Array.isArray(snapshot.runs)
    || !Array.isArray(snapshot.records)) {
    return issue("$", "invalid-value", "Snapshot catalog, definitions, runs, or records are invalid");
  }
  return accepted({
    catalogFingerprint: snapshot.catalogFingerprint,
    definitions: snapshot.definitions,
    runs: snapshot.runs,
    records: snapshot.records,
    integrity: snapshot.integrity,
    completeness: snapshot.completeness
  });
}

function validateDefinitions(
  values: readonly unknown[]
): ValidationResult<ValidatedCatalog> {
  const definitions: CheckDefinition[] = [];
  const checkIds = new Set<string>();
  for (let index = 0; index < values.length; index += 1) {
    const validated = validateMaterializedCheckDefinition(values[index]);
    if (!validated.ok) {
      return issue(`$.definitions[${index}]`, validated.issues[0].code, validated.issues[0].message);
    }
    if (checkIds.has(validated.value.checkId)) {
      return issue(`$.definitions[${index}].checkId`, "duplicate", "Duplicate checkId");
    }
    checkIds.add(validated.value.checkId);
    definitions.push(validated.value);
  }
  return accepted({ definitions, checkIds });
}

function validateCatalog(header: SnapshotHeader): ValidationResult<ValidatedCatalog> {
  const catalog = validateDefinitions(header.definitions);
  if (!catalog.ok) {
    return catalog;
  }
  const expectedFingerprint = createCatalogFingerprint(catalog.value.definitions).catalogFingerprint;
  return expectedFingerprint === header.catalogFingerprint
    ? catalog
    : issue("$.catalogFingerprint", "identity-mismatch", "Catalog fingerprint does not match definitions");
}

function validateRuns(
  values: readonly unknown[],
  catalog: ValidatedCatalog
): ValidationResult<ValidatedRuns> {
  const runs: CheckRun[] = [];
  const byCheckId = new Map<string, CheckRun>();
  for (let index = 0; index < values.length; index += 1) {
    const validated = validateMaterializedCheckRun(values[index]);
    if (!validated.ok) {
      return issue(`$.runs[${index}]`, validated.issues[0].code, validated.issues[0].message);
    }
    if (!catalog.checkIds.has(validated.value.checkId) || byCheckId.has(validated.value.checkId)) {
      return issue(`$.runs[${index}].checkId`, "identity-mismatch", "Each definition requires exactly one owned run");
    }
    byCheckId.set(validated.value.checkId, validated.value);
    runs.push(validated.value);
  }
  if (byCheckId.size !== catalog.definitions.length) {
    return issue("$.runs", "missing-field", "Each definition requires exactly one run");
  }
  return accepted({ runs, byCheckId });
}

function validateRecords(
  values: readonly unknown[],
  catalog: ValidatedCatalog,
  runs: ValidatedRuns
): ValidationResult<readonly QualityRecord[]> {
  const records: QualityRecord[] = [];
  const recordIds = new Set<string>();
  for (let index = 0; index < values.length; index += 1) {
    const rawRecord = values[index];
    const definition = isRecord(rawRecord)
      ? catalog.definitions.find((candidate) => candidate.checkId === rawRecord.checkId)
      : undefined;
    if (definition === undefined) {
      return issue(`$.records[${index}].checkId`, "identity-mismatch", "Record has no owning definition");
    }
    const validated = validateMaterializedQualityRecord(rawRecord, definition);
    if (!validated.ok) {
      return issue(`$.records[${index}]`, validated.issues[0].code, validated.issues[0].message);
    }
    const run = runs.byCheckId.get(validated.value.checkId);
    if (run === undefined) {
      return issue(`$.records[${index}].checkRunId`, "identity-mismatch", "Record has no owning run");
    }
    if (validated.value.checkRunId !== run.checkRunId || run.applicability !== "applicable") {
      return issue(`$.records[${index}].checkRunId`, "identity-mismatch", "Record has no applicable owning run");
    }
    if (recordIds.has(validated.value.recordId)) {
      return issue(`$.records[${index}].recordId`, "duplicate", "Trusted records require unique recordIds");
    }
    recordIds.add(validated.value.recordId);
    records.push(validated.value);
  }
  return accepted(records);
}

function ownsRecordType(
  definitions: readonly CheckDefinition[],
  checkId: string,
  recordTypeId: string
): boolean {
  return definitions.find((definition) => definition.checkId === checkId)
    ?.recordTypes.some((recordType) => recordType.recordTypeId === recordTypeId) === true;
}

function validateConflictOwnership(
  conflicts: readonly RecordConflictEvidence[],
  catalog: ValidatedCatalog,
  runs: ValidatedRuns,
  recordIds: ReadonlySet<string>
): ValidationResult<null> {
  for (const conflict of conflicts) {
    const run = runs.byCheckId.get(conflict.checkId);
    if (run?.checkRunId !== conflict.checkRunId || run.status !== "failed"
      || !ownsRecordType(catalog.definitions, conflict.checkId, conflict.recordTypeId)
      || recordIds.has(conflict.recordId)) {
      return issue("$.integrity.conflicts", "identity-mismatch", "Conflict evidence has no failed run and record-type owner");
    }
  }
  return accepted(null);
}

function validateInvalidRecordOwnership(
  integrity: SnapshotIntegrity,
  catalog: ValidatedCatalog,
  runs: ValidatedRuns
): ValidationResult<null> {
  for (const invalidRecord of integrity.invalidRecords) {
    const run = runs.byCheckId.get(invalidRecord.checkId);
    if (run?.checkRunId !== invalidRecord.checkRunId || run.status !== "failed"
      || !ownsRecordType(catalog.definitions, invalidRecord.checkId, invalidRecord.recordTypeId)) {
      return issue("$.integrity.invalidRecords", "identity-mismatch", "Invalid-record evidence has no failed run and record-type owner");
    }
  }
  return accepted(null);
}

function validateIntegrityOwnership(
  integrity: SnapshotIntegrity,
  catalog: ValidatedCatalog,
  runs: ValidatedRuns,
  records: readonly QualityRecord[]
): ValidationResult<null> {
  const recordIds = new Set(records.map((record) => record.recordId));
  const conflicts = validateConflictOwnership(integrity.conflicts, catalog, runs, recordIds);
  return conflicts.ok
    ? validateInvalidRecordOwnership(integrity, catalog, runs)
    : conflicts;
}

function validatePrimaryConflictDiagnostic(
  run: CheckRun,
  primaryRecordId: string
): ValidationResult<null> {
  if (run.status !== "failed" || run.diagnostic.category !== "record-conflict"
    || run.diagnostic.tieBreakKey !== primaryRecordId) {
    return issue("$.runs", "identity-mismatch", "Run diagnostic does not identify its primary conflict evidence");
  }
  return accepted(null);
}

function validatePrimaryInvalidRecordDiagnostic(
  run: CheckRun,
  primaryEvidenceId: string
): ValidationResult<null> {
  if (run.status !== "failed" || run.diagnostic.category !== "invalid-record"
    || run.diagnostic.tieBreakKey !== primaryEvidenceId) {
    return issue("$.runs", "identity-mismatch", "Run diagnostic does not identify its primary invalid-record evidence");
  }
  return accepted(null);
}

function validateUnbackedIntegrityDiagnostic(run: CheckRun): ValidationResult<null> {
  if (run.status === "failed"
    && (run.diagnostic.category === "record-conflict" || run.diagnostic.category === "invalid-record")) {
    return issue("$.runs", "identity-mismatch", "Record-integrity diagnostic requires corresponding evidence");
  }
  return accepted(null);
}

function validateRunEvidenceDiagnostic(
  run: CheckRun,
  integrity: SnapshotIntegrity
): ValidationResult<null> {
  const conflicts = integrity.conflicts.filter((evidence) => evidence.checkId === run.checkId);
  if (conflicts.length > 0) {
    return validatePrimaryConflictDiagnostic(run, conflicts[0]!.recordId);
  }
  const invalidRecords = integrity.invalidRecords.filter((evidence) => evidence.checkId === run.checkId);
  return invalidRecords.length > 0
    ? validatePrimaryInvalidRecordDiagnostic(run, invalidRecords[0]!.evidenceId)
    : validateUnbackedIntegrityDiagnostic(run);
}

function validateRunEvidenceDiagnostics(
  runs: readonly CheckRun[],
  integrity: SnapshotIntegrity
): ValidationResult<null> {
  for (const run of runs) {
    const validated = validateRunEvidenceDiagnostic(run, integrity);
    if (!validated.ok) {
      return validated;
    }
  }
  return accepted(null);
}

export function validateMaterializedFinalCoreSnapshot(
  value: unknown
): ValidationResult<FinalCoreSnapshot> {
  const header = validateSnapshotHeader(value);
  if (!header.ok) return header;
  const catalog = validateCatalog(header.value);
  if (!catalog.ok) return catalog;
  const runs = validateRuns(header.value.runs, catalog.value);
  if (!runs.ok) return runs;
  const records = validateRecords(header.value.records, catalog.value, runs.value);
  if (!records.ok) return records;
  const integrity = validateIntegrity(header.value.integrity);
  if (!integrity.ok) return integrity;
  const ownership = validateIntegrityOwnership(integrity.value, catalog.value, runs.value, records.value);
  if (!ownership.ok) return ownership;
  const diagnostics = validateRunEvidenceDiagnostics(runs.value.runs, integrity.value);
  if (!diagnostics.ok) return diagnostics;
  const completeness = validateCompleteness(header.value.completeness, runs.value.runs);
  if (!completeness.ok) return completeness;
  return acceptedDomain({
    catalogFingerprint: header.value.catalogFingerprint,
    definitions: [...catalog.value.definitions].sort(
      (left, right) => compareCanonicalText(left.checkId, right.checkId)
    ),
    runs: [...runs.value.runs].sort(
      (left, right) => compareCanonicalText(left.checkId, right.checkId)
    ),
    records: [...records.value].sort(
      (left, right) => compareCanonicalText(left.recordId, right.recordId)
    ),
    integrity: integrity.value,
    completeness: completeness.value
  });
}
