import type { CheckProjectContext } from "../check/check.ts";
import {
  normalizeProjectDefinition,
  type DefinitionWarning,
  type NormalizedProjectDefinition,
  type ProjectDefinition
} from "../project-definition/project-definition.ts";
import type { CheckAggregation, RunControls } from "./controls/contract.ts";
import {
  createAdmissionStrategyProvider,
  type AdmissionStrategyProviderFactory,
  type PreparedAdmissionStrategy
} from "./admission-strategy-provider/provider.ts";
import { prepareTaskGraph } from "./task-scheduler/graph.ts";
import { aggregateCheckOutcomes, validateCheckAggregationSelection } from "./aggregation.ts";
import {
  executeResolvedChecks,
  type CheckExecutionClock,
  type ResolvedCheckExecution
} from "./check-execution/resolved-checks.ts";
import { planStaticCheckGraph } from "./check-execution/plan.ts";
import {
  type ProgressRefreshScheduler,
  type ProgressRendering,
  type ProgressWriterFactory
} from "./progress-rendering/presentation.ts";
import { completeInvocation, finalizeInvocation, type CoreExecution } from "./completion.ts";
import { createProjectContext } from "./project-context.ts";
import {
  executionCancellation,
  isCancelled,
  planning,
  preExecutionCancellation,
  type NonConfigurationRunResult,
  type RunDiagnostic,
  type RunResult
} from "./result.ts";
import {
  diagnosticTags,
  summarizeDiagnosticValue,
  type DiagnosticLogger,
  type DiagnosticLoggerFactory
} from "./diagnostic-logging/logger.ts";
import { createInvocation } from "./invocation-creation.ts";
import { elapsedSince, outcomeCounts } from "./invocation-progress.ts";
import type { OutputStatuses } from "./output-status.ts";
export type Invocation = Readonly<{
  /** Product-private test seam; package `run` never accepts a provider factory. */
  readonly admissionStrategyProviderFactory: AdmissionStrategyProviderFactory | undefined;
  readonly clock: CheckExecutionClock;
  readonly controls: RunControls;
  readonly declarativeFingerprint: string;
  readonly definition: ProjectDefinition;
  readonly definitionWarnings: readonly DefinitionWarning[];
  readonly diagnosticLogger: DiagnosticLogger;
  /** Effective output selection, retained privately for enabled-only Scheduler diagnostics. */
  readonly diagnosticLoggingEnabled: boolean;
  readonly outputConfiguration: ProjectDefinition["outputs"];
  readonly outputs: OutputStatuses;
  readonly invocationId: string;
  readonly normalized: NormalizedProjectDefinition;
  readonly progressRendering: ProgressRendering;
  readonly projectRoot: string;
  /** Immutable UTC instant captured for enabled diagnostic or machine output, otherwise `null`. */
  readonly startedAtUtc: string | null;
}>;
export interface RunInvocationDependencies {
  /** Product-private test seam for proving invocation lifecycle sequencing. */
  readonly admissionStrategyProviderFactory?: AdmissionStrategyProviderFactory;
  readonly clock?: CheckExecutionClock;
  readonly progressRefreshScheduler?: ProgressRefreshScheduler;
  readonly progressWriterFactory?: ProgressWriterFactory;
  readonly diagnosticLoggerFactory?: DiagnosticLoggerFactory;
  /** Test seam for the invocation's machine-readable wall-clock timestamp. */
  readonly wallClock?: Readonly<{ now(): Date }>;
}

export async function executeValidatedRun(
  definition: ProjectDefinition,
  controls: RunControls,
  definitionWarnings: readonly DefinitionWarning[],
  dependencies: RunInvocationDependencies = {}
): Promise<RunResult> {
  const normalized = normalizeProjectDefinition(definition);
  const aggregation = validateCheckAggregationSelection(
    controls.checkAggregation,
    normalized.checks.map((check) => check.definition.checkId)
  );
  if (!aggregation.ok)
    return Object.freeze({
      kind: "configuration",
      definitionWarnings: Object.freeze([...definitionWarnings]),
      diagnostic: aggregation.error
    });

  const invocation = createInvocation({
    controls,
    definition,
    definitionWarnings,
    dependencies,
    normalized
  });
  let candidate: NonConfigurationRunResult;
  try {
    observeInvocationStarted(invocation, aggregation.value);
    if (isCancelled(controls)) {
      candidate = cancelledBeforeExecution(invocation, "pre-work");
    } else if (!validateTaskGraph(invocation)) {
      candidate = planningResult(invocation, "task-graph-invalid");
    } else {
      candidate = await executePlannedInvocation(invocation, aggregation.value);
    }
  } catch {
    candidate = executionResult(invocation, "task-engine-failed");
  }
  return finalizeInvocation(invocation, candidate);
}

