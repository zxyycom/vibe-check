import Value from "typebox/value";

import type {
  CheckDefinition,
  FinalCoreSnapshot,
  QualityRecord
} from "../../check-record/model.ts";
import type { EvidenceRef } from "../../check-record/policy-model.ts";
import {
  validateFinalCoreSnapshot,
  type ValidationIssue
} from "../../check-record/validation.ts";
import type { MachinePublicationV2 } from "./mapper.ts";
import {
  MACHINE_RECORD_V2_SCHEMA,
  MACHINE_RUN_V2_SCHEMA,
  type MachineRecordV2,
  type MachineRunV2
} from "./schema.ts";

export type MachinePublicationValidationCategory =
  | "decoding"
  | "framing"
  | "schema"
  | "set-invariant"
  | "syntax";

export type MachinePublicationSetRelationship =
  | "catalog-fingerprint"
  | "catalog-run-membership"
  | "decision-record-reference"
  | "decision-run-reference"
  | "decision-view-reference"
  | "decision-readiness-reference"
  | "decision-reference-reference"
  | "decision-canonical-order"
  | "decision-state"
  | "core-snapshot"
  | "record-canonical-order"
  | "record-identity"
  | "record-run-ownership"
  | "reference-canonical-order"
  | "reference-evidence"
  | "reference-identity"
  | "reference-relation";

export interface MachinePublicationValidationDiagnostic {
  readonly category: MachinePublicationValidationCategory;
  readonly index?: number;
  readonly line?: number;
  readonly logicalArtifact: "records.ndjson" | "run.json";
  readonly message: string;
  readonly pointer?: string;
  readonly relationship?: MachinePublicationSetRelationship;
}

export type MachinePublicationValidationResult = Readonly<
  | { ok: false; diagnostic: MachinePublicationValidationDiagnostic }
  | { ok: true; value: MachinePublicationV2 }
>;

export function validateMachinePublicationSetV2(input: Readonly<{
  recordsNdjson: Uint8Array;
  runJson: Uint8Array;
}>): MachinePublicationValidationResult {
  const runResult = parseRun(input.runJson);
  if (!runResult.ok) return runResult;
  const recordsResult = parseRecords(input.recordsNdjson);
  if (!recordsResult.ok) return recordsResult;
  const invariant = validateInvariants(runResult.value, recordsResult.value);
  return invariant ?? success(Object.freeze({
    run: deepFreeze(runResult.value),
    records: deepFreeze(recordsResult.value)
  }));
}

type Parsed<Value> = Readonly<
  | { ok: false; diagnostic: MachinePublicationValidationDiagnostic }
  | { ok: true; value: Value }
>;

function parseRun(bytes: Uint8Array): Parsed<MachineRunV2> {
  const decoded = decode(bytes, "run.json");
  if (!decoded.ok) return decoded;
  let value: unknown;
  try {
    value = JSON.parse(decoded.value) as unknown;
  } catch {
    return failure({
      category: "syntax",
      logicalArtifact: "run.json",
      message: "Run artifact must contain exactly one JSON value."
    });
  }
  if (!Value.Check(MACHINE_RUN_V2_SCHEMA, value)) {
    const error = Value.Errors(MACHINE_RUN_V2_SCHEMA, value)[0];
    return failure({
      category: "schema",
      logicalArtifact: "run.json",
      message: "Run artifact does not match the machine run v2 schema.",
      pointer: error?.instancePath ?? ""
    });
  }
  return success(value);
}

function parseRecords(bytes: Uint8Array): Parsed<MachineRecordV2[]> {
  if (bytes.byteLength === 0) return success([]);
  if (bytes[bytes.byteLength - 1] !== 0x0a) {
    return failure({
      category: "framing",
      line: countLf(bytes) + 1,
      logicalArtifact: "records.ndjson",
      message: "Non-empty record stream must end with exactly one LF."
    });
  }
  const decoded = decode(bytes, "records.ndjson");
  if (!decoded.ok) return decoded;
  const segments = decoded.value.slice(0, -1).split("\n");
  const records: MachineRecordV2[] = [];
  for (const [index, segment] of segments.entries()) {
    if (segment.length === 0 || /^[\t\r ]+$/.test(segment)) {
      return failure({
        category: "framing",
        index,
        line: index + 1,
        logicalArtifact: "records.ndjson",
        message: "Record segment must not be empty or whitespace-only."
      });
    }
    let value: unknown;
    try {
      value = JSON.parse(segment) as unknown;
    } catch {
      return failure({
        category: "syntax",
        index,
        line: index + 1,
        logicalArtifact: "records.ndjson",
        message: "Record segment must contain exactly one JSON value."
      });
    }
    if (!Value.Check(MACHINE_RECORD_V2_SCHEMA, value)) {
      const error = Value.Errors(MACHINE_RECORD_V2_SCHEMA, value)[0];
      return failure({
        category: "schema",
        index,
        line: index + 1,
        logicalArtifact: "records.ndjson",
        message: "Record does not match the machine record v2 schema.",
        pointer: error?.instancePath ?? ""
      });
    }
    records.push(value);
  }
  return success(records);
}

