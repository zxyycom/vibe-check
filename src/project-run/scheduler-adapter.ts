import type { CheckProjectContext } from "../check/check.ts";
import type { NormalizedCheck } from "../project-definition/project-definition.ts";
import type { PreparedAdmissionStrategy } from "./admission-strategy-provider/prepared-admission-strategy.ts";
import { executeResolvedChecks } from "./check-execution/resolved-checks.ts";
import type { ResolvedCheckExecution } from "./check-execution/resolved-execution-result.ts";
import type { Invocation } from "./invocation.ts";
import type { NonConfigurationRunResult } from "./result.ts";

export type SchedulerExecution =
  | ResolvedCheckExecution
  | Extract<NonConfigurationRunResult, { readonly kind: "execution" }>;

type SchedulerAdapterInput = Readonly<{
  readonly invocation: Invocation;
  readonly preparedStrategy: PreparedAdmissionStrategy;
  readonly project: CheckProjectContext;
}>;

/** Bridges one prepared invocation to resolved Check execution and contains task-engine faults. */
export async function executeScheduler(input: SchedulerAdapterInput): Promise<SchedulerExecution> {
  const { invocation, preparedStrategy } = input;
  try {
    const onAdmittedCheck = admittedCheckObservation(preparedStrategy);
    const performanceDiagnostics = schedulerPerformanceDiagnostics(input);
    return await executeResolvedChecks({
      admissionPolicy: preparedStrategy.admissionPolicy,
      checks: invocation.normalized.checks,
      clock: invocation.clock,
      diagnosticLogger: invocation.diagnosticLogging.core,
      ...(invocation.diagnosticLoggingEnabled
        ? { schedulerDiagnosticLogger: invocation.diagnosticLogging.scheduler }
        : {}),
      ...(onAdmittedCheck === undefined ? {} : { onAdmittedCheck }),
      schedulerPerformanceDiagnostics: performanceDiagnostics,
      schedulerMeasurementHooks: invocation.normalized.scheduler.measurementHooks,
      onSchedulerMeasurementHookFailure: () => invocation.outputs.failed("measurementHooks"),
      onSchedulerMeasurementHooksSettled: () => invocation.outputs.succeeded("measurementHooks"),
      maxParallel: invocation.normalized.declarative.scheduler.maxParallel,
      invocationId: invocation.invocationId,
      lifecycle: invocation.progressRendering.lifecycle,
      paths: invocation.paths,
      project: input.project,
      signal: invocation.controls.signal
    });
  } catch {
    return taskEngineFailure(invocation);
  }
}

function admittedCheckObservation(
  preparedStrategy: PreparedAdmissionStrategy
): ((check: NormalizedCheck) => void) | undefined {
  const observeAdmittedTask = preparedStrategy.observeAdmittedTask;
  return observeAdmittedTask === undefined
    ? undefined
    : (check) => observeAdmittedTask(check.definition.checkId);
}

function schedulerPerformanceDiagnostics(input: SchedulerAdapterInput) {
  const { invocation, preparedStrategy } = input;
  const shouldCollectSchedulerPerformanceDiagnostics =
    invocation.diagnosticLoggingEnabled ||
    invocation.normalized.scheduler.measurementHooks.length > 0 ||
    preparedStrategy.admissionPolicy.requiresMeasurement === true ||
    preparedStrategy.requiresTerminalMeasurement;
  if (!shouldCollectSchedulerPerformanceDiagnostics) return undefined;
  return Object.freeze({
    clock: invocation.clock,
    declarativeFingerprint: invocation.declarativeFingerprint,
    ...(invocation.diagnosticLoggingEnabled
      ? { logger: invocation.diagnosticLogging.scheduler }
      : {})
  });
}

function taskEngineFailure(
  invocation: Invocation
): Extract<NonConfigurationRunResult, { readonly kind: "execution" }> {
  return Object.freeze({
    kind: "execution",
    declarativeFingerprint: invocation.declarativeFingerprint,
    definitionWarnings: invocation.definitionWarnings,
    diagnostic: Object.freeze({ code: "task-engine-failed" }),
    outputs: invocation.outputs.value()
  });
}
