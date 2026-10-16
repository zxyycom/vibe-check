import { Set as PersistentSet } from "immutable";
import type { CompiledAdmissionGraph } from "./compiled-graph.ts";
import {
  requiredTaskMutexSlotsForCompiled,
  requiredTaskResourceClaimsForCompiled
} from "./compiled-graph-lookup.ts";
import { readyFrontierForSeed } from "./ready-frontier.ts";
import { staticFrontierForSeed } from "./static-frontier.ts";
import {
  forcedQueueFromTaskSlots,
  persistentNumbersFor,
  persistentStatuses,
  persistentScopesFor,
  pendingRelationBlockerStageForSelection,
  statusForStore,
  type AdmissionSelectionIndex,
  type AdmissionRelationFacts,
  type CoreTaskStatus,
  type ScopeLifecycle,
  type StatusStore
} from "./selection-index.ts";

interface SeedTaskCounters {
  readonly mutexHolders: number[];
  readonly nonCompletedDependencies: number[];
  readonly pendingDependencies: number[];
  readonly pendingObservations: number[];
  readonly resourceInUse: number[];
}

/** Cold seed builds source facts once, then their typed membership and ordered views. */
export function selectionIndexForSeed(
  compiled: CompiledAdmissionGraph,
  seed: Readonly<{
    statuses: readonly CoreTaskStatus[];
    activeScopeIds?: readonly string[];
    legacyRunningMutexes?: readonly string[];
  }>
): AdmissionSelectionIndex {
  const statuses = persistentStatuses(seed.statuses);
  const counters = seedTaskCounters(compiled, statuses);
  const relations = Object.freeze({
    pendingDependencies: persistentNumbersFor(counters.pendingDependencies),
    pendingObservations: persistentNumbersFor(counters.pendingObservations),
    nonCompletedDependencies: persistentNumbersFor(counters.nonCompletedDependencies)
  });
  const memberships = seedTaskMemberships(seed.statuses, relations);
  const lifecycle = seedScopeLifecycle(compiled, statuses, seed.activeScopeIds);
  const scopes = persistentScopesFor(lifecycle);
  const activeScopeOrder = sortedActiveScopeSlots(
    compiled,
    lifecycle.flatMap((kind, scopeSlot) => (kind === "active" ? [scopeSlot] : []))
  );
  const ready = readyFrontierForSeed(compiled, memberships.relationReady);
  return Object.freeze({
    facts: Object.freeze({
      statuses,
      relations,
      occupancy: Object.freeze({
        mutexHolders: persistentNumbersFor(counters.mutexHolders),
        resourceInUse: persistentNumbersFor(counters.resourceInUse)
      }),
      scopes,
      legacyRunningMutexes:
        seed.legacyRunningMutexes === undefined
          ? undefined
          : Object.freeze([...seed.legacyRunningMutexes])
    }),
    memberships,
    frontiers: Object.freeze({
      ready,
      static: staticFrontierForSeed({ compiled, readyGroupFrontier: ready, scopes }),
      activeScopeOrder,
      forced: forcedQueueFromTaskSlots(seedForcedTaskSlots(compiled, statuses, counters))
    })
  });
}

function seedTaskCounters(
  compiled: CompiledAdmissionGraph,
  statuses: StatusStore
): SeedTaskCounters {
  const mutexHolders = Array.from({ length: compiled.mutexSlotById.size }, () => 0);
  const resourceInUse = compiled.resourceCapacityBySlot.map(() => 0);
  const pendingDependencies: number[] = [];
  const nonCompletedDependencies: number[] = [];
  const pendingObservations: number[] = [];
  for (const [taskSlot, task] of compiled.graph.tasks.entries()) {
    if (statusForStore(statuses, taskSlot).kind === "running") {
      for (const mutexSlot of requiredTaskMutexSlotsForCompiled(compiled, taskSlot))
        incrementCounter(mutexHolders, mutexSlot, 1, "mutex holder");
      for (const claim of requiredTaskResourceClaimsForCompiled(compiled, taskSlot))
        incrementCounter(resourceInUse, claim.resourceSlot, claim.units, "resource usage");
    }
    let pending = 0;
    let nonCompleted = 0;
    for (const id of task.dependsOn) {
      const dependency = statusForStore(statuses, requiredTaskSlotForCompiled(compiled, id));
      if (dependency.kind !== "settled") pending++;
      else if (dependency.settlementKind !== "completed") nonCompleted++;
    }
    pendingDependencies.push(pending);
    nonCompletedDependencies.push(nonCompleted);
    let observations = 0;
    for (const id of task.observes)
      if (statusForStore(statuses, requiredTaskSlotForCompiled(compiled, id)).kind !== "settled")
        observations++;
    pendingObservations.push(observations);
  }
  return {
    mutexHolders,
    resourceInUse,
    pendingDependencies,
    nonCompletedDependencies,
    pendingObservations
  };
}
function incrementCounter(
  values: number[],
  slot: number,
  amount: number,
  counterName: string
): void {
  const current = values[slot];
  if (current === undefined)
    throw new Error(`admission core ${counterName} slot is unknown: ${slot}`);
  values[slot] = current + amount;
}

