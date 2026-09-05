import type { CompiledAdmissionGraph } from "./admission-core-compiled-graph.ts";
import {
  forcedQueueFromTaskSlots,
  freezeSelectionIndex,
  persistentNumbersFor,
  persistentStatuses,
  statusForStore,
  type AdmissionSelectionIndex,
  type CoreTaskStatus,
  type ForcedTaskQueue,
  type StatusStore
} from "./admission-core-selection-index.ts";

interface SeedTaskCounters {
  readonly mutexHolders: number[];
  readonly nonCompletedDependencies: number[];
  readonly pendingDependencies: number[];
  readonly pendingObservations: number[];
  readonly remainingTaskCount: number;
  readonly runningTotal: number;
}

/** Builds every immutable selection index from one static graph and one exact status seed. */
export function selectionIndexForSeed(
  compiled: CompiledAdmissionGraph,
  statuses: readonly CoreTaskStatus[],
  activeScopeIds: readonly string[] | undefined,
  legacyRunningMutexes: readonly string[] | undefined
): AdmissionSelectionIndex {
  const persistentStatus = persistentStatuses(statuses);
  const counters = seedTaskCounters(compiled, persistentStatus);
  const activeScopes = seedActiveScopes(compiled, activeScopeIds);
  return freezeSelectionIndex({
    activeScopeSlots: activeScopeSlotsForSeed(compiled, persistentStatus, activeScopes),
    activeScopes: persistentNumbersFor(activeScopes),
    forcedQueue: forcedQueueForSeed(compiled, persistentStatus, counters),
    heldMutexBlockers: persistentNumbersFor(
      heldMutexBlockersForSeed(compiled, counters.mutexHolders, legacyRunningMutexes)
    ),
    legacyRunningMutexes:
      legacyRunningMutexes === undefined ? undefined : Object.freeze([...legacyRunningMutexes]),
    mutexHolders: persistentNumbersFor(counters.mutexHolders),
    nonCompletedDependencies: persistentNumbersFor(counters.nonCompletedDependencies),
    pendingDependencies: persistentNumbersFor(counters.pendingDependencies),
    pendingObservations: persistentNumbersFor(counters.pendingObservations),
    remainingTaskCount: counters.remainingTaskCount,
    runningTotal: counters.runningTotal,
    statuses: persistentStatus
  });
}

/** Status/running/mutex and relation-counter seed stage. */
function seedTaskCounters(
  compiled: CompiledAdmissionGraph,
  statuses: StatusStore
): SeedTaskCounters {
  const mutexHolders = Array.from({ length: compiled.mutexSlotById.size }, () => 0);
  const pendingDependencies: number[] = [];
  const nonCompletedDependencies: number[] = [];
  const pendingObservations: number[] = [];
  let remainingTaskCount = 0;
  let runningTotal = 0;
  for (const [taskSlot, task] of compiled.graph.tasks.entries()) {
    const status = statusForStore(statuses, taskSlot);
    if (status.kind === "pending" || status.kind === "running") remainingTaskCount += 1;
    if (status.kind === "running") {
      runningTotal += 1;
      for (const mutexSlot of compiled.taskMutexSlots[taskSlot]) mutexHolders[mutexSlot] += 1;
    }
    appendDependencyCountsForSeed(
      compiled,
      statuses,
      task.dependsOn,
      pendingDependencies,
      nonCompletedDependencies
    );
    pendingObservations.push(observationCountForSeed(compiled, statuses, task.observes));
  }
  return {
    mutexHolders,
    nonCompletedDependencies,
    pendingDependencies,
    pendingObservations,
    remainingTaskCount,
    runningTotal
  };
}

