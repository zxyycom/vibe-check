import { Map as PersistentMap, type Set as PersistentSet } from "immutable";

import type { CompiledAdmissionGraph } from "./compiled-graph.ts";
import {
  mergeTaskQueues,
  queueWithTask,
  type PersistentTaskQueue
} from "./persistent-task-queue.ts";
import type { ReadyGroupFrontier } from "./ready-frontier.ts";

export type StaticSelectionLayer = "tightening" | "continuation" | "ordinary";
export interface StaticGroupFrontier {
  readonly queues: Readonly<Record<StaticSelectionLayer, PersistentTaskQueue | undefined>>;
  readonly revisions: PersistentMap<number, number>;
}

interface StaticFrontierContext {
  readonly compiled: CompiledAdmissionGraph;
  readonly readyGroupFrontier: ReadyGroupFrontier;
  readonly activeScopeSlots: PersistentSet<number>;
}

/** A persistent, globally ranked queue of group heads for each static selection layer. */
export function staticFrontierForSeed(context: StaticFrontierContext): StaticGroupFrontier {
  let frontier = emptyStaticFrontier();
  for (const groupSlot of context.readyGroupFrontier.keys())
    frontier = frontierWithGroup(context, frontier, groupSlot);
  return frontier;
}

/** Relation changes update only their groups; actual scope lifecycle changes reclassify its groups. */
export function transitionStaticFrontier(
  input: Readonly<{
    previous: StaticFrontierContext;
    next: StaticFrontierContext;
    frontier: StaticGroupFrontier;
    affectedTaskSlots: ReadonlySet<number>;
    changedScopeSlots: ReadonlySet<number>;
  }>
): StaticGroupFrontier {
  const { previous, next, affectedTaskSlots, changedScopeSlots } = input;
  const affectedGroups = new Set<number>();
  for (const taskSlot of affectedTaskSlots)
    affectedGroups.add(requiredGroupSlot(next.compiled, taskSlot));
  for (const scopeSlot of changedScopeSlots) {
    for (const groupSlot of next.compiled.constraintGroups.scopeGroupSlots[scopeSlot] ?? [])
      affectedGroups.add(groupSlot);
  }
  let frontier = input.frontier;
  for (const groupSlot of affectedGroups) {
    const layer = staticLayerForGroup(next, groupSlot);
    const previousLayer = staticLayerForGroup(previous, groupSlot);
    if (
      layer === previousLayer &&
      headTaskSlot(next, groupSlot, layer) === headTaskSlot(previous, groupSlot, layer)
    )
      continue;
    frontier = frontierWithGroup(next, frontier, groupSlot);
  }
  return Object.freeze({
    revisions: frontier.revisions,
    queues: Object.freeze({
      tightening: liveStaticQueue({ context: next, frontier, layer: "tightening" }),
      continuation: liveStaticQueue({ context: next, frontier, layer: "continuation" }),
      ordinary: liveStaticQueue({ context: next, frontier, layer: "ordinary" })
    })
  });
}

/** Query-local traversal may skip blocked heads, but never mutates a captured state or fork. */
export function liveStaticQueue(
  input: Readonly<{
    context: StaticFrontierContext;
    frontier: StaticGroupFrontier;
    layer: StaticSelectionLayer;
    queue?: PersistentTaskQueue;
  }>
): PersistentTaskQueue | undefined {
  const { context, frontier, layer } = input;
  let next = input.queue ?? frontier.queues[layer];
  while (next !== undefined) {
    const groupSlot = requiredGroupSlot(context.compiled, next.taskSlot);
    const isCurrentHead =
      next.revision === frontier.revisions.get(groupSlot) &&
      staticLayerForGroup(context, groupSlot) === layer &&
      headTaskSlot(context, groupSlot, layer) === next.taskSlot;
    if (isCurrentHead) return next;
    next = mergeTaskQueues(next.left, next.right);
  }
  return undefined;
}

function frontierWithGroup(
  context: StaticFrontierContext,
  frontier: StaticGroupFrontier,
  groupSlot: number
): StaticGroupFrontier {
  const layer = staticLayerForGroup(context, groupSlot);
  const taskSlot = headTaskSlot(context, groupSlot, layer);
  const revision = (frontier.revisions.get(groupSlot) ?? 0) + 1;
  const revisions = frontier.revisions.set(groupSlot, revision);
  if (taskSlot === undefined) return Object.freeze({ queues: frontier.queues, revisions });
  const groups = context.compiled.constraintGroups;
  const rank = (
    layer === "ordinary" ? groups.ordinaryPreferenceRanks : groups.constrainedPreferenceRanks
  )[taskSlot];
  if (rank === undefined) throw new Error(`admission core global rank is unknown: ${taskSlot}`);
  return Object.freeze({
    revisions,
    queues: Object.freeze({
      ...frontier.queues,
      [layer]: queueWithTask(frontier.queues[layer], { taskSlot, preferenceRank: rank, revision })
    })
  });
}

function staticLayerForGroup(
  context: StaticFrontierContext,
  groupSlot: number
): StaticSelectionLayer {
  const groups = context.compiled.constraintGroups;
  const scopeSlot = groups.groupScopeSlots[groupSlot];
  if (scopeSlot === undefined) return "ordinary";
  if (context.activeScopeSlots.has(scopeSlot)) return "continuation";
  return groups.groupActivatesScope[groupSlot] === true ? "tightening" : "ordinary";
}

function headTaskSlot(
  context: StaticFrontierContext,
  groupSlot: number,
  layer: StaticSelectionLayer
): number | undefined {
  const group = context.readyGroupFrontier.get(groupSlot);
  return (layer === "ordinary" ? group?.ordinary : group?.constrained)?.taskSlot;
}

function requiredGroupSlot(compiled: CompiledAdmissionGraph, taskSlot: number): number {
  const groupSlot = compiled.constraintGroups.taskGroupSlots[taskSlot];
  if (groupSlot === undefined)
    throw new Error(`admission core constraint group is unknown: ${taskSlot}`);
  return groupSlot;
}

function emptyStaticFrontier(): StaticGroupFrontier {
  return Object.freeze({
    revisions: PersistentMap<number, number>(),
    queues: Object.freeze({ tightening: undefined, continuation: undefined, ordinary: undefined })
  });
}
