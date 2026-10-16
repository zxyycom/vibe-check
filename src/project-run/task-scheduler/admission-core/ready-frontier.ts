import { Map as PersistentMap, type Set as PersistentSet } from "immutable";
import type { CompiledAdmissionGraph } from "./compiled-graph.ts";
import type { MembershipChanges } from "./membership-index.ts";
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
interface ReadyHeadSlots {
  readonly ordinary: number | undefined;
  readonly constrained: number | undefined;
}
export interface ReadyGroupHeadChange {
  readonly groupSlot: number;
  readonly before: ReadyHeadSlots;
  readonly after: ReadyHeadSlots;
}

export function readyFrontierForSeed(
  compiled: CompiledAdmissionGraph,
  readyTaskSlots: PersistentSet<number>
): ReadyGroupFrontier {
  let frontier = PersistentMap<number, ReadyGroupHeads>();
  for (const taskSlot of readyTaskSlots) frontier = frontierWithTask(compiled, frontier, taskSlot);
  return frontier;
}

/** Consume actual membership changes once; publish only changed live heads to the static view. */
export function transitionReadyFrontier(
  input: Readonly<{
    compiled: CompiledAdmissionGraph;
    frontier: ReadyGroupFrontier;
    nextReady: PersistentSet<number>;
    membershipDelta: MembershipChanges;
  }>
): Readonly<{ frontier: ReadyGroupFrontier; heads: readonly ReadyGroupHeadChange[] }> {
  const { compiled, frontier, nextReady, membershipDelta } = input;
  let next = frontier;
  const affectedGroups = new Set<number>();
  for (const taskSlot of membershipDelta.added) {
    const groupSlot = groupSlotFor(compiled, taskSlot);
    affectedGroups.add(groupSlot);
    next = frontierWithTask(compiled, next, taskSlot, groupSlot);
  }
  for (const taskSlot of membershipDelta.removed)
    affectedGroups.add(groupSlotFor(compiled, taskSlot));
  const heads: ReadyGroupHeadChange[] = [];
  for (const groupSlot of affectedGroups) {
    const previous = frontier.get(groupSlot);
    const group = next.get(groupSlot);
    if (group === undefined) continue;
    const live = liveGroupHeads(group, nextReady);
    if (live === undefined) next = next.delete(groupSlot);
    else if (live !== group) next = next.set(groupSlot, live);
    if (
      previous?.ordinary.taskSlot !== live?.ordinary.taskSlot ||
      previous?.constrained.taskSlot !== live?.constrained.taskSlot
    ) {
      heads.push(
        Object.freeze({
          groupSlot,
          before: headSlots(previous),
          after: headSlots(live)
        })
      );
    }
  }
  return Object.freeze({ frontier: next, heads: Object.freeze(heads) });
}

/** Both preference orders must retain exactly the same live membership. */
function liveGroupHeads(
  group: ReadyGroupHeads,
  nextReady: PersistentSet<number>
): ReadyGroupHeads | undefined {
  const ordinary = liveQueue(group.ordinary, nextReady);
  if (ordinary === undefined) return undefined;
  const constrained =
    group.constrained === group.ordinary ? ordinary : liveQueue(group.constrained, nextReady);
  if (constrained === undefined)
    throw new Error("admission core ready orders disagree about membership");
  // Non-head removals do not replace either persistent queue or its Map entry.
  return ordinary === group.ordinary && constrained === group.constrained
    ? group
    : Object.freeze({ ordinary, constrained });
}

function headSlots(group: ReadyGroupHeads | undefined): ReadyHeadSlots {
  return Object.freeze({
    ordinary: group?.ordinary.taskSlot,
    constrained: group?.constrained.taskSlot
  });
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
  taskSlot: number,
  groupSlot = groupSlotFor(compiled, taskSlot)
): ReadyGroupFrontier {
  const previous = frontier.get(groupSlot);
  const ordinaryRank = compiled.constraintGroups.ordinaryPreferenceRanks[taskSlot];
  const constrainedRank = compiled.constraintGroups.constrainedPreferenceRanks[taskSlot];
  if (ordinaryRank === undefined || constrainedRank === undefined)
    throw new Error(`admission core preference rank is unknown: ${taskSlot}`);
  const ordinary = queueWithTask(previous?.ordinary, { taskSlot, preferenceRank: ordinaryRank });
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
