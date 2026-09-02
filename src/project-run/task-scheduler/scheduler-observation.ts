import type { PlannedTask } from "./graph.ts";
import { diagnosticTags, type DiagnosticObservation } from "../diagnostic-logging/logger.ts";
import type { SchedulerDecision } from "./scheduler-decision.ts";
import { snapshotSchedulerState, type SchedulerState } from "./execution-state.ts";
import {
  canAdmit,
  capacityFor,
  inspectSnapshot,
  isRelationEligible,
  isRelationMutexEligible,
  type SchedulerInspection
} from "./scheduler-decision-inspection.ts";
import type {
  AdmissionViablePendingTask,
  SchedulerPerformanceDiagnostics,
  SchedulerPerformanceState
} from "./scheduler-performance-diagnostics.ts";
import type { AdmissionPolicyFault } from "./scheduler-admission-decision.ts";

/** Fault logging is observational and therefore excluded from Scheduler control-path timing. */
export function observeAdmissionPolicyFault<TResult>(
  state: SchedulerState<TResult>,
  fault: AdmissionPolicyFault
): void {
  observeSchedulerDiagnostic(state, {
    event: "scheduler.admission-policy-failed",
    tags: diagnosticTags("SCHEDULER", "ADMISSION_POLICY_FAILED", fault.category.toUpperCase()),
    details: Object.freeze({ category: fault.category })
  });
}

export function observeSchedulerDecision<TResult>(
  state: SchedulerState<TResult>,
  decision: SchedulerDecision,
  diagnostics: SchedulerPerformanceDiagnostics | undefined
): void {
  const observation: DiagnosticObservation = {
    event: "scheduler.decision",
    tags: schedulerDecisionTags(decision),
    details: decision
  };
  const observe = () => observeSchedulerDiagnostic(state, observation);
  if (diagnostics === undefined) observe();
  else diagnostics.observeDecision(observe);
}

/** Logger failures are observational and must not revise Scheduler lifecycle state. */
export function observeSchedulerDiagnostic<TResult>(
  state: SchedulerState<TResult>,
  observation: DiagnosticObservation
): void {
  try {
    state.diagnosticLogger?.observe(observation);
  } catch {
    // Invocation logging has its own containment; retain it for direct Scheduler seams as well.
  }
}

export function performanceState<TResult>(
  state: SchedulerState<TResult>
): SchedulerPerformanceState {
  const inspection = inspectSnapshot(snapshotSchedulerState(state));
  const admissionViablePendingTasks: AdmissionViablePendingTask[] = [];
  for (const task of inspection.pendingTasks) {
    if (!isRelationEligible(task, inspection)) continue;
    admissionViablePendingTasks.push(
      Object.freeze({
        kind: admissionViablePendingKind(task, inspection),
        taskId: task.id
      })
    );
  }
  const capacity = capacityFor(inspection);
  return Object.freeze({
    admissionViablePendingTasks: Object.freeze(admissionViablePendingTasks),
    effectiveMaxParallel: capacity.effectiveMaxParallel,
    rootMaxParallel: capacity.maxParallel,
    running: capacity.running
  });
}

function admissionViablePendingKind(
  task: PlannedTask,
  inspection: SchedulerInspection
): AdmissionViablePendingTask["kind"] {
  if (!isRelationMutexEligible(task, inspection)) return "mutex-blocked";
  return canAdmit(inspection, task) ? "admissible-pending" : "capacity-blocked";
}

function schedulerDecisionTags(decision: SchedulerDecision): readonly string[] {
  return diagnosticTags(
    "SCHEDULER",
    decision.kind.toUpperCase(),
    ...("taskId" in decision ? [`TASK:${decision.taskId}`] : [])
  );
}
