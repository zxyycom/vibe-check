/** Maps normalized Checks into the Scheduler's opaque Task execution contract. */

import type { NormalizedCheck } from "../../project-definition/project-definition.ts";
import { runTaskGraph, type RunTaskGraphOptions } from "../task-scheduler/scheduler.ts";
import {
  CheckExecutionInvariantFailure,
  type CheckExecutionState
} from "./execution-settlement.ts";
import { settleBlockedDependent, trustedFailure } from "./execution-finalization.ts";
import type { FlagControlSettlement } from "./flag-controls.ts";
import { planStaticCheckGraph } from "./plan.ts";
import {
  executeAdmittedCheck,
  type AdmittedCheckExecutionInput,
  type CheckExecutionClock
} from "./admitted-check-execution.ts";
import type { ResolvedCheckExecutionInput } from "./resolved-checks.ts";

const INERT_SIGNAL = new AbortController().signal;
const DIRECT_EXECUTION_INVOCATION_ID = "invocation/v1:direct-check-execution";
const SYSTEM_MONOTONIC_CLOCK: CheckExecutionClock = Object.freeze({
  now: () => performance.now()
});

export async function runScheduledChecks(
  input: Readonly<{
    readonly execution: ResolvedCheckExecutionInput;
    readonly flagControlSettlements: readonly FlagControlSettlement[];
    readonly state: CheckExecutionState;
  }>
): Promise<Awaited<ReturnType<typeof runTaskGraph<boolean>>>> {
  try {
    return await runTaskGraph(schedulerOptionsFor(input));
  } catch (error) {
    throw trustedFailure(error);
  }
}

function schedulerOptionsFor(
  input: Readonly<{
    readonly execution: ResolvedCheckExecutionInput;
    readonly flagControlSettlements: readonly FlagControlSettlement[];
    readonly state: CheckExecutionState;
  }>
): RunTaskGraphOptions<boolean> {
  const execution = input.execution;
  const checksByCheckId = new Map(
    execution.checks.map((check) => [check.definition.checkId, check] as const)
  );
  const schedulerDiagnosticLogger =
    execution.schedulerDiagnosticLogger ?? execution.diagnosticLogger;
  return {
    graph: planStaticCheckGraph(execution.checks, execution.resourceCapacities),
    ...(execution.admissionPolicy === undefined
      ? {}
      : { admissionPolicy: execution.admissionPolicy }),
    maxParallel: execution.maxParallel,
    ...(schedulerDiagnosticLogger === undefined
      ? {}
      : { diagnosticLogger: schedulerDiagnosticLogger }),
    ...(execution.schedulerPerformanceDiagnostics === undefined
      ? {}
      : { performanceDiagnostics: execution.schedulerPerformanceDiagnostics }),
    ...(execution.schedulerMeasurementHooks === undefined
      ? {}
      : { measurementHooks: execution.schedulerMeasurementHooks }),
    ...(execution.onSchedulerMeasurementHookFailure === undefined
      ? {}
      : { onMeasurementHookFailure: execution.onSchedulerMeasurementHookFailure }),
    ...(execution.onSchedulerMeasurementHooksSettled === undefined
      ? {}
      : { onMeasurementHooksSettled: execution.onSchedulerMeasurementHooksSettled }),
    preAdmissionTaskResults: Object.freeze(
      input.flagControlSettlements.map((settlement) =>
        Object.freeze({ taskId: settlement.check.definition.checkId, value: false })
      )
    ),
    ...(execution.signal === undefined ? {} : { signal: execution.signal }),
    isPrerequisiteSatisfied: (satisfied) => satisfied,
    onTaskBlocked: (task, dependencyIds) => {
      settleBlockedDependent({
        check: requiredNormalizedCheck(checksByCheckId, task, "Blocked Task"),
        dependencyIds,
        state: input.state
      });
    },
    execute: (task, context) =>
      executeAdmittedCheck({
        ...input.state,
        ...admittedExecutionFacts(execution),
        check: requiredNormalizedCheck(checksByCheckId, task, "Task graph"),
        signal: context.signal ?? INERT_SIGNAL
      })
  };
}

function requiredNormalizedCheck(
  checksByCheckId: ReadonlyMap<string, NormalizedCheck>,
  task: Readonly<{ readonly id: string }>,
  owner: "Blocked Task" | "Task graph"
): NormalizedCheck {
  const check = checksByCheckId.get(task.id);
  if (check === undefined) {
    throw new CheckExecutionInvariantFailure(`${owner} has no normalized Check`);
  }
  return check;
}

function admittedExecutionFacts(
  execution: ResolvedCheckExecutionInput
): Omit<AdmittedCheckExecutionInput, keyof CheckExecutionState | "check" | "signal"> {
  return {
    clock: execution.clock ?? SYSTEM_MONOTONIC_CLOCK,
    onAdmittedCheck: execution.onAdmittedCheck,
    invocationId: execution.invocationId ?? DIRECT_EXECUTION_INVOCATION_ID,
    paths: execution.paths,
    project: execution.project
  };
}