function observeInvocationStarted(
  invocation: Invocation,
  aggregation: CheckAggregation | undefined
): void {
  invocation.diagnosticLogger.observe({
    event: "run.started",
    tags: diagnosticTags("RUN", "STARTED"),
    details: {
      aggregation: aggregation ?? null,
      checkCount: invocation.normalized.checks.length,
      flags:
        invocation.normalized.scheduler.admissionPolicy.kind === "learned-critical-path"
          ? summarizeDiagnosticValue(invocation.controls.flags ?? [])
          : (invocation.controls.flags ?? []),
      invocationId: invocation.invocationId,
      outputs: invocation.outputConfiguration,
      scheduler: invocation.normalized.declarative.scheduler
    }
  });
}

function validateTaskGraph(invocation: Invocation): boolean {
  try {
    prepareTaskGraph(
      planStaticCheckGraph(invocation.normalized.checks),
      invocation.normalized.declarative.scheduler.maxParallel
    );
    invocation.diagnosticLogger.observe({
      event: "run.planning.succeeded",
      tags: diagnosticTags("RUN", "PLANNING", "SUCCEEDED"),
      details: {
        checkCount: invocation.normalized.checks.length,
        maxParallel: invocation.normalized.declarative.scheduler.maxParallel
      }
    });
    return true;
  } catch {
    invocation.diagnosticLogger.observe({
      event: "run.planning.failed",
      tags: diagnosticTags("RUN", "PLANNING", "FAILED"),
      details: {
        checkCount: invocation.normalized.checks.length,
        maxParallel: invocation.normalized.declarative.scheduler.maxParallel
      }
    });
    return false;
  }
}
async function executePlannedInvocation(
  invocation: Invocation,
  aggregation: CheckAggregation | undefined
): Promise<NonConfigurationRunResult> {
  if (isCancelled(invocation.controls)) return cancelledBeforeExecution(invocation, "pre-work");
  return executePreparedInvocation(
    invocation,
    aggregation,
    createProjectContext({
      controls: invocation.controls,
      root: invocation.projectRoot
    })
  );
}
async function executePreparedInvocation(
  invocation: Invocation,
  aggregation: CheckAggregation | undefined,
  project: CheckProjectContext
): Promise<NonConfigurationRunResult> {
  if (isCancelled(invocation.controls)) return cancelledBeforeExecution(invocation, "planning");
  const preparedStrategy = await prepareAdmissionStrategy(invocation);
  invocation.progressRendering.prepared(invocation.normalized.checks.length);
  const executionStartedAt = invocation.clock.now();
  const executed = await executeChecks(invocation, project, invocation.clock, preparedStrategy);
  if (isExecutionRunResult(executed)) return executed;
  await completeAdmissionStrategyAfterTerminalMeasurement(preparedStrategy, executed);
  return finalizeResolvedCheckExecution({
    aggregation,
    executed,
    executionStartedAt,
    invocation
  });
}

/** Composes one invocation-local strategy only after the static Task graph is valid. */
async function prepareAdmissionStrategy(
  invocation: Invocation
): Promise<PreparedAdmissionStrategy> {
  const graph = prepareTaskGraph(
    planStaticCheckGraph(invocation.normalized.checks),
    invocation.normalized.declarative.scheduler.maxParallel
  );
  const admissionStrategyProviderFactory =
    invocation.admissionStrategyProviderFactory ?? createAdmissionStrategyProvider;
  const provider = admissionStrategyProviderFactory({
    admissionPolicy: invocation.normalized.scheduler.admissionPolicy,
    checks: invocation.normalized.checks,
    flags: invocation.controls.flags ?? [],
    graph: graph.schedulerGraphSnapshot,
    observeDiagnostic: (observation) => invocation.diagnosticLogger.observe(observation),
    projectRoot: invocation.projectRoot
  });
  return provider.prepare();
}

/** The prepared provider closes only after Scheduler terminal measurement and Hooks have settled. */
async function completeAdmissionStrategyAfterTerminalMeasurement(
  preparedStrategy: PreparedAdmissionStrategy,
  executed: ResolvedCheckExecution
): Promise<void> {
  const terminalMeasurement = executed.terminalSchedulerMeasurement;
  if (terminalMeasurement !== undefined) {
    await preparedStrategy.complete(Object.freeze({ terminalMeasurement }));
  }
}

/** Maps a closed Scheduler execution into the Run-owned outcome and final presentation. */
function finalizeResolvedCheckExecution(input: {
  readonly aggregation: CheckAggregation | undefined;
  readonly executed: ResolvedCheckExecution;
  readonly executionStartedAt: number;
  readonly invocation: Invocation;
}): NonConfigurationRunResult {
  const { executed, invocation } = input;
  if (executed.kind === "admission-policy-failed") {
    return executionResult(invocation, "admission-policy-failed");
  }
  invocation.progressRendering.final({
    counts: outcomeCounts(executed.snapshot),
    elapsedMs: elapsedSince(input.executionStartedAt, invocation.clock),
    execution: executed.kind
  });
  if (executed.kind === "cancelled") {
    return finalizeCancelledExecution(invocation, executed);
  }
  return finalizeCompletedExecution(invocation, input.aggregation, executed);
}

