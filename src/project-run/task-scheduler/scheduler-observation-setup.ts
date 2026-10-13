import type { AdmissionPolicyContext } from "../../project-definition/project-definition.ts";
import {
  createSchedulerState,
  type RunTaskGraphOptions,
  type SchedulerState
} from "./execution-state.ts";
import type { ExecutableTaskGraph } from "./graph.ts";
import { SchedulerPerformanceDiagnostics } from "./measurement/diagnostics.ts";
import { observeSchedulerGraph, performanceState } from "./scheduler-observation.ts";
import { schedulerTerminalContextPlan } from "./scheduler-terminal-measurement.ts";
import type { ShellAdmissionFacts } from "./shell-admission-facts.ts";

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
  let measurementInput = input.performanceDiagnostics ?? undefined;
  if (measurementInput === undefined) {
    const needsMeasurementCollection =
      input.admissionPolicy?.requiresMeasurement === true ||
      terminalPlan.contextNeeds.includes("rawMeasurement");
    if (needsMeasurementCollection) {
      measurementInput = Object.freeze({
        clock: Object.freeze({ now: () => performance.now() }),
        declarativeFingerprint: ""
      });
    }
  }
  const options = {
    ...baseOptions,
    captureAdmissionFacts:
      measurementInput !== undefined || terminalPlan.contextNeeds.includes("execution")
  };
  const state = createSchedulerState(graph, options);
  observeSchedulerGraph(state);
  const diagnostics =
    measurementInput === undefined
      ? undefined
      : new SchedulerPerformanceDiagnostics(
          measurementInput,
          performanceState(state),
          requiredAdmissionFacts(state)
        );
  return { state, options, terminalPlan, diagnostics };
}

export function decisionBoundaryMeasurement(
  diagnostics: SchedulerPerformanceDiagnostics | undefined
): AdmissionPolicyContext["measurement"] {
  if (diagnostics === undefined) {
    throw new Error("custom policy measurement collector is unavailable");
  }
  return diagnostics.policyMeasurement();
}

function requiredAdmissionFacts<TResult>(state: SchedulerState<TResult>): ShellAdmissionFacts {
  if (state.admissionFacts === undefined) throw new Error("measurement requires admission facts");
  return state.admissionFacts;
}
