import { Map as PersistentMap } from "immutable";
import type { CompiledAdmissionGraph } from "./compiled-graph.ts";
import type { ScopeStore } from "./selection-index.ts";
import { scopeForStore } from "./selection-index.ts";
import type { ReadyGroupFrontier, ReadyGroupHeadChange } from "./ready-frontier.ts";
import {
  mergeTaskQueues,
  queueWithTask,
  type PersistentTaskQueue
} from "./persistent-task-queue.ts";

export type StaticSelectionLayer = "tightening" | "continuation" | "ordinary";
export interface StaticGroupFrontier {
  readonly queues: Readonly<Record<StaticSelectionLayer, PersistentTaskQueue | undefined>>;
  readonly revisions: PersistentMap<number, number>;
}
interface StaticFrontierContext {
  readonly compiled: CompiledAdmissionGraph;
  readonly readyGroupFrontier: ReadyGroupFrontier;
  readonly scopes: ScopeStore;
}

export function staticFrontierForSeed(context: StaticFrontierContext): StaticGroupFrontier {
  let frontier = emptyStaticFrontier();
  for (const groupSlot of context.readyGroupFrontier.keys()) {
    const layer = staticLayerForGroup(context, groupSlot);
    frontier = frontierWithHead({
      compiled: context.compiled,
      frontier,
      groupSlot,
      layer,
      taskSlot: headTaskSlot(context, groupSlot, layer)
    });
  }
  return frontier;
}

/** Heads arrive from ready, layers from source lifecycle. Neither membership diff is rediscovered. */
export function transitionStaticFrontier(
  input: Readonly<{
    previous: StaticFrontierContext;
    next: StaticFrontierContext;
    frontier: StaticGroupFrontier;
    heads: readonly ReadyGroupHeadChange[];
    changedScopeSlots: readonly number[];
  }>
): StaticGroupFrontier {
  const { previous, next, heads, changedScopeSlots } = input;
  if (heads.length === 0 && changedScopeSlots.length === 0) return input.frontier;
  const headChanges = new Map(heads.map((change) => [change.groupSlot, change]));
  const affectedGroups = new Set(headChanges.keys());
  for (const scopeSlot of changedScopeSlots)
    for (const groupSlot of next.compiled.constraintGroups.scopeGroupSlots[scopeSlot] ?? [])
      affectedGroups.add(groupSlot);
  let frontier = input.frontier;
  for (const groupSlot of affectedGroups) {
    frontier = transitionGroupHead(previous, next, frontier, groupSlot, headChanges.get(groupSlot));
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

/** A revision identifies the unique current head/layer entry; old branches keep their own map. */
function liveStaticQueue(
  input: Readonly<{
    context: Pick<StaticFrontierContext, "compiled">;
    frontier: StaticGroupFrontier;
    layer: StaticSelectionLayer;
  }>
): PersistentTaskQueue | undefined {
  const { context, frontier, layer } = input;
  let next = frontier.queues[layer];
  while (next !== undefined) {
    const groupSlot = requiredGroupSlot(context.compiled, next.taskSlot);
    if (next.revision === frontier.revisions.get(groupSlot)) return next;
    next = mergeTaskQueues(next.left, next.right);
  }
  return undefined;
}

function frontierWithHead(
  input: Readonly<{
    compiled: CompiledAdmissionGraph;
    frontier: StaticGroupFrontier;
    groupSlot: number;
    layer: StaticSelectionLayer;
    taskSlot: number | undefined;
  }>
): StaticGroupFrontier {
  const { compiled, frontier, groupSlot, layer, taskSlot } = input;
  const revision = (frontier.revisions.get(groupSlot) ?? 0) + 1;
  const revisions = frontier.revisions.set(groupSlot, revision);
  if (taskSlot === undefined) return Object.freeze({ queues: frontier.queues, revisions });
  const groups = compiled.constraintGroups;
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
  if (scopeForStore(context.scopes, scopeSlot) === "active") return "continuation";
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

function headForLayer(
  heads: ReadyGroupHeadChange["before"],
  layer: StaticSelectionLayer
): number | undefined {
  return layer === "ordinary" ? heads.ordinary : heads.constrained;
}

/** Revisions advance only when this group's selected head or static layer changes. */
function transitionGroupHead(
  previous: StaticFrontierContext,
  next: StaticFrontierContext,
  frontier: StaticGroupFrontier,
  groupSlot: number,
  change: ReadyGroupHeadChange | undefined
): StaticGroupFrontier {
  const layer = staticLayerForGroup(next, groupSlot);
  const previousLayer = staticLayerForGroup(previous, groupSlot);
  const previousHead =
    change === undefined
      ? headTaskSlot(previous, groupSlot, previousLayer)
      : headForLayer(change.before, previousLayer);
  const taskSlot =
    change === undefined ? headTaskSlot(next, groupSlot, layer) : headForLayer(change.after, layer);
  if (layer === previousLayer && taskSlot === previousHead) return frontier;
  return frontierWithHead({ compiled: next.compiled, frontier, groupSlot, layer, taskSlot });
}
