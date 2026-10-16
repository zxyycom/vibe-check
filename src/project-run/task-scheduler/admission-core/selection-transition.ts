import type { CompiledAdmissionGraph } from "./compiled-graph.ts";
import {
  requiredReverseDependenciesForCompiled,
  requiredReverseObservationsForCompiled,
  requiredScopeTerminalSlotsForCompiled,
  requiredTaskMutexSlotsForCompiled,
  requiredTaskResourceClaimsForCompiled
} from "./compiled-graph-lookup.ts";
import { type AdmissionMembershipDelta, transitionTaskMemberships } from "./membership-index.ts";
import { transitionSelectionFrontiers } from "./selection-frontiers.ts";
import { insertActiveScopeSlot, removeActiveScopeSlot } from "./selection-seed.ts";
import {
  liveForcedQueue,
  enqueueForcedTaskSlots,
  numberFor,
  scopeForStore,
  statusForSelection,
  statusForStore,
  withStatusAt,
  type AdmissionSelectionIndex,
  type AdmissionSourceFacts,
  type CoreTaskStatus,
  type NumberStore,
  type ScopeStore,
  type StatusStore
} from "./selection-index.ts";
import type {
  AdmissionCounterChange,
  AdmissionCounterKind,
  AdmissionScopeChange,
  AdmissionStateDelta
} from "./state-delta.ts";

export interface IndexedSelectionTransition {
  readonly taskSlot: number;
  readonly status: CoreTaskStatus;
  readonly activatedScopeSlot: number | undefined;
}
interface MutableTransitionFacts {
  readonly taskSlot: number;
  readonly previous: CoreTaskStatus;
  readonly status: CoreTaskStatus;
  readonly counters: AdmissionCounterChange[];
  readonly scopeChanges: AdmissionScopeChange[];
  readonly activeAdded: number[];
  readonly activeRemoved: number[];
  scopes: ScopeStore;
  activeScopeOrder: readonly number[];
  mutexHolders: NumberStore;
  resourceInUse: NumberStore;
  nonCompletedDependencies: NumberStore;
  pendingDependencies: NumberStore;
  pendingObservations: NumberStore;
}

/** One source transaction owns facts, threshold events, actual membership changes and derived views. */
export function transitionIndexedSelection(
  compiled: CompiledAdmissionGraph,
  selection: AdmissionSelectionIndex,
  transition: IndexedSelectionTransition
): Readonly<{ selection: AdmissionSelectionIndex; delta: AdmissionStateDelta }> {
  const { taskSlot, status } = transition;
  const previous = statusForSelection(selection, taskSlot);
  const facts: MutableTransitionFacts = {
    taskSlot,
    status,
    previous,
    counters: [],
    scopeChanges: [],
    activeAdded: [],
    activeRemoved: [],
    scopes: selection.facts.scopes,
    activeScopeOrder: selection.frontiers.activeScopeOrder,
    ...selection.facts.occupancy,
    ...selection.facts.relations
  };
  applyRunningOccupancyDelta(compiled, facts);
  applySettlementRelationDelta(compiled, facts);
  applyScopeLifecycleDelta(compiled, facts, transition.activatedScopeSlot);
  const statuses = withStatusAt(selection.facts.statuses, taskSlot, status);
  const sourceFacts = publishSourceFacts(selection.facts, facts, statuses);
  const { affectedRelationSlots, newlyForced } = relationThresholdEffects(facts, statuses);
  const membership = transitionTaskMemberships({
    previous: selection.memberships,
    facts: sourceFacts,
    taskSlot,
    previousStatus: previous,
    affectedRelationSlots
  });
  const views = transitionSelectionFrontiers({
    compiled,
    selection,
    scopes: facts.scopes,
    relationReadyTaskSlots: membership.memberships.relationReady,
    membershipDelta: membership.delta.relationReady,
    changedActiveScopes: [...facts.activeAdded, ...facts.activeRemoved]
  });
  const next: AdmissionSelectionIndex = Object.freeze({
    facts: sourceFacts,
    memberships: membership.memberships,
    frontiers: Object.freeze({
      ...views,
      activeScopeOrder: facts.activeScopeOrder,
      forced: liveForcedQueue(
        enqueueForcedTaskSlots(selection.frontiers.forced, newlyForced),
        statuses
      )
    })
  });
  return Object.freeze({
    selection: next,
    delta: transitionDelta(facts, membership.delta, selection, next)
  });
}

