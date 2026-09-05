import type {
  AdmissionGraph,
  AdmissionGraphInput,
  AdmissionRejectionReason,
  AdmissionSelectionValidation,
  AdmissionSelectionValidationRejectionReason,
  AdmissionSettlementOutcome,
  AdmissionState,
  AdmissionTransitionResult
} from "../../project-definition/scheduler-policy.ts";
import { compileAdmissionGraphInput } from "./admission-core-input.ts";
import {
  catalogForCore,
  inspectionForCore,
  schedulerInspectionForCore
} from "./admission-core-projection.ts";
import {
  admitTaskForCore,
  createAdmissionCoreFromSchedulerSnapshot,
  createInitialAdmissionCoreState,
  nextForcedTaskForCore,
  settleForcedTaskForCore,
  settleTaskForCore,
  type AdmissionCoreState
} from "./admission-core-selection.ts";
import {
  admissionCandidatesForCore,
  isCoreComplete,
  requiredTaskForCore,
  requiredTaskSlotForCore,
  scopeToActivateForCore,
  selectionRejectionForPendingTask,
  statusForCore,
  type AdmissionCoreSelection
} from "./admission-core-selection-query.ts";
import type { SchedulerSettlementKind } from "./scheduler-decision-model.ts";

export { compilePreparedAdmissionGraph } from "./admission-core-compiled-graph.ts";
export type { CompiledAdmissionGraph } from "./admission-core-compiled-graph.ts";
export {
  admissionCandidatesForCore,
  createAdmissionCoreFromSchedulerSnapshot,
  createInitialAdmissionCoreState,
  schedulerInspectionForCore,
  scopeToActivateForCore
};
export type { AdmissionCoreSelection, AdmissionCoreState };

export type AdmissionCoreEffect =
  | Readonly<{ readonly kind: "admitted"; readonly taskId: string }>
  | Readonly<{
      readonly dependencyIds?: readonly string[];
      readonly kind: "settled";
      readonly settlementKind: SchedulerSettlementKind;
      readonly taskId: string;
    }>;

export interface AdmissionCoreTransition {
  /** The immutable post-state for each corresponding canonical effect. */
  readonly effectStates: readonly AdmissionCoreState[];
  readonly effects: readonly AdmissionCoreEffect[];
  readonly state: AdmissionCoreState;
}

/** 在 exact boundary validation 和一次 static compile 后创建 standalone public factory。 */
export function createAdmissionGraph(input: AdmissionGraphInput): AdmissionGraph {
  const compiled = compileAdmissionGraphInput(input);
  return Object.freeze({
    initialState: Object.freeze(function initialState(this: void): AdmissionState {
      return admissionStateForCore(createInitialAdmissionCoreState(compiled));
    })
  });
}

/** The canonical select action used by both the public opaque handle and the real shell. */
export function selectAdmissionCore(
  state: AdmissionCoreState,
  taskId: string
): Readonly<
  | { readonly accepted: true; readonly transition: AdmissionCoreTransition }
  | { readonly accepted: false; readonly reason: AdmissionSelectionValidationRejectionReason }
> {
  const validation = validateAdmissionCoreSelection(state, taskId);
  if (!validation.accepted) return Object.freeze({ accepted: false, reason: validation.reason });
  const next = admitTaskForCore(state, requiredTaskSlotForCore(state, taskId));
  return Object.freeze({
    accepted: true,
    transition: freezeTransition(next, [Object.freeze({ kind: "admitted", taskId })], [next])
  });
}

/** The public binary settlement action. Runtime outcome validation intentionally precedes ID checks. */
export function settleAdmissionCore(
  state: AdmissionCoreState,
  taskId: string,
  outcome: unknown
): Readonly<
  | { readonly accepted: true; readonly transition: AdmissionCoreTransition }
  | { readonly accepted: false; readonly reason: AdmissionRejectionReason }
> {
  if (outcome !== "satisfied" && outcome !== "unsatisfied") {
    return Object.freeze({
      accepted: false,
      reason: Object.freeze({ kind: "invalid-settlement-outcome" })
    });
  }
  return settleRunningAdmissionCore(
    state,
    taskId,
    outcome === "satisfied" ? "completed" : "prerequisite-unsatisfied"
  );
}

/** Applies a real running Task settlement through the same reducer, retaining private exact kinds. */
export function settleRunningAdmissionCore(
  state: AdmissionCoreState,
  taskId: string,
  settlementKind: Extract<
    SchedulerSettlementKind,
    "completed" | "prerequisite-unsatisfied" | "failed"
  >
): Readonly<
  | { readonly accepted: true; readonly transition: AdmissionCoreTransition }
  | { readonly accepted: false; readonly reason: AdmissionRejectionReason }
> {
  if (isCoreComplete(state)) {
    return Object.freeze({ accepted: false, reason: Object.freeze({ kind: "state-complete" }) });
  }
  const taskSlot = state.compiled.taskSlotsById.get(taskId);
  if (taskSlot === undefined) {
    return Object.freeze({ accepted: false, reason: Object.freeze({ kind: "unknown-task" }) });
  }
  const status = statusForCore(state, taskSlot);
  if (status.kind !== "running") {
    return Object.freeze({
      accepted: false,
      reason: Object.freeze({
        kind: "not-running",
        status: status.kind === "pending" ? "pending" : "settled"
      })
    });
  }
  const settled = settleTaskForCore(state, taskSlot, settlementKind);
  const directEffect = Object.freeze({ kind: "settled" as const, settlementKind, taskId });
  return Object.freeze({
    accepted: true,
    transition: reconcileForcedBlocks(settled, [directEffect], [settled])
  });
}

