import { createCatalogFingerprint } from "../../check-record/identity.ts";
import {
  projectHumanStatus,
  type HumanStatusProjection
} from "../../check-record/human-status.ts";
import type {
  CoreSnapshot,
  QualityRecord
} from "../../check-record/model.ts";
import type {
  DecisionEvidence,
  EvidenceRef,
  NamedReferenceIdentity,
  ReferenceFacts
} from "../../check-record/policy-model.ts";
import { validateCoreSnapshot } from "../../check-record/validation.ts";
import { freezePublicationValue } from "./freeze-publication-value.ts";

export interface PublicationInvocationV3 {
  readonly invocationId: string;
  readonly projectRoot: ".";
  readonly timestamp: string;
}

/**
 * The immutable terminal source for every machine and readable projection.
 * `catalogFingerprint` is derived from the validated Check definitions, never
 * supplied as a parallel invocation or Core fact.
 */
export interface ValidatedPublicationModelV3 {
  readonly catalogFingerprint: string;
  readonly decision: DecisionEvidence;
  readonly humanStatus: HumanStatusProjection;
  readonly invocation: PublicationInvocationV3;
  readonly records: readonly QualityRecord[];
  readonly referenceFacts: ReferenceFacts;
  readonly references: readonly NamedReferenceIdentity[];
  readonly snapshot: CoreSnapshot;
  readonly verificationOutput: boolean;
}

interface PublicationEvidenceIndex {
  readonly checkIds: ReadonlySet<string>;
  readonly readinessIds: ReadonlySet<string>;
  readonly recordIds: ReadonlySet<string>;
  readonly referenceEvidencePairs: ReadonlySet<string>;
  readonly referencesByName: ReadonlyMap<string, NamedReferenceIdentity>;
  readonly viewIds: ReadonlySet<string>;
}

export function createPublicationModelV3(input: Readonly<{
  decision: DecisionEvidence;
  humanStatus: HumanStatusProjection;
  invocation: PublicationInvocationV3;
  referenceFacts: ReferenceFacts;
  references: readonly NamedReferenceIdentity[];
  snapshot: CoreSnapshot;
  verificationOutput: boolean;
}>): ValidatedPublicationModelV3 {
  const validatedSnapshot = validateCoreSnapshot(input.snapshot);
  if (!validatedSnapshot.ok) {
    throw new TypeError("Publication requires a valid Core snapshot");
  }
  validateInvocation(input.invocation);
  validatePublicationEvidence(
    validatedSnapshot.value,
    input.references,
    input.referenceFacts,
    input.decision
  );
  validateHumanStatus(
    validatedSnapshot.value,
    input.decision,
    input.humanStatus,
    input.verificationOutput
  );
  return freezePublicationValue({
    catalogFingerprint: createCatalogFingerprint(validatedSnapshot.value.checks).catalogFingerprint,
    invocation: { ...input.invocation },
    snapshot: validatedSnapshot.value,
    records: validatedSnapshot.value.records,
    references: input.references.map((reference) => ({ ...reference })),
    referenceFacts: {
      evidence: input.referenceFacts.evidence.map((evidence) => ({ ...evidence })),
      relations: input.referenceFacts.relations.map((relation) => ({ ...relation }))
    },
    decision: structuredClone(input.decision),
    humanStatus: { ...input.humanStatus },
    verificationOutput: input.verificationOutput
  });
}

function validateHumanStatus(
  snapshot: CoreSnapshot,
  decision: DecisionEvidence,
  humanStatus: HumanStatusProjection,
  verificationOutput: boolean
): void {
  if (typeof verificationOutput !== "boolean") {
    throw new TypeError("Publication verification output selection is invalid");
  }
  const expected = projectHumanStatus({ decision, snapshot, verificationOutput });
  if (humanStatus === null || typeof humanStatus !== "object"
    || humanStatus.normal !== expected.normal
    || humanStatus.verification !== expected.verification
    || humanStatus.selected !== expected.selected) {
    throw new TypeError("Publication human status projection is invalid");
  }
}

