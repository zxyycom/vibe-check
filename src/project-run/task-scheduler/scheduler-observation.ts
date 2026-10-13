import { createHash } from "node:crypto";

import { diagnosticTags, type DiagnosticObservation } from "../diagnostic-logging/logger.ts";
import type { SchedulerDecision } from "./scheduler-decision.ts";
import type { SchedulerState } from "./execution-state.ts";
import {
  schedulerInspectionForCore,
  validateAdmissionCoreSelection
} from "./admission-core/core.ts";
import type {
  AdmissionViablePendingTask,
  SchedulerPerformanceDiagnostics,
  SchedulerPerformanceState
} from "./measurement/diagnostics.ts";
import type { AdmissionPolicyFault } from "./scheduler-admission-decision.ts";

/** Fault logging is observational and therefore excluded from Scheduler control-path timing. */
export function observeAdmissionPolicyFault<TResult>(
  state: SchedulerState<TResult>,
  fault: AdmissionPolicyFault
): void {
  observeSchedulerDiagnostic(state, {
    event: "scheduler.admission-policy-failed",
    tags: diagnosticTags("ADMISSION_POLICY_FAILED", fault.category.toUpperCase()),
    details: Object.freeze({ category: fault.category })
  });
}

export function observeSchedulerDecision<TResult>(
  state: SchedulerState<TResult>,
  decision: SchedulerDecision,
  diagnostics: SchedulerPerformanceDiagnostics | undefined
): void {
  if (state.diagnosticLogger === undefined) return;
  const observation: DiagnosticObservation = {
    event: "scheduler.decision",
    tags: schedulerDecisionTags(decision),
    details: schedulerDecisionDetails(state, decision)
  };
  const observe = () => {
    observeSchedulerDiagnostic(state, observation);
  };
  if (diagnostics === undefined) observe();
  else diagnostics.observeDecision(observe);
}

/** One immutable graph record makes the enclosing scheduler channel the self-contained evidence unit. */
export function observeSchedulerGraph<TResult>(state: SchedulerState<TResult>): void {
  if (state.diagnosticLogger === undefined) return;
  const graph = state.graph.schedulerGraphSnapshot;
  observeSchedulerDiagnostic(state, {
    event: "scheduler.graph",
    tags: diagnosticTags("GRAPH"),
    details: Object.freeze({ graph, graphFingerprint: graphFingerprintForInvocation(state) })
  });
}

export function schedulerGraphFingerprint(graph: unknown): string {
  return createHash("sha256").update(JSON.stringify(graph)).digest("hex");
}

function graphFingerprintForInvocation<TResult>(state: SchedulerState<TResult>): string {
  state.graphFingerprint ??= schedulerGraphFingerprint(state.graph.schedulerGraphSnapshot);
  return state.graphFingerprint;
}

function schedulerDecisionDetails<TResult>(
  state: SchedulerState<TResult>,
  decision: SchedulerDecision
): Readonly<Record<string, unknown>> {
  const { graphIdentity: _graphIdentity, ...dynamicFacts } = decision;
  return Object.freeze({
    ...dynamicFacts,
    graphFingerprint: graphFingerprintForInvocation(state)
  });
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
  const inspection = schedulerInspectionForCore(state.admissionCore);
  const admissionViablePendingTasks: AdmissionViablePendingTask[] = [];
  for (const task of inspection.pendingTasks) {
    const validation = validateAdmissionCoreSelection(state.admissionCore, task.id);
    if (validation.accepted) {
      admissionViablePendingTasks.push(
        Object.freeze({ kind: "admissible-pending", taskId: task.id })
      );
      continue;
    }
    switch (validation.reason.kind) {
      case "mutex-held":
        admissionViablePendingTasks.push(Object.freeze({ kind: "mutex-blocked", taskId: task.id }));
        continue;
      case "root-capacity-reached":
      case "scope-capacity-reached":
      case "resource-capacity-insufficient":
        admissionViablePendingTasks.push(
          Object.freeze({ kind: "capacity-blocked", taskId: task.id })
        );
        continue;
      case "depends-on-pending":
      case "observes-pending":
        continue;
      case "not-pending":
      case "state-complete":
      case "unknown-task":
        throw new Error("shared admission core disagrees with Scheduler pending state");
    }
  }
  return Object.freeze({
    admissionViablePendingTasks: Object.freeze(admissionViablePendingTasks),
    effectiveMaxParallel: inspection.effectiveMaxParallel,
    rootMaxParallel: inspection.maxParallel,
    running: inspection.runningTaskIds.length
  });
}

function schedulerDecisionTags(decision: SchedulerDecision): readonly string[] {
  return diagnosticTags(
    decision.kind.toUpperCase(),
    ...("taskId" in decision ? [`TASK:${decision.taskId}`] : [])
  );
}
