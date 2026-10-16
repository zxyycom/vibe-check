import { hasCapacityForPendingTask } from "../../src/project-run/task-scheduler/admission-core/capacity-query.ts";
import type { PersistentTaskQueue } from "../../src/project-run/task-scheduler/admission-core/persistent-task-queue.ts";
import type { CompiledAdmissionGraph } from "../../src/project-run/task-scheduler/admission-core/compiled-graph.ts";
import { mergeTaskQueues } from "../../src/project-run/task-scheduler/admission-core/persistent-task-queue.ts";
import type { StaticGroupFrontier, StaticSelectionLayer } from "../../src/project-run/task-scheduler/admission-core/static-frontier.ts";
import {
  isMutexBlockedForPendingTask,
  type AdmissionCoreSelection
} from "../../src/project-run/task-scheduler/admission-core/selection-query.ts";
import { requiredTaskForCore } from "../../src/project-run/task-scheduler/admission-core/state-query.ts";
import type { AdmissionCoreState } from "../../src/project-run/task-scheduler/admission-core/selection.ts";

/** Consume ranked group heads, retaining constrained waits and ordinary admissible-first ordering. */
export function persistentStaticAdmissionCandidateForCore(
  state: AdmissionCoreState
): AdmissionCoreSelection | undefined {
  for (const layer of ["tightening", "continuation", "ordinary"] as const) {
    const choice = candidateForLayer(state, layer);
    if (choice !== undefined) return choice;
  }
  return undefined;
}

function candidateForLayer(
  state: AdmissionCoreState,
  layer: StaticSelectionLayer
): AdmissionCoreSelection | undefined {
  const frontierContext = {
    compiled: state.compiled
  };
  const rootHasCapacity =
    state.selection.memberships.status.running.size < state.compiled.maxParallel;
  let queue = state.selection.frontiers.static.queues[layer];
  let firstBlocked: AdmissionCoreSelection | undefined;
  while (queue !== undefined) {
    queue = liveStaticQueue({
      context: frontierContext,
      frontier: state.selection.frontiers.static,
      queue,
      layer
    });
    if (queue === undefined) break;
    const taskSlot = queue.taskSlot;
    if (!isMutexBlockedForPendingTask(state, taskSlot)) {
      const candidate = Object.freeze({
        task: requiredTaskForCore(state, taskSlot),
        canAdmit: rootHasCapacity && hasCapacityForPendingTask(state, taskSlot)
      });
      if (layer !== "ordinary" || candidate.canAdmit || !rootHasCapacity) return candidate;
      firstBlocked ??= candidate;
    }
    queue = mergeTaskQueues(queue.left, queue.right);
  }
  return firstBlocked;
}

/** Original pre-adoption liveness helper retained locally because final Product made it private. */
function liveStaticQueue(input: Readonly<{context: {compiled: CompiledAdmissionGraph}; frontier: StaticGroupFrontier; layer: StaticSelectionLayer; queue?: PersistentTaskQueue}>): PersistentTaskQueue | undefined {
  const { context, frontier, layer } = input;
  let next = input.queue ?? frontier.queues[layer];
  while (next !== undefined) {
    const groupSlot = context.compiled.constraintGroups.taskGroupSlots[next.taskSlot];
    if (groupSlot === undefined) throw new Error(`admission core constraint group is unknown: ${next.taskSlot}`);
    if (next.revision === frontier.revisions.get(groupSlot)) return next;
    next = mergeTaskQueues(next.left, next.right);
  }
  return undefined;
}
