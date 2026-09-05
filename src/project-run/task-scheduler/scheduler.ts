import type { AdmissionPolicyContext } from "../../project-definition/project-definition.ts";
import { prepareTaskGraph } from "./graph.ts";
import {
  decideScheduler,
  type SchedulerDecision,
  type SchedulerTrigger
} from "./scheduler-decision.ts";
import {
  createSchedulerState,
  snapshotSchedulerState,
  type RunTaskGraphOptions,
  type SchedulerState,
  type TaskGraphRun
} from "./execution-state.ts";
export type {
  RunTaskGraphOptions,
  SettledTask,
  TaskExecutionContext,
  TaskGraphRun,
  TaskSettlement
} from "./execution-state.ts";
import { AdmissionPolicyFault } from "./scheduler-admission-decision.ts";
import { replayCoreForcedBlocks } from "./forced-block-effect-replay.ts";
import { SchedulerPerformanceDiagnostics } from "./measurement/diagnostics.ts";
import {
  observeAdmissionPolicyFault,
  observeSchedulerDecision,
  observeSchedulerGraph,
  performanceState
} from "./scheduler-observation.ts";
import { observeTerminalMeasurement } from "./scheduler-terminal-measurement.ts";
import {
  applyAdmission,
  applyAdmissionPolicyFault,
  applyBlockedSettlement,
  applyCancellation,
  buildTaskGraphRun,
  nextRunningSettlement,
  settleRunningTask
} from "./scheduler-task-lifecycle.ts";
import {
  cancelPendingAdmissionCore,
  reconcileAdmissionCore,
  selectAdmissionCore,
  settleRunningAdmissionCore,
  type AdmissionCoreEffect
} from "./admission-core/core.ts";

