import {
  createSchedulerCriticalPathSnapshot,
  criticalPathScoreForTask,
  type SchedulerCriticalPathPredictionSnapshot,
  type SchedulerCriticalPathSnapshot
} from "./critical-path-ranking.ts";
import type {
  AdmissionCandidate,
  AdmissionPolicyDecision,
  AdmissionPolicyInput,
  AdmissionSelectionPolicy
} from "./admission-selection-policy.ts";
import type { PlannedTask } from "./graph.ts";
import {
  isConstrainedScopeContinuation,
  scopeForTask,
  tighteningScopeForTask
} from "./admission-scope-layers.ts";
import type { SchedulerGraphSnapshot } from "../../project-definition/project-definition.ts";

export interface LearnedCriticalPathAdmission {
  readonly admissionPolicy: AdmissionSelectionPolicy;
  readonly criticalPath: SchedulerCriticalPathSnapshot;
}

/** Forms one immutable score snapshot and its complete frozen Scheduler-facing policy. */
export function createLearnedCriticalPathAdmission(
  graph: SchedulerGraphSnapshot,
  prediction: SchedulerCriticalPathPredictionSnapshot
): LearnedCriticalPathAdmission {
  const criticalPath = createSchedulerCriticalPathSnapshot(graph, prediction);
  return Object.freeze({
    admissionPolicy: learnedCriticalPathAdmissionSelectionPolicy(criticalPath),
    criticalPath
  });
}

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
    .filter(
      (candidate) =>
        tighteningScopeForTask(input.graph, input.inspection, candidate.task) !== undefined
    )
    .sort((left, right) => compareConstrainedCandidates(input, criticalPath, left, right))[0];
}

function selectConstrainedContinuation(
  input: AdmissionPolicyInput,
  criticalPath: SchedulerCriticalPathSnapshot
): AdmissionCandidate | undefined {
  return input.candidates
    .filter((candidate) =>
      isConstrainedScopeContinuation(input.graph, input.inspection, candidate.task)
    )
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

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
