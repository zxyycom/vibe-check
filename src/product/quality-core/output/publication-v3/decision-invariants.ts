import type { EvidenceRef } from "../../check-record/policy-model.ts";
import type { MachineRunV3 } from "./schema.ts";
import { setInvariantFailure, type ValidationFailure } from "./validation-result.ts";
import { compareText, isCanonical, isCanonicalText, sameText } from "./validation-order.ts";

type Decision = MachineRunV3["decision"];
type DecisionGate = Decision["gate"];

export interface DecisionReferenceIndex {
  readonly checkIds: ReadonlySet<string>;
  readonly readinessIds: ReadonlySet<string>;
  readonly recordIds: ReadonlySet<string>;
  readonly referenceEvidencePairs: ReadonlySet<string>;
  readonly referencesByName: ReadonlyMap<string, MachineRunV3["references"]["identities"][number]>;
  readonly viewIds: ReadonlySet<string>;
}

export function validateDecisionReferences(
  references: readonly EvidenceRef[],
  index: DecisionReferenceIndex
): ValidationFailure | null {
  for (const reference of references) {
    const failure = unknownDecisionReference(reference, index);
    if (failure !== null) return failure;
  }
  return null;
}

function unknownDecisionReference(
  reference: EvidenceRef,
  index: DecisionReferenceIndex
): ValidationFailure | null {
  if (reference.kind === "check") {
    return index.checkIds.has(reference.checkId)
      ? null
      : decisionReferenceFailure(
          "decision-check-reference",
          "Decision references an unknown Check."
        );
  }
  if (reference.kind === "record") {
    return index.recordIds.has(reference.recordId)
      ? null
      : decisionReferenceFailure(
          "decision-record-reference",
          "Decision references an unknown record."
        );
  }
  if (reference.kind === "view") {
    return index.viewIds.has(reference.viewId)
      ? null
      : decisionReferenceFailure("decision-view-reference", "Decision references an unknown view.");
  }
  if (reference.kind === "readiness") {
    return index.readinessIds.has(reference.readinessId)
      ? null
      : decisionReferenceFailure(
          "decision-readiness-reference",
          "Decision references unknown readiness evidence."
        );
  }
  return isKnownReference(reference, index)
    ? null
    : decisionReferenceFailure(
        "decision-reference-reference",
        "Decision references an unknown Check/reference pair."
      );
}

function isKnownReference(
  reference: Extract<EvidenceRef, { kind: "reference" }>,
  index: DecisionReferenceIndex
): boolean {
  const identity = index.referencesByName.get(reference.referenceName);
  return (
    identity?.referenceId === reference.referenceId &&
    index.checkIds.has(reference.checkId) &&
    index.referenceEvidencePairs.has(`${reference.checkId}\u0000${reference.referenceName}`)
  );
}

function decisionReferenceFailure(
  relationship: Extract<
    Parameters<typeof setInvariantFailure>[0],
    | "decision-check-reference"
    | "decision-readiness-reference"
    | "decision-record-reference"
    | "decision-reference-reference"
    | "decision-view-reference"
  >,
  message: string
): ValidationFailure {
  return setInvariantFailure(relationship, "run.json", message);
}

export function validateDecisionState(run: MachineRunV3): ValidationFailure | null {
  const canonicalOrderIssue = validateDecisionCanonicalOrder(run);
  if (canonicalOrderIssue !== null) return canonicalOrderIssue;

  const decision = run.decision;
  const gate = decision.gate;
  const failedReadiness = collectFailedReadiness(decision);
  if (gate.status === "disabled") {
    return validateDisabledDecision(decision);
  }
  if (decision.policyId === null || gate.policyId !== decision.policyId) {
    return decisionStateFailure("Gate policy identity is inconsistent.");
  }
  if (gate.status === "not-evaluated") {
    return validateNotEvaluatedDecision(decision, gate, failedReadiness);
  }
  return validateEvaluatedDecision(decision, gate, failedReadiness);
}

function validateDecisionCanonicalOrder(run: MachineRunV3): ValidationFailure | null {
  const decision = run.decision;
  if (
    !isCanonical(run.acceptance, (evidence) => `${evidence.recordId}\u0000${evidence.acceptanceId}`)
  )
    return decisionCanonicalOrderFailure();
  if (!isCanonical(decision.views, (view) => view.viewId)) {
    return decisionCanonicalOrderFailure();
  }
  if (decision.views.some((view) => !isCanonicalText(view.recordIds))) {
    return decisionCanonicalOrderFailure();
  }
  if (!isCanonical(decision.readiness, (evidence) => evidence.readinessId)) {
    return decisionCanonicalOrderFailure();
  }
  if (decision.readiness.some((evidence) => !isCanonical(evidence.evidenceRefs, evidenceKey))) {
    return decisionCanonicalOrderFailure();
  }
  return validateGateCanonicalOrder(decision);
}

