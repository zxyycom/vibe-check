import type { PlannedTask } from "./graph.ts";
import {
  activationScopeFor,
  canAdmit,
  capacityWaitReason,
  isDependencyMutexEligible,
  selectConstrainedContinuation,
  selectOrdinaryReadyTask,
  selectTighteningTask,
  type SchedulerInspection
} from "./scheduler-decision-inspection.ts";
import {
  freezeDecision,
  reservationClear,
  reservationSet,
  reservationUnchanged,
  type ReservationUpdate,
  type SchedulerAdmissionReason,
  type SchedulerAwaitReason,
  type SchedulerDecision,
  type SchedulerDecisionContext,
  type SchedulerTrigger
} from "./scheduler-decision-model.ts";

export interface SchedulerDecisionCycle {
  readonly context: SchedulerDecisionContext;
  readonly state: SchedulerInspection;
  readonly trigger: SchedulerTrigger;
}

interface AdmissionSelection {
  readonly reason: SchedulerAdmissionReason;
  readonly reservationUpdate: ReservationUpdate;
  readonly task: PlannedTask;
}

interface AwaitingSchedulerDecision {
  readonly eligibleTasks: readonly PlannedTask[];
  readonly reason: SchedulerAwaitReason;
  readonly reservationUpdate: ReservationUpdate;
}

export function decideAdmission(cycle: SchedulerDecisionCycle): SchedulerDecision {
  const eligibleTasks = cycle.state.pendingTasks.filter((task) =>
    isDependencyMutexEligible(task, cycle.state)
  );
  if (eligibleTasks.length === 0) {
    return awaitDecision(cycle, {
      eligibleTasks,
      reason: "dependency-or-mutex",
      reservationUpdate: reservationUnchanged()
    });
  }

  const reservedTask = taskById(cycle.state.reservationTaskId, eligibleTasks);
  if (reservedTask !== undefined)
    return decideReservedAdmission(cycle, eligibleTasks, reservedTask);

  return decideUnreservedAdmission(cycle, eligibleTasks);
}

function decideReservedAdmission(
  cycle: SchedulerDecisionCycle,
  eligibleTasks: readonly PlannedTask[],
  reservedTask: PlannedTask
): SchedulerDecision {
  const selection: AdmissionSelection = {
    reason: "reservation",
    reservationUpdate: reservationClear(),
    task: reservedTask
  };
  if (canAdmit(cycle.state, reservedTask)) return admitDecision(cycle, selection, eligibleTasks);
  return awaitDecision(cycle, {
    eligibleTasks,
    reason: "reserved-tightening-scope",
    reservationUpdate: reservationUnchanged()
  });
}

function decideUnreservedAdmission(
  cycle: SchedulerDecisionCycle,
  eligibleTasks: readonly PlannedTask[]
): SchedulerDecision {
  const reservationUpdate = staleReservationUpdate(cycle.state);
  const tighteningTask = selectTighteningTask(
    cycle.state,
    eligibleTasks,
    cycle.context.capacity.effectiveMaxParallel
  );
  if (tighteningTask !== undefined) {
    return admissionOrCapacityWait(
      cycle,
      eligibleTasks,
      { reason: "tightening-scope", reservationUpdate, task: tighteningTask },
      "reserved-tightening-scope"
    );
  }

  const continuation = selectConstrainedContinuation(
    cycle.state,
    eligibleTasks,
    cycle.context.capacity.effectiveMaxParallel
  );
  if (continuation !== undefined) {
    return admissionOrCapacityWait(
      cycle,
      eligibleTasks,
      { reason: "constrained-continuation", reservationUpdate, task: continuation },
      capacityWaitReason(cycle.state)
    );
  }

  return admissionOrCapacityWait(
    cycle,
    eligibleTasks,
    {
      reason: "canonical-order",
      reservationUpdate,
      task: selectOrdinaryReadyTask(eligibleTasks)
    },
    capacityWaitReason(cycle.state)
  );
}

function admissionOrCapacityWait(
  cycle: SchedulerDecisionCycle,
  eligibleTasks: readonly PlannedTask[],
  selection: AdmissionSelection,
  waitReason: SchedulerAwaitReason
): SchedulerDecision {
  if (canAdmit(cycle.state, selection.task)) return admitDecision(cycle, selection, eligibleTasks);
  const reservationUpdate =
    selection.reason === "tightening-scope"
      ? reservationSet(selection.task.id)
      : selection.reservationUpdate;
  return awaitDecision(cycle, { eligibleTasks, reason: waitReason, reservationUpdate });
}

function admitDecision(
  cycle: SchedulerDecisionCycle,
  selection: AdmissionSelection,
  eligibleTasks: readonly PlannedTask[]
): SchedulerDecision {
  return freezeDecision({
    ...cycle.context,
    admissionPriority: selection.task.admissionPriority,
    eligibleCount: eligibleTasks.length,
    kind: "admit",
    reason: selection.reason,
    reservationUpdate: selection.reservationUpdate,
    scopeToActivate: activationScopeFor(cycle.state, selection.task)?.id ?? null,
    taskId: selection.task.id,
    trigger: cycle.trigger
  });
}

function awaitDecision(
  cycle: SchedulerDecisionCycle,
  waiting: AwaitingSchedulerDecision
): SchedulerDecision {
  if (cycle.state.runningTaskIds.size === 0) {
    throw new Error("scheduler has pending tasks but no runnable or running task");
  }
  return freezeDecision({
    ...cycle.context,
    eligibleCount: waiting.eligibleTasks.length,
    kind: "await-running",
    reason: waiting.reason,
    reservationUpdate: waiting.reservationUpdate,
    trigger: cycle.trigger
  });
}

function staleReservationUpdate(state: SchedulerInspection): ReservationUpdate {
  return state.reservationTaskId === undefined ? reservationUnchanged() : reservationClear();
}

function taskById(
  taskId: string | undefined,
  tasks: readonly PlannedTask[]
): PlannedTask | undefined {
  return taskId === undefined ? undefined : tasks.find((task) => task.id === taskId);
}
