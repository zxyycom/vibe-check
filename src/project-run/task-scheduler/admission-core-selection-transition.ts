import type { CompiledAdmissionGraph } from "./admission-core-compiled-graph.ts";
import {
  enqueueForcedTaskSlots,
  freezeSelectionIndex,
  numberFor,
  statusForSelection,
  statusForStore,
  withNumberDeltas,
  withStatusAt,
  type AdmissionSelectionIndex,
  type CoreTaskStatus,
  type ForcedTaskQueue,
  type NumberStore,
  type StatusStore
} from "./admission-core-selection-index.ts";
import { insertActiveScopeSlot } from "./admission-core-selection-seed.ts";

interface MutableTransitionFacts {
  readonly activatedScopeSlot: number | undefined;
  activeScopeSlots: readonly number[];
  activeScopes: NumberStore;
  forcedQueue: ForcedTaskQueue;
  heldMutexBlockers: NumberStore;
  mutexHolders: NumberStore;
  nonCompletedDependencies: NumberStore;
  pendingDependencies: NumberStore;
  pendingObservations: NumberStore;
  readonly previous: CoreTaskStatus;
  remainingTaskCount: number;
  runningTotal: number;
  readonly status: CoreTaskStatus;
  statuses: StatusStore;
  readonly taskSlot: number;
}

/** Applies one status event through staged persistent index deltas. */
export function transitionIndexedSelection(
  compiled: CompiledAdmissionGraph,
  selection: AdmissionSelectionIndex,
  taskSlot: number,
  status: CoreTaskStatus,
  activatedScopeSlot: number | undefined
): AdmissionSelectionIndex {
  const facts = initialTransitionFacts(selection, taskSlot, status, activatedScopeSlot);
  applyRunningAndMutexDelta(compiled, facts);
  applySettlementRelationDelta(compiled, facts);
  applyScopeLifecycleDelta(compiled, facts);
  return freezeSelectionIndex({
    activeScopeSlots: facts.activeScopeSlots,
    activeScopes: facts.activeScopes,
    forcedQueue: facts.forcedQueue,
    heldMutexBlockers: facts.heldMutexBlockers,
    legacyRunningMutexes: selection.legacyRunningMutexes,
    mutexHolders: facts.mutexHolders,
    nonCompletedDependencies: facts.nonCompletedDependencies,
    pendingDependencies: facts.pendingDependencies,
    pendingObservations: facts.pendingObservations,
    remainingTaskCount: facts.remainingTaskCount,
    runningTotal: facts.runningTotal,
    statuses: facts.statuses
  });
}

function initialTransitionFacts(
  selection: AdmissionSelectionIndex,
  taskSlot: number,
  status: CoreTaskStatus,
  activatedScopeSlot: number | undefined
): MutableTransitionFacts {
  return {
    activatedScopeSlot,
    activeScopeSlots: selection.activeScopeSlots,
    activeScopes: selection.activeScopes,
    forcedQueue: selection.forcedQueue,
    heldMutexBlockers: selection.heldMutexBlockers,
    mutexHolders: selection.mutexHolders,
    nonCompletedDependencies: selection.nonCompletedDependencies,
    pendingDependencies: selection.pendingDependencies,
    pendingObservations: selection.pendingObservations,
    previous: statusForSelection(selection, taskSlot),
    remainingTaskCount: selection.remainingTaskCount,
    runningTotal: selection.runningTotal,
    status,
    statuses: withStatusAt(selection.statuses, taskSlot, status),
    taskSlot
  };
}

/** Running admission/settlement changes global count and only affected mutex reverse fanout. */
function applyRunningAndMutexDelta(
  compiled: CompiledAdmissionGraph,
  facts: MutableTransitionFacts
): void {
  const { previous, status, taskSlot } = facts;
  if (previous.kind === "pending" && status.kind === "running") {
    facts.runningTotal += 1;
    facts.mutexHolders = withMutexHolderDelta(compiled, facts.mutexHolders, taskSlot, 1);
    facts.heldMutexBlockers = withMutexBlockerDelta(compiled, facts.heldMutexBlockers, taskSlot, 1);
  } else if (previous.kind === "running" && status.kind === "settled") {
    facts.runningTotal -= 1;
    facts.remainingTaskCount -= 1;
    facts.mutexHolders = withMutexHolderDelta(compiled, facts.mutexHolders, taskSlot, -1);
    facts.heldMutexBlockers = withMutexBlockerDelta(
      compiled,
      facts.heldMutexBlockers,
      taskSlot,
      -1
    );
  } else if (previous.kind === "pending" && status.kind === "settled") {
    facts.remainingTaskCount -= 1;
  }
}

