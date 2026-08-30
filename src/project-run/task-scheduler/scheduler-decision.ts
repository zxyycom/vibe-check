import { decideAdmission, type SchedulerDecisionCycle } from "./scheduler-admission-decision.ts";
import {
  decisionContext,
  inspectSnapshot,
  selectBlockedTask
} from "./scheduler-decision-inspection.ts";
import { freezeDecision, reservationUnchanged } from "./scheduler-decision-model.ts";
import type {
  SchedulerDecision,
  SchedulerSnapshot,
  SchedulerTrigger
} from "./scheduler-decision-model.ts";

export type {
  SchedulerDecision,
  SchedulerSettlementKind,
  SchedulerSnapshot,
  SchedulerTrigger
} from "./scheduler-decision-model.ts";

/**
 * Computes the next generic task-engine action from an immutable state projection.
 * Starting work, awaiting promises, cancellation, and diagnostic output remain in
 * the imperative scheduler shell.
 */
export function decideScheduler(
  snapshot: SchedulerSnapshot,
  trigger: SchedulerTrigger
): SchedulerDecision {
  const state = inspectSnapshot(snapshot);
  const cycle: SchedulerDecisionCycle = Object.freeze({
    context: decisionContext(state),
    state,
    trigger
  });
  const terminalDecision = decideTerminalSchedulerAction(cycle, snapshot);
  if (terminalDecision !== undefined) return terminalDecision;

  const blocked = selectBlockedTask(state);
  if (blocked !== undefined) {
    return freezeDecision({
      ...cycle.context,
      dependencyIds: blocked.dependencyIds,
      kind: "settle-blocked",
      taskId: blocked.task.id,
      trigger
    });
  }

  return decideAdmission(cycle);
}

function decideTerminalSchedulerAction(
  cycle: SchedulerDecisionCycle,
  snapshot: SchedulerSnapshot
): SchedulerDecision | undefined {
  if (cycle.state.pendingTasks.length === 0 && cycle.state.runningTaskIds.size === 0) {
    return freezeDecision({
      ...cycle.context,
      cancelled: snapshot.isCancelled,
      kind: "complete",
      trigger: cycle.trigger
    });
  }
  if (snapshot.isAbortRequested && !snapshot.isCancelled) {
    return freezeDecision({
      ...cycle.context,
      kind: "cancel-pending",
      taskIds: snapshot.pendingTaskIds,
      trigger: Object.freeze({ kind: "cancellation-observed" })
    });
  }
  if (snapshot.isCancelled) {
    if (cycle.state.pendingTasks.length > 0) {
      throw new Error("cancelled scheduler state retains pending tasks");
    }
    return cancellationDrainDecision(cycle);
  }
  if (cycle.state.pendingTasks.length === 0) return runningDrainDecision(cycle);
  return undefined;
}

function cancellationDrainDecision(cycle: SchedulerDecisionCycle): SchedulerDecision {
  return awaitDrainDecision(cycle, "cancellation-drain");
}

function runningDrainDecision(cycle: SchedulerDecisionCycle): SchedulerDecision {
  return awaitDrainDecision(cycle, "running-drain");
}

function awaitDrainDecision(
  cycle: SchedulerDecisionCycle,
  reason: Extract<SchedulerDecision, { readonly kind: "await-running" }>["reason"]
): SchedulerDecision {
  return freezeDecision({
    ...cycle.context,
    eligibleCount: 0,
    kind: "await-running",
    reason,
    reservationUpdate: reservationUnchanged(),
    trigger: cycle.trigger
  });
}