function validateInvariants(
  run: MachineRunV2,
  records: readonly MachineRecordV2[]
): Extract<MachinePublicationValidationResult, { ok: false }> | null {
  const definitions = run.definitions as readonly CheckDefinition[];
  const coreSnapshot = validateFinalCoreSnapshot({
    catalogFingerprint: run.catalogFingerprint,
    definitions,
    runs: run.runs,
    records: records.map(stripRecordSchemaVersion),
    integrity: run.integrity,
    completeness: run.completeness
  } satisfies FinalCoreSnapshot);
  if (!coreSnapshot.ok) {
    const issue = coreSnapshot.issues[0];
    return coreSnapshotFailure(issue);
  }
  for (const [index, record] of records.entries()) {
    if (index > 0 && records[index - 1]!.recordId >= record.recordId) {
      return setFailure(
        "record-canonical-order",
        "records.ndjson",
        "Records must be uniquely sorted by recordId.",
        index
      );
    }
  }
  const recordIds = new Set(records.map((record) => record.recordId));
  const runIds = new Set(run.runs.map((checkRun) => checkRun.checkRunId));
  const viewIds = new Set(run.decision.views.map((view) => view.viewId));
  const readinessIds = new Set(run.decision.readiness.map((evidence) => evidence.readinessId));
  const referencesByName = new Map(run.references.identities.map((identity) => [
    identity.referenceName,
    identity
  ]));
  const definitionIds = new Set(definitions.map((definition) => definition.checkId));
  const evidencePairs = new Set(run.references.evidence.map(referenceEvidenceKey));
  const refIssue = validateDecisionRefs(
    decisionRefs(run),
    recordIds,
    runIds,
    viewIds,
    readinessIds,
    referencesByName,
    definitionIds,
    evidencePairs
  );
  if (refIssue !== null) return refIssue;
  const referencedRecordIds = [
    ...run.acceptance.map((evidence) => evidence.recordId),
    ...run.references.relations.map((relation) => relation.recordId),
    ...run.decision.views.flatMap((view) => view.recordIds),
    ...(run.decision.blockWhen?.blockingRecordIds ?? []),
    ...(run.decision.gate.status === "passed" || run.decision.gate.status === "failed"
      ? run.decision.gate.blockingRecordIds
      : [])
  ];
  if (referencedRecordIds.some((recordId) => !recordIds.has(recordId))) {
    return setFailure("decision-record-reference", "run.json", "Decision references an unknown record.");
  }
  const referenceIds = new Set(run.references.identities.map((identity) => identity.referenceId));
  if (referencesByName.size !== run.references.identities.length
    || referenceIds.size !== run.references.identities.length) {
    return setFailure("reference-identity", "run.json", "Reference evidence requires one published identity.");
  }
  if (!isCanonical(run.references.identities, (identity) => identity.referenceName)
    || !isCanonical(run.references.evidence, referenceEvidenceKey)
    || !isCanonical(run.references.relations, relationKey)) {
    return setFailure("reference-canonical-order", "run.json", "Reference arrays must use canonical unique order.");
  }
  if (run.references.evidence.some((evidence) => (
    !referencesByName.has(evidence.referenceName) || !definitionIds.has(evidence.checkId)
  ))) {
    return setFailure("reference-evidence", "run.json", "Reference evidence requires a published Check/reference pair.");
  }
  for (const relation of run.references.relations) {
    const record = records.find((candidate) => candidate.recordId === relation.recordId);
    const recordType = definitions
      .find((definition) => definition.checkId === record?.checkId)
      ?.recordTypes.find((candidate) => candidate.recordTypeId === record?.recordTypeId);
    const evidence = run.references.evidence.find((candidate) => (
      candidate.checkId === record?.checkId && candidate.referenceName === relation.referenceName
    ));
    if (record === undefined || !referencesByName.has(relation.referenceName)
      || !evidencePairs.has(`${record.checkId}\u0000${relation.referenceName}`)
      || evidence?.status !== "complete"
      || !recordType?.policy?.relations.includes(relation.relationId)) {
      return setFailure("reference-relation", "run.json", "Reference relation is not bound to registered complete evidence.");
    }
  }
  const decisionIssue = validateDecisionState(run);
  if (decisionIssue !== null) return decisionIssue;
  return null;
}