/** Private cancellation stays in the reducer/effect owner but has no public AdmissionState action. */
export function cancelPendingAdmissionCore(state: AdmissionCoreState): AdmissionCoreTransition {
  let next = state;
  const effects: AdmissionCoreEffect[] = [];
  const effectStates: AdmissionCoreState[] = [];
  for (const [slot, task] of state.compiled.graph.tasks.entries()) {
    if (statusForCore(next, slot).kind !== "pending") continue;
    next = settleTaskForCore(next, slot, "cancelled-before-start");
    effects.push(
      Object.freeze({ kind: "settled", settlementKind: "cancelled-before-start", taskId: task.id })
    );
    effectStates.push(next);
  }
  return freezeTransition(next, effects, effectStates);
}

/** Reconciles forced dependency blocks before the real shell publishes its next decision boundary. */
export function reconcileAdmissionCore(state: AdmissionCoreState): AdmissionCoreTransition {
  return reconcileForcedBlocks(state, [], []);
}

export function validateAdmissionCoreSelection(
  state: AdmissionCoreState,
  taskId: string
): AdmissionSelectionValidation {
  if (isCoreComplete(state)) return rejectedValidation(Object.freeze({ kind: "state-complete" }));
  const taskSlot = state.compiled.taskSlotsById.get(taskId);
  if (taskSlot === undefined) return rejectedValidation(Object.freeze({ kind: "unknown-task" }));
  const status = statusForCore(state, taskSlot);
  if (status.kind !== "pending") {
    return rejectedValidation(
      Object.freeze({
        kind: "not-pending",
        status: status.kind === "running" ? "running" : "settled"
      })
    );
  }
  const reason = selectionRejectionForPendingTask(state, taskSlot);
  return reason === undefined ? ACCEPTED_SELECTION : rejectedValidation(reason);
}

/** Constructs the frozen opaque public wrapper. Projection work remains lazy until its getter is read. */
export function admissionStateForCore(core: AdmissionCoreState): AdmissionState {
  const select = Object.freeze(function select(
    this: void,
    taskId: string
  ): AdmissionTransitionResult {
    const selection = selectAdmissionCore(core, taskId);
    return selection.accepted
      ? Object.freeze({ accepted: true, state: admissionStateForCore(selection.transition.state) })
      : Object.freeze({ accepted: false, reason: selection.reason });
  });
  const settle = Object.freeze(function settle(
    this: void,
    taskId: string,
    outcome: AdmissionSettlementOutcome
  ): AdmissionTransitionResult {
    const settlement = settleAdmissionCore(core, taskId, outcome);
    return settlement.accepted
      ? Object.freeze({ accepted: true, state: admissionStateForCore(settlement.transition.state) })
      : Object.freeze({ accepted: false, reason: settlement.reason });
  });
  const validateSelection = Object.freeze(function validateSelection(
    this: void,
    taskId: string
  ): AdmissionSelectionValidation {
    return validateAdmissionCoreSelection(core, taskId);
  });
  return Object.freeze({
    get catalog() {
      return catalogForCore(core);
    },
    get inspection() {
      return inspectionForCore(core);
    },
    select,
    settle,
    validateSelection
  } satisfies AdmissionState);
}

const ACCEPTED_SELECTION: AdmissionSelectionValidation = Object.freeze({ accepted: true });

function reconcileForcedBlocks(
  state: AdmissionCoreState,
  initialEffects: readonly AdmissionCoreEffect[],
  initialEffectStates: readonly AdmissionCoreState[]
): AdmissionCoreTransition {
  let next = state;
  const effects = [...initialEffects];
  const effectStates = [...initialEffectStates];
  while (true) {
    const forcedTaskSlot = nextForcedTaskForCore(next);
    if (forcedTaskSlot === undefined) return freezeTransition(next, effects, effectStates);
    const task = requiredTaskForCore(next, forcedTaskSlot);
    const dependencyIds = task.dependsOn.filter((taskId) => {
      const status = statusForCore(next, requiredTaskSlotForCore(next, taskId));
      return status.kind === "settled" && status.settlementKind !== "completed";
    });
    next = settleForcedTaskForCore(next, forcedTaskSlot);
    effects.push(
      Object.freeze({
        dependencyIds: Object.freeze(dependencyIds),
        kind: "settled",
        settlementKind: "blocked",
        taskId: task.id
      })
    );
    effectStates.push(next);
  }
}

function freezeTransition(
  state: AdmissionCoreState,
  effects: readonly AdmissionCoreEffect[],
  effectStates: readonly AdmissionCoreState[]
): AdmissionCoreTransition {
  if (effects.length !== effectStates.length) {
    throw new Error("admission core transition effects must have matching immutable post-states");
  }
  return Object.freeze({
    effectStates: Object.freeze([...effectStates]),
    effects: Object.freeze([...effects]),
    state
  });
}

function rejectedValidation(
  reason: AdmissionSelectionValidationRejectionReason
): AdmissionSelectionValidation {
  return Object.freeze({ accepted: false, reason });
}