function applyRunningOccupancyDelta(
  compiled: CompiledAdmissionGraph,
  facts: MutableTransitionFacts
): void {
  let direction: number | undefined;
  if (facts.previous.kind === "pending" && facts.status.kind === "running") direction = 1;
  if (facts.previous.kind === "running" && facts.status.kind === "settled") direction = -1;
  if (direction === undefined) return;
  facts.mutexHolders = applyCounterDeltas(
    facts,
    "mutexHolders",
    facts.mutexHolders,
    requiredTaskMutexSlotsForCompiled(compiled, facts.taskSlot).map(
      (slot) => [slot, direction] as const
    )
  );
  facts.resourceInUse = applyCounterDeltas(
    facts,
    "resourceInUse",
    facts.resourceInUse,
    requiredTaskResourceClaimsForCompiled(compiled, facts.taskSlot).map(
      ({ resourceSlot, units }) => [resourceSlot, direction * units] as const
    )
  );
}
function applySettlementRelationDelta(
  compiled: CompiledAdmissionGraph,
  facts: MutableTransitionFacts
): void {
  if (facts.previous.kind === "settled" || facts.status.kind !== "settled") return;
  const dependencies = requiredReverseDependenciesForCompiled(compiled, facts.taskSlot);
  facts.pendingDependencies = applyCounterDeltas(
    facts,
    "pendingDependencies",
    facts.pendingDependencies,
    dependencies.map((slot) => [slot, -1] as const)
  );
  if (facts.status.settlementKind !== "completed")
    facts.nonCompletedDependencies = applyCounterDeltas(
      facts,
      "nonCompletedDependencies",
      facts.nonCompletedDependencies,
      dependencies.map((slot) => [slot, 1] as const)
    );
  facts.pendingObservations = applyCounterDeltas(
    facts,
    "pendingObservations",
    facts.pendingObservations,
    requiredReverseObservationsForCompiled(compiled, facts.taskSlot).map(
      (slot) => [slot, -1] as const
    )
  );
}
function applyCounterDeltas(
  facts: MutableTransitionFacts,
  kind: AdmissionCounterKind,
  store: NumberStore,
  deltas: readonly (readonly [number, number])[]
): NumberStore {
  if (deltas.length === 0) return store;
  const aggregated = new Map<number, number>();
  for (const [slot, delta] of deltas) aggregated.set(slot, (aggregated.get(slot) ?? 0) + delta);
  const values = store.values.withMutations((batch) => {
    for (const [slot, amount] of aggregated) {
      const before = batch.get(slot);
      if (before === undefined) throw new Error(`admission core index slot is unknown: ${slot}`);
      const after = before + amount;
      if (before === after) continue;
      batch.set(slot, after);
      facts.counters.push(Object.freeze({ kind, slot, before, after }));
    }
  });
  return values === store.values ? store : Object.freeze({ values });
}
function applyScopeLifecycleDelta(
  compiled: CompiledAdmissionGraph,
  facts: MutableTransitionFacts,
  activatedScopeSlot: number | undefined
): void {
  if (
    activatedScopeSlot !== undefined &&
    scopeForStore(facts.scopes, activatedScopeSlot) === "inactive"
  ) {
    facts.scopeChanges.push(
      Object.freeze({ scopeSlot: activatedScopeSlot, previous: "inactive", next: "active" })
    );
    facts.scopes = Object.freeze({ values: facts.scopes.values.set(activatedScopeSlot, "active") });
    facts.activeScopeOrder = insertActiveScopeSlot(
      compiled,
      facts.activeScopeOrder,
      activatedScopeSlot
    );
    facts.activeAdded.push(activatedScopeSlot);
  }
  if (facts.previous.kind === "settled" || facts.status.kind !== "settled") return;
  for (const scopeSlot of requiredScopeTerminalSlotsForCompiled(compiled, facts.taskSlot)) {
    const previous = scopeForStore(facts.scopes, scopeSlot);
    if (previous === "closed") continue;
    facts.scopeChanges.push(Object.freeze({ scopeSlot, previous, next: "closed" }));
    facts.scopes = Object.freeze({ values: facts.scopes.values.set(scopeSlot, "closed") });
    if (previous === "active") {
      facts.activeScopeOrder = removeActiveScopeSlot(compiled, facts.activeScopeOrder, scopeSlot);
      facts.activeRemoved.push(scopeSlot);
    }
  }
}

