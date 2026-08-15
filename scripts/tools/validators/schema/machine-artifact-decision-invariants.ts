import {
  evidenceKey,
  isCanonical,
  isCanonicalText,
  readinessEvidencePrefix,
  referenceEvidenceKey,
  sameEvidence,
  sameText
} from "./machine-artifact-canonical.ts";
import { setFailure } from "./machine-artifact-diagnostics.ts";
import {
  RUN_ARTIFACT,
  type DocsMachineValidationFailure,
  type EvidenceRefShape,
  type GateShape,
  type RecordShape,
  type ReadinessEvidenceShape,
  type RunShape
} from "./machine-artifact-types.ts";

interface EvidenceReferenceSets {
  readonly checkIds: ReadonlySet<string>;
  readonly recordIds: ReadonlySet<string>;
  readonly viewIds: ReadonlySet<string>;
  readonly readinessIds: ReadonlySet<string>;
  readonly referenceByName: ReadonlyMap<string, { referenceId: string }>;
  readonly referencePairs: ReadonlySet<string>;
}

export function validateDecision(
  run: RunShape,
  records: readonly RecordShape[],
  artifactRoot: string
): DocsMachineValidationFailure | null {
  const recordIds = new Set(records.map(({ recordId }) => recordId));
  return validateEvidenceReferences(run, recordIds, artifactRoot)
    ?? validateDecisionRecordReferences(run, recordIds, artifactRoot)
    ?? validateDecisionCanonicalOrder(run, artifactRoot)
    ?? validateDecisionState(run, artifactRoot);
}

function validateEvidenceReferences(
  run: RunShape,
  recordIds: ReadonlySet<string>,
  artifactRoot: string
): DocsMachineValidationFailure | null {
  const sets = createEvidenceReferenceSets(run, recordIds);
  for (const reference of allEvidenceReferences(run)) {
    const failure = validateEvidenceRef(reference, sets, artifactRoot);
    if (failure !== null) return failure;
  }
  return null;
}

function createEvidenceReferenceSets(
  run: RunShape,
  recordIds: ReadonlySet<string>
): EvidenceReferenceSets {
  return {
    checkIds: new Set(run.checks.map(({ checkId }) => checkId)),
    recordIds,
    viewIds: new Set(run.decision.views.map(({ viewId }) => viewId)),
    readinessIds: new Set(run.decision.readiness.map(({ readinessId }) => readinessId)),
    referenceByName: new Map(run.references.identities.map((identity) => [
      identity.referenceName,
      identity
    ])),
    referencePairs: new Set(run.references.evidence.map(referenceEvidenceKey))
  };
}

function allEvidenceReferences(run: RunShape): readonly EvidenceRefShape[] {
  const decision = run.decision;
  return [
    ...decision.readiness.flatMap(({ evidenceRefs }) => evidenceRefs),
    ...(decision.blockWhen?.evidenceRefs ?? []),
    ...(decision.gate.status === "disabled" ? [] : decision.gate.evidenceRefs)
  ];
}

function validateEvidenceRef(
  reference: EvidenceRefShape,
  sets: EvidenceReferenceSets,
  artifactRoot: string
): DocsMachineValidationFailure | null {
  switch (reference.kind) {
    case "record":
      return sets.recordIds.has(reference.recordId)
        ? null
        : decisionFailure(artifactRoot, "decision-record-reference", "Unknown record evidence ref.");
    case "check":
      return sets.checkIds.has(reference.checkId)
        ? null
        : decisionFailure(artifactRoot, "decision-check-reference", "Unknown Check evidence ref.");
    case "view":
      return sets.viewIds.has(reference.viewId)
        ? null
        : decisionFailure(artifactRoot, "decision-view-reference", "Unknown view evidence ref.");
    case "readiness":
      return sets.readinessIds.has(reference.readinessId)
        ? null
        : decisionFailure(
          artifactRoot,
          "decision-readiness-reference",
          "Unknown readiness evidence ref."
        );
    case "reference":
      return validateNamedReference(reference, sets, artifactRoot);
  }
  return unreachableEvidenceRef(reference);
}

function validateNamedReference(
  reference: Extract<EvidenceRefShape, { readonly kind: "reference" }>,
  sets: EvidenceReferenceSets,
  artifactRoot: string
): DocsMachineValidationFailure | null {
  const identity = sets.referenceByName.get(reference.referenceName);
  if (
    identity?.referenceId === reference.referenceId &&
    sets.checkIds.has(reference.checkId) &&
    sets.referencePairs.has(`${reference.checkId}\u0000${reference.referenceName}`)
  ) return null;
  return decisionFailure(
    artifactRoot,
    "decision-reference-reference",
    "Unknown Check/reference evidence ref."
  );
}

function validateDecisionRecordReferences(
  run: RunShape,
  recordIds: ReadonlySet<string>,
  artifactRoot: string
): DocsMachineValidationFailure | null {
  const decision = run.decision;
  const referencedRecordIds = [
    ...run.acceptance.map(({ recordId }) => recordId),
    ...run.references.relations.map(({ recordId }) => recordId),
    ...decision.views.flatMap(({ recordIds: ids }) => ids),
    ...(decision.blockWhen?.blockingRecordIds ?? []),
    ...((decision.gate.status === "passed" || decision.gate.status === "failed")
      ? decision.gate.blockingRecordIds
      : [])
  ];
  if (referencedRecordIds.every((recordId) => recordIds.has(recordId))) return null;
  return decisionFailure(
    artifactRoot,
    "decision-record-reference",
    "Decision references an unknown record."
  );
}

