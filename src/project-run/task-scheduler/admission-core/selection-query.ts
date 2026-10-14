import type { AdmissionSelectionRejectionReason } from "../../../project-definition/scheduler-policy.ts";
import type { PlannedTask, PlannedTaskGraph } from "../graph.ts";
import {
  requiredTaskMutexSlotsForCompiled,
  requiredTaskResourceClaimsForCompiled
} from "./compiled-graph-lookup.ts";
import {
  numberFor,
  pendingRelationBlockerStageForSelection,
  type PendingBlockerStage
} from "./selection-index.ts";
import { compareScopeCapacityForCompiled } from "./selection-seed.ts";
import type { AdmissionCoreState } from "./selection.ts";
import {
  effectiveMaxParallelForCore,
  isScopeInactiveForCore,
  requiredScopeForCore,
  requiredTaskForCore,
  requiredTaskSlotForCore,
  statusForCore
} from "./state-query.ts";

export interface AdmissionCoreSelection {
  readonly canAdmit: boolean;
  readonly task: PlannedTask;
}

/** Public validation and catalog payloads preserve lexical duplicate occurrences. */
export function selectionRejectionForPendingTask(
  state: AdmissionCoreState,
  taskSlot: number
): AdmissionSelectionRejectionReason | undefined {
  const stage = pendingBlockerStageForCore(state, taskSlot);
  return stage === undefined
    ? capacityRejectionFor(state, taskSlot)
    : blockerPayloadFor(state, taskSlot, stage);
}

function blockerPayloadFor(
  state: AdmissionCoreState,
  taskSlot: number,
  stage: PendingBlockerStage
): AdmissionSelectionRejectionReason {
  const task = requiredTaskForCore(state, taskSlot);
  switch (stage) {
    case "depends-on-pending":
      return Object.freeze({
        kind: stage,
        taskIds: sorted(
          task.dependsOn.filter(
            (taskId) =>
              statusForCore(state, requiredTaskSlotForCore(state, taskId)).kind !== "settled"
          )
        )
      });
    case "observes-pending":
      return Object.freeze({
        kind: stage,
        taskIds: sorted(
          task.observes.filter(
            (taskId) =>
              statusForCore(state, requiredTaskSlotForCore(state, taskId)).kind !== "settled"
          )
        )
      });
    case "mutex-held":
      return Object.freeze({
        kind: stage,
        mutexIds: sorted(task.mutex.filter((mutexId) => isMutexHeld(state, mutexId)))
      });
  }
}

export function isAdmissionEligibleForPendingTask(
  state: AdmissionCoreState,
  taskSlot: number
): boolean {
  return (
    pendingBlockerStageForCore(state, taskSlot) === undefined &&
    hasCapacityForPendingTask(state, taskSlot)
  );
}

export function hasCapacityForPendingTask(state: AdmissionCoreState, taskSlot: number): boolean {
  const running = state.selection.runningTotal;
  return (
    scopeCapacityBlockerFor(state, taskSlot, running) === undefined &&
    hasRunningCapacity(running, state.compiled.maxParallel) &&
    !hasResourceShortageForPendingTask(state, taskSlot)
  );
}

