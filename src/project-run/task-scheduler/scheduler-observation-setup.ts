import type { AdmissionPolicyContext } from "../../project-definition/project-definition.ts";
import { createSchedulerState, type RunTaskGraphOptions } from "./execution-state.ts";
import type { ExecutableTaskGraph } from "./graph.ts";
import { SchedulerPerformanceDiagnostics } from "./measurement/diagnostics.ts";
import { observeSchedulerGraph, performanceState } from "./scheduler-observation.ts";
import { schedulerTerminalContextPlan } from "./scheduler-terminal-measurement.ts";

/** Fixes observation demand, creates the shell once, then starts any raw collector after graph observation. */
export function createObservedSchedulerState<TResult>(
  prepared: ExecutableTaskGraph,
  input: Omit<RunTaskGraphOptions<TResult>, "graph" | "maxParallel">
) {
  const graph = prepared.graph;
  const baseOptions = { ...input, maxParallel: prepared.rootMaxParallel };
  const terminalPlan = schedulerTerminalContextPlan(
    baseOptions,
    input.performanceDiagnostics?.logger !== undefined
  );
  const groups = Object.freeze({
    cumulative: input.admissionPolicy?.measurementNeeds?.includes("cumulative") === true,
    actionHistory: input.admissionPolicy?.measurementNeeds?.includes("actionHistory") === true,
    runMeasurement: terminalPlan.contextNeeds.includes("runMeasurement"),
    taskTimings: terminalPlan.contextNeeds.includes("taskTimings")
  });
  const hasMeasurementDemand = Object.values(groups).some(Boolean);
  const measurementInput = !hasMeasurementDemand
    ? undefined
    : Object.freeze({
        ...(input.performanceDiagnostics ?? {
          clock: Object.freeze({ now: () => performance.now() }),
          declarativeFingerprint: ""
        }),
        groups
      });
  const options = {
    ...baseOptions,
    captureAdmissionFacts: terminalPlan.contextNeeds.includes("execution")
  };
  const state = createSchedulerState(graph, options);
  observeSchedulerGraph(state);
  const diagnostics =
    measurementInput === undefined
      ? undefined
      : new SchedulerPerformanceDiagnostics(measurementInput, performanceState(state));
  return { state, options, terminalPlan, diagnostics };
}

export function decisionBoundaryMeasurement(
  diagnostics: SchedulerPerformanceDiagnostics | undefined
): Readonly<Partial<Pick<AdmissionPolicyContext, "cumulative" | "actionHistory">>> {
  if (diagnostics === undefined) {
    throw new Error("custom policy measurement collector is unavailable");
  }
  return diagnostics.decisionMeasurement();
}
