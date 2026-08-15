import type {
  CheckDefinition,
  FinalCoreSnapshot,
  QualityRecord
} from "../../check-record/model.ts";
import {
  validateFinalCoreSnapshot,
  type ValidationIssue
} from "../../check-record/validation.ts";
import {
  collectDecisionReferences,
  validateDecisionReferences,
  validateDecisionState,
  type DecisionReferenceIndex
} from "./decision-invariants.ts";
import type { MachineRecordV2, MachineRunV2 } from "./schema.ts";
import { isCanonical } from "./validation-order.ts";
import {
  setInvariantFailure,
  type MachinePublicationValidationResult,
  type ValidationFailure
} from "./validation-result.ts";

interface PublicationInvariantIndex extends DecisionReferenceIndex {
  readonly definitions: readonly CheckDefinition[];
  readonly records: readonly MachineRecordV2[];
}

export function validatePublicationInvariants(
  run: MachineRunV2,
  records: readonly MachineRecordV2[]
): ValidationFailure | null {
  const definitions = run.definitions as readonly CheckDefinition[];
  const coreIssue = validateCoreSnapshot(run, records, definitions);
  if (coreIssue !== null) return coreIssue;

  const recordOrderIssue = validateRecordOrder(records);
  if (recordOrderIssue !== null) return recordOrderIssue;

  const index = buildPublicationInvariantIndex(run, records, definitions);
  const decisionRefIssue = validateDecisionReferences(collectDecisionReferences(run), index);
  if (decisionRefIssue !== null) return decisionRefIssue;

  const referencedRecordIssue = validateReferencedRecords(run, index.recordIds);
  if (referencedRecordIssue !== null) return referencedRecordIssue;

  const referenceIdentityIssue = validateReferenceIdentities(run, index);
  if (referenceIdentityIssue !== null) return referenceIdentityIssue;

  const relationIssue = validateReferenceRelations(run, index);
  if (relationIssue !== null) return relationIssue;

  return validateDecisionState(run);
}

function validateCoreSnapshot(
  run: MachineRunV2,
  records: readonly MachineRecordV2[],
  definitions: readonly CheckDefinition[]
): ValidationFailure | null {
  const coreSnapshot = validateFinalCoreSnapshot({
    catalogFingerprint: run.catalogFingerprint,
    definitions,
    runs: run.runs,
    records: records.map(stripRecordSchemaVersion),
    integrity: run.integrity,
    completeness: run.completeness
  } satisfies FinalCoreSnapshot);
  return coreSnapshot.ok ? null : coreSnapshotFailure(coreSnapshot.issues[0]);
}

function validateRecordOrder(records: readonly MachineRecordV2[]): ValidationFailure | null {
  for (const [index, record] of records.entries()) {
    if (index > 0 && records[index - 1]!.recordId >= record.recordId) {
      return setInvariantFailure(
        "record-canonical-order",
        "records.ndjson",
        "Records must be uniquely sorted by recordId.",
        index
      );
    }
  }
  return null;
}

function buildPublicationInvariantIndex(
  run: MachineRunV2,
  records: readonly MachineRecordV2[],
  definitions: readonly CheckDefinition[]
): PublicationInvariantIndex {
  return {
    definitions,
    records,
    recordIds: new Set(records.map((record) => record.recordId)),
    runIds: new Set(run.runs.map((checkRun) => checkRun.checkRunId)),
    viewIds: new Set(run.decision.views.map((view) => view.viewId)),
    readinessIds: new Set(run.decision.readiness.map((evidence) => evidence.readinessId)),
    referencesByName: new Map(run.references.identities.map((identity) => [
      identity.referenceName,
      identity
    ])),
    definitionIds: new Set(definitions.map((definition) => definition.checkId)),
    referenceEvidencePairs: new Set(run.references.evidence.map(referenceEvidenceKey))
  };
}