function withMutexHolderDelta(
  compiled: CompiledAdmissionGraph,
  mutexHolders: NumberStore,
  taskSlot: number,
  delta: 1 | -1
): NumberStore {
  return withNumberDeltas(
    mutexHolders,
    compiled.taskMutexSlots[taskSlot].map((mutexSlot) => [mutexSlot, delta] as const)
  );
}

function withMutexBlockerDelta(
  compiled: CompiledAdmissionGraph,
  blockers: NumberStore,
  taskSlot: number,
  delta: 1 | -1
): NumberStore {
  return withNumberDeltas(blockers, mutexBlockerDeltasFor(compiled, taskSlot, delta));
}

function mutexBlockerDeltasFor(
  compiled: CompiledAdmissionGraph,
  taskSlot: number,
  delta: 1 | -1
): readonly (readonly [number, number])[] {
  const deltas: [number, number][] = [];
  for (const mutexSlot of compiled.taskMutexSlots[taskSlot]) {
    for (const blockedTaskSlot of compiled.relationIndexes.reverseMutexOccurrences[mutexSlot] ??
      []) {
      deltas.push([blockedTaskSlot, delta]);
    }
  }
  return deltas;
}

/** Settlement changes only the changed task's relation reverse fanout and forced frontier. */
function applySettlementRelationDelta(
  compiled: CompiledAdmissionGraph,
  facts: MutableTransitionFacts
): void {
  const { previous, status, taskSlot } = facts;
  if (previous.kind === "settled" || status.kind !== "settled") return;
  const reverseDependencies = compiled.relationIndexes.reverseDependencies[taskSlot];
  facts.pendingDependencies = withNumberDeltas(
    facts.pendingDependencies,
    reverseDependencies.map((dependentSlot) => [dependentSlot, -1] as const)
  );
  if (status.settlementKind !== "completed") {
    facts.nonCompletedDependencies = withNumberDeltas(
      facts.nonCompletedDependencies,
      reverseDependencies.map((dependentSlot) => [dependentSlot, 1] as const)
    );
  }
  facts.pendingObservations = withNumberDeltas(
    facts.pendingObservations,
    compiled.relationIndexes.reverseObservations[taskSlot].map(
      (observerSlot) => [observerSlot, -1] as const
    )
  );
  facts.forcedQueue = enqueueForcedTaskSlots(
    facts.forcedQueue,
    newlyForcedTaskSlots(facts, reverseDependencies)
  );
}

function newlyForcedTaskSlots(
  facts: MutableTransitionFacts,
  reverseDependencies: readonly number[]
): ReadonlySet<number> {
  const readyForced = new Set<number>();
  for (const dependentSlot of reverseDependencies) {
    if (
      statusForStore(facts.statuses, dependentSlot).kind === "pending" &&
      numberFor(facts.pendingDependencies, dependentSlot) === 0 &&
      numberFor(facts.nonCompletedDependencies, dependentSlot) > 0
    ) {
      readyForced.add(dependentSlot);
    }
  }
  return readyForced;
}

/** Activation happens before terminal close, preserving the canonical scope lifecycle order. */
function applyScopeLifecycleDelta(
  compiled: CompiledAdmissionGraph,
  facts: MutableTransitionFacts
): void {
  const { activatedScopeSlot, previous, status, taskSlot } = facts;
  if (activatedScopeSlot !== undefined && numberFor(facts.activeScopes, activatedScopeSlot) === 0) {
    facts.activeScopes = withNumberDeltas(facts.activeScopes, [[activatedScopeSlot, 1]]);
    facts.activeScopeSlots = insertActiveScopeSlot(
      compiled,
      facts.activeScopeSlots,
      activatedScopeSlot
    );
  }
  if (previous.kind === "settled" || status.kind !== "settled") return;
  for (const scopeSlot of compiled.scopeSlotsByTerminalTaskSlot[taskSlot]) {
    facts.activeScopeSlots = Object.freeze(
      facts.activeScopeSlots.filter((candidate) => candidate !== scopeSlot)
    );
  }
}
