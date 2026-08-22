import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import type { CheckProjectContext } from "../definition/custom-check.ts";
import {
  createDeclarativeFingerprint,
  normalizeProjectDefinition,
  type CheckAggregate,
  type CheckAggregation,
  type DefinitionWarning,
  type NormalizedProjectDefinition,
  type ProjectDefinition,
  type RunControls
} from "../definition/project.ts";
import type { CoreSnapshot } from "../quality-core/check-record/model.ts";
import { prepareTaskGraph } from "../task-scheduler/index.ts";
import { aggregateCheckOutcomes, validateCheckAggregationSelection } from "./check-aggregation.ts";
import {
  executeResolvedChecks,
  type CheckExecutionClock,
  type ResolvedCheckExecution
} from "./check-execution.ts";
import { planStaticCheckGraph } from "./check-execution-plan.ts";
import {
  createEffectStatuses,
  createProgressEffect,
  effectiveEffects,
  type EffectStatuses,
  type ProgressEffect,
  type ProgressWriterFactory
} from "./effects.ts";
import { completeInvocation } from "./publication.ts";
import { prepareProjectContext, type PreparedProjectContext } from "./project-context.ts";
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
  readonly effectConfiguration: ProjectDefinition["effects"];
  readonly effects: EffectStatuses;
  readonly invocationId: string;
  readonly normalized: NormalizedProjectDefinition;
  readonly progress: ProgressEffect;
  readonly projectRoot: string;
}>;

export interface RunInvocationDependencies {
  readonly clock?: CheckExecutionClock;
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
  if (!aggregation.ok) {
    return Object.freeze({
      kind: "configuration",
      definitionWarnings: invocation.definitionWarnings,
      diagnostic: aggregation.error
    });
  }
  if (isCancelled(controls)) {
    return preExecutionCancellation(
      invocation.declarativeFingerprint,
      invocation.definitionWarnings,
      invocation.effects.value(),
      "pre-work"
    );
  }
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
  const effectConfiguration = effectiveEffects(definition, controls);
  const effects = createEffectStatuses(effectConfiguration);
  return Object.freeze({
    clock: dependencies.clock ?? SYSTEM_MONOTONIC_CLOCK,
    controls,
    declarativeFingerprint: createDeclarativeFingerprint(normalized.declarative),
    definition,
    definitionWarnings: Object.freeze([...definitionWarnings]),
    effectConfiguration,
    effects,
    invocationId: `invocation/v1:${randomUUID()}`,
    normalized,
    progress: createProgressEffect(effects, dependencies.progressWriterFactory),
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
  if (isCancelled(invocation.controls)) {
    return preExecutionCancellation(
      invocation.declarativeFingerprint,
      invocation.definitionWarnings,
      invocation.effects.value(),
      "pre-work"
    );
  }
  const project = prepareInvocationProject(invocation);
  try {
    return await executePreparedInvocation(invocation, aggregation, project.context);
  } finally {
    project.cleanup();
  }
}

function prepareInvocationProject(invocation: Invocation): PreparedProjectContext {
  return prepareProjectContext({
    controls: invocation.controls,
    definition: invocation.definition,
    effectConfiguration: invocation.effectConfiguration,
    effects: invocation.effects,
    root: invocation.projectRoot
  });
}

async function executePreparedInvocation(
  invocation: Invocation,
  aggregation: CheckAggregation | undefined,
  project: CheckProjectContext
): Promise<RunResult> {
  if (isCancelled(invocation.controls)) {
    return preExecutionCancellation(
      invocation.declarativeFingerprint,
      invocation.definitionWarnings,
      invocation.effects.value(),
      "planning"
    );
  }
  invocation.progress.prepared(invocation.normalized.checks.length);
  const executionStartedAt = invocation.clock.now();
  const executed = await executeChecks(invocation, project, invocation.clock);
  if (isExecutionRunResult(executed)) return executed;
  invocation.progress.final({
    counts: outcomeCounts(executed.snapshot),
    elapsedMs: elapsedSince(executionStartedAt, invocation.clock),
    execution: executed.kind
  });
  if (executed.kind === "cancelled") {
    return executionCancellation(
      invocation.declarativeFingerprint,
      invocation.definitionWarnings,
      invocation.effects.value(),
      executed.snapshot,
      executed.checkDurations,
      executed.checkMessages
    );
  }
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
      lifecycle: invocation.progress.lifecycle,
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
  let failed = 0;
  let notApplicable = 0;
  let passed = 0;
  let unavailable = 0;
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
    invocation.effects.value(),
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
    effects: invocation.effects.value()
  });
}

function isExecutionRunResult(value: ResolvedCheckExecution | RunResult): value is RunResult {
  return "declarativeFingerprint" in value;
}
