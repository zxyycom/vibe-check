import { resolve } from "node:path";

import type { CheckProjectContext } from "../check/check.ts";
import { canonicalizeJsonObject, canonicalizeJsonValue } from "../data-boundary/canonical-data.ts";
import {
  normalizeProjectDefinition,
  type DefinitionWarning,
  type NormalizedProjectDefinition,
  type ProjectDefinition
} from "../project-definition/project-definition.ts";
import type { CheckAggregation, RunControls } from "./controls/contract.ts";
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
import {
  createSchedulerCriticalPathSnapshot,
  type SchedulerCriticalPathSnapshot,
  criticalPathScoreForTask
} from "./scheduler-history/critical-path.ts";
import type { SchedulerHistoryModel } from "./scheduler-history/bounded-history.ts";
import {
  createSchedulerPredictionSnapshot,
  predictionForTask,
  type SchedulerPredictionInput,
  type SchedulerPredictionSnapshot
} from "./scheduler-history/prediction.ts";
import { recordSchedulerHistory } from "./scheduler-history/recording.ts";
import { loadSchedulerHistory, writeSchedulerHistory } from "./scheduler-history/storage.ts";
export type Invocation = Readonly<{
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
  readonly clock?: CheckExecutionClock;
  readonly progressRefreshScheduler?: ProgressRefreshScheduler;
  readonly progressWriterFactory?: ProgressWriterFactory;
  readonly diagnosticLoggerFactory?: DiagnosticLoggerFactory;
  /** Test seam for the invocation's machine-readable wall-clock timestamp. */
  readonly wallClock?: Readonly<{ now(): Date }>;
}

