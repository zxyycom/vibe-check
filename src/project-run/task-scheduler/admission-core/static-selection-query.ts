import { hasCapacityForPendingTask } from "./capacity-query.ts";
import { Heap } from "mnemonist";
import type { AdmissionCoreState } from "./selection.ts";
import type { PersistentTaskQueue } from "./persistent-task-queue.ts";
import type { StaticSelectionLayer } from "./static-frontier.ts";
import { isMutexBlockedForPendingTask, type AdmissionCoreSelection } from "./selection-query.ts";
import { requiredTaskForCore } from "./state-query.ts";

/** Ranked prefix traversal uses a query-local reference heap, never persistent successor copies. */
export function staticAdmissionCandidateForCore(
  state: AdmissionCoreState
): AdmissionCoreSelection | undefined {
  for (const layer of ["tightening", "continuation", "ordinary"] as const) {
    const selected = candidateForLayer(state, layer);
    if (selected !== undefined) return selected;
  }
  return undefined;
}
function candidateForLayer(
  state: AdmissionCoreState,
  layer: StaticSelectionLayer
): AdmissionCoreSelection | undefined {
  const rootHasCapacity =
    state.selection.memberships.status.running.size < state.compiled.maxParallel;
  const frontier = state.selection.frontiers.static;
  let node = frontier.queues[layer];
  let pending: Heap<PersistentTaskQueue> | undefined;
  let firstBlocked: AdmissionCoreSelection | undefined;
  while (node !== undefined) {
    const groupSlot = state.compiled.constraintGroups.taskGroupSlots[node.taskSlot];
    if (groupSlot === undefined)
      throw new Error(`admission core constraint group is unknown: ${node.taskSlot}`);
    if (
      node.revision === frontier.revisions.get(groupSlot) &&
      !isMutexBlockedForPendingTask(state, node.taskSlot)
    ) {
      const candidate = Object.freeze({
        task: requiredTaskForCore(state, node.taskSlot),
        canAdmit: rootHasCapacity && hasCapacityForPendingTask(state, node.taskSlot)
      });
      if (mustUseFirstCandidate(layer, rootHasCapacity, candidate.canAdmit)) return candidate;
      firstBlocked ??= candidate;
    }
    pending ??= new Heap<PersistentTaskQueue>(comparePreferenceRank);
    enqueueChildren(pending, node);
    node = pending.pop();
  }
  return firstBlocked;
}

/** Constrained layers never backfill; a full root budget also preserves the first candidate. */
function mustUseFirstCandidate(
  layer: StaticSelectionLayer,
  rootHasCapacity: boolean,
  canAdmit: boolean
): boolean {
  return layer !== "ordinary" || canAdmit || !rootHasCapacity;
}

function comparePreferenceRank(left: PersistentTaskQueue, right: PersistentTaskQueue): number {
  return left.preferenceRank - right.preferenceRank;
}

/** Best-first traversal retains only immutable node references, not successor queue copies. */
function enqueueChildren(pending: Heap<PersistentTaskQueue>, node: PersistentTaskQueue): void {
  if (node.left !== undefined) pending.push(node.left);
  if (node.right !== undefined) pending.push(node.right);
}
