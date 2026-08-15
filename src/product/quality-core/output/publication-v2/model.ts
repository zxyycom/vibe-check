import type {
  FinalCoreSnapshot,
  QualityRecord
} from "../../check-record/model.ts";
import type {
  DecisionEvidence,
  EvidenceRef,
  NamedReferenceIdentity,
  ReferenceFacts
} from "../../check-record/policy-model.ts";
import {
  projectHumanStatus,
  type HumanStatusProjection
} from "../../check-record/human-status.ts";
import { validateFinalCoreSnapshot } from "../../check-record/validation.ts";

export interface PublicationInvocationV2 {
  readonly invocationId: string;
  readonly projectRoot: ".";
  readonly timestamp: string;
}

export interface ValidatedPublicationModelV2 {
  readonly decision: DecisionEvidence;
  readonly humanStatus: HumanStatusProjection;
  readonly invocation: PublicationInvocationV2;
  readonly records: readonly QualityRecord[];
  readonly referenceFacts: ReferenceFacts;
  readonly references: readonly NamedReferenceIdentity[];
  readonly snapshot: FinalCoreSnapshot;
  readonly verificationOutput: boolean;
}

interface PublicationEvidenceIndex {
  readonly definitionIds: ReadonlySet<string>;
  readonly recordIds: ReadonlySet<string>;
  readonly referenceEvidencePairs: ReadonlySet<string>;
  readonly referenceKeys: ReadonlySet<string>;
  readonly runIds: ReadonlySet<string>;
}

export function createPublicationModelV2(input: Readonly<{
  decision: DecisionEvidence;
  humanStatus: HumanStatusProjection;
  invocation: PublicationInvocationV2;
  referenceFacts: ReferenceFacts;
  references: readonly NamedReferenceIdentity[];
  snapshot: FinalCoreSnapshot;
  verificationOutput: boolean;
}>): ValidatedPublicationModelV2 {
  const validatedSnapshot = validateFinalCoreSnapshot(input.snapshot);
  if (!validatedSnapshot.ok) {
    throw new TypeError("Publication requires a valid final Core snapshot");
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
  return deepFreeze({
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
  snapshot: FinalCoreSnapshot,
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

function validateInvocation(invocation: PublicationInvocationV2): void {
  if (typeof invocation.invocationId !== "string" || invocation.invocationId.length === 0
    || invocation.projectRoot !== "."
    || typeof invocation.timestamp !== "string"
    || Number.isNaN(Date.parse(invocation.timestamp))) {
    throw new TypeError("Publication invocation metadata is invalid");
  }
}

function validatePublicationEvidence(
  snapshot: FinalCoreSnapshot,
  references: readonly NamedReferenceIdentity[],
  referenceFacts: ReferenceFacts,
  decision: DecisionEvidence
): void {
  const index = buildPublicationEvidenceIndex(snapshot, references, referenceFacts);
  if (index.referenceKeys.size !== references.length
    || referenceFacts.relations.some((relation) => !index.recordIds.has(relation.recordId))) {
    throw new TypeError("Publication reference evidence is invalid");
  }
  for (const reference of decisionEvidenceRefs(decision)) {
    validateDecisionEvidenceReference(reference, index);
  }
}

function buildPublicationEvidenceIndex(
  snapshot: FinalCoreSnapshot,
  references: readonly NamedReferenceIdentity[],
  referenceFacts: ReferenceFacts
): PublicationEvidenceIndex {
  return {
    recordIds: new Set(snapshot.records.map((record) => record.recordId)),
    runIds: new Set(snapshot.runs.map((run) => run.checkRunId)),
    definitionIds: new Set(snapshot.definitions.map((definition) => definition.checkId)),
    referenceKeys: new Set(references.map((reference) => (
      `${reference.referenceName}\u0000${reference.referenceId}`
    ))),
    referenceEvidencePairs: new Set(referenceFacts.evidence.map((evidence) => (
      `${evidence.checkId}\u0000${evidence.referenceName}`
    )))
  };
}

function validateDecisionEvidenceReference(
  reference: EvidenceRef,
  index: PublicationEvidenceIndex
): void {
  if (reference.kind === "record") {
    if (!index.recordIds.has(reference.recordId)) {
      throw new TypeError("Publication decision references an unknown record");
    }
    return;
  }
  if (reference.kind === "run") {
    if (!index.runIds.has(reference.checkRunId)) {
      throw new TypeError("Publication decision references an unknown run");
    }
    return;
  }
  if (reference.kind !== "reference") return;
  if (!index.referenceKeys.has(`${reference.referenceName}\u0000${reference.referenceId}`)
    || !index.definitionIds.has(reference.checkId)
    || !index.referenceEvidencePairs.has(`${reference.checkId}\u0000${reference.referenceName}`)) {
    throw new TypeError("Publication decision references an unknown Check/reference pair");
  }
}

function decisionEvidenceRefs(decision: DecisionEvidence) {
  return [
    ...decision.readiness.flatMap((evidence) => evidence.evidenceRefs),
    ...(decision.blockWhen?.evidenceRefs ?? []),
    ...(decision.gate.status === "disabled" ? [] : decision.gate.evidenceRefs)
  ];
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