function appendDependencyCountsForSeed(
  compiled: CompiledAdmissionGraph,
  statuses: StatusStore,
  dependencyIds: readonly string[],
  pendingDependencies: number[],
  nonCompletedDependencies: number[]
): void {
  let pending = 0;
  let nonCompleted = 0;
  for (const dependencyId of dependencyIds) {
    const dependency = statusForStore(
      statuses,
      requiredTaskSlotForCompiled(compiled, dependencyId)
    );
    if (dependency.kind !== "settled") pending += 1;
    else if (dependency.settlementKind !== "completed") nonCompleted += 1;
  }
  pendingDependencies.push(pending);
  nonCompletedDependencies.push(nonCompleted);
}

function observationCountForSeed(
  compiled: CompiledAdmissionGraph,
  statuses: StatusStore,
  observationIds: readonly string[]
): number {
  let pending = 0;
  for (const observationId of observationIds) {
    if (
      statusForStore(statuses, requiredTaskSlotForCompiled(compiled, observationId)).kind !==
      "settled"
    ) {
      pending += 1;
    }
  }
  return pending;
}

/** Legacy external mutexes and dynamic holder occurrences intentionally contribute independently. */
function heldMutexBlockersForSeed(
  compiled: CompiledAdmissionGraph,
  mutexHolders: readonly number[],
  legacyRunningMutexes: readonly string[] | undefined
): number[] {
  const blockers = compiled.graph.tasks.map(() => 0);
  const legacyHeldMutexes = new Set(legacyRunningMutexes);
  for (const [taskSlot, task] of compiled.graph.tasks.entries()) {
    for (const [mutexOccurrence, mutexSlot] of compiled.taskMutexSlots[taskSlot].entries()) {
      blockers[taskSlot] += mutexHolders[mutexSlot];
      if (legacyHeldMutexes.has(task.mutex[mutexOccurrence])) blockers[taskSlot] += 1;
    }
  }
  return blockers;
}

function seedActiveScopes(
  compiled: CompiledAdmissionGraph,
  activeScopeIds: readonly string[] | undefined
): number[] {
  const activeScopes = Array.from({ length: compiled.graph.scopes.length }, () => 0);
  for (const scopeId of activeScopeIds ?? []) {
    const scopeSlot = compiled.scopeSlotById.get(scopeId);
    if (scopeSlot !== undefined) activeScopes[scopeSlot] = 1;
  }
  return activeScopes;
}

/** Active root seed stage excludes scopes whose terminal is already settled. */
function activeScopeSlotsForSeed(
  compiled: CompiledAdmissionGraph,
  statuses: StatusStore,
  activeScopes: readonly number[]
): readonly number[] {
  const slots = activeScopes
    .map((active, scopeSlot) => (active > 0 ? scopeSlot : undefined))
    .filter((scopeSlot): scopeSlot is number => scopeSlot !== undefined)
    .filter(
      (scopeSlot) =>
        statusForStore(
          statuses,
          requiredTaskSlotForCompiled(
            compiled,
            requiredScopeForCompiled(compiled, scopeSlot).terminalTaskId
          )
        ).kind !== "settled"
    );
  return sortedActiveScopeSlots(compiled, slots);
}

/** Forced-frontier seed stage retains only eligible pending dependents. */
function forcedQueueForSeed(
  compiled: CompiledAdmissionGraph,
  statuses: StatusStore,
  counters: SeedTaskCounters
): ForcedTaskQueue {
  const forced = compiled.graph.tasks
    .map((_, taskSlot) => taskSlot)
    .filter(
      (taskSlot) =>
        statusForStore(statuses, taskSlot).kind === "pending" &&
        counters.pendingDependencies[taskSlot] === 0 &&
        (counters.nonCompletedDependencies[taskSlot] ?? 0) > 0
    );
  return forcedQueueFromTaskSlots(forced);
}

export function insertActiveScopeSlot(
  compiled: CompiledAdmissionGraph,
  slots: readonly number[],
  next: number
): readonly number[] {
  if (slots.includes(next)) return slots;
  return Object.freeze(sortedActiveScopeSlots(compiled, [...slots, next]));
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
  const taskSlot = compiled.taskSlotsById.get(taskId);
  if (taskSlot === undefined) throw new Error(`admission core task is unknown: ${taskId}`);
  return taskSlot;
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