function validateGateCanonicalOrder(decision: Decision): ValidationFailure | null {
  if (decision.blockWhen !== null && !isCanonical(decision.blockWhen.evidenceRefs, evidenceKey)) {
    return decisionCanonicalOrderFailure();
  }
  if (decision.blockWhen !== null && !isCanonicalText(decision.blockWhen.blockingRecordIds)) {
    return decisionCanonicalOrderFailure();
  }
  if (
    decision.gate.status !== "disabled" &&
    !isCanonical(decision.gate.evidenceRefs, evidenceKey)
  ) {
    return decisionCanonicalOrderFailure();
  }
  if (
    (decision.gate.status === "passed" || decision.gate.status === "failed") &&
    !isCanonicalText(decision.gate.blockingRecordIds)
  ) {
    return decisionCanonicalOrderFailure();
  }
  return null;
}

function collectFailedReadiness(decision: Decision) {
  return decision.readiness
    .map((evidence, index) => ({ evidence, index }))
    .filter(({ evidence }) => evidence.status === "failed");
}

function validateDisabledDecision(decision: Decision): ValidationFailure | null {
  if (
    decision.policyId !== null ||
    decision.readiness.length !== 0 ||
    decision.blockWhen !== null
  ) {
    return decisionStateFailure("Disabled decision state is inconsistent.");
  }
  return null;
}

function validateNotEvaluatedDecision(
  decision: Decision,
  gate: Extract<DecisionGate, { status: "not-evaluated" }>,
  failedReadiness: ReturnType<typeof collectFailedReadiness>
): ValidationFailure | null {
  const failed = failedReadiness[0];
  if (failedReadiness.length !== 1 || failed === undefined) {
    return decisionStateFailure("Not-evaluated gate does not close readiness evidence.");
  }
  if (failed.index !== decision.readiness.length - 1 || decision.blockWhen !== null) {
    return decisionStateFailure("Not-evaluated gate does not close readiness evidence.");
  }
  if (failed.evidence.status !== "failed" || failed.evidence.reason !== gate.reason) {
    return decisionStateFailure("Not-evaluated gate does not close readiness evidence.");
  }
  const expectedEvidence = readinessEvidencePrefix(decision.readiness.slice(0, failed.index + 1));
  if (!sameEvidence(gate.evidenceRefs, expectedEvidence)) {
    return decisionStateFailure("Not-evaluated gate does not close readiness evidence.");
  }
  return null;
}

function validateEvaluatedDecision(
  decision: Decision,
  gate: Extract<DecisionGate, { status: "failed" | "passed" }>,
  failedReadiness: ReturnType<typeof collectFailedReadiness>
): ValidationFailure | null {
  if (failedReadiness.length !== 0 || decision.blockWhen === null) {
    return decisionStateFailure("Evaluated gate does not close readiness and blockWhen evidence.");
  }
  if ((gate.status === "failed") !== (decision.blockWhen.status === "matched")) {
    return decisionStateFailure("Evaluated gate does not close readiness and blockWhen evidence.");
  }
  if (!sameText(gate.blockingRecordIds, decision.blockWhen.blockingRecordIds)) {
    return decisionStateFailure("Evaluated gate does not close readiness and blockWhen evidence.");
  }
  const expectedEvidence = [
    ...readinessEvidencePrefix(decision.readiness),
    ...decision.blockWhen.evidenceRefs
  ];
  if (!sameEvidence(gate.evidenceRefs, expectedEvidence)) {
    return decisionStateFailure("Evaluated gate does not close readiness and blockWhen evidence.");
  }
  return null;
}

function decisionCanonicalOrderFailure(): ValidationFailure {
  return setInvariantFailure(
    "decision-canonical-order",
    "run.json",
    "Decision arrays must use canonical unique order."
  );
}

function decisionStateFailure(message: string): ValidationFailure {
  return setInvariantFailure("decision-state", "run.json", message);
}

export function collectDecisionReferences(run: MachineRunV3): readonly EvidenceRef[] {
  return [
    ...run.decision.readiness.flatMap((evidence) => evidence.evidenceRefs),
    ...(run.decision.blockWhen?.evidenceRefs ?? []),
    ...(run.decision.gate.status === "disabled" ? [] : run.decision.gate.evidenceRefs)
  ];
}

function evidenceKey(reference: EvidenceRef): string {
  if (reference.kind === "check") return `0\u0000${reference.checkId}`;
  if (reference.kind === "record") return `1\u0000${reference.recordId}`;
  if (reference.kind === "reference") {
    return `2\u0000${reference.checkId}\u0000${reference.referenceName}\u0000${reference.referenceId}`;
  }
  if (reference.kind === "view") return `3\u0000${reference.viewId}`;
  return `4\u0000${reference.readinessId}`;
}

function readinessEvidencePrefix(readiness: Decision["readiness"]): readonly EvidenceRef[] {
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