type SchedulerLearning = Readonly<{
  readonly criticalPath: SchedulerCriticalPathSnapshot;
  readonly history: SchedulerHistoryModel;
  readonly prediction: SchedulerPredictionSnapshot;
  readonly stateDirectory: string;
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
  const learning = await prepareSchedulerLearning(invocation);
  invocation.progressRendering.prepared(invocation.normalized.checks.length);
  const executionStartedAt = invocation.clock.now();
  const executed = await executeChecks(invocation, project, invocation.clock, learning);
  if (isExecutionRunResult(executed)) return executed;
  await recordSchedulerLearning(invocation, learning, executed.terminalSchedulerMeasurement);
  if (executed.kind === "admission-policy-failed") {
    return executionResult(invocation, "admission-policy-failed");
  }
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
    return executionCancellation({
      checkDurations: executed.checkDurations,
      checkMessages: executed.checkMessages,
      declarativeFingerprint: invocation.declarativeFingerprint,
      definitionWarnings: invocation.definitionWarnings,
      outputs: invocation.outputs.value(),
      snapshot: executed.snapshot
    });
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

async function executeChecks(
  invocation: Invocation,
  project: CheckProjectContext,
  clock: CheckExecutionClock,
  learning: SchedulerLearning | undefined
): Promise<ResolvedCheckExecution | NonConfigurationRunResult> {
  try {
    const learned =
      invocation.normalized.scheduler.admissionPolicy.kind === "learned-critical-path";
    return await executeResolvedChecks({
      admissionPolicy: invocation.normalized.scheduler.admissionPolicy,
      checks: invocation.normalized.checks,
      clock,
      diagnosticLogger: invocation.diagnosticLogger,
      ...(learning === undefined
        ? {}
        : {
            learnedCriticalPath: learning.criticalPath,
            onAdmittedCheck: (check) => observeLearnedAdmission(invocation, learning, check)
          }),
      schedulerPerformanceDiagnostics:
        invocation.diagnosticLoggingEnabled ||
        invocation.normalized.scheduler.measurementHooks.length > 0 ||
        invocation.normalized.scheduler.admissionPolicy.kind === "custom" ||
        learned
          ? Object.freeze({
              clock,
              declarativeFingerprint: invocation.declarativeFingerprint,
              ...(invocation.diagnosticLoggingEnabled
                ? { logger: invocation.diagnosticLogger }
                : {})
            })
          : undefined,
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

/** Builds all learned model inputs before Scheduler admission and never invokes preflight. */
async function prepareSchedulerLearning(
  invocation: Invocation
): Promise<SchedulerLearning | undefined> {
  const policy = invocation.normalized.scheduler.admissionPolicy;
  if (policy.kind === "static") return undefined;
  if (policy.kind === "custom") return undefined;

  const inputs = schedulerPredictionInputs(invocation);
  if (inputs === undefined) {
    observeSchedulerLearningDiagnostic(invocation, {
      event: "scheduler.history.prediction-unavailable",
      tags: diagnosticTags("SCHEDULER", "HISTORY", "PREDICTION_UNAVAILABLE"),
      details: Object.freeze({ reason: "canonical-input-unavailable" })
    });
    return undefined;
  }

  try {
    const stateDirectory = resolve(invocation.projectRoot, policy.stateDirectory);
    const loaded = await loadSchedulerHistory(stateDirectory);
    const prediction = createSchedulerPredictionSnapshot(loaded.history, inputs);
    const graph = prepareTaskGraph(
      planStaticCheckGraph(invocation.normalized.checks),
      invocation.normalized.declarative.scheduler.maxParallel
    );
    const criticalPath = createSchedulerCriticalPathSnapshot(
      graph.schedulerGraphSnapshot,
      prediction
    );
    observeSchedulerLearningDiagnostic(invocation, {
      event: "scheduler.history.read",
      tags: diagnosticTags("SCHEDULER", "HISTORY", "READ", loaded.observation.toUpperCase()),
      details: Object.freeze({
        modelVersion: prediction.modelVersion,
        predictionDigest: prediction.digest,
        retainedSeriesCount: loaded.history.series.length
      })
    });
    return Object.freeze({
      criticalPath,
      history: loaded.history,
      prediction,
      stateDirectory
    });
  } catch {
    observeSchedulerLearningDiagnostic(invocation, {
      event: "scheduler.history.prediction-unavailable",
      tags: diagnosticTags("SCHEDULER", "HISTORY", "PREDICTION_UNAVAILABLE"),
      details: Object.freeze({ reason: "history-setup-failed" })
    });
    return undefined;
  }
}

function schedulerPredictionInputs(
  invocation: Invocation
): readonly SchedulerPredictionInput[] | undefined {
  const flags = canonicalizeJsonValue(invocation.controls.flags ?? []);
  if (flags === undefined) return undefined;
  const inputs: SchedulerPredictionInput[] = [];
  for (const check of invocation.normalized.checks) {
    const authoredOptions = canonicalizeJsonObject(check.options);
    if (authoredOptions === undefined) return undefined;
    inputs.push(
      Object.freeze({
        authoredOptions,
        checkId: check.definition.checkId,
        flags,
        taskId: check.definition.checkId
      })
    );
  }
  return Object.freeze(inputs);
}

function observeLearnedAdmission(
  invocation: Invocation,
  learning: SchedulerLearning,
  check: NormalizedProjectDefinition["checks"][number]
): void {
  const taskId = check.definition.checkId;
  const prediction = predictionForTask(learning.prediction, taskId);
  const score = criticalPathScoreForTask(learning.criticalPath, taskId);
  if (prediction === undefined || score === undefined) return;
  observeSchedulerLearningDiagnostic(invocation, {
    event: "scheduler.learned-admission",
    tags: diagnosticTags("SCHEDULER", "LEARNED", "ADMISSION", `TASK:${taskId}`),
    details: Object.freeze({
      criticalPathScore: score,
      estimatedDurationMs: prediction.estimatedDurationMs,
      sampleCount: prediction.sampleCount,
      source: prediction.source
    })
  });
}

/** Records only post-drain terminal facts; all local-state failure modes preserve the Run result. */
async function recordSchedulerLearning(
  invocation: Invocation,
  learning: SchedulerLearning | undefined,
  terminalMeasurement: ResolvedCheckExecution["terminalSchedulerMeasurement"]
): Promise<void> {
  if (learning === undefined) return;
  if (terminalMeasurement === undefined) {
    observeSchedulerLearningDiagnostic(invocation, {
      event: "scheduler.history.recording-unavailable",
      tags: diagnosticTags("SCHEDULER", "HISTORY", "RECORDING_UNAVAILABLE"),
      details: Object.freeze({ reason: "terminal-measurement-unavailable" })
    });
    return;
  }
  try {
    const recording = recordSchedulerHistory({
      history: learning.history,
      prediction: learning.prediction,
      rawMeasurement: terminalMeasurement.rawMeasurement,
      settledTasks: terminalMeasurement.execution.settledTasks
    });
    observeSchedulerLearningDiagnostic(invocation, {
      event: "scheduler.history.recorded",
      tags: diagnosticTags(
        "SCHEDULER",
        "HISTORY",
        "RECORDED",
        recording.observation.status.toUpperCase()
      ),
      details: Object.freeze({
        acceptedSampleCount: recording.observation.acceptedSampleCount,
        retainedSeriesCount: recording.observation.retainedSeriesCount
      })
    });
    const writeObservation = await writeSchedulerHistory(
      learning.stateDirectory,
      recording.history
    );
    observeSchedulerLearningDiagnostic(invocation, {
      event: "scheduler.history.write",
      tags: diagnosticTags("SCHEDULER", "HISTORY", "WRITE", writeObservation.toUpperCase()),
      details: Object.freeze({
        retainedSeriesCount: recording.observation.retainedSeriesCount
      })
    });
  } catch {
    observeSchedulerLearningDiagnostic(invocation, {
      event: "scheduler.history.recording-unavailable",
      tags: diagnosticTags("SCHEDULER", "HISTORY", "RECORDING_UNAVAILABLE"),
      details: Object.freeze({ reason: "history-recording-failed" })
    });
  }
}

function observeSchedulerLearningDiagnostic(
  invocation: Invocation,
  observation: Parameters<DiagnosticLogger["observe"]>[0]
): void {
  try {
    invocation.diagnosticLogger.observe(observation);
  } catch {
    // Optimization diagnostics cannot revise lifecycle or quality facts.
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
