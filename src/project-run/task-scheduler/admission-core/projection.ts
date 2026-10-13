import type {
  AdmissionCatalog,
  AdmissionInspection,
  AdmissionSelectionRejectionReason,
  AdmissionSettlementOutcome
} from "../../../project-definition/scheduler-policy.ts";
import type { PlannedTask, PlannedTaskGraph } from "../graph.ts";
import {
  isAdmissionEligibleForPendingTask,
  selectionRejectionForPendingTask
} from "./selection-query.ts";
import {
  activeScopesForCore,
  effectiveMaxParallelForCore,
  requiredScopeSlotForCore,
  requiredTaskForCore,
  scopeLifecycleForCore,
  statusForCore,
  taskSlotsForCore
} from "./state-query.ts";
import { numberFor } from "./selection-index.ts";
import type { AdmissionCoreState } from "./selection.ts";
import type { SchedulerSettlementKind } from "../scheduler-decision-model.ts";

/** Materializes the public catalog only when the public getter reads it. */
export function catalogForCore(state: AdmissionCoreState): AdmissionCatalog {
  const selectableTaskIds: string[] = [];
  const nonSelectableTasks: { reason: AdmissionSelectionRejectionReason; taskId: string }[] = [];
  for (const taskSlot of publicTaskSlotsForCore(state, "pending")) {
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
  const runningTaskIds = publicTaskSlotsForCore(state, "running").map(
    (slot) => requiredTaskForCore(state, slot).id
  );
  const settledTasks: { outcome: AdmissionSettlementOutcome; taskId: string }[] = [];
  for (const taskSlot of publicTaskSlotsForCore(state, "settled")) {
    const status = statusForCore(state, taskSlot);
    if (status.kind !== "settled")
      throw new Error("admission core settled partition disagrees with status");
    const outcome = publicOutcomeForSettlement(status.settlementKind);
    if (outcome !== undefined)
      settledTasks.push(
        Object.freeze({ outcome, taskId: requiredTaskForCore(state, taskSlot).id })
      );
  }
  const hasSelectablePending = state.selection.candidateTaskSlots.some((slot) =>
    isAdmissionEligibleForPendingTask(state, slot)
  );
  return Object.freeze({
    capacity: Object.freeze({
      effectiveMaxParallel: effectiveMaxParallelForCore(state),
      maxParallel: state.compiled.maxParallel,
      running: state.selection.runningTotal
    }),
    nextBoundary: nextBoundaryFor(hasSelectablePending, state.selection.runningTotal),
    resources: resourceOccupancyForCore(state),
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
  readonly resources: AdmissionInspection["resources"];
  readonly runningTaskIds: readonly string[];
  readonly settledTasks: readonly Readonly<{
    readonly kind: SchedulerSettlementKind;
    readonly taskId: string;
  }>[];
}> {
  const pendingTasks = taskSlotsForCore(state, "pending").map((slot) =>
    requiredTaskForCore(state, slot)
  );
  const runningTaskIds: string[] = [];
  const runningMutexes = new Set<string>();
  const settledTasks: { kind: SchedulerSettlementKind; taskId: string }[] = [];
  for (const slot of taskSlotsForCore(state, "running")) {
    const task = requiredTaskForCore(state, slot);
    runningTaskIds.push(task.id);
    for (const mutexId of task.mutex) runningMutexes.add(mutexId);
  }
  for (const slot of taskSlotsForCore(state, "settled")) {
    const status = statusForCore(state, slot);
    if (status.kind !== "settled")
      throw new Error("admission core settled partition disagrees with status");
    settledTasks.push({ kind: status.settlementKind, taskId: requiredTaskForCore(state, slot).id });
  }
  return Object.freeze({
    activeScopeIds: Object.freeze(activeScopesForCore(state).map((scope) => scope.id)),
    effectiveMaxParallel: effectiveMaxParallelForCore(state),
    graph: state.compiled.graph,
    maxParallel: state.compiled.maxParallel,
    pendingTasks: Object.freeze(pendingTasks),
    resources: resourceOccupancyForCore(state),
    runningMutexes: Object.freeze([...runningMutexes]),
    runningTaskIds: Object.freeze(runningTaskIds),
    settledTasks: Object.freeze(settledTasks.map((task) => Object.freeze(task)))
  });
}

/** Public lexical order is a projection, distinct from real Scheduler declaration order. */
function publicTaskSlotsForCore(
  state: AdmissionCoreState,
  kind: "pending" | "running" | "settled"
): readonly number[] {
  return state.selection.taskSlotsByStatus[kind]
    .toArray()
    .sort((left, right) => publicRankForCore(state, left) - publicRankForCore(state, right));
}

function publicRankForCore(state: AdmissionCoreState, slot: number): number {
  const rank = state.compiled.taskPublicRanksBySlot[slot];
  if (rank === undefined) throw new Error(`admission core public rank is unknown: ${slot}`);
  return rank;
}

function resourceOccupancyForCore(state: AdmissionCoreState): AdmissionInspection["resources"] {
  return Object.freeze(
    state.compiled.graph.resourceCapacities.map(({ resourceId, units }, resourceSlot) => {
      const inUse = numberFor(state.selection.resourceInUse, resourceSlot);
      return Object.freeze({
        available: units - inUse,
        capacity: units,
        inUse,
        resourceId
      });
    })
  );
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
