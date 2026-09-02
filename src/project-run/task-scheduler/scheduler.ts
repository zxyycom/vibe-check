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
import { SchedulerPerformanceDiagnostics } from "./scheduler-performance-diagnostics.ts";
import {
  observeAdmissionPolicyFault,
  observeSchedulerDecision,
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

export async function runTaskGraph<TResult>(
  options: RunTaskGraphOptions<TResult>
): Promise<TaskGraphRun<TResult>> {
  const graph = prepareTaskGraph(options.graph, options.maxParallel);
  const state = createSchedulerState(graph, options);
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
          decideScheduler(snapshot, trigger, state.admissionPolicy, measurement)
        ) ?? decideScheduler(snapshot, trigger, state.admissionPolicy, measurement);
    } catch (error) {
      if (!(error instanceof AdmissionPolicyFault)) throw error;
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
      case "admit":
        if (state.signal?.aborted === true) {
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
        diagnostics?.beforeAdmission(decision.taskId, [...state.runningById.keys()]);
        if (diagnostics === undefined) applyAdmission(state, decision);
        else diagnostics.measureControlPath(() => applyAdmission(state, decision));
        diagnostics?.captureState(performanceState(state));
        if (state.admissionPolicy.requiresMeasurement === true) {
          diagnostics?.beginSelectedPolicyAction(decision.taskId);
          diagnostics?.recordEffect(Object.freeze({ kind: "admitted", taskId: decision.taskId }));
        }
        trigger = Object.freeze({ kind: "admission-continued" });
        continue;
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
        diagnostics?.captureState(performanceState(state));
        diagnostics?.recordEffect(
          Object.freeze({
            kind: "settled",
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

function decisionBoundaryMeasurement(
  diagnostics: SchedulerPerformanceDiagnostics | undefined
): AdmissionPolicyContext["measurement"] {
  if (diagnostics === undefined) {
    throw new Error("custom policy measurement collector is unavailable");
  }
  return diagnostics.policyMeasurement();
}
