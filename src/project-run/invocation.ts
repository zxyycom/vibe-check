import { randomUUID } from "node:crypto";
import { relative, resolve } from "node:path";
import type { CheckProjectContext } from "../check/check.ts";
import {
  createDeclarativeFingerprint,
  normalizeProjectDefinition,
  type DefinitionWarning,
  type NormalizedProjectDefinition,
  type ProjectDefinition
} from "../project-definition/project-definition.ts";
import type { CoreSnapshot } from "../check-settlement/facts.ts";
import type { CheckAggregate, CheckAggregation, RunControls } from "./controls/contract.ts";
import { prepareTaskGraph } from "./task-scheduler/graph.ts";
import { aggregateCheckOutcomes, validateCheckAggregationSelection } from "./aggregation.ts";
import {
  executeResolvedChecks,
  type CheckExecutionClock,
  type ResolvedCheckExecution
} from "./check-execution/resolved-checks.ts";
import { planStaticCheckGraph } from "./check-execution/plan.ts";
import { createOutputStatuses, type OutputStatuses } from "./output-status.ts";
import { effectiveOutputs } from "./output-configuration.ts";
import {
  createProgressRendering,
  type ProgressRefreshScheduler,
  type ProgressRendering,
  type ProgressWriterFactory
} from "./progress-rendering/presentation.ts";
import { completeInvocation, finalizeInvocation } from "./completion.ts";
import { createProjectContext } from "./project-context.ts";
import {
  executionCancellation,
  isCancelled,
  planning,
  preExecutionCancellation,
  type CheckDuration,
  type CheckRunMessage,
  type NonConfigurationRunResult,
  type RunDiagnostic,
  type RunResult
} from "./result.ts";
import {
  createDiagnosticLogger,
  diagnosticTags,
  type DiagnosticLogger,
  type DiagnosticLoggerFactory,
  type DiagnosticObservation
} from "./diagnostic-logging/logger.ts";
export type Invocation = Readonly<{
  readonly clock: CheckExecutionClock;
  readonly controls: RunControls;
  readonly declarativeFingerprint: string;
  readonly definition: ProjectDefinition;
  readonly definitionWarnings: readonly DefinitionWarning[];
  readonly diagnosticLogger: DiagnosticLogger;
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
  readonly clock?: CheckExecutionClock;
  readonly progressRefreshScheduler?: ProgressRefreshScheduler;
  readonly progressWriterFactory?: ProgressWriterFactory;
  readonly diagnosticLoggerFactory?: DiagnosticLoggerFactory;
  /** Test seam for the invocation's machine-readable wall-clock timestamp. */
  readonly wallClock?: Readonly<{ now(): Date }>;
}
const SYSTEM_MONOTONIC_CLOCK: CheckExecutionClock = Object.freeze({ now: () => performance.now() });
export type CoreExecution = Readonly<{
  readonly aggregate: CheckAggregate | null;
  readonly checkDurations: readonly CheckDuration[];
  readonly checkMessages: readonly CheckRunMessage[];
  readonly snapshot: CoreSnapshot;
}>;
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

  const invocation = createInvocation(
    definition,
    controls,
    definitionWarnings,
    normalized,
    dependencies
  );
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

function createInvocation(
  definition: ProjectDefinition,
  controls: RunControls,
  definitionWarnings: readonly DefinitionWarning[],
  normalized: NormalizedProjectDefinition,
  dependencies: RunInvocationDependencies
): Invocation {
  const outputConfiguration = effectiveOutputs(definition, controls);
  const clock = dependencies.clock ?? SYSTEM_MONOTONIC_CLOCK;
  const projectRoot = resolve(controls.projectRoot ?? process.cwd());
  const startedAtUtc =
    outputConfiguration.diagnosticLogging.enabled || outputConfiguration.machinePublication.enabled
      ? (dependencies.wallClock?.now() ?? new Date()).toISOString()
      : null;
  const invocationUuid = randomUUID();
  const invocationId = `invocation/v1:${invocationUuid}`;
  const diagnosticLoggingFile = outputConfiguration.diagnosticLogging.enabled
    ? relative(
        projectRoot,
        resolve(
          projectRoot,
          outputConfiguration.diagnosticLogging.directory,
          diagnosticLogFileName(requireStartedAtUtc(startedAtUtc), invocationUuid)
        )
      )
    : null;
  const outputs = createOutputStatuses(outputConfiguration, diagnosticLoggingFile);
  const diagnosticLoggerFactory = dependencies.diagnosticLoggerFactory ?? createDiagnosticLogger;
  const diagnosticLogger = createDiagnosticLoggerSafely(diagnosticLoggerFactory, {
    clock,
    enabled: outputConfiguration.diagnosticLogging.enabled,
    file: diagnosticLoggingFile === null ? null : resolve(projectRoot, diagnosticLoggingFile)
  });
  return Object.freeze({
    clock,
    controls,
    declarativeFingerprint: createDeclarativeFingerprint(normalized.declarative),
    definition,
    definitionWarnings: Object.freeze([...definitionWarnings]),
    diagnosticLogger,
    outputConfiguration,
    outputs,
    invocationId,
    normalized,
    progressRendering: createProgressRendering(outputConfiguration.progressRendering, outputs, {
      clock,
      refreshScheduler: dependencies.progressRefreshScheduler,
      writerFactory: dependencies.progressWriterFactory
    }),
    projectRoot,
    startedAtUtc
  });
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
      flags: invocation.controls.flags ?? [],
      invocationId: invocation.invocationId,
      outputs: invocation.outputConfiguration,
      scheduler: invocation.normalized.declarative.scheduler
    }
  });
}

