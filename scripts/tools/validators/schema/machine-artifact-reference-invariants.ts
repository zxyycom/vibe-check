import { isCanonical, referenceEvidenceKey, relationKey } from "./machine-artifact-canonical.ts";
import { setFailure } from "./machine-artifact-diagnostics.ts";
import {
  RUN_ARTIFACT,
  type DocsMachineValidationFailure,
  type RecordShape,
  type RunShape
} from "./machine-artifact-types.ts";

export function validateReferences(
  run: RunShape,
  records: readonly RecordShape[],
  artifactRoot: string
): DocsMachineValidationFailure | null {
  return (
    validateReferenceCanonicalOrder(run, artifactRoot) ??
    validateReferenceIdentities(run, artifactRoot) ??
    validateReferenceEvidence(run, artifactRoot) ??
    validateReferenceRelations(run, records, artifactRoot)
  );
}

function validateReferenceCanonicalOrder(
  run: RunShape,
  artifactRoot: string
): DocsMachineValidationFailure | null {
  const { evidence, identities, relations } = run.references;
  if (
    isCanonical(identities, ({ referenceName }) => referenceName) &&
    isCanonical(evidence, referenceEvidenceKey) &&
    isCanonical(relations, relationKey)
  )
    return null;
  return setFailure(artifactRoot, RUN_ARTIFACT, {
    message: "Reference arrays must use canonical unique order.",
    pointer: "/references",
    relationship: "reference-canonical-order"
  });
}

function validateReferenceIdentities(
  run: RunShape,
  artifactRoot: string
): DocsMachineValidationFailure | null {
  const identities = run.references.identities;
  if (new Set(identities.map(({ referenceId }) => referenceId)).size === identities.length) {
    return null;
  }
  return setFailure(artifactRoot, RUN_ARTIFACT, {
    message: "Reference names and identities must both be unique.",
    pointer: "/references/identities",
    relationship: "reference-identity"
  });
}

function validateReferenceEvidence(
  run: RunShape,
  artifactRoot: string
): DocsMachineValidationFailure | null {
  const referenceNames = new Set(
    run.references.identities.map(({ referenceName }) => referenceName)
  );
  const checkIds = new Set(run.checks.map(({ checkId }) => checkId));
  const hasUnknownPair = run.references.evidence.some(
    (item) => !referenceNames.has(item.referenceName) || !checkIds.has(item.checkId)
  );
  if (!hasUnknownPair) return null;
  return setFailure(artifactRoot, RUN_ARTIFACT, {
    message: "Reference evidence requires a published Check/reference pair.",
    pointer: "/references/evidence",
    relationship: "reference-evidence"
  });
}

function validateReferenceRelations(
  run: RunShape,
  records: readonly RecordShape[],
  artifactRoot: string
): DocsMachineValidationFailure | null {
  const evidencePairs = new Map(
    run.references.evidence.map((item) => [referenceEvidenceKey(item), item])
  );
  for (const relation of run.references.relations) {
    const record = records.find(({ recordId }) => recordId === relation.recordId);
    const recordType = run.checks
      .find(({ checkId }) => checkId === record?.checkId)
      ?.recordTypes.find(({ recordTypeId }) => recordTypeId === record?.recordTypeId);
    const pair =
      record === undefined
        ? undefined
        : evidencePairs.get(`${record.checkId}\u0000${relation.referenceName}`);
    if (
      record !== undefined &&
      pair?.status === "complete" &&
      recordType?.policy?.relations.includes(relation.relationId)
    )
      continue;
    return setFailure(artifactRoot, RUN_ARTIFACT, {
      message: "Reference relation must bind a record to registered complete evidence.",
      pointer: "/references/relations",
      relationship: "reference-relation"
    });
  }
  return null;
}