export function insertActiveScopeSlot(
  compiled: CompiledAdmissionGraph,
  slots: readonly number[],
  next: number
): readonly number[] {
  const position = activeScopePosition(compiled, slots, next);
  if (slots[position] === next) return slots;
  return Object.freeze([...slots.slice(0, position), next, ...slots.slice(position)]);
}
export function removeActiveScopeSlot(
  compiled: CompiledAdmissionGraph,
  slots: readonly number[],
  removed: number
): readonly number[] {
  const position = activeScopePosition(compiled, slots, removed);
  if (slots[position] !== removed) return slots;
  return Object.freeze([...slots.slice(0, position), ...slots.slice(position + 1)]);
}
function activeScopePosition(
  compiled: CompiledAdmissionGraph,
  slots: readonly number[],
  scopeSlot: number
): number {
  let lower = 0;
  let upper = slots.length;
  while (lower < upper) {
    const middle = lower + Math.floor((upper - lower) / 2);
    const current = slots[middle];
    if (current === undefined)
      throw new Error("admission core active scope order has a missing slot");
    if (compareScopeCapacityForCompiled(compiled, current, scopeSlot) < 0) lower = middle + 1;
    else upper = middle;
  }
  return lower;
}
export function sortedActiveScopeSlots(
  compiled: CompiledAdmissionGraph,
  slots: readonly number[]
): readonly number[] {
  return Object.freeze(
    [...slots].sort((left, right) => compareScopeCapacityForCompiled(compiled, left, right))
  );
}
export function compareScopeCapacityForCompiled(
  compiled: CompiledAdmissionGraph,
  left: number,
  right: number
): number {
  const leftScope = requiredScopeForCompiled(compiled, left);
  const rightScope = requiredScopeForCompiled(compiled, right);
  return leftScope.maxParallel - rightScope.maxParallel || compareText(leftScope.id, rightScope.id);
}
export function requiredTaskSlotForCompiled(
  compiled: CompiledAdmissionGraph,
  taskId: string
): number {
  const slot = compiled.taskSlotsById.get(taskId);
  if (slot === undefined) throw new Error(`admission core task is unknown: ${taskId}`);
  return slot;
}
export function requiredScopeForCompiled(
  compiled: CompiledAdmissionGraph,
  scopeSlot: number
): CompiledAdmissionGraph["graph"]["scopes"][number] {
  const scope = compiled.graph.scopes[scopeSlot];
  if (scope === undefined) throw new Error(`admission core scope slot is unknown: ${scopeSlot}`);
  return scope;
}
function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/** Status and relation-ready membership share the seed relation predicate. */
function seedTaskMemberships(
  statuses: readonly CoreTaskStatus[],
  relations: AdmissionRelationFacts
) {
  const status = {
    pending: PersistentSet<number>(),
    running: PersistentSet<number>(),
    settled: PersistentSet<number>()
  };
  for (const [slot, taskStatus] of statuses.entries())
    if (taskStatus.kind !== "absent") status[taskStatus.kind] = status[taskStatus.kind].add(slot);
  const relationReady = status.pending.filter(
    (slot) => pendingRelationBlockerStageForSelection(relations, slot) === undefined
  );
  return Object.freeze({ status: Object.freeze(status), relationReady });
}

function seedScopeLifecycle(
  compiled: CompiledAdmissionGraph,
  statuses: StatusStore,
  activeScopeIds: readonly string[] | undefined
): ScopeLifecycle[] {
  const activeIds = new Set(activeScopeIds ?? []);
  return compiled.graph.scopes.map((scope) => {
    if (
      statusForStore(statuses, requiredTaskSlotForCompiled(compiled, scope.terminalTaskId)).kind ===
      "settled"
    )
      return "closed";
    return activeIds.has(scope.id) ? "active" : "inactive";
  });
}

function seedForcedTaskSlots(
  compiled: CompiledAdmissionGraph,
  statuses: StatusStore,
  counters: SeedTaskCounters
): number[] {
  return compiled.graph.tasks.flatMap((_, taskSlot) =>
    statusForStore(statuses, taskSlot).kind === "pending" &&
    counters.pendingDependencies[taskSlot] === 0 &&
    (counters.nonCompletedDependencies[taskSlot] ?? 0) > 0
      ? [taskSlot]
      : []
  );
}
