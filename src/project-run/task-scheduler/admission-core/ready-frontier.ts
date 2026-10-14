import { Map as PersistentMap, Set as PersistentSet } from "immutable";

import type { CompiledAdmissionGraph } from "./compiled-graph.ts";
import {
  mergeTaskQueues,
  queueWithTask,
  type PersistentTaskQueue
} from "./persistent-task-queue.ts";

export interface ReadyGroupHeads {
  readonly ordinary: PersistentTaskQueue;
  readonly constrained: PersistentTaskQueue;
}
export type ReadyGroupFrontier = PersistentMap<number, ReadyGroupHeads>;

export function readyFrontierForSeed(
  compiled: CompiledAdmissionGraph,
  readyTaskSlots: PersistentSet<number>
): ReadyGroupFrontier {
  let frontier = PersistentMap<number, ReadyGroupHeads>();
  for (const taskSlot of readyTaskSlots) frontier = frontierWithTask(compiled, frontier, taskSlot);
  return frontier;
}

/** Only relation changes insert; mutex/capacity changes never rebuild or prune ready members. */
export function transitionReadyFrontier(
  compiled: CompiledAdmissionGraph,
  frontier: ReadyGroupFrontier,
  previousReady: PersistentSet<number>,
  nextReady: PersistentSet<number>,
  affectedTaskSlots: ReadonlySet<number>
): ReadyGroupFrontier {
  let next = frontier;
  const affectedGroups = new Set<number>();
  for (const taskSlot of affectedTaskSlots) {
    const wasReady = previousReady.has(taskSlot);
    const isReady = nextReady.has(taskSlot);
    if (wasReady === isReady) continue;
    const groupSlot = groupSlotFor(compiled, taskSlot);
    affectedGroups.add(groupSlot);
    if (isReady) next = frontierWithTask(compiled, next, taskSlot);
  }
  // Arbitrary custom selections/cancellation leave non-head tombstones. Each is discarded once
  // on a monotone branch; a query always receives live heads without mutating the old state.
  for (const groupSlot of affectedGroups) {
    const group = next.get(groupSlot);
    if (group === undefined) continue;
    const ordinary = liveQueue(group.ordinary, nextReady);
    if (ordinary === undefined) {
      next = next.delete(groupSlot);
      continue;
    }
    const constrained =
      group.constrained === group.ordinary ? ordinary : liveQueue(group.constrained, nextReady);
    if (constrained === undefined)
      throw new Error("admission core ready orders disagree about membership");
    next = next.set(groupSlot, Object.freeze({ ordinary, constrained }));
  }
  return next;
}

function liveQueue(
  queue: PersistentTaskQueue,
  readyTaskSlots: PersistentSet<number>
): PersistentTaskQueue | undefined {
  let next: PersistentTaskQueue | undefined = queue;
  while (next !== undefined && !readyTaskSlots.has(next.taskSlot))
    next = mergeTaskQueues(next.left, next.right);
  return next;
}

function frontierWithTask(
  compiled: CompiledAdmissionGraph,
  frontier: ReadyGroupFrontier,
  taskSlot: number
): ReadyGroupFrontier {
  const groupSlot = groupSlotFor(compiled, taskSlot);
  const previous = frontier.get(groupSlot);
  const ordinaryRank = compiled.constraintGroups.ordinaryPreferenceRanks[taskSlot];
  const constrainedRank = compiled.constraintGroups.constrainedPreferenceRanks[taskSlot];
  if (ordinaryRank === undefined || constrainedRank === undefined)
    throw new Error(`admission core preference rank is unknown: ${taskSlot}`);
  const ordinary = queueWithTask(previous?.ordinary, { taskSlot, preferenceRank: ordinaryRank });
  // Rank equality extends sharing only when all previously inserted nodes already agree.
  const canSharePreferenceQueues =
    previous?.ordinary === previous?.constrained && ordinaryRank === constrainedRank;
  const constrained = canSharePreferenceQueues
    ? ordinary
    : queueWithTask(previous?.constrained, { taskSlot, preferenceRank: constrainedRank });
  return frontier.set(groupSlot, Object.freeze({ ordinary, constrained }));
}

function groupSlotFor(compiled: CompiledAdmissionGraph, taskSlot: number): number {
  const groupSlot = compiled.constraintGroups.taskGroupSlots[taskSlot];
  if (groupSlot === undefined)
    throw new Error(`admission core constraint group is unknown: ${taskSlot}`);
  return groupSlot;
}