function stripRecordSchemaVersion(record: MachineRecordV2): QualityRecord {
  return {
    recordId: record.recordId,
    checkId: record.checkId,
    checkRunId: record.checkRunId,
    recordTypeId: record.recordTypeId,
    level: record.level,
    semanticSubject: record.semanticSubject,
    message: record.message,
    fields: record.fields,
    location: record.location
  };
}

function validateDecisionRefs(
  references: readonly EvidenceRef[],
  recordIds: ReadonlySet<string>,
  runIds: ReadonlySet<string>,
  viewIds: ReadonlySet<string>,
  readinessIds: ReadonlySet<string>,
  referencesByName: ReadonlyMap<string, MachineRunV2["references"]["identities"][number]>,
  definitionIds: ReadonlySet<string>,
  referenceEvidencePairs: ReadonlySet<string>
) {
  for (const reference of references) {
    if (reference.kind === "record" && !recordIds.has(reference.recordId)) {
      return setFailure("decision-record-reference", "run.json", "Decision references an unknown record.");
    }
    if (reference.kind === "run" && !runIds.has(reference.checkRunId)) {
      return setFailure("decision-run-reference", "run.json", "Decision references an unknown run.");
    }
    if (reference.kind === "view" && !viewIds.has(reference.viewId)) {
      return setFailure("decision-view-reference", "run.json", "Decision references an unknown view.");
    }
    if (reference.kind === "readiness" && !readinessIds.has(reference.readinessId)) {
      return setFailure("decision-readiness-reference", "run.json", "Decision references unknown readiness evidence.");
    }
    if (reference.kind === "reference") {
      const identity = referencesByName.get(reference.referenceName);
      if (identity?.referenceId !== reference.referenceId
        || !definitionIds.has(reference.checkId)
        || !referenceEvidencePairs.has(`${reference.checkId}\u0000${reference.referenceName}`)) {
        return setFailure("decision-reference-reference", "run.json", "Decision references an unknown Check/reference pair.");
      }
    }
  }
  return null;
}

function validateDecisionState(run: MachineRunV2) {
  const decision = run.decision;
  if (!isCanonical(run.acceptance, (evidence) => `${evidence.recordId}\u0000${evidence.acceptanceId}`)
    || !isCanonical(decision.views, (view) => view.viewId)
    || decision.views.some((view) => !isCanonicalText(view.recordIds))
    || !isCanonical(decision.readiness, (evidence) => evidence.readinessId)
    || decision.readiness.some((evidence) => !isCanonical(evidence.evidenceRefs, evidenceKey))
    || (decision.blockWhen !== null && (
      !isCanonical(decision.blockWhen.evidenceRefs, evidenceKey)
      || !isCanonicalText(decision.blockWhen.blockingRecordIds)
    ))
    || (decision.gate.status !== "disabled" && !isCanonical(decision.gate.evidenceRefs, evidenceKey))
    || ((decision.gate.status === "passed" || decision.gate.status === "failed")
      && !isCanonicalText(decision.gate.blockingRecordIds))) {
    return setFailure("decision-canonical-order", "run.json", "Decision arrays must use canonical unique order.");
  }
  const failedReadiness = decision.readiness
    .map((evidence, index) => ({ evidence, index }))
    .filter(({ evidence }) => evidence.status === "failed");
  if (decision.gate.status === "disabled") {
    if (decision.policyId !== null || decision.readiness.length !== 0 || decision.blockWhen !== null) {
      return setFailure("decision-state", "run.json", "Disabled decision state is inconsistent.");
    }
    return null;
  }
  if (decision.policyId === null || decision.gate.policyId !== decision.policyId) {
    return setFailure("decision-state", "run.json", "Gate policy identity is inconsistent.");
  }
  if (decision.gate.status === "not-evaluated") {
    const failed = failedReadiness[0];
    if (failedReadiness.length !== 1 || failed === undefined
      || failed.index !== decision.readiness.length - 1
      || decision.blockWhen !== null
      || failed.evidence.status !== "failed"
      || failed.evidence.reason !== decision.gate.reason
      || !sameEvidence(
        decision.gate.evidenceRefs,
        readinessEvidencePrefix(decision.readiness.slice(0, failed.index + 1))
      )) {
      return setFailure("decision-state", "run.json", "Not-evaluated gate does not close readiness evidence.");
    }
    return null;
  }
  if (failedReadiness.length !== 0 || decision.blockWhen === null
    || (decision.gate.status === "failed") !== (decision.blockWhen.status === "matched")
    || !sameText(decision.gate.blockingRecordIds, decision.blockWhen.blockingRecordIds)
    || !sameEvidence(decision.gate.evidenceRefs, [
      ...readinessEvidencePrefix(decision.readiness),
      ...decision.blockWhen.evidenceRefs
    ])) {
    return setFailure("decision-state", "run.json", "Evaluated gate does not close readiness and blockWhen evidence.");
  }
  return null;
}

