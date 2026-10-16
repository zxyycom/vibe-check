import { hasCapacityForPendingTask } from "../../src/project-run/task-scheduler/admission-core/capacity-query.ts";
import { Heap } from "mnemonist";
import type { AdmissionCoreState } from "../../src/project-run/task-scheduler/admission-core/selection.ts";
import type { PersistentTaskQueue } from "../../src/project-run/task-scheduler/admission-core/persistent-task-queue.ts";
import type { StaticSelectionLayer } from "../../src/project-run/task-scheduler/admission-core/static-frontier.ts";
import { isMutexBlockedForPendingTask, type AdmissionCoreSelection } from "../../src/project-run/task-scheduler/admission-core/selection-query.ts";
import { requiredTaskForCore } from "../../src/project-run/task-scheduler/admission-core/state-query.ts";

/** Experimental only: ephemeral reference heap, never successor backing or another legality owner. */
export function nativeStaticAdmissionCandidateForCore(state: AdmissionCoreState): AdmissionCoreSelection | undefined {
  for (const layer of ["tightening", "continuation", "ordinary"] as const) {
    const selected = candidateForLayer(state, layer);
    if (selected !== undefined) return selected;
  }
  return undefined;
}
function candidateForLayer(state: AdmissionCoreState, layer: StaticSelectionLayer): AdmissionCoreSelection | undefined {
  const rootHasCapacity = state.selection.memberships.status.running.size < state.compiled.maxParallel;
  const frontier = state.selection.frontiers.static;
  let node = frontier.queues[layer];
  let pending: Heap<PersistentTaskQueue> | undefined;
  let firstBlocked: AdmissionCoreSelection | undefined;
  while (node !== undefined) {
    const groupSlot = state.compiled.constraintGroups.taskGroupSlots[node.taskSlot];
    if (groupSlot === undefined) throw new Error("unknown candidate group");
    if (node.revision === frontier.revisions.get(groupSlot) && !isMutexBlockedForPendingTask(state, node.taskSlot)) {
      const candidate = Object.freeze({ task: requiredTaskForCore(state, node.taskSlot), canAdmit: rootHasCapacity && hasCapacityForPendingTask(state, node.taskSlot) });
      if (layer !== "ordinary" || candidate.canAdmit || !rootHasCapacity) return candidate;
      firstBlocked ??= candidate;
    }
    pending ??= new Heap<PersistentTaskQueue>((left, right) => left.preferenceRank - right.preferenceRank);
    if (node.left !== undefined) pending.push(node.left);
    if (node.right !== undefined) pending.push(node.right);
    node = pending.pop();
  }
  return firstBlocked;
}
