import type { CompiledAdmissionGraph } from "./compiled-graph.ts";
import {
  ABSENT,
  PENDING,
  withoutForcedTask,
  forcedTaskSlotFor,
  type AdmissionSelectionIndex,
  type CoreTaskStatus
} from "./selection-index.ts";
import { isScopeInactiveForCore } from "./selection-query.ts";
import { selectionIndexForSeed } from "./selection-seed.ts";
import { transitionIndexedSelection } from "./selection-transition.ts";
import type { SchedulerSettlementKind, SchedulerSnapshot } from "../scheduler-decision-model.ts";

/** Private immutable core passed among Scheduler decision, policy and effect owners. */
export interface AdmissionCoreState {
  readonly compiled: CompiledAdmissionGraph;
  /** Selection representation remains private to this lifecycle module family. */
  readonly selection: AdmissionSelectionIndex;
}

/** Starts from the canonical all-pending selection seed. */
export function createInitialAdmissionCoreState(
  compiled: CompiledAdmissionGraph
): AdmissionCoreState {
  return freezeCoreState(
    compiled,
    selectionIndexForSeed(
      compiled,
      compiled.graph.tasks.map(() => PENDING),
      undefined,
      undefined
    )
  );
}

/** Seeds from a shell snapshot without exposing a mutable shell view. */
export function createAdmissionCoreFromSchedulerSnapshot(
  compiled: CompiledAdmissionGraph,
  snapshot: SchedulerSnapshot
): AdmissionCoreState {
  const statuses = statusesForSchedulerSnapshot(compiled, snapshot);
  return freezeCoreState(
    compiled,
    selectionIndexForSeed(compiled, statuses, snapshot.activeScopeIds, snapshot.runningMutexes)
  );
}

/** Produces an immutable successor for a validated pending-to-running admission. */
export function admitTaskForCore(state: AdmissionCoreState, taskSlot: number): AdmissionCoreState {
  const scopeSlot = state.compiled.taskScopeSlots[taskSlot];
  const activatedScopeSlot =
    scopeSlot !== undefined &&
    isScopeInactiveForCore(state, scopeSlot) &&
    state.compiled.taskActivatesScope[taskSlot] === true
      ? scopeSlot
      : undefined;
  return transitionState(state, taskSlot, Object.freeze({ kind: "running" }), activatedScopeSlot);
}

/** Produces an immutable successor for one already-validated settlement event. */
export function settleTaskForCore(
  state: AdmissionCoreState,
  taskSlot: number,
  settlementKind: SchedulerSettlementKind
): AdmissionCoreState {
  return transitionState(
    state,
    taskSlot,
    Object.freeze({ kind: "settled", settlementKind }),
    undefined
  );
}

/** Pops the forced max-heap before recording its canonical blocked settlement. */
export function settleForcedTaskForCore(
  state: AdmissionCoreState,
  taskSlot: number
): AdmissionCoreState {
  return settleTaskForCore(
    freezeCoreState(state.compiled, withoutForcedTask(state.selection)),
    taskSlot,
    "blocked"
  );
}

export function nextForcedTaskForCore(state: AdmissionCoreState): number | undefined {
  return forcedTaskSlotFor(state.selection);
}

function statusesForSchedulerSnapshot(
  compiled: CompiledAdmissionGraph,
  snapshot: SchedulerSnapshot
): CoreTaskStatus[] {
  const statuses = compiled.graph.tasks.map(() => PENDING);
  const presentTaskIds = new Set([
    ...snapshot.pendingTaskIds,
    ...snapshot.runningTaskIds,
    ...snapshot.settledTasks.map((task) => task.taskId)
  ]);
  for (const [slot, task] of compiled.graph.tasks.entries()) {
    if (!presentTaskIds.has(task.id)) statuses[slot] = ABSENT;
  }
  for (const taskId of snapshot.runningTaskIds) {
    const slot = compiled.taskSlotsById.get(taskId);
    if (slot !== undefined) statuses[slot] = Object.freeze({ kind: "running" });
  }
  for (const settled of snapshot.settledTasks) {
    const slot = compiled.taskSlotsById.get(settled.taskId);
    if (slot !== undefined) {
      statuses[slot] = Object.freeze({ kind: "settled", settlementKind: settled.kind });
    }
  }
  return statuses;
}

function transitionState(
  state: AdmissionCoreState,
  taskSlot: number,
  status: CoreTaskStatus,
  activatedScopeSlot: number | undefined
): AdmissionCoreState {
  return freezeCoreState(
    state.compiled,
    transitionIndexedSelection(
      state.compiled,
      state.selection,
      taskSlot,
      status,
      activatedScopeSlot
    )
  );
}

function freezeCoreState(
  compiled: CompiledAdmissionGraph,
  selection: AdmissionSelectionIndex
): AdmissionCoreState {
  return Object.freeze({ compiled, selection });
}