function decisionRefs(run: MachineRunV2) {
  return [
    ...run.decision.readiness.flatMap((evidence) => evidence.evidenceRefs),
    ...(run.decision.blockWhen?.evidenceRefs ?? []),
    ...(run.decision.gate.status === "disabled" ? [] : run.decision.gate.evidenceRefs)
  ];
}

function evidenceKey(reference: EvidenceRef): string {
  if (reference.kind === "run") return `0\u0000${reference.checkRunId}`;
  if (reference.kind === "record") return `1\u0000${reference.recordId}`;
  if (reference.kind === "reference") {
    return `2\u0000${reference.checkId}\u0000${reference.referenceName}\u0000${reference.referenceId}`;
  }
  if (reference.kind === "view") return `3\u0000${reference.viewId}`;
  return `4\u0000${reference.readinessId}`;
}

function referenceEvidenceKey(evidence: MachineRunV2["references"]["evidence"][number]) {
  return `${evidence.checkId}\u0000${evidence.referenceName}`;
}

function relationKey(relation: MachineRunV2["references"]["relations"][number]) {
  return `${relation.recordId}\u0000${relation.referenceName}`;
}

function readinessEvidencePrefix(readiness: MachineRunV2["decision"]["readiness"]) {
  return canonicalEvidence(readiness.flatMap((evidence) => evidence.evidenceRefs));
}

function canonicalEvidence(references: readonly EvidenceRef[]): readonly EvidenceRef[] {
  return [...new Map(references.map((reference) => [evidenceKey(reference), reference])).entries()]
    .sort(([left], [right]) => compareText(left, right))
    .map(([, reference]) => reference);
}

function sameEvidence(left: readonly EvidenceRef[], right: readonly EvidenceRef[]): boolean {
  return sameText(left.map(evidenceKey), canonicalEvidence(right).map(evidenceKey));
}

function sameText(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isCanonicalText(values: readonly string[]): boolean {
  return isCanonical(values, (value) => value);
}

function isCanonical<Value>(values: readonly Value[], key: (value: Value) => string): boolean {
  return values.every((value, index) => index === 0 || key(values[index - 1]!) < key(value));
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function coreSnapshotFailure(
  issue: ValidationIssue | undefined
): Extract<MachinePublicationValidationResult, { ok: false }> {
  const logicalArtifact = issue?.path.includes("records")
    ? "records.ndjson"
    : "run.json";
  if (issue?.path.includes("catalogFingerprint")) {
    return setFailure("catalog-fingerprint", logicalArtifact, issue.message);
  }
  if (issue?.path.includes("runs") && issue.code === "missing-field") {
    return setFailure("catalog-run-membership", logicalArtifact, issue.message);
  }
  if (issue?.path.includes("records") && issue.path.includes("recordId")) {
    return setFailure("record-identity", logicalArtifact, issue.message);
  }
  if (issue?.path.includes("records")) {
    return setFailure("record-run-ownership", logicalArtifact, issue.message);
  }
  return setFailure("core-snapshot", logicalArtifact, issue?.message ?? "Final Core snapshot is invalid.");
}

function decode(
  bytes: Uint8Array,
  logicalArtifact: MachinePublicationValidationDiagnostic["logicalArtifact"]
): Parsed<string> {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return failure({
      category: "decoding",
      logicalArtifact,
      message: "Leading UTF-8 BOM is not allowed."
    });
  }
  try {
    return success(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return failure({ category: "decoding", logicalArtifact, message: "Input is not valid UTF-8." });
  }
}

function countLf(bytes: Uint8Array): number {
  let count = 0;
  for (const byte of bytes) if (byte === 0x0a) count += 1;
  return count;
}

function success<Value>(value: Value): { ok: true; value: Value } {
  return { ok: true, value };
}

function failure(
  diagnostic: MachinePublicationValidationDiagnostic
): { ok: false; diagnostic: MachinePublicationValidationDiagnostic } {
  return { ok: false, diagnostic };
}

function setFailure(
  relationship: MachinePublicationSetRelationship,
  logicalArtifact: MachinePublicationValidationDiagnostic["logicalArtifact"],
  message: string,
  index?: number
): { ok: false; diagnostic: MachinePublicationValidationDiagnostic } {
  return failure({
    category: "set-invariant",
    ...(index === undefined ? {} : { index, line: index + 1 }),
    logicalArtifact,
    message,
    relationship
  });
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
