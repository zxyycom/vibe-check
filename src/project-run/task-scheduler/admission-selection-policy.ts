import type { PlannedTask, PlannedTaskGraph, PlannedTaskScope } from "./graph.ts";
import type { SchedulerInspection } from "./scheduler-decision-inspection.ts";

export interface AdmissionCandidate {
  readonly canAdmit: boolean;
  readonly task: PlannedTask;
}

export interface AdmissionPolicyInput {
  readonly candidates: readonly AdmissionCandidate[];
  readonly graph: PlannedTaskGraph;
  readonly inspection: SchedulerInspection;
}

export type AdmissionPolicyDecision =
  | Readonly<{ readonly kind: "select"; readonly taskId: string }>
  | Readonly<{ readonly kind: "wait" }>;

/** A Product-private pure admission policy; it receives no executor or mutable scheduler state. */
export interface AdmissionSelectionPolicy {
  readonly decide: (input: AdmissionPolicyInput) => AdmissionPolicyDecision;
}

export const staticAdmissionSelectionPolicy: AdmissionSelectionPolicy = Object.freeze({
  decide: decideStaticAdmission
});

function decideStaticAdmission(input: AdmissionPolicyInput): AdmissionPolicyDecision {
  const tightening = selectTighteningCandidate(input);
  if (tightening !== undefined) return proposalFor(tightening);

  const continuation = selectConstrainedContinuation(input);
  if (continuation !== undefined) return proposalFor(continuation);

  return proposalFor(selectOrdinaryReadyCandidate(input.candidates));
}

function proposalFor(candidate: AdmissionCandidate): AdmissionPolicyDecision {
  return candidate.canAdmit
    ? Object.freeze({ kind: "select", taskId: candidate.task.id })
    : Object.freeze({ kind: "wait" });
}

function selectTighteningCandidate(input: AdmissionPolicyInput): AdmissionCandidate | undefined {
  return input.candidates
    .filter((candidate) => activatesTighteningScope(input, candidate.task))
    .sort((left, right) => compareConstrainedCandidates(input, left, right))[0];
}

function selectConstrainedContinuation(
  input: AdmissionPolicyInput
): AdmissionCandidate | undefined {
  return input.candidates
    .filter((candidate) => isConstrainedContinuation(input, candidate.task))
    .sort((left, right) => compareConstrainedCandidates(input, left, right))[0];
}

function selectOrdinaryReadyCandidate(
  candidates: readonly AdmissionCandidate[]
): AdmissionCandidate {
  const [first, ...remaining] = candidates;
  if (first === undefined) throw new Error("static scheduler selection requires a candidate");
  return remaining.reduce(
    (selected, candidate) =>
      candidate.task.admissionPriority > selected.task.admissionPriority ? candidate : selected,
    first
  );
}

function activatesTighteningScope(input: AdmissionPolicyInput, task: PlannedTask): boolean {
  const scope = activationScopeFor(input, task);
  return scope !== undefined && scope.maxParallel < input.inspection.maxParallel;
}

function isConstrainedContinuation(input: AdmissionPolicyInput, task: PlannedTask): boolean {
  const scope = scopeForTask(input.graph, task);
  return (
    scope !== undefined &&
    input.inspection.activeScopeIds.includes(scope.id) &&
    scope.maxParallel < input.inspection.maxParallel
  );
}

function compareConstrainedCandidates(
  input: AdmissionPolicyInput,
  left: AdmissionCandidate,
  right: AdmissionCandidate
): number {
  const leftScope = scopeForTask(input.graph, left.task);
  const rightScope = scopeForTask(input.graph, right.task);
  if (leftScope === undefined || rightScope === undefined) {
    throw new Error("constrained task is missing a scope");
  }
  return (
    leftScope.maxParallel - rightScope.maxParallel ||
    right.task.admissionPriority - left.task.admissionPriority ||
    compareText(leftScope.id, rightScope.id) ||
    compareText(left.task.id, right.task.id)
  );
}

function activationScopeFor(
  input: AdmissionPolicyInput,
  task: PlannedTask
): PlannedTaskScope | undefined {
  const scope = scopeForTask(input.graph, task);
  return scope?.activationTaskIds.includes(task.id) === true &&
    !input.inspection.activeScopeIds.includes(scope.id)
    ? scope
    : undefined;
}

function scopeForTask(graph: PlannedTaskGraph, task: PlannedTask): PlannedTaskScope | undefined {
  return task.scopeId === undefined
    ? undefined
    : graph.scopes.find((scope) => scope.id === task.scopeId);
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