function finalizeCancelledExecution(
  invocation: Invocation,
  executed: Extract<ResolvedCheckExecution, { readonly kind: "cancelled" }>
): NonConfigurationRunResult {
  invocation.diagnosticLogger.observe({
    event: "run.execution.cancelled",
    tags: diagnosticTags("RUN", "EXECUTION", "CANCELLED"),
    details: { checkCount: executed.snapshot.checks.length }
  });
  return executionCancellation({
    checkDurations: executed.checkDurations,
    checkMessages: executed.checkMessages,
    declarativeFingerprint: invocation.declarativeFingerprint,
    definitionWarnings: invocation.definitionWarnings,
    outputs: invocation.outputs.value(),
    snapshot: executed.snapshot
  });
}

function finalizeCompletedExecution(
  invocation: Invocation,
  aggregation: CheckAggregation | undefined,
  executed: Extract<ResolvedCheckExecution, { readonly kind: "completed" }>
): NonConfigurationRunResult {
  const aggregate =
    aggregation === undefined ? null : aggregateCheckOutcomes(executed.snapshot, aggregation);
  invocation.diagnosticLogger.observe({
    event: "run.aggregation.completed",
    tags: diagnosticTags("RUN", "AGGREGATION", "COMPLETED"),
    details: { aggregate, selection: aggregation ?? null }
  });
  const core: CoreExecution = Object.freeze({
    aggregate,
    checkDurations: executed.checkDurations,
    checkMessages: executed.checkMessages,
    snapshot: executed.snapshot
  });
  return completeInvocation(invocation, core);
}

function cancelledBeforeExecution(
  invocation: Invocation,
  phase: "pre-work" | "planning"
): NonConfigurationRunResult {
  invocation.diagnosticLogger.observe({
    event: "run.cancelled",
    tags: diagnosticTags("RUN", "CANCELLED"),
    details: { phase }
  });
  return preExecutionCancellation(
    invocation.declarativeFingerprint,
    invocation.definitionWarnings,
    invocation.outputs.value(),
    phase
  );
}

async function executeChecks(
  invocation: Invocation,
  project: CheckProjectContext,
  clock: CheckExecutionClock,
  preparedStrategy: PreparedAdmissionStrategy
): Promise<ResolvedCheckExecution | NonConfigurationRunResult> {
  try {
    const observeAdmittedTask = preparedStrategy.observeAdmittedTask;
    const shouldCollectSchedulerPerformanceDiagnostics =
      invocation.diagnosticLoggingEnabled ||
      invocation.normalized.scheduler.measurementHooks.length > 0 ||
      preparedStrategy.admissionPolicy.requiresMeasurement === true ||
      preparedStrategy.requiresTerminalMeasurement;
    const schedulerPerformanceDiagnostics = shouldCollectSchedulerPerformanceDiagnostics
      ? Object.freeze({
          clock,
          declarativeFingerprint: invocation.declarativeFingerprint,
          ...(invocation.diagnosticLoggingEnabled ? { logger: invocation.diagnosticLogger } : {})
        })
      : undefined;
    return await executeResolvedChecks({
      admissionPolicy: preparedStrategy.admissionPolicy,
      checks: invocation.normalized.checks,
      clock,
      diagnosticLogger: invocation.diagnosticLogger,
      ...(observeAdmittedTask === undefined
        ? {}
        : { onAdmittedCheck: (check) => observeAdmittedTask(check.definition.checkId) }),
      schedulerPerformanceDiagnostics,
      schedulerMeasurementHooks: invocation.normalized.scheduler.measurementHooks,
      onSchedulerMeasurementHookFailure: () => invocation.outputs.failed("measurementHooks"),
      onSchedulerMeasurementHooksSettled: () => invocation.outputs.succeeded("measurementHooks"),
      maxParallel: invocation.normalized.declarative.scheduler.maxParallel,
      lifecycle: invocation.progressRendering.lifecycle,
      project,
      signal: invocation.controls.signal
    });
  } catch {
    return executionResult(invocation, "task-engine-failed");
  }
}

function planningResult(
  invocation: Invocation,
  code: Extract<RunDiagnostic["code"], "task-graph-invalid">
): NonConfigurationRunResult {
  return planning(
    invocation.declarativeFingerprint,
    invocation.definitionWarnings,
    invocation.outputs.value(),
    code
  );
}
function executionResult(
  invocation: Invocation,
  code: Extract<
    RunDiagnostic["code"],
    "admission-policy-failed" | "publication-model-failed" | "task-engine-failed"
  >
): NonConfigurationRunResult {
  return Object.freeze({
    kind: "execution",
    declarativeFingerprint: invocation.declarativeFingerprint,
    definitionWarnings: invocation.definitionWarnings,
    diagnostic: Object.freeze({ code }),
    outputs: invocation.outputs.value()
  });
}
function isExecutionRunResult(
  value: ResolvedCheckExecution | NonConfigurationRunResult
): value is NonConfigurationRunResult {
  return "declarativeFingerprint" in value;
}