function createDiagnosticLoggerSafely(
  factory: DiagnosticLoggerFactory,
  input: Parameters<DiagnosticLoggerFactory>[0]
): DiagnosticLogger {
  let delegate: DiagnosticLogger;
  try {
    delegate = factory(input);
  } catch {
    return failedDiagnosticLogger();
  }
  let failed = false;
  return Object.freeze({
    close: () => {
      try {
        const status = delegate.close();
        return failed ? "failed" : status;
      } catch {
        return "failed";
      }
    },
    observe: (observation: DiagnosticObservation) => {
      if (failed) return;
      try {
        delegate.observe(observation);
      } catch {
        failed = true;
      }
    }
  });
}

function failedDiagnosticLogger(): DiagnosticLogger {
  return Object.freeze({
    close: () => "failed" as const,
    observe: () => undefined
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
    createProjectContext({ controls: invocation.controls, root: invocation.projectRoot })
  );
}
async function executePreparedInvocation(
  invocation: Invocation,
  aggregation: CheckAggregation | undefined,
  project: CheckProjectContext
): Promise<NonConfigurationRunResult> {
  if (isCancelled(invocation.controls)) return cancelledBeforeExecution(invocation, "planning");
  invocation.progressRendering.prepared(invocation.normalized.checks.length);
  const executionStartedAt = invocation.clock.now();
  const executed = await executeChecks(invocation, project, invocation.clock);
  if (isExecutionRunResult(executed)) return executed;
  invocation.progressRendering.final({
    counts: outcomeCounts(executed.snapshot),
    elapsedMs: elapsedSince(executionStartedAt, invocation.clock),
    execution: executed.kind
  });
  if (executed.kind === "cancelled") {
    invocation.diagnosticLogger.observe({
      event: "run.execution.cancelled",
      tags: diagnosticTags("RUN", "EXECUTION", "CANCELLED"),
      details: { checkCount: executed.snapshot.checks.length }
    });
    return executionCancellation(
      invocation.declarativeFingerprint,
      invocation.definitionWarnings,
      invocation.outputs.value(),
      executed.snapshot,
      executed.checkDurations,
      executed.checkMessages
    );
  }
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

function diagnosticLogFileName(startedAtUtc: string, invocationUuid: string): string {
  const compactUtc = startedAtUtc.replaceAll("-", "").replaceAll(":", "");
  return `run-${compactUtc}-${invocationUuid}.log`;
}

function requireStartedAtUtc(startedAtUtc: string | null): string {
  if (startedAtUtc === null) throw new Error("Enabled output requires an invocation timestamp");
  return startedAtUtc;
}
async function executeChecks(
  invocation: Invocation,
  project: CheckProjectContext,
  clock: CheckExecutionClock
): Promise<ResolvedCheckExecution | NonConfigurationRunResult> {
  try {
    return await executeResolvedChecks({
      checks: invocation.normalized.checks,
      clock,
      diagnosticLogger: invocation.diagnosticLogger,
      maxParallel: invocation.normalized.declarative.scheduler.maxParallel,
      lifecycle: invocation.progressRendering.lifecycle,
      project,
      signal: invocation.controls.signal
    });
  } catch {
    return executionResult(invocation, "task-engine-failed");
  }
}
function outcomeCounts(snapshot: CoreSnapshot): Readonly<{
  readonly failed: number;
  readonly notApplicable: number;
  readonly passed: number;
  readonly unavailable: number;
}> {
  let failed = 0,
    notApplicable = 0,
    passed = 0,
    unavailable = 0;
  for (const check of snapshot.checks) {
    switch (check.outcome.status) {
      case "passed":
        passed += 1;
        break;
      case "failed":
        failed += 1;
        break;
      case "not-applicable":
        notApplicable += 1;
        break;
      case "unavailable":
        unavailable += 1;
        break;
    }
  }
  return Object.freeze({ failed, notApplicable, passed, unavailable });
}
function elapsedSince(startedAt: number, clock: CheckExecutionClock): number {
  const elapsed = clock.now() - startedAt;
  return Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : 0;
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
  code: Extract<RunDiagnostic["code"], "publication-model-failed" | "task-engine-failed">
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
