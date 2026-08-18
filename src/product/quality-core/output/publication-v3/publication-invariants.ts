import { createCatalogFingerprint } from "../../check-record/identity.ts";
import type { CheckDefinition, QualityRecord } from "../../check-record/model.ts";
import { validateCoreSnapshot, type ValidationIssue } from "../../check-record/validation.ts";
import {
  collectDecisionReferences,
  validateDecisionReferences,
  validateDecisionState,
  type DecisionReferenceIndex
} from "./decision-invariants.ts";
import { createRecordsFingerprintV3 } from "./records-fingerprint.ts";
import type { MachineRecordV3, MachineRunV3 } from "./schema.ts";
import { isCanonical } from "./validation-order.ts";
import {
  setInvariantFailure,
  type MachinePublicationValidationResult,
  type ValidationFailure
} from "./validation-result.ts";

interface PublicationInvariantIndex extends DecisionReferenceIndex {
  readonly checks: readonly CheckDefinition[];
  readonly records: readonly MachineRecordV3[];
}

export function validatePublicationInvariants(
  run: MachineRunV3,
  records: readonly MachineRecordV3[]
): ValidationFailure | null {
  const catalogIssue = validateCatalogFingerprint(run);
  if (catalogIssue !== null) return catalogIssue;

  const coreIssue = validateProjectedCoreSnapshot(run, records);
  if (coreIssue !== null) return coreIssue;

  const recordOrderIssue = validateRecordOrder(records);
  if (recordOrderIssue !== null) return recordOrderIssue;

  const recordsFingerprintIssue = validateRecordsFingerprint(run, records);
  if (recordsFingerprintIssue !== null) return recordsFingerprintIssue;

  const index = buildPublicationInvariantIndex(run, records);
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

function validateRecordsFingerprint(
  run: MachineRunV3,
  records: readonly MachineRecordV3[]
): ValidationFailure | null {
  return createRecordsFingerprintV3(records) === run.recordsFingerprint
    ? null
    : setInvariantFailure(
        "records-fingerprint",
        "records.ndjson",
        "Records fingerprint must match the complete canonical Record row set."
      );
}

function validateCatalogFingerprint(run: MachineRunV3): ValidationFailure | null {
  const expected = createCatalogFingerprint(run.checks).catalogFingerprint;
  return expected === run.catalogFingerprint
    ? null
    : setInvariantFailure(
        "catalog-fingerprint",
        "run.json",
        "Catalog fingerprint must match the published Check projections."
      );
}

function validateProjectedCoreSnapshot(
  run: MachineRunV3,
  records: readonly MachineRecordV3[]
): ValidationFailure | null {
  const coreSnapshot = validateCoreSnapshot({
    checks: run.checks,
    records: records.map(stripRecordSchemaVersion)
  });
  return coreSnapshot.ok ? null : coreSnapshotFailure(coreSnapshot.issues[0]);
}

function validateRecordOrder(records: readonly MachineRecordV3[]): ValidationFailure | null {
  let previousRecordId: string | undefined;
  for (const [index, record] of records.entries()) {
    if (previousRecordId !== undefined && previousRecordId >= record.recordId) {
      return setInvariantFailure(
        "record-canonical-order",
        "records.ndjson",
        "Records must be uniquely sorted by recordId.",
        index
      );
    }
    previousRecordId = record.recordId;
  }
  return null;
}

function buildPublicationInvariantIndex(
  run: MachineRunV3,
  records: readonly MachineRecordV3[]
): PublicationInvariantIndex {
  return {
    checks: run.checks,
    records,
    checkIds: new Set(run.checks.map((check) => check.checkId)),
    recordIds: new Set(records.map((record) => record.recordId)),
    viewIds: new Set(run.decision.views.map((view) => view.viewId)),
    readinessIds: new Set(run.decision.readiness.map((evidence) => evidence.readinessId)),
    referencesByName: new Map(
      run.references.identities.map((identity) => [identity.referenceName, identity])
    ),
    referenceEvidencePairs: new Set(run.references.evidence.map(referenceEvidenceKey))
  };
}

function validateReferencedRecords(
  run: MachineRunV3,
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
  run: MachineRunV3,
  index: PublicationInvariantIndex
): ValidationFailure | null {
  const referenceIds = new Set(run.references.identities.map((identity) => identity.referenceId));
  if (
    index.referencesByName.size !== run.references.identities.length ||
    referenceIds.size !== run.references.identities.length
  ) {
    return setInvariantFailure(
      "reference-identity",
      "run.json",
      "Reference evidence requires one published identity."
    );
  }
  if (
    !isCanonical(run.references.identities, (identity) => identity.referenceName) ||
    !isCanonical(run.references.evidence, referenceEvidenceKey) ||
    !isCanonical(run.references.relations, relationKey)
  ) {
    return setInvariantFailure(
      "reference-canonical-order",
      "run.json",
      "Reference arrays must use canonical unique order."
    );
  }
  const hasUnknownEvidence = run.references.evidence.some(
    (evidence) =>
      !index.referencesByName.has(evidence.referenceName) || !index.checkIds.has(evidence.checkId)
  );
  return hasUnknownEvidence
    ? setInvariantFailure(
        "reference-evidence",
        "run.json",
        "Reference evidence requires a published Check/reference pair."
      )
    : null;
}

function validateReferenceRelations(
  run: MachineRunV3,
  index: PublicationInvariantIndex
): ValidationFailure | null {
  for (const relation of run.references.relations) {
    const record = index.records.find((candidate) => candidate.recordId === relation.recordId);
    const recordType = index.checks
      .find((check) => check.checkId === record?.checkId)
      ?.recordTypes.find((candidate) => candidate.recordTypeId === record?.recordTypeId);
    const evidence = run.references.evidence.find(
      (candidate) =>
        candidate.checkId === record?.checkId && candidate.referenceName === relation.referenceName
    );
    if (
      record === undefined ||
      !index.referencesByName.has(relation.referenceName) ||
      !index.referenceEvidencePairs.has(`${record.checkId}\u0000${relation.referenceName}`) ||
      evidence?.status !== "complete" ||
      !recordType?.policy?.relations.includes(relation.relationId)
    ) {
      return setInvariantFailure(
        "reference-relation",
        "run.json",
        "Reference relation is not bound to registered complete evidence."
      );
    }
  }
  return null;
}

function stripRecordSchemaVersion(record: MachineRecordV3): QualityRecord {
  return {
    recordId: record.recordId,
    checkId: record.checkId,
    recordTypeId: record.recordTypeId,
    level: record.level,
    semanticSubject: record.semanticSubject,
    message: record.message,
    fields: record.fields,
    location: record.location
  };
}

function referenceEvidenceKey(evidence: MachineRunV3["references"]["evidence"][number]): string {
  return `${evidence.checkId}\u0000${evidence.referenceName}`;
}

function relationKey(relation: MachineRunV3["references"]["relations"][number]): string {
  return `${relation.recordId}\u0000${relation.referenceName}`;
}

function coreSnapshotFailure(
  issue: ValidationIssue | undefined
): Extract<MachinePublicationValidationResult, { ok: false }> {
  const logicalArtifact = issue?.path.includes("records") ? "records.ndjson" : "run.json";
  if (issue?.path.includes("records") && issue.path.includes("recordId")) {
    return setInvariantFailure("record-identity", logicalArtifact, issue.message);
  }
  if (issue?.path.includes("records")) {
    return setInvariantFailure("record-check-ownership", logicalArtifact, issue.message);
  }
  return setInvariantFailure(
    "core-snapshot",
    logicalArtifact,
    issue?.message ?? "Core snapshot is invalid."
  );
}
