import {
  schedulerInspectionForCore,
  type AdmissionCoreEffect,
  type AdmissionCoreState
} from "./admission-core/core.ts";
import { decisionContext } from "./scheduler-decision-inspection.ts";
import { freezeDecision } from "./scheduler-decision-model.ts";
import type { SchedulerTrigger } from "./scheduler-decision.ts";
import type { SchedulerState } from "./execution-state.ts";
import { observeSchedulerDecision, performanceState } from "./scheduler-observation.ts";
import type { SchedulerPerformanceDiagnostics } from "./measurement/diagnostics.ts";
import { applyForcedBlockedSettlement } from "./scheduler-task-lifecycle.ts";

/**
 * Adapts only canonical forced blocked effects to the real Scheduler shell.
 * Direct admission, running settlement, and cancellation remain in the root shell.
 */
export function replayCoreForcedBlocks<TResult>(
  state: SchedulerState<TResult>,
  effects: readonly AdmissionCoreEffect[],
  effectStates: readonly AdmissionCoreState[],
  diagnostics: SchedulerPerformanceDiagnostics | undefined,
  trigger: SchedulerTrigger
): void {
  if (effects.length !== effectStates.length) {
    throw new Error("shared admission core effect replay has no matching immutable post-state");
  }
  for (const [index, effect] of effects.entries()) {
    if (effect.kind !== "settled" || effect.settlementKind !== "blocked") {
      throw new Error("shared admission core forced-block replay received a non-blocked effect");
    }
    const effectState = effectStates[index];
    if (effectState === undefined) {
      throw new Error("shared admission core forced block has no immutable post-state");
    }
    diagnostics?.beforePendingSettlement([effect.taskId]);
    state.admissionCore = effectState;
    applyForcedBlockedSettlement(state, effect.taskId, effect.dependencyIds ?? []);
    diagnostics?.captureState(performanceState(state));
    diagnostics?.recordEffect(
      Object.freeze({ kind: "settled", settlementKind: "blocked", taskId: effect.taskId })
    );
    if (diagnostics !== undefined || state.diagnosticLogger !== undefined) {
      const inspection = schedulerInspectionForCore(state.admissionCore);
      observeSchedulerDecision(
        state,
        freezeDecision({
          ...decisionContext(
            Object.freeze({
              ...inspection,
              isAbortRequested: state.signal?.aborted === true,
              isCancelled: state.isCancelled
            }),
            state.admissionCore.compiled.graph.schedulerGraphSnapshot
          ),
          dependencyIds: effect.dependencyIds ?? [],
          kind: "settle-blocked",
          taskId: effect.taskId,
          trigger
        }),
        diagnostics
      );
    }
    if (state.onAdmissionCoreEffect !== undefined) {
      state.onAdmissionCoreEffect(Object.freeze({ effect, state: state.admissionCore }));
    }
  }
}
