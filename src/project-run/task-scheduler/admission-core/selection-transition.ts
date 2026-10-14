import { transitionReadyFrontier } from "./ready-frontier.ts";
import type { CompiledAdmissionGraph } from "./compiled-graph.ts";
import {
  requiredReverseDependenciesForCompiled,
  requiredReverseObservationsForCompiled,
  requiredScopeTerminalSlotsForCompiled,
  requiredTaskMutexSlotsForCompiled,
  requiredTaskResourceClaimsForCompiled
} from "./compiled-graph-lookup.ts";
import {
  enqueueForcedTaskSlots,
  freezeSelectionIndex,
  numberFor,
  pendingRelationBlockerStageForSelection,
  statusForSelection,
  statusForStore,
  withNumberDeltas,
  withStatusAt,
  type AdmissionSelectionIndex,
  type CoreTaskStatus,
  type ForcedTaskQueue,
  type NumberStore,
  type StatusStore
} from "./selection-index.ts";
import { insertActiveScopeSlot } from "./selection-seed.ts";

export interface IndexedSelectionTransition {
  readonly taskSlot: number;
  readonly status: CoreTaskStatus;
  readonly activatedScopeSlot: number | undefined;
}

interface MutableTransitionFacts {
  readonly affectedCandidateSlots: Set<number>;
  readonly activatedScopeSlot: number | undefined;
  activeScopeSlots: readonly number[];
  activeScopes: NumberStore;
  forcedQueue: ForcedTaskQueue;
  mutexHolders: NumberStore;
  nonCompletedDependencies: NumberStore;
  pendingDependencies: NumberStore;
  pendingObservations: NumberStore;
  readonly previous: CoreTaskStatus;
  remainingTaskCount: number;
  resourceInUse: NumberStore;
  runningTotal: number;
  readonly status: CoreTaskStatus;
  statuses: StatusStore;
  readonly taskSlot: number;
}

/** Applies one status event through staged persistent index deltas. */
export function transitionIndexedSelection(
  compiled: CompiledAdmissionGraph,
  selection: AdmissionSelectionIndex,
  transition: IndexedSelectionTransition
): AdmissionSelectionIndex {
  const { taskSlot, status } = transition;
  const facts = initialTransitionFacts(selection, transition);
  applyRunningOccupancyDelta(compiled, facts);
  applySettlementRelationDelta(compiled, facts);
  applyScopeLifecycleDelta(compiled, facts);
  const taskSlotsByStatus = { ...selection.taskSlotsByStatus };
  if (facts.previous.kind !== "absent")
    taskSlotsByStatus[facts.previous.kind] =
      taskSlotsByStatus[facts.previous.kind].delete(taskSlot);
  if (status.kind !== "absent")
    taskSlotsByStatus[status.kind] = taskSlotsByStatus[status.kind].add(taskSlot);
  const relationReadyTaskSlots = selection.relationReadyTaskSlots.withMutations((batch) => {
    for (const slot of facts.affectedCandidateSlots) {
      if (
        statusForStore(facts.statuses, slot).kind === "pending" &&
        pendingRelationBlockerStageForSelection(facts, slot) === undefined
      )
        batch.add(slot);
      else batch.delete(slot);
    }
  });
  return freezeSelectionIndex({
    relationReadyTaskSlots,
    readyGroupFrontier: transitionReadyFrontier(
      compiled,
      selection.readyGroupFrontier,
      selection.relationReadyTaskSlots,
      relationReadyTaskSlots,
      facts.affectedCandidateSlots
    ),
    taskSlotsByStatus: Object.freeze(taskSlotsByStatus),
    activeScopeSlots: facts.activeScopeSlots,
    activeScopes: facts.activeScopes,
    forcedQueue: facts.forcedQueue,
    legacyRunningMutexes: selection.legacyRunningMutexes,
    mutexHolders: facts.mutexHolders,
    nonCompletedDependencies: facts.nonCompletedDependencies,
    pendingDependencies: facts.pendingDependencies,
    pendingObservations: facts.pendingObservations,
    remainingTaskCount: facts.remainingTaskCount,
    resourceInUse: facts.resourceInUse,
    runningTotal: facts.runningTotal,
    statuses: facts.statuses
  });
}

