import type {
  AdmissionCatalog,
  AdmissionInspection,
  AdmissionSelectionRejectionReason,
  AdmissionSettlementOutcome
} from "../../../project-definition/scheduler-policy.ts";
import type { PlannedTask, PlannedTaskGraph } from "../graph.ts";
import {
  activeScopesForCore,
  effectiveMaxParallelForCore,
  isAdmissionEligibleForPendingTask,
  requiredScopeSlotForCore,
  requiredTaskForCore,
  scopeLifecycleForCore,
  selectionRejectionForPendingTask,
  statusForCore
} from "./selection-query.ts";
import type { AdmissionCoreState } from "./selection.ts";
import type { SchedulerSettlementKind } from "../scheduler-decision-model.ts";

/** Materializes the public catalog only when the public getter reads it. */
export function catalogForCore(state: AdmissionCoreState): AdmissionCatalog {
  const selectableTaskIds: string[] = [];
  const nonSelectableTasks: { reason: AdmissionSelectionRejectionReason; taskId: string }[] = [];
  for (const taskSlot of state.compiled.taskSlotsInPublicOrder) {
    if (statusForCore(state, taskSlot).kind !== "pending") continue;
    const reason = selectionRejectionForPendingTask(state, taskSlot);
    const taskId = requiredTaskForCore(state, taskSlot).id;
    if (reason === undefined) selectableTaskIds.push(taskId);
    else nonSelectableTasks.push(Object.freeze({ reason, taskId }));
  }
  return Object.freeze({
    nonSelectableTasks: Object.freeze(nonSelectableTasks),
    selectableTaskIds: Object.freeze(selectableTaskIds)
  });
}

export function inspectionForCore(state: AdmissionCoreState): AdmissionInspection {
  const runningTaskIds: string[] = [];
  const settledTasks: { outcome: AdmissionSettlementOutcome; taskId: string }[] = [];
  for (const taskSlot of state.compiled.taskSlotsInPublicOrder) {
    const task = requiredTaskForCore(state, taskSlot);
    const status = statusForCore(state, taskSlot);
    if (status.kind === "running") runningTaskIds.push(task.id);
    if (status.kind === "settled") {
      const outcome = publicOutcomeForSettlement(status.settlementKind);
      if (outcome !== undefined) settledTasks.push(Object.freeze({ outcome, taskId: task.id }));
    }
  }
  const hasSelectablePending = state.compiled.graph.tasks.some(
    (_, taskSlot) =>
      statusForCore(state, taskSlot).kind === "pending" &&
      isAdmissionEligibleForPendingTask(state, taskSlot)
  );
  return Object.freeze({
    capacity: Object.freeze({
      effectiveMaxParallel: effectiveMaxParallelForCore(state),
      maxParallel: state.compiled.maxParallel,
      running: state.selection.runningTotal
    }),
    nextBoundary: nextBoundaryFor(hasSelectablePending, state.selection.runningTotal),
    runningTaskIds: Object.freeze(runningTaskIds),
    scopes: Object.freeze(
      [...state.compiled.graph.scopes]
        .sort((left, right) => compareText(left.id, right.id))
        .map((scope) =>
          Object.freeze({
            lifecycle: scopeLifecycleForCore(state, requiredScopeSlotForCore(state, scope.id)),
            scopeId: scope.id
          })
        )
    ),
    settledTasks: Object.freeze(settledTasks)
  });
}

/** Scheduler-only projection retained for policy choice and diagnostics, not a second transition model. */
export function schedulerInspectionForCore(state: AdmissionCoreState): Readonly<{
  readonly activeScopeIds: readonly string[];
  readonly effectiveMaxParallel: number;
  readonly graph: PlannedTaskGraph;
  readonly maxParallel: number;
  readonly pendingTasks: readonly PlannedTask[];
  readonly runningMutexes: readonly string[];
  readonly runningTaskIds: readonly string[];
  readonly settledTasks: readonly Readonly<{
    readonly kind: SchedulerSettlementKind;
    readonly taskId: string;
  }>[];
}> {
  const pendingTasks: PlannedTask[] = [];
  const runningTaskIds: string[] = [];
  const runningMutexes = new Set<string>();
  const settledTasks: { kind: SchedulerSettlementKind; taskId: string }[] = [];
  for (const [taskSlot, task] of state.compiled.graph.tasks.entries()) {
    const status = statusForCore(state, taskSlot);
    if (status.kind === "pending") pendingTasks.push(task);
    if (status.kind === "running") {
      runningTaskIds.push(task.id);
      for (const mutexId of task.mutex) runningMutexes.add(mutexId);
    }
    if (status.kind === "settled") {
      settledTasks.push({ kind: status.settlementKind, taskId: task.id });
    }
  }
  return Object.freeze({
    activeScopeIds: Object.freeze(activeScopesForCore(state).map((scope) => scope.id)),
    effectiveMaxParallel: effectiveMaxParallelForCore(state),
    graph: state.compiled.graph,
    maxParallel: state.compiled.maxParallel,
    pendingTasks: Object.freeze(pendingTasks),
    runningMutexes: Object.freeze([...runningMutexes]),
    runningTaskIds: Object.freeze(runningTaskIds),
    settledTasks: Object.freeze(settledTasks.map((task) => Object.freeze(task)))
  });
}

function nextBoundaryFor(
  hasSelectablePending: boolean,
  runningTaskCount: number
): "select" | "wait" | "complete" {
  if (hasSelectablePending) return "select";
  if (runningTaskCount > 0) return "wait";
  return "complete";
}

function publicOutcomeForSettlement(
  settlementKind: SchedulerSettlementKind
): AdmissionSettlementOutcome | undefined {
  switch (settlementKind) {
    case "completed":
      return "satisfied";
    case "prerequisite-unsatisfied":
    case "failed":
      return "unsatisfied";
    case "blocked":
    case "cancelled-before-start":
      return undefined;
  }
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
