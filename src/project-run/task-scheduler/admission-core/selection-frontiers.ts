import type { Set as PersistentSet } from "immutable";

import type { CompiledAdmissionGraph } from "./compiled-graph.ts";
import { requiredScopeTerminalSlotsForCompiled } from "./compiled-graph-lookup.ts";
import { transitionReadyFrontier } from "./ready-frontier.ts";
import type { AdmissionSelectionIndex } from "./selection-index.ts";
import { transitionStaticFrontier } from "./static-frontier.ts";

/** Keeps membership, live group heads and static layers in the same persistent successor. */
export function transitionSelectionFrontiers(
  input: Readonly<{
    compiled: CompiledAdmissionGraph;
    selection: AdmissionSelectionIndex;
    relationReadyTaskSlots: PersistentSet<number>;
    activeScopeSlots: readonly number[];
    affectedTaskSlots: ReadonlySet<number>;
    taskSlot: number;
    activatedScopeSlot: number | undefined;
  }>
): Pick<
  AdmissionSelectionIndex,
  "readyGroupFrontier" | "staticGroupFrontier" | "activeScopeSlotSet"
> {
  const { compiled, selection, relationReadyTaskSlots, affectedTaskSlots } = input;
  const readyGroupFrontier = transitionReadyFrontier(
    compiled,
    selection.readyGroupFrontier,
    selection.relationReadyTaskSlots,
    relationReadyTaskSlots,
    affectedTaskSlots
  );
  const { activeScopeSlotSet, changedScopeSlots } = transitionActiveScopeMembership(input);
  const staticGroupFrontier = transitionStaticFrontier({
    previous: {
      compiled,
      readyGroupFrontier: selection.readyGroupFrontier,
      activeScopeSlots: selection.activeScopeSlotSet
    },
    next: { compiled, readyGroupFrontier, activeScopeSlots: activeScopeSlotSet },
    frontier: selection.staticGroupFrontier,
    affectedTaskSlots,
    changedScopeSlots
  });
  return { readyGroupFrontier, staticGroupFrontier, activeScopeSlotSet };
}

/** Once-activated counters are historical markers; only actual active roots classify layers. */
function transitionActiveScopeMembership(
  input: Readonly<{
    compiled: CompiledAdmissionGraph;
    selection: AdmissionSelectionIndex;
    activeScopeSlots: readonly number[];
    taskSlot: number;
    activatedScopeSlot: number | undefined;
  }>
): Readonly<{ activeScopeSlotSet: PersistentSet<number>; changedScopeSlots: ReadonlySet<number> }> {
  const { compiled, selection, activeScopeSlots, taskSlot, activatedScopeSlot } = input;
  if (activeScopeSlots === selection.activeScopeSlots)
    return { activeScopeSlotSet: selection.activeScopeSlotSet, changedScopeSlots: new Set() };
  const candidates = new Set(requiredScopeTerminalSlotsForCompiled(compiled, taskSlot));
  if (activatedScopeSlot !== undefined) candidates.add(activatedScopeSlot);
  const changedScopeSlots = new Set<number>();
  let activeScopeSlotSet = selection.activeScopeSlotSet;
  for (const scopeSlot of candidates) {
    const isActive = activeScopeSlots.includes(scopeSlot);
    if (isActive === activeScopeSlotSet.has(scopeSlot)) continue;
    changedScopeSlots.add(scopeSlot);
    activeScopeSlotSet = isActive
      ? activeScopeSlotSet.add(scopeSlot)
      : activeScopeSlotSet.delete(scopeSlot);
  }
  return { activeScopeSlotSet, changedScopeSlots };
}
