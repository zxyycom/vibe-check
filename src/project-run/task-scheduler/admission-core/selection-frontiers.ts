import type { Set as PersistentSet } from "immutable";
import type { CompiledAdmissionGraph } from "./compiled-graph.ts";
import type { MembershipChanges } from "./membership-index.ts";
import { transitionReadyFrontier } from "./ready-frontier.ts";
import type { AdmissionSelectionIndex, ScopeStore } from "./selection-index.ts";
import { transitionStaticFrontier } from "./static-frontier.ts";

/** Publish the dependent views in transaction order: actual members → actual heads → static layers. */
export function transitionSelectionFrontiers(
  input: Readonly<{
    compiled: CompiledAdmissionGraph;
    selection: AdmissionSelectionIndex;
    relationReadyTaskSlots: PersistentSet<number>;
    scopes: ScopeStore;
    membershipDelta: MembershipChanges;
    changedActiveScopes: readonly number[];
  }>
): Pick<AdmissionSelectionIndex["frontiers"], "ready" | "static"> {
  const {
    compiled,
    selection,
    relationReadyTaskSlots,
    scopes,
    membershipDelta,
    changedActiveScopes
  } = input;
  const ready = transitionReadyFrontier({
    compiled,
    frontier: selection.frontiers.ready,
    nextReady: relationReadyTaskSlots,
    membershipDelta
  });
  const staticFrontier = transitionStaticFrontier({
    previous: {
      compiled,
      readyGroupFrontier: selection.frontiers.ready,
      scopes: selection.facts.scopes
    },
    next: { compiled, readyGroupFrontier: ready.frontier, scopes },
    frontier: selection.frontiers.static,
    heads: ready.heads,
    changedScopeSlots: changedActiveScopes
  });
  return Object.freeze({ ready: ready.frontier, static: staticFrontier });
}
