import type { CheckProjectContext } from "../../check/check.ts";
import type { PreparedAdmissionStrategy } from "../admission-strategy-provider/prepared-admission-strategy.ts";
import { executePreparedChecks } from "../check-execution/resolved-checks.ts";
import type { ResolvedCheckExecution } from "../check-execution/resolved-execution-result.ts";
import type { PreparedCheckExecution } from "../check-execution/prepared-check-execution.ts";
import type { Invocation } from "./run.ts";
import type { NonConfigurationRunResult } from "../result.ts";

export type SchedulerExecution =
  | ResolvedCheckExecution
  | Extract<NonConfigurationRunResult, { readonly kind: "execution" }>;

type SchedulerAdapterInput = Readonly<{
  readonly invocation: Invocation;
  readonly prepared: PreparedCheckExecution;
  readonly preparedStrategy: PreparedAdmissionStrategy;
  readonly project: CheckProjectContext;
}>;

/** Bridges one prepared invocation to resolved Check execution and contains task-engine faults. */
export async function executeScheduler(input: SchedulerAdapterInput): Promise<SchedulerExecution> {
  const { invocation, preparedStrategy } = input;
  try {
    const performanceDiagnostics = schedulerPerformanceDiagnostics(input);
    return await executePreparedChecks(input.prepared, {
      admissionPolicy: preparedStrategy.admissionPolicy,
      clock: invocation.clock,
      diagnosticLogger: invocation.diagnosticLogging.core,
      ...(invocation.diagnosticLoggingEnabled
        ? { schedulerDiagnosticLogger: invocation.diagnosticLogging.scheduler }
        : {}),
      ...(performanceDiagnostics === undefined
        ? {}
        : { schedulerPerformanceDiagnostics: performanceDiagnostics }),
      schedulerTerminalEffects: invocation.normalized.scheduler.terminalEffects,
      onSchedulerTerminalEffectFailure: () => {
        invocation.outputs.failed("terminalEffects");
      },
      onSchedulerTerminalEffectsSettled: () => {
        invocation.outputs.succeeded("terminalEffects");
      },
      invocationId: invocation.invocationId,
      checkLifecycle: invocation.progressRendering.checkLifecycle,
      invocationLifecycle: invocation.progressRendering.invocationLifecycle,
      paths: invocation.paths,
      project: input.project,
      signal: invocation.controls.signal
    });
  } catch {
    return taskEngineFailure(invocation);
  }
}

function schedulerPerformanceDiagnostics(input: SchedulerAdapterInput) {
  const { invocation, preparedStrategy } = input;
  const shouldCollectSchedulerPerformanceDiagnostics =
    invocation.diagnosticLoggingEnabled ||
    invocation.normalized.scheduler.terminalEffects.length > 0 ||
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
