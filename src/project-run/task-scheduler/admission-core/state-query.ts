import type { Set as PersistentSet } from "immutable";
import type { PlannedTask, PlannedTaskGraph } from "../graph.ts";
import type { CompiledAdmissionGraph } from "./compiled-graph.ts";
import { requiredTaskForCompiled } from "./compiled-graph-lookup.ts";
import {
  scopeForStore,
  statusForSelection,
  type CoreTaskStatus,
  type ScopeLifecycle,
  type TaskPartitionKind
} from "./selection-index.ts";
import { requiredScopeForCompiled, requiredTaskSlotForCompiled } from "./selection-seed.ts";
import type { AdmissionCoreState } from "./selection.ts";

// Cache only requested edge ordering, keyed by immutable membership identity. Weak keys do not
// retain completed snapshots; lexical order is additionally bound to its compiled graph ranks.
const declarationOrder = new WeakMap<PersistentSet<number>, readonly number[]>();
const publicOrder = new WeakMap<
  CompiledAdmissionGraph,
  WeakMap<PersistentSet<number>, readonly number[]>
>();

export function statusForCore(state: AdmissionCoreState, taskSlot: number): CoreTaskStatus {
  return statusForSelection(state.selection, taskSlot);
}
export function pendingTaskCountForCore(state: AdmissionCoreState): number {
  return state.selection.memberships.status.pending.size;
}
export function runningTaskCountForCore(state: AdmissionCoreState): number {
  return state.selection.memberships.status.running.size;
}
export function isCoreComplete(state: AdmissionCoreState): boolean {
  return pendingTaskCountForCore(state) === 0 && runningTaskCountForCore(state) === 0;
}
export function requiredTaskForCore(state: AdmissionCoreState, taskSlot: number): PlannedTask {
  return requiredTaskForCompiled(state.compiled, taskSlot);
}
export function requiredTaskSlotForCore(state: AdmissionCoreState, taskId: string): number {
  return requiredTaskSlotForCompiled(state.compiled, taskId);
}
export function requiredScopeForCore(
  state: AdmissionCoreState,
  scopeSlot: number
): PlannedTaskGraph["scopes"][number] {
  return requiredScopeForCompiled(state.compiled, scopeSlot);
}
export function requiredScopeSlotForCore(state: AdmissionCoreState, scopeId: string): number {
  const slot = state.compiled.scopeSlotById.get(scopeId);
  if (slot === undefined) throw new Error(`admission core scope is unknown: ${scopeId}`);
  return slot;
}
export function taskSlotsForCore(
  state: AdmissionCoreState,
  kind: TaskPartitionKind
): readonly number[] {
  return declaredSlots(state.selection.memberships.status[kind]);
}
export function relationReadyTaskSlotsForCore(state: AdmissionCoreState): Iterable<number> {
  return state.selection.memberships.relationReady;
}
export function orderedRelationReadyTaskSlotsForCore(state: AdmissionCoreState): readonly number[] {
  return declaredSlots(state.selection.memberships.relationReady);
}
export function publicTaskSlotsForCore(
  state: AdmissionCoreState,
  kind: TaskPartitionKind
): readonly number[] {
  let cache = publicOrder.get(state.compiled);
  if (cache === undefined) {
    cache = new WeakMap();
    publicOrder.set(state.compiled, cache);
  }
  const members = state.selection.memberships.status[kind];
  let slots = cache.get(members);
  if (slots === undefined) {
    slots = Object.freeze(
      members
        .toArray()
        .sort((left, right) => publicRank(state.compiled, left) - publicRank(state.compiled, right))
    );
    cache.set(members, slots);
  }
  return slots;
}
function declaredSlots(members: PersistentSet<number>): readonly number[] {
  let slots = declarationOrder.get(members);
  if (slots === undefined) {
    slots = Object.freeze(members.toArray().sort((left, right) => left - right));
    declarationOrder.set(members, slots);
  }
  return slots;
}
function publicRank(compiled: CompiledAdmissionGraph, slot: number): number {
  const rank = compiled.taskPublicRanksBySlot[slot];
  if (rank === undefined) throw new Error(`admission core public rank is unknown: ${slot}`);
  return rank;
}
export function scopeToActivateForCore(state: AdmissionCoreState, taskId: string): string | null {
  const taskSlot = state.compiled.taskSlotsById.get(taskId);
  if (taskSlot === undefined) return null;
  const scopeSlot = state.compiled.taskScopeSlots[taskSlot];
  if (scopeSlot === undefined || !isScopeInactiveForCore(state, scopeSlot)) return null;
  return state.compiled.taskActivatesScope[taskSlot] === true
    ? requiredScopeForCore(state, scopeSlot).id
    : null;
}
export function activeScopesForCore(
  state: AdmissionCoreState
): PlannedTaskGraph["scopes"][number][] {
  return state.selection.frontiers.activeScopeOrder.map((slot) =>
    requiredScopeForCore(state, slot)
  );
}
export function scopeLifecycleForCore(
  state: AdmissionCoreState,
  scopeSlot: number
): ScopeLifecycle {
  return scopeForStore(state.selection.facts.scopes, scopeSlot);
}
export function isScopeInactiveForCore(state: AdmissionCoreState, scopeSlot: number): boolean {
  return scopeLifecycleForCore(state, scopeSlot) === "inactive";
}
export function effectiveMaxParallelForCore(state: AdmissionCoreState): number {
  const slot = state.selection.frontiers.activeScopeOrder[0];
  return slot === undefined
    ? state.compiled.maxParallel
    : Math.min(state.compiled.maxParallel, requiredScopeForCore(state, slot).maxParallel);
}