function validateReferencedRecords(
  run: MachineRunV2,
  recordIds: ReadonlySet<string>
): ValidationFailure | null {
  const referencedRecordIds = [
    ...run.acceptance.map((evidence) => evidence.recordId),
    ...run.references.relations.map((relation) => relation.recordId),
    ...run.decision.views.flatMap((view) => view.recordIds),
    ...(run.decision.blockWhen?.blockingRecordIds ?? []),
    ...(run.decision.gate.status === "passed" || run.decision.gate.status === "failed"
      ? run.decision.gate.blockingRecordIds
      : [])
  ];
  return referencedRecordIds.some((recordId) => !recordIds.has(recordId))
    ? setInvariantFailure(
      "decision-record-reference",
      "run.json",
      "Decision references an unknown record."
    )
    : null;
}

function validateReferenceIdentities(
  run: MachineRunV2,
  index: PublicationInvariantIndex
): ValidationFailure | null {
  const referenceIds = new Set(run.references.identities.map((identity) => identity.referenceId));
  if (index.referencesByName.size !== run.references.identities.length
    || referenceIds.size !== run.references.identities.length) {
    return setInvariantFailure(
      "reference-identity",
      "run.json",
      "Reference evidence requires one published identity."
    );
  }
  if (!isCanonical(run.references.identities, (identity) => identity.referenceName)
    || !isCanonical(run.references.evidence, referenceEvidenceKey)
    || !isCanonical(run.references.relations, relationKey)) {
    return setInvariantFailure(
      "reference-canonical-order",
      "run.json",
      "Reference arrays must use canonical unique order."
    );
  }
  const hasUnknownEvidence = run.references.evidence.some((evidence) => (
    !index.referencesByName.has(evidence.referenceName)
      || !index.definitionIds.has(evidence.checkId)
  ));
  return hasUnknownEvidence
    ? setInvariantFailure(
      "reference-evidence",
      "run.json",
      "Reference evidence requires a published Check/reference pair."
    )
    : null;
}

function validateReferenceRelations(
  run: MachineRunV2,
  index: PublicationInvariantIndex
): ValidationFailure | null {
  for (const relation of run.references.relations) {
    const record = index.records.find((candidate) => candidate.recordId === relation.recordId);
    const recordType = index.definitions
      .find((definition) => definition.checkId === record?.checkId)
      ?.recordTypes.find((candidate) => candidate.recordTypeId === record?.recordTypeId);
    const evidence = run.references.evidence.find((candidate) => (
      candidate.checkId === record?.checkId && candidate.referenceName === relation.referenceName
    ));
    if (record === undefined || !index.referencesByName.has(relation.referenceName)
      || !index.referenceEvidencePairs.has(`${record.checkId}\u0000${relation.referenceName}`)
      || evidence?.status !== "complete"
      || !recordType?.policy?.relations.includes(relation.relationId)) {
      return setInvariantFailure(
        "reference-relation",
        "run.json",
        "Reference relation is not bound to registered complete evidence."
      );
    }
  }
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

function referenceEvidenceKey(
  evidence: MachineRunV2["references"]["evidence"][number]
): string {
  return `${evidence.checkId}\u0000${evidence.referenceName}`;
}

function relationKey(relation: MachineRunV2["references"]["relations"][number]): string {
  return `${relation.recordId}\u0000${relation.referenceName}`;
}

function coreSnapshotFailure(
  issue: ValidationIssue | undefined
): Extract<MachinePublicationValidationResult, { ok: false }> {
  const logicalArtifact = issue?.path.includes("records")
    ? "records.ndjson"
    : "run.json";
  if (issue?.path.includes("catalogFingerprint")) {
    return setInvariantFailure("catalog-fingerprint", logicalArtifact, issue.message);
  }
  if (issue?.path.includes("runs") && issue.code === "missing-field") {
    return setInvariantFailure("catalog-run-membership", logicalArtifact, issue.message);
  }
  if (issue?.path.includes("records") && issue.path.includes("recordId")) {
    return setInvariantFailure("record-identity", logicalArtifact, issue.message);
  }
  if (issue?.path.includes("records")) {
    return setInvariantFailure("record-run-ownership", logicalArtifact, issue.message);
  }
  return setInvariantFailure(
    "core-snapshot",
    logicalArtifact,
    issue?.message ?? "Final Core snapshot is invalid."
  );
}
