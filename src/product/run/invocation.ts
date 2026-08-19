import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import type { CheckProjectContext } from "../definition/custom-check.ts";
import {
  createDeclarativeFingerprint,
  normalizeProjectDefinition,
  type DefinitionWarning,
  type NormalizedProjectDefinition,
  type ProjectDefinition,
  type RunControls
} from "../definition/project.ts";
import type { CoreSnapshot } from "../quality-core/check-record/model.ts";
import type {
  PolicyResolution,
  ReferenceFacts
} from "../quality-core/check-record/policy-model.ts";
import { prepareTaskGraph } from "../task-scheduler/index.ts";
import { executeResolvedChecks, type ResolvedCheckExecution } from "./check-execution.ts";
import { planStaticCheckGraph } from "./check-execution-plan.ts";
import {
  createEffectStatuses,
  effectiveEffects,
  emitProgress,
  type EffectStatuses
} from "./effects.ts";
import { completeInvocation } from "./publication.ts";
import { resolveReferenceFacts, resolveSelectedPolicy } from "./policy.ts";
import { prepareProjectContext, type PreparedProjectContext } from "./project-context.ts";
import {
  executionCancellation,
  isCancelled,
  planning,
  preExecutionCancellation,
  type RunDiagnostic,
  type RunResult
} from "./result.ts";

export type Invocation = Readonly<{
  readonly controls: RunControls;
  readonly declarativeFingerprint: string;
  readonly definition: ProjectDefinition;
  readonly definitionWarnings: readonly DefinitionWarning[];
  readonly effectConfiguration: ProjectDefinition["effects"];
  readonly effects: EffectStatuses;
  readonly invocationId: string;
  readonly normalized: NormalizedProjectDefinition;
  readonly projectRoot: string;
}>;

type PlannedInvocation = Readonly<{ readonly policy: PolicyResolution }>;

export type CoreExecution = Readonly<{
  readonly referenceFacts: ReferenceFacts;
  readonly snapshot: CoreSnapshot;
}>;

export async function executeValidatedRun(
  definition: ProjectDefinition,
  controls: RunControls,
  definitionWarnings: readonly DefinitionWarning[]
): Promise<RunResult> {
  const invocation = createInvocation(definition, controls, definitionWarnings);
  if (isCancelled(controls)) {
    return preExecutionCancellation(
      invocation.declarativeFingerprint,
      invocation.definitionWarnings,
      invocation.effects.value(),
      "pre-work"
    );
  }
  const plan = resolveInvocationPlan(invocation);
  if (isRunResult(plan)) return plan;
  if (!validateTaskGraph(invocation)) {
    return planningResult(invocation, "task-graph-invalid");
  }
  return executePlannedInvocation(invocation, plan);
}

function createInvocation(
  definition: ProjectDefinition,
  controls: RunControls,
  definitionWarnings: readonly DefinitionWarning[]
): Invocation {
  const normalized = normalizeProjectDefinition(definition);
  const effectConfiguration = effectiveEffects(definition, controls);
  return Object.freeze({
    controls,
    declarativeFingerprint: createDeclarativeFingerprint(normalized.declarative),
    definition,
    definitionWarnings: Object.freeze([...definitionWarnings]),
    effectConfiguration,
    effects: createEffectStatuses(effectConfiguration),
    invocationId: `invocation/v1:${randomUUID()}`,
    normalized,
    projectRoot: resolve(controls.projectRoot ?? process.cwd())
  });
}

function resolveInvocationPlan(invocation: Invocation): PlannedInvocation | RunResult {
  const definitions = invocation.normalized.declarative.checks.map((check) => check.definition);
  const policy = resolveSelectedPolicy(invocation.definition, invocation.controls, definitions);
  return policy === undefined
    ? planningResult(invocation, "policy-validation-failed")
    : Object.freeze({ policy });
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
  plan: PlannedInvocation
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
  if (project === undefined) return planningResult(invocation, "comparison-preparation-failed");
  try {
    return await executePreparedInvocation(invocation, plan, project.context);
  } finally {
    project.cleanup();
  }
}

function prepareInvocationProject(invocation: Invocation): PreparedProjectContext | undefined {
  try {
    return prepareProjectContext({
      controls: invocation.controls,
      definition: invocation.definition,
      effectConfiguration: invocation.effectConfiguration,
      effects: invocation.effects,
      root: invocation.projectRoot
    });
  } catch {
    return undefined;
  }
}

async function executePreparedInvocation(
  invocation: Invocation,
  plan: PlannedInvocation,
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
  if (!emitProgress(invocation.effects, "execution")) {
    return executionResult(invocation, "progress-failed");
  }
  const executed = await executeChecks(invocation, project);
  if (isExecutionRunResult(executed)) return executed;
  if (executed.kind === "cancelled") {
    return executionCancellation(
      invocation.declarativeFingerprint,
      invocation.definitionWarnings,
      invocation.effects.value(),
      executed.snapshot
    );
  }
  const core = resolveCoreExecution(plan, executed);
  return core === undefined
    ? executionResult(invocation, "policy-validation-failed")
    : completeInvocation(invocation, plan.policy, core);
}

function resolveCoreExecution(
  plan: PlannedInvocation,
  executed: Extract<ResolvedCheckExecution, { readonly kind: "completed" }>
): CoreExecution | undefined {
  const referenceFacts = resolveReferenceFacts(plan.policy, executed.snapshot, executed.references);
  return referenceFacts === undefined
    ? undefined
    : Object.freeze({ referenceFacts, snapshot: executed.snapshot });
}

async function executeChecks(
  invocation: Invocation,
  project: CheckProjectContext
): Promise<ResolvedCheckExecution | RunResult> {
  try {
    return await executeResolvedChecks({
      checks: invocation.normalized.checks,
      maxParallel: invocation.normalized.declarative.scheduler.maxParallel,
      project,
      signal: invocation.controls.signal
    });
  } catch {
    return executionResult(invocation, "task-engine-failed");
  }
}

function planningResult(
  invocation: Invocation,
  code: Extract<
    RunDiagnostic["code"],
    "comparison-preparation-failed" | "policy-validation-failed" | "task-graph-invalid"
  >
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
  code: Extract<
    RunDiagnostic["code"],
    | "progress-failed"
    | "publication-model-failed"
    | "policy-validation-failed"
    | "task-engine-failed"
  >
): RunResult {
  return Object.freeze({
    kind: "execution",
    declarativeFingerprint: invocation.declarativeFingerprint,
    definitionWarnings: invocation.definitionWarnings,
    diagnostic: Object.freeze({ code }),
    effects: invocation.effects.value()
  });
}

function isRunResult(value: unknown): value is RunResult {
  return typeof value === "object" && value !== null && "kind" in value;
}

function isExecutionRunResult(value: ResolvedCheckExecution | RunResult): value is RunResult {
  return "declarativeFingerprint" in value;
}