function capacityRejectionFor(
  state: AdmissionCoreState,
  taskSlot: number
): AdmissionSelectionRejectionReason | undefined {
  const running = state.selection.runningTotal;
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

function resourceCapacityRejectionFor(
  state: AdmissionCoreState,
  taskSlot: number
):
  | Extract<AdmissionSelectionRejectionReason, { readonly kind: "resource-capacity-insufficient" }>
  | undefined {
  const task = requiredTaskForCore(state, taskSlot);
  const insufficient: Extract<
    AdmissionSelectionRejectionReason,
    { readonly kind: "resource-capacity-insufficient" }
  >["resources"][number][] = [];
  for (const claim of requiredTaskResourceClaimsForCompiled(state.compiled, taskSlot)) {
    const capacity = state.compiled.resourceCapacityBySlot[claim.resourceSlot];
    const inUse = numberFor(state.selection.resourceInUse, claim.resourceSlot);
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
  return numberFor(state.selection.resourceInUse, claim.resourceSlot) + claim.units <= capacity;
}

function hasResourceShortageForPendingTask(state: AdmissionCoreState, taskSlot: number): boolean {
  return requiredTaskResourceClaimsForCompiled(state.compiled, taskSlot).some(
    (claim) => !resourceClaimFitsForCore(state, claim)
  );
}

/** Shared slot-budget judgment; summary reports active global constraints, selection also considers activation. */
function hasRunningCapacity(running: number, maxParallel: number): boolean {
  return running < maxParallel;
}

export function globalCapacityBlockerFactsForCore(state: AdmissionCoreState): Readonly<{
  rootCapacity: boolean;
  scopeCapacity: boolean;
}> {
  const effectiveMaxParallel = effectiveMaxParallelForCore(state);
  return Object.freeze({
    rootCapacity: !hasRunningCapacity(state.selection.runningTotal, state.compiled.maxParallel),
    scopeCapacity:
      effectiveMaxParallel < state.compiled.maxParallel &&
      !hasRunningCapacity(state.selection.runningTotal, effectiveMaxParallel)
  });
}

/** Independent blocker facts, not primary rejection: root/scope must not hide a resource shortage. */
export function pendingBlockerFactsForCore(
  state: AdmissionCoreState,
  taskSlot: number
): Readonly<{
  dependency: boolean;
  mutex: boolean;
  resourceCapacity: boolean;
}> {
  return Object.freeze({
    dependency:
      numberFor(state.selection.pendingDependencies, taskSlot) > 0 ||
      numberFor(state.selection.nonCompletedDependencies, taskSlot) > 0 ||
      numberFor(state.selection.pendingObservations, taskSlot) > 0,
    mutex: isMutexBlockedForPendingTask(state, taskSlot),
    resourceCapacity: hasResourceShortageForPendingTask(state, taskSlot)
  });
}

/** Measurement classification uses primary readiness/capacity without materializing public reason payloads. */
export function admissionQueueKindForCore(
  state: AdmissionCoreState,
  taskSlot: number
): "admissible-pending" | "capacity-blocked" | "mutex-blocked" | undefined {
  const stage = pendingBlockerStageForCore(state, taskSlot);
  switch (stage) {
    case "depends-on-pending":
    case "observes-pending":
      return undefined;
    case "mutex-held":
      return "mutex-blocked";
    case undefined:
      return hasCapacityForPendingTask(state, taskSlot) ? "admissible-pending" : "capacity-blocked";
  }
}

/** Active scope capacity is global; an activating candidate supplies one additional exact scope fact. */
function scopeCapacityBlockerFor(
  state: AdmissionCoreState,
  taskSlot: number,
  running: number
): PlannedTaskGraph["scopes"][number] | undefined {
  let selectedScopeSlot: number | undefined = state.selection.activeScopeSlots[0];
  if (
    selectedScopeSlot !== undefined &&
    hasRunningCapacity(running, requiredScopeForCore(state, selectedScopeSlot).maxParallel)
  ) {
    selectedScopeSlot = undefined;
  }
  const taskScopeSlot = state.compiled.taskScopeSlots[taskSlot];
  if (
    taskScopeSlot !== undefined &&
    isScopeInactiveForCore(state, taskScopeSlot) &&
    state.compiled.taskActivatesScope[taskSlot] === true &&
    !hasRunningCapacity(running, requiredScopeForCore(state, taskScopeSlot).maxParallel) &&
    (selectedScopeSlot === undefined ||
      compareScopeCapacityForCompiled(state.compiled, taskScopeSlot, selectedScopeSlot) < 0)
  ) {
    selectedScopeSlot = taskScopeSlot;
  }
  return selectedScopeSlot === undefined
    ? undefined
    : requiredScopeForCore(state, selectedScopeSlot);
}

export function admissionCandidatesForCore(
  state: AdmissionCoreState
): readonly AdmissionCoreSelection[] {
  const candidates: AdmissionCoreSelection[] = [];
  for (const taskSlot of state.selection.relationReadyTaskSlots
    .toArray()
    .sort((left, right) => left - right)) {
    if (isMutexBlockedForPendingTask(state, taskSlot)) continue;
    const task = requiredTaskForCore(state, taskSlot);
    candidates.push(Object.freeze({ canAdmit: hasCapacityForPendingTask(state, taskSlot), task }));
  }
  return Object.freeze(candidates);
}

function pendingBlockerStageForCore(
  state: AdmissionCoreState,
  taskSlot: number
): PendingBlockerStage | undefined {
  const relation = pendingRelationBlockerStageForSelection(state.selection, taskSlot);
  if (relation !== undefined) return relation;
  return isMutexBlockedForPendingTask(state, taskSlot) ? "mutex-held" : undefined;
}

/** Shared dynamic mutex readiness; transition updates holders, never broadcasts to task cohorts. */
export function isMutexBlockedForPendingTask(state: AdmissionCoreState, taskSlot: number): boolean {
  if (
    requiredTaskMutexSlotsForCompiled(state.compiled, taskSlot).some(
      (mutexSlot) => numberFor(state.selection.mutexHolders, mutexSlot) > 0
    )
  )
    return true;
  if (state.selection.legacyRunningMutexes === undefined) return false;
  return requiredTaskForCore(state, taskSlot).mutex.some(
    (mutexId) => state.selection.legacyRunningMutexes?.includes(mutexId) === true
  );
}

function isMutexHeld(state: AdmissionCoreState, mutexId: string): boolean {
  if (state.selection.legacyRunningMutexes?.includes(mutexId) === true) return true;
  const mutexSlot = state.compiled.mutexSlotById.get(mutexId);
  return mutexSlot !== undefined && numberFor(state.selection.mutexHolders, mutexSlot) > 0;
}

function sorted(values: readonly string[]): readonly string[] {
  return Object.freeze([...values].sort(compareText));
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
