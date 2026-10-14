import {
  isConstrainedScopeContinuation,
  scopeForTask,
  tighteningScopeForTask
} from "../admission-scope-layers.ts";
import type { ReadyGroupHeads } from "./ready-frontier.ts";
import { activeScopeIdsForCore } from "./scheduler-queries.ts";
import {
  hasCapacityForPendingTask,
  isMutexBlockedForPendingTask,
  type AdmissionCoreSelection
} from "./selection-query.ts";
import { requiredTaskForCore } from "./state-query.ts";
import type { AdmissionCoreState } from "./selection.ts";

interface StaticChoice {
  readonly candidate: AdmissionCoreSelection;
  readonly layer: "tightening" | "continuation" | "ordinary";
  readonly taskSlot: number;
}

/** Same selection layers and legality; each constraint-equivalent group contributes one live head. */
export function staticAdmissionCandidateForCore(
  state: AdmissionCoreState
): AdmissionCoreSelection | undefined {
  const activeScopeIds = new Set(activeScopeIdsForCore(state));
  const rootHasCapacity = state.selection.runningTotal < state.compiled.maxParallel;
  let selected: StaticChoice | undefined;
  for (const group of state.selection.readyGroupFrontier.values()) {
    const choice = staticChoiceForGroup(state, group, activeScopeIds, rootHasCapacity);
    if (choice === undefined) continue;
    if (selected === undefined || compareStaticChoices(state, choice, selected) < 0)
      selected = choice;
  }
  return selected === undefined ? undefined : Object.freeze(selected.candidate);
}

/** All members agree on mutex/capacity and layer; only its layer-specific priority head is needed. */
function staticChoiceForGroup(
  state: AdmissionCoreState,
  group: ReadyGroupHeads,
  activeScopeIds: ReadonlySet<string>,
  rootHasCapacity: boolean
): StaticChoice | undefined {
  if (isMutexBlockedForPendingTask(state, group.ordinary.taskSlot)) return undefined;
  const ordinaryTask = requiredTaskForCore(state, group.ordinary.taskSlot);
  let layer: StaticChoice["layer"] = "ordinary";
  if (
    tighteningScopeForTask(
      state.compiled,
      state.compiled.maxParallel,
      activeScopeIds,
      ordinaryTask
    ) !== undefined
  )
    layer = "tightening";
  else if (
    isConstrainedScopeContinuation(
      state.compiled,
      state.compiled.maxParallel,
      activeScopeIds,
      ordinaryTask
    )
  )
    layer = "continuation";
  const taskSlot = layer === "ordinary" ? group.ordinary.taskSlot : group.constrained.taskSlot;
  const task =
    taskSlot === group.ordinary.taskSlot ? ordinaryTask : requiredTaskForCore(state, taskSlot);
  return {
    candidate: { canAdmit: rootHasCapacity && hasCapacityForPendingTask(state, taskSlot), task },
    layer,
    taskSlot
  };
}

function compareStaticChoices(
  state: AdmissionCoreState,
  left: StaticChoice,
  right: StaticChoice
): number {
  const layerRank = { tightening: 0, continuation: 1, ordinary: 2 } as const;
  const layerOrder = layerRank[left.layer] - layerRank[right.layer];
  if (layerOrder !== 0) return layerOrder;
  if (left.layer === "ordinary")
    return (
      Number(right.candidate.canAdmit) - Number(left.candidate.canAdmit) ||
      right.candidate.task.admissionPriority - left.candidate.task.admissionPriority ||
      left.taskSlot - right.taskSlot
    );
  const leftScope = scopeForTask(state.compiled, left.candidate.task);
  const rightScope = scopeForTask(state.compiled, right.candidate.task);
  if (leftScope === undefined || rightScope === undefined)
    throw new Error("constrained task is missing a scope");
  return (
    leftScope.maxParallel - rightScope.maxParallel ||
    right.candidate.task.admissionPriority - left.candidate.task.admissionPriority ||
    compareText(leftScope.id, rightScope.id) ||
    compareText(left.candidate.task.id, right.candidate.task.id)
  );
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
