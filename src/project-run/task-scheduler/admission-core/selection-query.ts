import type { AdmissionSelectionRejectionReason } from "../../../project-definition/scheduler-policy.ts";
import type { CompiledAdmissionGraph } from "./compiled-graph.ts";
import {
  numberFor,
  statusForSelection,
  type AdmissionSelectionIndex,
  type CoreTaskStatus
} from "./selection-index.ts";
import {
  compareScopeCapacityForCompiled,
  requiredScopeForCompiled,
  requiredTaskSlotForCompiled
} from "./selection-seed.ts";
import type { PlannedTask, PlannedTaskGraph } from "../graph.ts";

type SelectionCoreState = Readonly<{
  readonly compiled: CompiledAdmissionGraph;
  readonly selection: AdmissionSelectionIndex;
}>;

export interface AdmissionCoreSelection {
  readonly canAdmit: boolean;
  readonly task: PlannedTask;
}

export function statusForCore(state: SelectionCoreState, taskSlot: number): CoreTaskStatus {
  return statusForSelection(state.selection, taskSlot);
}

export function isCoreComplete(state: SelectionCoreState): boolean {
  return state.selection.remainingTaskCount === 0;
}

export function requiredTaskForCore(state: SelectionCoreState, taskSlot: number): PlannedTask {
  const task = state.compiled.graph.tasks[taskSlot];
  if (task === undefined) throw new Error(`admission core task slot is unknown: ${taskSlot}`);
  return task;
}

export function requiredTaskSlotForCore(state: SelectionCoreState, taskId: string): number {
  return requiredTaskSlotForCompiled(state.compiled, taskId);
}

export function requiredScopeForCore(
  state: SelectionCoreState,
  scopeSlot: number
): PlannedTaskGraph["scopes"][number] {
  return requiredScopeForCompiled(state.compiled, scopeSlot);
}

export function requiredScopeSlotForCore(state: SelectionCoreState, scopeId: string): number {
  const scopeSlot = state.compiled.scopeSlotById.get(scopeId);
  if (scopeSlot === undefined) throw new Error(`admission core scope is unknown: ${scopeId}`);
  return scopeSlot;
}

/** Public validation and catalog payloads preserve lexical duplicate occurrences. */
export function selectionRejectionForPendingTask(
  state: SelectionCoreState,
  taskSlot: number
): AdmissionSelectionRejectionReason | undefined {
  const stage = blockerStageFor(state, taskSlot);
  return stage === undefined
    ? capacityRejectionFor(state, taskSlot)
    : blockerPayloadFor(state, taskSlot, stage);
}

type PendingBlockerStage = "depends-on-pending" | "mutex-held" | "observes-pending";

/** Candidate scheduling uses only indexed counters and does not materialize public payloads. */
function blockerStageFor(
  state: SelectionCoreState,
  taskSlot: number
): PendingBlockerStage | undefined {
  const selection = state.selection;
  if (numberFor(selection.pendingDependencies, taskSlot) > 0) return "depends-on-pending";
  if (numberFor(selection.pendingObservations, taskSlot) > 0) return "observes-pending";
  return numberFor(selection.heldMutexBlockers, taskSlot) > 0 ? "mutex-held" : undefined;
}

function blockerPayloadFor(
  state: SelectionCoreState,
  taskSlot: number,
  stage: PendingBlockerStage
): AdmissionSelectionRejectionReason {
  const task = requiredTaskForCore(state, taskSlot);
  if (stage === "depends-on-pending") {
    return Object.freeze({
      kind: stage,
      taskIds: sorted(
        task.dependsOn.filter(
          (taskId) =>
            statusForCore(state, requiredTaskSlotForCore(state, taskId)).kind !== "settled"
        )
      )
    });
  }
  if (stage === "observes-pending") {
    return Object.freeze({
      kind: stage,
      taskIds: sorted(
        task.observes.filter(
          (taskId) =>
            statusForCore(state, requiredTaskSlotForCore(state, taskId)).kind !== "settled"
        )
      )
    });
  }
  return Object.freeze({
    kind: stage,
    mutexIds: sorted(task.mutex.filter((mutexId) => isMutexHeld(state, mutexId)))
  });
}