export async function runTaskGraph<TResult>(
  options: RunTaskGraphOptions<TResult>
): Promise<TaskGraphRun<TResult>> {
  const graph = prepareTaskGraph(options.graph, options.maxParallel);
  const state = createSchedulerState(graph, options);
  observeSchedulerGraph(state);
  const measurementInput =
    options.performanceDiagnostics ??
    (state.admissionPolicy.requiresMeasurement === true
      ? Object.freeze({
          clock: Object.freeze({ now: () => performance.now() }),
          declarativeFingerprint: ""
        })
      : undefined);
  const diagnostics =
    measurementInput === undefined
      ? undefined
      : new SchedulerPerformanceDiagnostics(measurementInput, performanceState(state));
  const initialReconciliation = reconcileAdmissionCore(state.admissionCore);
  replayCoreForcedBlocks(
    state,
    initialReconciliation.effects,
    initialReconciliation.effectStates,
    diagnostics,
    triggerForInitialReconciliation()
  );
  let trigger: SchedulerTrigger = Object.freeze({ kind: "execution-started" });

  while (true) {
    let decision: SchedulerDecision;
    try {
      const snapshot = snapshotSchedulerState(state);
      const measurement =
        state.admissionPolicy.requiresMeasurement === true
          ? () => decisionBoundaryMeasurement(diagnostics)
          : undefined;
      decision =
        diagnostics?.measureControlPath(() =>
          decideScheduler(
            snapshot,
            trigger,
            state.admissionPolicy,
            measurement,
            state.admissionCore
          )
        ) ??
        decideScheduler(snapshot, trigger, state.admissionPolicy, measurement, state.admissionCore);
    } catch (error) {
      if (!(error instanceof AdmissionPolicyFault)) throw error;
      const cancellation = cancelPendingAdmissionCore(state.admissionCore);
      state.admissionCore = cancellation.state;
      diagnostics?.beforePendingSettlement(state.pending.map((task) => task.id));
      if (diagnostics === undefined) applyAdmissionPolicyFault(state, error);
      else diagnostics.measureControlPath(() => applyAdmissionPolicyFault(state, error));
      diagnostics?.captureState(performanceState(state));
      observeAdmissionPolicyFault(state, error);
      trigger = Object.freeze({ kind: "cancellation-applied" });
      continue;
    }
    observeSchedulerDecision(state, decision, diagnostics);

    switch (decision.kind) {
      case "admit": {
        if (state.signal?.aborted === true) {
          const cancellation = cancelPendingAdmissionCore(state.admissionCore);
          state.admissionCore = cancellation.state;
          diagnostics?.beforePendingSettlement(state.pending.map((task) => task.id));
          const lifecycleFault = new AdmissionPolicyFault("lifecycle-invalid-select");
          if (diagnostics === undefined) applyAdmissionPolicyFault(state, lifecycleFault);
          else
            diagnostics.measureControlPath(() => applyAdmissionPolicyFault(state, lifecycleFault));
          diagnostics?.captureState(performanceState(state));
          observeAdmissionPolicyFault(state, lifecycleFault);
          trigger = Object.freeze({ kind: "cancellation-applied" });
          continue;
        }
        const selection = selectAdmissionCore(state.admissionCore, decision.taskId);
        if (!selection.accepted) {
          throw new Error("shared admission core rejected a Scheduler hard-guarded selection");
        }
        const admissionEffect = selection.transition.effects[0];
        if (admissionEffect === undefined) {
          throw new Error("shared admission core omitted a Scheduler admission effect");
        }
        state.admissionCore = selection.transition.state;
        diagnostics?.beforeAdmission(decision.taskId, [...state.runningById.keys()]);
        if (diagnostics === undefined) applyAdmission(state, decision);
        else diagnostics.measureControlPath(() => applyAdmission(state, decision));
        diagnostics?.captureState(performanceState(state));
        if (state.admissionPolicy.requiresMeasurement === true) {
          diagnostics?.beginSelectedPolicyAction(decision.taskId);
          diagnostics?.recordEffect(Object.freeze({ kind: "admitted", taskId: decision.taskId }));
        }
        observeAdmissionCoreEffect(state, admissionEffect);
        trigger = Object.freeze({ kind: "admission-continued" });
        continue;
      }
      case "settle-blocked":
        diagnostics?.beforePendingSettlement([decision.taskId]);
        if (diagnostics === undefined) applyBlockedSettlement(state, decision);
        else diagnostics.measureControlPath(() => applyBlockedSettlement(state, decision));
        diagnostics?.captureState(performanceState(state));
        diagnostics?.recordEffect(
          Object.freeze({
            kind: "settled",
            settlementKind: "blocked",
            taskId: decision.taskId
          })
        );
        trigger = Object.freeze({
          kind: "blocked-settled",
          taskId: decision.taskId
        });
        continue;
      case "cancel-pending":
        state.admissionCore = cancelPendingAdmissionCore(state.admissionCore).state;
        diagnostics?.beforePendingSettlement(decision.taskIds);
        if (diagnostics === undefined) applyCancellation(state, decision);
        else diagnostics.measureControlPath(() => applyCancellation(state, decision));
        diagnostics?.captureState(performanceState(state));
        for (const taskId of decision.taskIds) {
          diagnostics?.recordEffect(
            Object.freeze({
              kind: "settled",
              settlementKind: "cancelled-before-start",
              taskId
            })
          );
        }
        trigger = Object.freeze({ kind: "cancellation-applied" });
        continue;
      case "await-running": {
        if (decision.proposal?.kind === "wait") {
          diagnostics?.beforeAcceptedWait();
          if (state.admissionPolicy.requiresMeasurement === true) {
            diagnostics?.beginWaitPolicyAction();
          }
        }
        const completion = await nextRunningSettlement(state);
        diagnostics?.beforeRunningSettlement(completion.taskId);
        if (diagnostics === undefined) settleRunningTask(state, completion);
        else diagnostics.measureControlPath(() => settleRunningTask(state, completion));
        const settlementKind = completion.settlement.kind;
        if (
          settlementKind !== "completed" &&
          settlementKind !== "prerequisite-unsatisfied" &&
          settlementKind !== "failed"
        ) {
          throw new Error("running Task completed with a non-running settlement kind");
        }
        const transition = settleRunningAdmissionCore(
          state.admissionCore,
          completion.taskId,
          settlementKind
        );
        if (!transition.accepted) {
          throw new Error("shared admission core rejected a Scheduler running settlement");
        }
        const directEffect = transition.transition.effects[0];
        const directState = transition.transition.effectStates[0];
        if (directEffect === undefined || directState === undefined) {
          throw new Error("shared admission core omitted a Scheduler running settlement effect");
        }
        state.admissionCore = directState;
        diagnostics?.captureState(performanceState(state));
        diagnostics?.recordEffect(
          Object.freeze({
            kind: "settled",
            settlementKind: completion.settlement.kind,
            taskId: completion.taskId
          })
        );
        observeAdmissionCoreEffect(state, directEffect);
        replayCoreForcedBlocks(
          state,
          transition.transition.effects.slice(1),
          transition.transition.effectStates.slice(1),
          diagnostics,
          Object.freeze({
            kind: "task-settled",
            settlementKind: completion.settlement.kind,
            taskId: completion.taskId
          })
        );
        trigger = Object.freeze({
          kind: "task-settled",
          settlementKind: completion.settlement.kind,
          taskId: completion.taskId
        });
        continue;
      }
      case "complete": {
        if (diagnostics === undefined) return buildTaskGraphRun(state);
        const run = diagnostics.measureControlPath(() => buildTaskGraphRun(state));
        const terminalMeasurement = await observeTerminalMeasurement({
          diagnostics,
          options,
          state
        });
        return Object.freeze({ ...run, terminalMeasurement });
      }
    }
  }
}

function observeAdmissionCoreEffect<TResult>(
  state: SchedulerState<TResult>,
  effect: AdmissionCoreEffect
): void {
  if (state.onAdmissionCoreEffect === undefined) return;
  state.onAdmissionCoreEffect(Object.freeze({ effect, state: state.admissionCore }));
}

function triggerForInitialReconciliation(): SchedulerTrigger {
  return Object.freeze({ kind: "execution-started" });
}

function decisionBoundaryMeasurement(
  diagnostics: SchedulerPerformanceDiagnostics | undefined
): AdmissionPolicyContext["measurement"] {
  if (diagnostics === undefined) {
    throw new Error("custom policy measurement collector is unavailable");
  }
  return diagnostics.policyMeasurement();
}