/** Publish immutable facts, sharing unchanged relation/occupancy records. */
function publishSourceFacts(
  previous: AdmissionSourceFacts,
  facts: MutableTransitionFacts,
  statuses: StatusStore
): AdmissionSourceFacts {
  return Object.freeze({
    statuses,
    relations:
      facts.pendingDependencies === previous.relations.pendingDependencies &&
      facts.pendingObservations === previous.relations.pendingObservations &&
      facts.nonCompletedDependencies === previous.relations.nonCompletedDependencies
        ? previous.relations
        : Object.freeze({
            pendingDependencies: facts.pendingDependencies,
            pendingObservations: facts.pendingObservations,
            nonCompletedDependencies: facts.nonCompletedDependencies
          }),
    occupancy:
      facts.mutexHolders === previous.occupancy.mutexHolders &&
      facts.resourceInUse === previous.occupancy.resourceInUse
        ? previous.occupancy
        : Object.freeze({ mutexHolders: facts.mutexHolders, resourceInUse: facts.resourceInUse }),
    scopes: facts.scopes,
    legacyRunningMutexes: previous.legacyRunningMutexes
  });
}

/** Only relation counter zero crossings can introduce ready or forced work. */
function relationThresholdEffects(facts: MutableTransitionFacts, statuses: StatusStore) {
  const affectedRelationSlots = new Set<number>(
    facts.previous.kind === "pending" ? [facts.taskSlot] : []
  );
  const newlyForced = new Set<number>();
  for (const change of facts.counters) {
    if (
      (change.kind === "pendingDependencies" || change.kind === "pendingObservations") &&
      change.before > 0 &&
      change.after === 0
    ) {
      affectedRelationSlots.add(change.slot);
      if (
        change.kind === "pendingDependencies" &&
        statusForStore(statuses, change.slot).kind === "pending" &&
        numberFor(facts.nonCompletedDependencies, change.slot) > 0
      )
        newlyForced.add(change.slot);
    }
  }
  return { affectedRelationSlots, newlyForced };
}

function transitionDelta(
  facts: MutableTransitionFacts,
  membership: AdmissionMembershipDelta,
  previous: AdmissionSelectionIndex,
  next: AdmissionSelectionIndex
): AdmissionStateDelta {
  return Object.freeze({
    status: Object.freeze([
      Object.freeze({ taskSlot: facts.taskSlot, previous: facts.previous, next: facts.status })
    ]),
    membership,
    counters: Object.freeze(facts.counters),
    scopes: Object.freeze(facts.scopeChanges),
    activeScopes: Object.freeze({
      added: Object.freeze(facts.activeAdded),
      removed: Object.freeze(facts.activeRemoved)
    }),
    running: Object.freeze({
      before: previous.memberships.status.running.size,
      after: next.memberships.status.running.size
    })
  });
}
