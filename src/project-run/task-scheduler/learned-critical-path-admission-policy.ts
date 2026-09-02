import {
  criticalPathScoreForTask,
  type SchedulerCriticalPathSnapshot
} from "../scheduler-history/critical-path.ts";
import type {
  AdmissionCandidate,
  AdmissionPolicyDecision,
  AdmissionPolicyInput,
  AdmissionSelectionPolicy
} from "./admission-selection-policy.ts";
import type { PlannedTask, PlannedTaskGraph, PlannedTaskScope } from "./graph.ts";

/**
 * Selects from the existing tightening, constrained-continuation, and ordinary
 * layers with one immutable learned critical-path score table per invocation.
 */
export function learnedCriticalPathAdmissionSelectionPolicy(
  criticalPath: SchedulerCriticalPathSnapshot
): AdmissionSelectionPolicy {
  return Object.freeze({
    decide: (input: AdmissionPolicyInput) => decideLearnedCriticalPathAdmission(input, criticalPath)
  });
}

function decideLearnedCriticalPathAdmission(
  input: AdmissionPolicyInput,
  criticalPath: SchedulerCriticalPathSnapshot
): AdmissionPolicyDecision {
  const tightening = selectTighteningCandidate(input, criticalPath);
  if (tightening !== undefined) return proposalFor(tightening);

  const continuation = selectConstrainedContinuation(input, criticalPath);
  if (continuation !== undefined) return proposalFor(continuation);

  return proposalFor(selectOrdinaryReadyCandidate(input.candidates, criticalPath));
}

function proposalFor(candidate: AdmissionCandidate): AdmissionPolicyDecision {
  return candidate.canAdmit
    ? Object.freeze({ kind: "select", taskId: candidate.task.id })
    : Object.freeze({ kind: "wait" });
}

function selectTighteningCandidate(
  input: AdmissionPolicyInput,
  criticalPath: SchedulerCriticalPathSnapshot
): AdmissionCandidate | undefined {
  return input.candidates
    .filter((candidate) => activatesTighteningScope(input, candidate.task))
    .sort((left, right) => compareConstrainedCandidates(input, criticalPath, left, right))[0];
}

function selectConstrainedContinuation(
  input: AdmissionPolicyInput,
  criticalPath: SchedulerCriticalPathSnapshot
): AdmissionCandidate | undefined {
  return input.candidates
    .filter((candidate) => isConstrainedContinuation(input, candidate.task))
    .sort((left, right) => compareConstrainedCandidates(input, criticalPath, left, right))[0];
}

function selectOrdinaryReadyCandidate(
  candidates: readonly AdmissionCandidate[],
  criticalPath: SchedulerCriticalPathSnapshot
): AdmissionCandidate {
  const [first, ...remaining] = candidates;
  if (first === undefined) throw new Error("learned scheduler selection requires a candidate");
  return remaining.reduce(
    (selected, candidate) =>
      compareLearnedTasks(criticalPath, candidate.task, selected.task) < 0 ? candidate : selected,
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
  criticalPath: SchedulerCriticalPathSnapshot,
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
    compareLearnedTasks(criticalPath, left.task, right.task) ||
    compareText(leftScope.id, rightScope.id) ||
    compareText(left.task.id, right.task.id)
  );
}

function compareLearnedTasks(
  criticalPath: SchedulerCriticalPathSnapshot,
  left: PlannedTask,
  right: PlannedTask
): number {
  return (
    criticalPathScore(criticalPath, right.id) - criticalPathScore(criticalPath, left.id) ||
    right.admissionPriority - left.admissionPriority ||
    compareText(left.id, right.id)
  );
}

function criticalPathScore(criticalPath: SchedulerCriticalPathSnapshot, taskId: string): number {
  const score = criticalPathScoreForTask(criticalPath, taskId);
  if (score === undefined) throw new Error(`learned scheduler score is missing task ${taskId}`);
  return score;
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