function validateDecisionCanonicalOrder(
  run: RunShape,
  artifactRoot: string
): DocsMachineValidationFailure | null {
  const decision = run.decision;
  if (
    isCanonical(run.acceptance, (item) => `${item.recordId}\u0000${item.acceptanceId}`) &&
    isCanonical(decision.views, ({ viewId }) => viewId) &&
    decision.views.every(({ recordIds }) => isCanonicalText(recordIds)) &&
    isCanonical(decision.readiness, ({ readinessId }) => readinessId) &&
    decision.readiness.every(({ evidenceRefs }) => isCanonical(evidenceRefs, evidenceKey)) &&
    isCanonicalBlockWhen(decision.blockWhen) &&
    isCanonicalGate(decision.gate)
  ) return null;
  return decisionFailure(
    artifactRoot,
    "decision-canonical-order",
    "Decision arrays must use canonical unique order."
  );
}

function isCanonicalBlockWhen(blockWhen: RunShape["decision"]["blockWhen"]): boolean {
  return blockWhen === null || (
    isCanonical(blockWhen.evidenceRefs, evidenceKey) &&
    isCanonicalText(blockWhen.blockingRecordIds)
  );
}

function isCanonicalGate(gate: RunShape["decision"]["gate"]): boolean {
  if (gate.status === "disabled") return true;
  if (!isCanonical(gate.evidenceRefs, evidenceKey)) return false;
  return gate.status === "not-evaluated" || isCanonicalText(gate.blockingRecordIds);
}

function validateDecisionState(
  run: RunShape,
  artifactRoot: string
): DocsMachineValidationFailure | null {
  const decision = run.decision;
  const gate = decision.gate;
  const failedReadiness: FailedReadiness = decision.readiness.flatMap((evidence, index) => (
    evidence.status === "failed" ? [{ evidence, index }] : []
  ));
  if (gate.status === "disabled") {
    return validateDisabledDecision(run, artifactRoot);
  }
  if (decision.policyId === null || gate.policyId !== decision.policyId) {
    return decisionFailure(artifactRoot, "decision-state", "Gate policy identity is inconsistent.");
  }
  if (gate.status === "not-evaluated") {
    return validateNotEvaluatedDecision(run, gate, failedReadiness, artifactRoot);
  }
  return validateEvaluatedDecision(run, gate, failedReadiness, artifactRoot);
}

function validateDisabledDecision(
  run: RunShape,
  artifactRoot: string
): DocsMachineValidationFailure | null {
  const decision = run.decision;
  return decision.policyId === null && decision.readiness.length === 0
    && decision.blockWhen === null
    ? null
    : decisionFailure(artifactRoot, "decision-state", "Disabled decision is inconsistent.");
}

type FailedReadiness = readonly {
  readonly evidence: Extract<ReadinessEvidenceShape, { readonly status: "failed" }>;
  readonly index: number;
}[];

function validateNotEvaluatedDecision(
  run: RunShape,
  gate: Extract<GateShape, { readonly status: "not-evaluated" }>,
  failedReadiness: FailedReadiness,
  artifactRoot: string
): DocsMachineValidationFailure | null {
  const { decision } = run;
  const failed = failedReadiness[0];
  if (
    failedReadiness.length === 1 &&
    failed !== undefined &&
    failed.index === decision.readiness.length - 1 &&
    decision.blockWhen === null &&
    failed.evidence.reason === gate.reason &&
    sameEvidence(
      gate.evidenceRefs,
      readinessEvidencePrefix(decision.readiness.slice(0, failed.index + 1))
    )
  ) return null;
  return decisionFailure(
    artifactRoot,
    "decision-state",
    "Not-evaluated gate does not close readiness evidence."
  );
}

function validateEvaluatedDecision(
  run: RunShape,
  gate: Extract<GateShape, { readonly status: "passed" | "failed" }>,
  failedReadiness: FailedReadiness,
  artifactRoot: string
): DocsMachineValidationFailure | null {
  const { decision } = run;
  const blockWhen = decision.blockWhen;
  if (
    failedReadiness.length === 0 &&
    blockWhen !== null &&
    (gate.status === "failed") === (blockWhen.status === "matched") &&
    sameText(gate.blockingRecordIds, blockWhen.blockingRecordIds) &&
    sameEvidence(gate.evidenceRefs, [
      ...readinessEvidencePrefix(decision.readiness),
      ...blockWhen.evidenceRefs
    ])
  ) return null;
  return decisionFailure(
    artifactRoot,
    "decision-state",
    "Evaluated gate does not close readiness and blockWhen evidence."
  );
}

function decisionFailure(
  artifactRoot: string,
  relationship: Parameters<typeof setFailure>[2]["relationship"],
  message: string
): DocsMachineValidationFailure {
  return setFailure(artifactRoot, RUN_ARTIFACT, {
    message,
    pointer: "/decision",
    relationship
  });
}

function unreachableEvidenceRef(reference: never): never {
  throw new TypeError(`Unknown decision evidence reference: ${JSON.stringify(reference)}`);
}
