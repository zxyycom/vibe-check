import type {
  AdmissionCatalog,
  AdmissionInspection,
  AdmissionSelectionValidation
} from "../../../project-definition/scheduler-policy.ts";
import {
  admissionStateForCore,
  cancelPendingAdmissionCore,
  reconcileAdmissionCore,
  selectAdmissionCore,
  settleAdmissionCore,
  settleRunningAdmissionCore,
  type AdmissionCoreEffect,
  type AdmissionCoreState,
  type AdmissionCoreTransition
} from "./core.ts";

export type AdmissionTraceAction =
  | Readonly<{ readonly kind: "select"; readonly taskId: string }>
  | Readonly<{
      readonly kind: "settle";
      readonly outcome: "satisfied" | "unsatisfied";
      readonly taskId: string;
    }>
  | Readonly<{
      readonly kind: "settle-running";
      readonly settlementKind: "completed" | "failed" | "prerequisite-unsatisfied";
      readonly taskId: string;
    }>
  | Readonly<{ readonly kind: "cancel-pending" }>
  | Readonly<{ readonly kind: "reconcile" }>;

export interface AdmissionCoreTraceProjection {
  readonly catalog: AdmissionCatalog;
  readonly inspection: AdmissionInspection;
  readonly validation: readonly Readonly<{
    readonly taskId: string;
    readonly value: AdmissionSelectionValidation;
  }>[];
}

export interface AdmissionCoreTraceStep {
  readonly action: AdmissionTraceAction;
  /** The normalized public state after each matching canonical effect. */
  readonly effectProjections: readonly AdmissionCoreTraceProjection[];
  readonly effects: readonly AdmissionCoreEffect[];
  readonly post: AdmissionCoreTraceProjection;
  readonly pre: AdmissionCoreTraceProjection;
  readonly result: Readonly<{ readonly accepted: boolean; readonly reasonKind: string | null }>;
}

interface AppliedTraceAction {
  readonly accepted: boolean;
  readonly effectStates: readonly AdmissionCoreState[];
  readonly effects: readonly AdmissionCoreEffect[];
  readonly reasonKind: string | null;
  readonly state: AdmissionCoreState;
}

type AdmissionCoreActionResult =
  | Readonly<{ readonly accepted: true; readonly transition: AdmissionCoreTransition }>
  | Readonly<{ readonly accepted: false; readonly reason: Readonly<{ readonly kind: string }> }>;

/**
 * Private deterministic oracle: it invokes the shared reducer and only normalizes
 * its public projection. It never recreates legality or exposes the effect stream.
 */
export function traceAdmissionCore(
  seed: AdmissionCoreState,
  actions: readonly AdmissionTraceAction[]
): readonly AdmissionCoreTraceStep[] {
  let state = seed;
  const taskIds = state.compiled.taskIdsInPublicOrder;
  const steps: AdmissionCoreTraceStep[] = [];
  for (const action of actions) {
    const pre = projectionFor(state, taskIds);
    const applied = applyTraceAction(state, action);
    state = applied.state;
    steps.push(
      Object.freeze({
        action: Object.freeze({ ...action }),
        effectProjections: Object.freeze(
          applied.effectStates.map((effectState) => projectionFor(effectState, taskIds))
        ),
        effects: Object.freeze([...applied.effects]),
        post: projectionFor(state, taskIds),
        pre,
        result: Object.freeze({ accepted: applied.accepted, reasonKind: applied.reasonKind })
      })
    );
  }
  return Object.freeze(steps);
}

function applyTraceAction(
  state: AdmissionCoreState,
  action: AdmissionTraceAction
): AppliedTraceAction {
  switch (action.kind) {
    case "select":
      return traceCoreActionResult(state, selectAdmissionCore(state, action.taskId));
    case "settle":
      return traceCoreActionResult(
        state,
        settleAdmissionCore(state, action.taskId, action.outcome)
      );
    case "settle-running":
      return traceCoreActionResult(
        state,
        settleRunningAdmissionCore(state, action.taskId, action.settlementKind)
      );
    case "cancel-pending": {
      const cancelled = cancelPendingAdmissionCore(state);
      return Object.freeze({
        accepted: true,
        effectStates: cancelled.effectStates,
        effects: cancelled.effects,
        reasonKind: null,
        state: cancelled.state
      });
    }
    case "reconcile": {
      const reconciled = reconcileAdmissionCore(state);
      return Object.freeze({
        accepted: true,
        effectStates: reconciled.effectStates,
        effects: reconciled.effects,
        reasonKind: null,
        state: reconciled.state
      });
    }
  }
}

/** Normalizes the reducer's common accepted/rejected transition protocol for trace output. */
function traceCoreActionResult(
  state: AdmissionCoreState,
  result: AdmissionCoreActionResult
): AppliedTraceAction {
  return result.accepted
    ? Object.freeze({
        accepted: true,
        effectStates: result.transition.effectStates,
        effects: result.transition.effects,
        reasonKind: null,
        state: result.transition.state
      })
    : Object.freeze({
        accepted: false,
        effectStates: [],
        effects: [],
        reasonKind: result.reason.kind,
        state
      });
}

export function admissionCoreTraceProjectionFor(
  state: AdmissionCoreState
): AdmissionCoreTraceProjection {
  return projectionFor(state, state.compiled.taskIdsInPublicOrder);
}

function projectionFor(
  state: AdmissionCoreState,
  taskIds: readonly string[]
): AdmissionCoreTraceProjection {
  const publicState = admissionStateForCore(state);
  return Object.freeze({
    catalog: publicState.catalog,
    inspection: publicState.inspection,
    validation: Object.freeze(
      [...taskIds, "__admission_trace_unknown__"].map((taskId) =>
        Object.freeze({ taskId, value: publicState.validateSelection(taskId) })
      )
    )
  });
}