function validateInvocation(invocation: PublicationInvocationV3): void {
  if (typeof invocation.invocationId !== "string" || invocation.invocationId.length === 0
    || invocation.projectRoot !== "."
    || typeof invocation.timestamp !== "string"
    || Number.isNaN(Date.parse(invocation.timestamp))) {
    throw new TypeError("Publication invocation metadata is invalid");
  }
}

function validatePublicationEvidence(
  snapshot: CoreSnapshot,
  references: readonly NamedReferenceIdentity[],
  referenceFacts: ReferenceFacts,
  decision: DecisionEvidence
): void {
  const index = buildPublicationEvidenceIndex(snapshot, references, referenceFacts, decision);
  if (index.referencesByName.size !== references.length
    || new Set(references.map((reference) => reference.referenceId)).size !== references.length) {
    throw new TypeError("Publication reference identities are invalid");
  }
  if (index.referenceEvidencePairs.size !== referenceFacts.evidence.length
    || referenceFacts.evidence.some((evidence) => (
      !index.checkIds.has(evidence.checkId)
      || !index.referencesByName.has(evidence.referenceName)
    ))) {
    throw new TypeError("Publication reference evidence is invalid");
  }
  if (referenceFacts.relations.some((relation) => !index.recordIds.has(relation.recordId))) {
    throw new TypeError("Publication reference relations are invalid");
  }
  for (const reference of decisionEvidenceRefs(decision)) {
    validateDecisionEvidenceReference(reference, index);
  }
}

function buildPublicationEvidenceIndex(
  snapshot: CoreSnapshot,
  references: readonly NamedReferenceIdentity[],
  referenceFacts: ReferenceFacts,
  decision: DecisionEvidence
): PublicationEvidenceIndex {
  return {
    checkIds: new Set(snapshot.checks.map((check) => check.checkId)),
    recordIds: new Set(snapshot.records.map((record) => record.recordId)),
    referencesByName: new Map(references.map((reference) => [reference.referenceName, reference])),
    referenceEvidencePairs: new Set(referenceFacts.evidence.map((evidence) => (
      `${evidence.checkId}\u0000${evidence.referenceName}`
    ))),
    readinessIds: new Set(decision.readiness.map((evidence) => evidence.readinessId)),
    viewIds: new Set(decision.views.map((view) => view.viewId))
  };
}

function validateDecisionEvidenceReference(
  reference: EvidenceRef,
  index: PublicationEvidenceIndex
): void {
  switch (reference.kind) {
    case "check":
      if (!index.checkIds.has(reference.checkId)) {
        throw new TypeError("Publication decision references an unknown Check");
      }
      return;
    case "record":
      if (!index.recordIds.has(reference.recordId)) {
        throw new TypeError("Publication decision references an unknown record");
      }
      return;
    case "view":
      if (!index.viewIds.has(reference.viewId)) {
        throw new TypeError("Publication decision references an unknown view");
      }
      return;
    case "readiness":
      if (!index.readinessIds.has(reference.readinessId)) {
        throw new TypeError("Publication decision references unknown readiness evidence");
      }
      return;
    case "reference":
      validateNamedDecisionEvidenceReference(reference, index);
      return;
  }
  return unexpectedEvidenceReference(reference);
}

function validateNamedDecisionEvidenceReference(
  reference: Extract<EvidenceRef, { readonly kind: "reference" }>,
  index: PublicationEvidenceIndex
): void {
  const identity = index.referencesByName.get(reference.referenceName);
  if (identity?.referenceId !== reference.referenceId
    || !index.checkIds.has(reference.checkId)
    || !index.referenceEvidencePairs.has(`${reference.checkId}\u0000${reference.referenceName}`)) {
    throw new TypeError("Publication decision references an unknown Check/reference pair");
  }
}

function unexpectedEvidenceReference(reference: never): never {
  throw new TypeError(`Unknown publication decision evidence reference: ${JSON.stringify(reference)}`);
}

function decisionEvidenceRefs(decision: DecisionEvidence): readonly EvidenceRef[] {
  return [
    ...decision.readiness.flatMap((evidence) => evidence.evidenceRefs),
    ...(decision.blockWhen?.evidenceRefs ?? []),
    ...(decision.gate.status === "disabled" ? [] : decision.gate.evidenceRefs)
  ];
}
