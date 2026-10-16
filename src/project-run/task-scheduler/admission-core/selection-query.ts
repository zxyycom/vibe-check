import {
  capacityRejectionFor,
  hasCapacityForPendingTask,
  hasResourceShortageForPendingTask,
  inactiveActivationCapacityBlockerFor
} from "./capacity-query.ts";
import type { AdmissionSelectionRejectionReason } from "../../../project-definition/scheduler-policy.ts";
import type { PlannedTask } from "../graph.ts";
import { requiredTaskMutexSlotsForCompiled } from "./compiled-graph-lookup.ts";
import {
  numberFor,
  pendingRelationBlockerStageForSelection,
  type PendingBlockerStage
} from "./selection-index.ts";
import type { AdmissionCoreState } from "./selection.ts";
import {
  requiredTaskForCore,
  requiredTaskSlotForCore,
  statusForCore,
  orderedRelationReadyTaskSlotsForCore
} from "./state-query.ts";

export interface AdmissionCoreSelection {
  readonly canAdmit: boolean;
  readonly task: PlannedTask;
}

/** Public validation and catalog payloads preserve lexical duplicate occurrences. */
export function selectionRejectionForPendingTask(
  state: AdmissionCoreState,
  taskSlot: number
): AdmissionSelectionRejectionReason | undefined {
  const stage = pendingBlockerStageForCore(state, taskSlot);
  return stage === undefined
    ? capacityRejectionFor(state, taskSlot)
    : blockerPayloadFor(state, taskSlot, stage);
}

function blockerPayloadFor(
  state: AdmissionCoreState,
  taskSlot: number,
  stage: PendingBlockerStage
): AdmissionSelectionRejectionReason {
  const task = requiredTaskForCore(state, taskSlot);
  switch (stage) {
    case "depends-on-pending":
      return Object.freeze({
        kind: stage,
        taskIds: sorted(
          task.dependsOn.filter(
            (taskId) =>
              statusForCore(state, requiredTaskSlotForCore(state, taskId)).kind !== "settled"
          )
        )
      });
    case "observes-pending":
      return Object.freeze({
        kind: stage,
        taskIds: sorted(
          task.observes.filter(
            (taskId) =>
              statusForCore(state, requiredTaskSlotForCore(state, taskId)).kind !== "settled"
          )
        )
      });
    case "mutex-held":
      return Object.freeze({
        kind: stage,
        mutexIds: sorted(task.mutex.filter((mutexId) => isMutexHeld(state, mutexId)))
      });
  }
}

export function isAdmissionEligibleForPendingTask(
  state: AdmissionCoreState,
  taskSlot: number
): boolean {
  return (
    pendingBlockerStageForCore(state, taskSlot) === undefined &&
    hasCapacityForPendingTask(state, taskSlot)
  );
}

/** Independent blocker facts, not primary rejection: root/scope must not hide a resource shortage. */
export function pendingBlockerFactsForCore(
  state: AdmissionCoreState,
  taskSlot: number
): Readonly<{
  dependency: boolean;
  mutex: boolean;
  resourceCapacity: boolean;
}> {
  return Object.freeze({
    dependency:
      numberFor(state.selection.facts.relations.pendingDependencies, taskSlot) > 0 ||
      numberFor(state.selection.facts.relations.nonCompletedDependencies, taskSlot) > 0 ||
      numberFor(state.selection.facts.relations.pendingObservations, taskSlot) > 0,
    mutex: isMutexBlockedForPendingTask(state, taskSlot),
    resourceCapacity: hasResourceShortageForPendingTask(state, taskSlot)
  });
}

/** Measurement classification uses primary readiness/capacity without materializing public reason payloads. */
export function admissionQueueKindForCore(
  state: AdmissionCoreState,
  taskSlot: number
): "admissible-pending" | "capacity-blocked" | "mutex-blocked" | undefined {
  if (!isAdmissionViablePendingTaskForCore(state, taskSlot)) return undefined;
  const stage = pendingBlockerStageForCore(state, taskSlot);
  switch (stage) {
    case "depends-on-pending":
    case "observes-pending":
      return undefined;
    case "mutex-held":
      return "mutex-blocked";
    case undefined:
      return hasCapacityForPendingTask(state, taskSlot) ? "admissible-pending" : "capacity-blocked";
  }
}

export function admissionCandidatesForCore(
  state: AdmissionCoreState
): readonly AdmissionCoreSelection[] {
  const candidates: AdmissionCoreSelection[] = [];
  for (const taskSlot of orderedRelationReadyTaskSlotsForCore(state)) {
    if (isMutexBlockedForPendingTask(state, taskSlot)) continue;
    const task = requiredTaskForCore(state, taskSlot);
    candidates.push(Object.freeze({ canAdmit: hasCapacityForPendingTask(state, taskSlot), task }));
  }
  return Object.freeze(candidates);
}

function pendingBlockerStageForCore(
  state: AdmissionCoreState,
  taskSlot: number
): PendingBlockerStage | undefined {
  const relation = pendingRelationBlockerStageForSelection(
    state.selection.facts.relations,
    taskSlot
  );
  if (relation !== undefined) return relation;
  return isMutexBlockedForPendingTask(state, taskSlot) ? "mutex-held" : undefined;
}

/** Shared dynamic mutex readiness; transition updates holders, never broadcasts to task cohorts. */
export function isMutexBlockedForPendingTask(state: AdmissionCoreState, taskSlot: number): boolean {
  if (
    requiredTaskMutexSlotsForCompiled(state.compiled, taskSlot).some(
      (mutexSlot) => numberFor(state.selection.facts.occupancy.mutexHolders, mutexSlot) > 0
    )
  )
    return true;
  if (state.selection.facts.legacyRunningMutexes === undefined) return false;
  return requiredTaskForCore(state, taskSlot).mutex.some(
    (mutexId) => state.selection.facts.legacyRunningMutexes?.includes(mutexId) === true
  );
}

function isMutexHeld(state: AdmissionCoreState, mutexId: string): boolean {
  if (state.selection.facts.legacyRunningMutexes?.includes(mutexId) === true) return true;
  const mutexSlot = state.compiled.mutexSlotById.get(mutexId);
  return (
    mutexSlot !== undefined &&
    numberFor(state.selection.facts.occupancy.mutexHolders, mutexSlot) > 0
  );
}

function sorted(values: readonly string[]): readonly string[] {
  return Object.freeze([...values].sort(compareText));
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/** No status precondition: a group representative can already be settled. */
export function admissionQueueLocalKindForCore(
  state: AdmissionCoreState,
  taskSlot: number
): "mutex-blocked" | "capacity-blocked" | "shared-capacity" {
  if (isMutexBlockedForPendingTask(state, taskSlot)) return "mutex-blocked";
  if (
    hasResourceShortageForPendingTask(state, taskSlot) ||
    inactiveActivationCapacityBlockerFor(
      state,
      taskSlot,
      state.selection.memberships.status.running.size
    ) !== undefined
  )
    return "capacity-blocked";
  return "shared-capacity";
}
export function isAdmissionViablePendingTaskForCore(
  state: AdmissionCoreState,
  taskSlot: number
): boolean {
  return (
    state.selection.memberships.relationReady.has(taskSlot) &&
    numberFor(state.selection.facts.relations.nonCompletedDependencies, taskSlot) === 0
  );
}