function initialTransitionFacts(
  selection: AdmissionSelectionIndex,
  transition: IndexedSelectionTransition
): MutableTransitionFacts {
  const { taskSlot, status, activatedScopeSlot } = transition;
  return {
    affectedCandidateSlots: new Set([taskSlot]),
    activatedScopeSlot,
    activeScopeSlots: selection.activeScopeSlots,
    activeScopes: selection.activeScopes,
    forcedQueue: selection.forcedQueue,
    mutexHolders: selection.mutexHolders,
    nonCompletedDependencies: selection.nonCompletedDependencies,
    pendingDependencies: selection.pendingDependencies,
    pendingObservations: selection.pendingObservations,
    previous: statusForSelection(selection, taskSlot),
    remainingTaskCount: selection.remainingTaskCount,
    resourceInUse: selection.resourceInUse,
    runningTotal: selection.runningTotal,
    status,
    statuses: withStatusAt(selection.statuses, taskSlot, status),
    taskSlot
  };
}

/** Running admission/settlement changes the global count and owned constraint occupancy. */
function applyRunningOccupancyDelta(
  compiled: CompiledAdmissionGraph,
  facts: MutableTransitionFacts
): void {
  const { previous, status, taskSlot } = facts;
  if (previous.kind === "pending" && status.kind === "running") {
    facts.runningTotal += 1;
    facts.mutexHolders = withMutexHolderDelta(compiled, facts.mutexHolders, taskSlot, 1);
    facts.resourceInUse = withResourceClaimDelta(compiled, facts.resourceInUse, taskSlot, 1);
  } else if (previous.kind === "running" && status.kind === "settled") {
    facts.runningTotal -= 1;
    facts.remainingTaskCount -= 1;
    facts.mutexHolders = withMutexHolderDelta(compiled, facts.mutexHolders, taskSlot, -1);
    facts.resourceInUse = withResourceClaimDelta(compiled, facts.resourceInUse, taskSlot, -1);
  } else if (previous.kind === "pending" && status.kind === "settled") {
    facts.remainingTaskCount -= 1;
  }
}

function withResourceClaimDelta(
  compiled: CompiledAdmissionGraph,
  resourceInUse: NumberStore,
  taskSlot: number,
  direction: 1 | -1
): NumberStore {
  return withNumberDeltas(
    resourceInUse,
    requiredTaskResourceClaimsForCompiled(compiled, taskSlot).map(
      ({ resourceSlot, units }) => [resourceSlot, direction * units] as const
    )
  );
}

function withMutexHolderDelta(
  compiled: CompiledAdmissionGraph,
  mutexHolders: NumberStore,
  taskSlot: number,
  delta: 1 | -1
): NumberStore {
  return withNumberDeltas(
    mutexHolders,
    requiredTaskMutexSlotsForCompiled(compiled, taskSlot).map(
      (mutexSlot) => [mutexSlot, delta] as const
    )
  );
}

/** Settlement changes only the changed task's relation reverse fanout and forced frontier. */
function applySettlementRelationDelta(
  compiled: CompiledAdmissionGraph,
  facts: MutableTransitionFacts
): void {
  const { previous, status, taskSlot } = facts;
  if (previous.kind === "settled" || status.kind !== "settled") return;
  const reverseDependencies = requiredReverseDependenciesForCompiled(compiled, taskSlot);
  const reverseObservations = requiredReverseObservationsForCompiled(compiled, taskSlot);
  for (const slot of reverseDependencies) facts.affectedCandidateSlots.add(slot);
  for (const slot of reverseObservations) facts.affectedCandidateSlots.add(slot);
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
    reverseObservations.map((observerSlot) => [observerSlot, -1] as const)
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
  for (const scopeSlot of requiredScopeTerminalSlotsForCompiled(compiled, taskSlot)) {
    facts.activeScopeSlots = Object.freeze(
      facts.activeScopeSlots.filter((candidate) => candidate !== scopeSlot)
    );
  }
}