export function isAdmissionEligibleForPendingTask(
  state: SelectionCoreState,
  taskSlot: number
): boolean {
  return (
    blockerStageFor(state, taskSlot) === undefined && hasCapacityForPendingTask(state, taskSlot)
  );
}

function hasCapacityForPendingTask(state: SelectionCoreState, taskSlot: number): boolean {
  const running = state.selection.runningTotal;
  return (
    scopeCapacityBlockerFor(state, taskSlot, running) === undefined &&
    running < state.compiled.maxParallel
  );
}

function capacityRejectionFor(
  state: SelectionCoreState,
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
  return running >= state.compiled.maxParallel
    ? Object.freeze({
        kind: "root-capacity-reached",
        maxParallel: state.compiled.maxParallel,
        running
      })
    : undefined;
}

/** Active scope capacity is global; an activating candidate supplies one additional exact scope fact. */
function scopeCapacityBlockerFor(
  state: SelectionCoreState,
  taskSlot: number,
  running: number
): PlannedTaskGraph["scopes"][number] | undefined {
  let selectedScopeSlot: number | undefined = state.selection.activeScopeSlots[0];
  if (
    selectedScopeSlot !== undefined &&
    requiredScopeForCore(state, selectedScopeSlot).maxParallel > running
  ) {
    selectedScopeSlot = undefined;
  }
  const taskScopeSlot = state.compiled.taskScopeSlots[taskSlot];
  if (
    taskScopeSlot !== undefined &&
    isScopeInactiveForCore(state, taskScopeSlot) &&
    state.compiled.taskActivatesScope[taskSlot] === true &&
    requiredScopeForCore(state, taskScopeSlot).maxParallel <= running &&
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
  state: SelectionCoreState
): readonly AdmissionCoreSelection[] {
  const candidates: AdmissionCoreSelection[] = [];
  for (const [taskSlot, task] of state.compiled.graph.tasks.entries()) {
    if (statusForCore(state, taskSlot).kind !== "pending") continue;
    if (blockerStageFor(state, taskSlot) !== undefined) continue;
    candidates.push(Object.freeze({ canAdmit: hasCapacityForPendingTask(state, taskSlot), task }));
  }
  return Object.freeze(candidates);
}

export function scopeToActivateForCore(state: SelectionCoreState, taskId: string): string | null {
  const taskSlot = state.compiled.taskSlotsById.get(taskId);
  if (taskSlot === undefined) return null;
  const scopeSlot = state.compiled.taskScopeSlots[taskSlot];
  if (scopeSlot === undefined || !isScopeInactiveForCore(state, scopeSlot)) return null;
  return state.compiled.taskActivatesScope[taskSlot] === true
    ? requiredScopeForCore(state, scopeSlot).id
    : null;
}

export function activeScopesForCore(
  state: SelectionCoreState
): PlannedTaskGraph["scopes"][number][] {
  return state.selection.activeScopeSlots.map((slot) => requiredScopeForCore(state, slot));
}

export function scopeLifecycleForCore(
  state: SelectionCoreState,
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

export function isScopeInactiveForCore(state: SelectionCoreState, scopeSlot: number): boolean {
  return scopeLifecycleForCore(state, scopeSlot) === "inactive";
}

export function effectiveMaxParallelForCore(state: SelectionCoreState): number {
  const constrainedScope = state.selection.activeScopeSlots[0];
  return constrainedScope === undefined
    ? state.compiled.maxParallel
    : Math.min(
        state.compiled.maxParallel,
        requiredScopeForCore(state, constrainedScope).maxParallel
      );
}

function isMutexHeld(state: SelectionCoreState, mutexId: string): boolean {
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
