import type { AdmissionSelectionRejectionReason } from "../../../project-definition/scheduler-policy.ts";
import type { PlannedTaskGraph } from "../graph.ts";
import { requiredTaskResourceClaimsForCompiled } from "./compiled-graph-lookup.ts";
import { numberFor } from "./selection-index.ts";
import { compareScopeCapacityForCompiled } from "./selection-seed.ts";
import type { AdmissionCoreState } from "./selection.ts";
import {
  effectiveMaxParallelForCore,
  isScopeInactiveForCore,
  requiredScopeForCore,
  requiredTaskForCore
} from "./state-query.ts";

export function hasCapacityForPendingTask(state: AdmissionCoreState, taskSlot: number): boolean {
  const running = state.selection.memberships.status.running.size;
  return (
    scopeCapacityBlockerFor(state, taskSlot, running) === undefined &&
    hasRunningCapacity(running, state.compiled.maxParallel) &&
    !hasResourceShortageForPendingTask(state, taskSlot)
  );
}

export function capacityRejectionFor(
  state: AdmissionCoreState,
  taskSlot: number
): AdmissionSelectionRejectionReason | undefined {
  const running = state.selection.memberships.status.running.size;
  const scope = scopeCapacityBlockerFor(state, taskSlot, running);
  if (scope !== undefined) {
    return Object.freeze({
      kind: "scope-capacity-reached",
      maxParallel: scope.maxParallel,
      running,
      scopeId: scope.id
    });
  }
  if (!hasRunningCapacity(running, state.compiled.maxParallel)) {
    return Object.freeze({
      kind: "root-capacity-reached",
      maxParallel: state.compiled.maxParallel,
      running
    });
  }
  return resourceCapacityRejectionFor(state, taskSlot);
}

type ResourceCapacityRejection = Extract<
  AdmissionSelectionRejectionReason,
  { readonly kind: "resource-capacity-insufficient" }
>;
type AdmissionScope = PlannedTaskGraph["scopes"][number];

function resourceCapacityRejectionFor(
  state: AdmissionCoreState,
  taskSlot: number
): ResourceCapacityRejection | undefined {
  const task = requiredTaskForCore(state, taskSlot);
  const insufficient: ResourceCapacityRejection["resources"][number][] = [];
  for (const claim of requiredTaskResourceClaimsForCompiled(state.compiled, taskSlot)) {
    const capacity = state.compiled.resourceCapacityBySlot[claim.resourceSlot];
    const inUse = numberFor(state.selection.facts.occupancy.resourceInUse, claim.resourceSlot);
    if (capacity === undefined) {
      throw new Error(`admission core resource slot is unknown: ${claim.resourceSlot}`);
    }
    if (resourceClaimFitsForCore(state, claim)) continue;
    const resourceId = state.compiled.graph.resourceCapacities[claim.resourceSlot]?.resourceId;
    if (resourceId === undefined) {
      throw new Error(`admission core task resource claim is missing: ${task.id}`);
    }
    insufficient.push(
      Object.freeze({
        available: capacity - inUse,
        capacity,
        inUse,
        required: claim.units,
        resourceId
      })
    );
  }
  return insufficient.length === 0
    ? undefined
    : Object.freeze({
        kind: "resource-capacity-insufficient",
        resources: Object.freeze(insufficient)
      });
}

function resourceClaimFitsForCore(
  state: AdmissionCoreState,
  claim: Readonly<{ resourceSlot: number; units: number }>
): boolean {
  const capacity = state.compiled.resourceCapacityBySlot[claim.resourceSlot];
  if (capacity === undefined)
    throw new Error(`admission core resource slot is unknown: ${claim.resourceSlot}`);
  return (
    numberFor(state.selection.facts.occupancy.resourceInUse, claim.resourceSlot) + claim.units <=
    capacity
  );
}

export function hasResourceShortageForPendingTask(
  state: AdmissionCoreState,
  taskSlot: number
): boolean {
  return requiredTaskResourceClaimsForCompiled(state.compiled, taskSlot).some(
    (claim) => !resourceClaimFitsForCore(state, claim)
  );
}

/** Shared slot-budget judgment; summary reports active global constraints, selection also considers activation. */
function hasRunningCapacity(running: number, maxParallel: number): boolean {
  return running < maxParallel;
}

export interface GlobalCapacityBlockerFacts {
  readonly rootCapacity: boolean;
  readonly scopeCapacity: boolean;
}

export function globalCapacityBlockerFactsForCore(
  state: AdmissionCoreState
): GlobalCapacityBlockerFacts {
  const running = state.selection.memberships.status.running.size;
  const effectiveMaxParallel = effectiveMaxParallelForCore(state);
  const hasTighterScope = effectiveMaxParallel < state.compiled.maxParallel;
  return Object.freeze({
    rootCapacity: !hasRunningCapacity(running, state.compiled.maxParallel),
    scopeCapacity: hasTighterScope && !hasRunningCapacity(running, effectiveMaxParallel)
  });
}

/** Active scope capacity is global; an activating candidate supplies one additional exact scope fact. */
function scopeCapacityBlockerFor(
  state: AdmissionCoreState,
  taskSlot: number,
  running: number
): AdmissionScope | undefined {
  let selectedScopeSlot: number | undefined = state.selection.frontiers.activeScopeOrder[0];
  if (
    selectedScopeSlot !== undefined &&
    hasRunningCapacity(running, requiredScopeForCore(state, selectedScopeSlot).maxParallel)
  ) {
    selectedScopeSlot = undefined;
  }
  const taskScopeSlot = inactiveActivationCapacityBlockerFor(state, taskSlot, running);
  if (
    taskScopeSlot !== undefined &&
    (selectedScopeSlot === undefined ||
      compareScopeCapacityForCompiled(state.compiled, taskScopeSlot, selectedScopeSlot) < 0)
  ) {
    selectedScopeSlot = taskScopeSlot;
  }
  return selectedScopeSlot === undefined
    ? undefined
    : requiredScopeForCore(state, selectedScopeSlot);
}

export function inactiveActivationCapacityBlockerFor(
  state: AdmissionCoreState,
  taskSlot: number,
  running: number
): number | undefined {
  const slot = state.compiled.taskScopeSlots[taskSlot];
  if (
    slot === undefined ||
    !isScopeInactiveForCore(state, slot) ||
    state.compiled.taskActivatesScope[taskSlot] !== true
  )
    return undefined;
  return hasRunningCapacity(running, requiredScopeForCore(state, slot).maxParallel)
    ? undefined
    : slot;
}
