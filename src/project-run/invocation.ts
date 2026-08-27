import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
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
import { completeInvocation } from "./completion.ts";
import { createProjectContext } from "./project-context.ts";
import {
  executionCancellation,
  isCancelled,
  planning,
  preExecutionCancellation,
  type CheckDuration,
  type CheckRunMessage,
  type RunDiagnostic,
  type RunResult
} from "./result.ts";
export type Invocation = Readonly<{
  readonly clock: CheckExecutionClock;
  readonly controls: RunControls;
  readonly declarativeFingerprint: string;
  readonly definition: ProjectDefinition;
  readonly definitionWarnings: readonly DefinitionWarning[];
  readonly outputConfiguration: ProjectDefinition["outputs"];
  readonly outputs: OutputStatuses;
  readonly invocationId: string;
  readonly normalized: NormalizedProjectDefinition;
  readonly progressRendering: ProgressRendering;
  readonly projectRoot: string;
}>;
export interface RunInvocationDependencies {
  readonly clock?: CheckExecutionClock;
  readonly progressRefreshScheduler?: ProgressRefreshScheduler;
  readonly progressWriterFactory?: ProgressWriterFactory;
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
  const invocation = createInvocation(definition, controls, definitionWarnings, dependencies);
  const aggregation = validateCheckAggregationSelection(
    controls.checkAggregation,
    invocation.normalized.checks.map((check) => check.definition.checkId)
  );
  if (!aggregation.ok)
    return Object.freeze({
      kind: "configuration",
      definitionWarnings: invocation.definitionWarnings,
      diagnostic: aggregation.error
    });
  if (isCancelled(controls))
    return preExecutionCancellation(
      invocation.declarativeFingerprint,
      invocation.definitionWarnings,
      invocation.outputs.value(),
      "pre-work"
    );
  if (!validateTaskGraph(invocation)) return planningResult(invocation, "task-graph-invalid");
  return executePlannedInvocation(invocation, aggregation.value);
}
function createInvocation(
  definition: ProjectDefinition,
  controls: RunControls,
  definitionWarnings: readonly DefinitionWarning[],
  dependencies: RunInvocationDependencies
): Invocation {
  const normalized = normalizeProjectDefinition(definition);
  const outputConfiguration = effectiveOutputs(definition, controls);
  const outputs = createOutputStatuses(outputConfiguration);
  const clock = dependencies.clock ?? SYSTEM_MONOTONIC_CLOCK;
  return Object.freeze({
    clock,
    controls,
    declarativeFingerprint: createDeclarativeFingerprint(normalized.declarative),
    definition,
    definitionWarnings: Object.freeze([...definitionWarnings]),
    outputConfiguration,
    outputs,
    invocationId: `invocation/v1:${randomUUID()}`,
    normalized,
    progressRendering: createProgressRendering(outputConfiguration.progressRendering, outputs, {
      clock,
      refreshScheduler: dependencies.progressRefreshScheduler,
      writerFactory: dependencies.progressWriterFactory
    }),
    projectRoot: resolve(controls.projectRoot ?? process.cwd())
  });
}
function validateTaskGraph(invocation: Invocation): boolean {
  try {
    prepareTaskGraph(
      planStaticCheckGraph(invocation.normalized.checks),
      invocation.normalized.declarative.scheduler.maxParallel
    );
    return true;
  } catch {
    return false;
  }
}
async function executePlannedInvocation(
  invocation: Invocation,
  aggregation: CheckAggregation | undefined
): Promise<RunResult> {
  if (isCancelled(invocation.controls))
    return preExecutionCancellation(
      invocation.declarativeFingerprint,
      invocation.definitionWarnings,
      invocation.outputs.value(),
      "pre-work"
    );
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
): Promise<RunResult> {
  if (isCancelled(invocation.controls))
    return preExecutionCancellation(
      invocation.declarativeFingerprint,
      invocation.definitionWarnings,
      invocation.outputs.value(),
      "planning"
    );
  invocation.progressRendering.prepared(invocation.normalized.checks.length);
  const executionStartedAt = invocation.clock.now();
  const executed = await executeChecks(invocation, project, invocation.clock);
  if (isExecutionRunResult(executed)) return executed;
  invocation.progressRendering.final({
    counts: outcomeCounts(executed.snapshot),
    elapsedMs: elapsedSince(executionStartedAt, invocation.clock),
    execution: executed.kind
  });
  if (executed.kind === "cancelled")
    return executionCancellation(
      invocation.declarativeFingerprint,
      invocation.definitionWarnings,
      invocation.outputs.value(),
      executed.snapshot,
      executed.checkDurations,
      executed.checkMessages
    );
  const core: CoreExecution = Object.freeze({
    aggregate:
      aggregation === undefined ? null : aggregateCheckOutcomes(executed.snapshot, aggregation),
    checkDurations: executed.checkDurations,
    checkMessages: executed.checkMessages,
    snapshot: executed.snapshot
  });
  return completeInvocation(invocation, core);
}
async function executeChecks(
  invocation: Invocation,
  project: CheckProjectContext,
  clock: CheckExecutionClock
): Promise<ResolvedCheckExecution | RunResult> {
  try {
    return await executeResolvedChecks({
      checks: invocation.normalized.checks,
      clock,
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
): RunResult {
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
): RunResult {
  return Object.freeze({
    kind: "execution",
    declarativeFingerprint: invocation.declarativeFingerprint,
    definitionWarnings: invocation.definitionWarnings,
    diagnostic: Object.freeze({ code }),
    outputs: invocation.outputs.value()
  });
}
function isExecutionRunResult(value: ResolvedCheckExecution | RunResult): value is RunResult {
  return "declarativeFingerprint" in value;
}
