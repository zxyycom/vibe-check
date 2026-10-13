import type { PlannedTask, PlannedTaskGraph } from "../graph.ts";
import { requiredTaskForCompiled } from "./compiled-graph-lookup.ts";
import {
  numberFor,
  statusForSelection,
  type CoreTaskStatus,
  type TaskPartitionKind
} from "./selection-index.ts";
import { requiredScopeForCompiled, requiredTaskSlotForCompiled } from "./selection-seed.ts";
import type { AdmissionCoreState } from "./selection.ts";

/** Read-only Core facts: memberships and scope lifecycle, without selection judgements or DTO round trips. */
export function statusForCore(state: AdmissionCoreState, taskSlot: number): CoreTaskStatus {
  return statusForSelection(state.selection, taskSlot);
}

export function isCoreComplete(state: AdmissionCoreState): boolean {
  return state.selection.remainingTaskCount === 0;
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
  const scopeSlot = state.compiled.scopeSlotById.get(scopeId);
  if (scopeSlot === undefined) throw new Error(`admission core scope is unknown: ${scopeId}`);
  return scopeSlot;
}

/** Membership is authoritative; consumers choose declaration or lexical ordering at the edge. */
export function taskSlotsForCore(
  state: AdmissionCoreState,
  kind: TaskPartitionKind
): readonly number[] {
  return Object.freeze(
    state.selection.taskSlotsByStatus[kind].toArray().sort((left, right) => left - right)
  );
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
  return state.selection.activeScopeSlots.map((slot) => requiredScopeForCore(state, slot));
}

export function scopeLifecycleForCore(
  state: AdmissionCoreState,
  scopeSlot: number
): "inactive" | "active" | "closed" {
  const scope = requiredScopeForCore(state, scopeSlot);
  if (
    statusForCore(state, requiredTaskSlotForCore(state, scope.terminalTaskId)).kind === "settled"
  ) {
    return "closed";
  }
  return numberFor(state.selection.activeScopes, scopeSlot) > 0 ? "active" : "inactive";
}

export function isScopeInactiveForCore(state: AdmissionCoreState, scopeSlot: number): boolean {
  return scopeLifecycleForCore(state, scopeSlot) === "inactive";
}

export function effectiveMaxParallelForCore(state: AdmissionCoreState): number {
  const constrainedScope = state.selection.activeScopeSlots[0];
  return constrainedScope === undefined
    ? state.compiled.maxParallel
    : Math.min(
        state.compiled.maxParallel,
        requiredScopeForCore(state, constrainedScope).maxParallel
      );
}
