import {
  normalizeProjectDefinition,
  type DefinitionWarning,
  type NormalizedProjectDefinition,
  type ProjectDefinition,
  type ResolvedProjectOutputs
} from "../../project-definition/project-definition.ts";
import type { CheckAggregation, RunControls } from "../controls/contract.ts";
import type { AdmissionStrategyProviderFactory } from "../admission-strategy-provider/provider.ts";
import {
  prepareCheckExecution,
  type PreparedCheckExecution
} from "../check-execution/prepared-check-execution.ts";
import type { ValidatedProjectDefinition } from "../../project-definition/project-definition-validation.ts";
import { CheckAggregationFailure } from "../aggregation.ts";
import { type CheckExecutionClock } from "../check-execution/resolved-checks.ts";
import {
  type ProgressRefreshScheduler,
  type ProgressRendering,
  type ProgressWriterFactory
} from "../progress-rendering/presentation.ts";
import { closeAggregationFailure, finalizeInvocation } from "../completion/completion.ts";
import type { ResolvedInvocationPaths } from "./paths.ts";
import type { OutputStatuses } from "../outputs/status.ts";
import { isCancelled, type NonConfigurationRunResult, type RunResult } from "../result.ts";
import {
  diagnosticTags,
  summarizeDiagnosticValue,
  type DiagnosticLoggerFactory,
  type DiagnosticLoggingRouter
} from "../diagnostic-logging/logger.ts";
import { createInvocation } from "./creation.ts";
import { cancelledBeforeExecution, executionResult, planningResult } from "./candidates.ts";
import { executePlannedInvocation } from "./execution.ts";
export type Invocation = Readonly<{
  /** Product-private test seam; package `run` never accepts a provider factory. */
  readonly admissionStrategyProviderFactory: AdmissionStrategyProviderFactory | undefined;
  readonly clock: CheckExecutionClock;
  readonly controls: RunControls;
  readonly declarativeFingerprint: string;
  readonly definitionWarnings: readonly DefinitionWarning[];
  readonly diagnosticLogging: DiagnosticLoggingRouter;
  /** Effective output selection, retained privately for enabled-only Scheduler diagnostics. */
  readonly diagnosticLoggingEnabled: boolean;
  readonly outputConfiguration: ResolvedProjectOutputs;
  readonly outputs: OutputStatuses;
  readonly invocationId: string;
  readonly normalized: NormalizedProjectDefinition;
  /** 本次 invocation 冻结的 Product-private output 与 Check artifact paths。 */
  readonly paths: ResolvedInvocationPaths;
  readonly progressRendering: ProgressRendering;
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

/**
 * 兼容 private standalone callers：调用方负责 Controls 校验；Definition 仍按原始输入归一化。
 * 此入口不持有 validation 的准备事实；public Run 通过 executePreparedRun 传递它们。
 */
export async function executeValidatedRun(
  definition: ProjectDefinition,
  controls: RunControls,
  definitionWarnings: readonly DefinitionWarning[],
  dependencies: RunInvocationDependencies = {}
): Promise<RunResult> {
  const normalized = normalizeProjectDefinition(definition);
  return executeNormalizedRun({
    definition,
    controls,
    definitionWarnings,
    dependencies,
    normalized
  });
}

/** Public Run's private handoff; Controls have already passed before normalization. */
export async function executePreparedRun(
  definition: ValidatedProjectDefinition,
  controls: RunControls,
  dependencies: RunInvocationDependencies = {}
): Promise<RunResult> {
  return executeNormalizedRun({
    definition,
    controls,
    definitionWarnings: definition.warnings,
    dependencies,
    normalized: definition.normalize()
  });
}

async function executeNormalizedRun(
  input: Parameters<typeof createInvocation>[0]
): Promise<RunResult> {
  const { controls } = input;
  const invocation = createInvocation(input);
  let candidate: NonConfigurationRunResult;
  try {
    observeInvocationStarted(invocation, controls.checkAggregation);
    if (isCancelled(controls)) {
      candidate = cancelledBeforeExecution(invocation, "pre-work");
    } else {
      const prepared = prepareInvocationChecks(invocation);
      candidate =
        prepared === undefined
          ? planningResult(invocation, "task-graph-invalid")
          : await executePlannedInvocation(invocation, prepared, controls.checkAggregation);
    }
  } catch (error) {
    if (error instanceof CheckAggregationFailure) {
      closeAggregationFailure(invocation);
      throw error.originalError;
    }
    candidate = executionResult(invocation, "task-engine-failed");
  }
  return finalizeInvocation(invocation, candidate);
}

function observeInvocationStarted(
  invocation: Invocation,
  aggregation: CheckAggregation | undefined
): void {
  invocation.diagnosticLogging.core.observe({
    event: "run.started",
    tags: diagnosticTags("RUN", "STARTED"),
    details: {
      aggregation: aggregation === undefined ? "default" : "custom",
      checkCount: invocation.normalized.checks.length,
      flags: summarizeDiagnosticValue(invocation.controls.flags ?? []),
      outputs: invocation.outputConfiguration,
      scheduler: invocation.normalized.declarative.scheduler
    }
  });
}

function prepareInvocationChecks(invocation: Invocation): PreparedCheckExecution | undefined {
  try {
    const prepared = prepareCheckExecution({
      checks: invocation.normalized.checks,
      resourceCapacities: invocation.normalized.declarative.scheduler.resourceCapacities,
      maxParallel: invocation.normalized.declarative.scheduler.maxParallel
    });
    invocation.diagnosticLogging.core.observe({
      event: "run.planning.succeeded",
      tags: diagnosticTags("RUN", "PLANNING", "SUCCEEDED"),
      details: {
        checkCount: invocation.normalized.checks.length,
        maxParallel: invocation.normalized.declarative.scheduler.maxParallel
      }
    });
    return prepared;
  } catch {
    invocation.diagnosticLogging.core.observe({
      event: "run.planning.failed",
      tags: diagnosticTags("RUN", "PLANNING", "FAILED"),
      details: {
        checkCount: invocation.normalized.checks.length,
        maxParallel: invocation.normalized.declarative.scheduler.maxParallel
      }
    });
    return undefined;
  }
}
