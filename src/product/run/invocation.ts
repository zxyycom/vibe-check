import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import {
  createDeclarativeFingerprint,
  normalizeProjectDefinition,
  type NormalizedProjectDefinition,
  type ProjectDefinition,
  type RunControls
} from "../definition/project.ts";
import { ScannerOperationalInputError } from "../scanner-dependencies/index.ts";
import type { CoreSnapshot } from "../quality-core/check-record/model.ts";
import type { PolicyResolution, ReferenceFacts } from "../quality-core/check-record/policy-model.ts";
import {
  executeResolvedChecks,
  type ResolvedCheckExecution
} from "./check-execution.ts";
import { prepareBuiltInRuntime, type BuiltInRuntime } from "./built-ins.ts";
import { createEffectStatuses, effectiveEffects, emitProgress, type EffectStatuses } from "./effects.ts";
import { completeInvocation } from "./publication.ts";
import { resolveReferenceFacts, resolveSelectedPolicy } from "./policy.ts";
import {
  executionCancellation,
  isCancelled,
  planning,
  preExecutionCancellation,
  type RunDiagnostic,
  type RunResult
} from "./result.ts";
import { resolveChecks, type ResolvedCheck } from "./resolved-check.ts";

export type Invocation = Readonly<{
  controls: RunControls;
  declarativeFingerprint: string;
  definition: ProjectDefinition;
  effectConfiguration: ProjectDefinition["effects"];
  effects: EffectStatuses;
  invocationId: string;
  normalized: NormalizedProjectDefinition;
  projectRoot: string;
}>;

type PlannedInvocation = Readonly<{ policy: PolicyResolution }>;

export type CoreExecution = Readonly<{
  referenceFacts: ReferenceFacts;
  snapshot: CoreSnapshot;
}>;

export async function executeValidatedRun(
  definition: ProjectDefinition,
  controls: RunControls
): Promise<RunResult> {
  const invocation = createInvocation(definition, controls);
  if (isCancelled(controls)) {
    return preExecutionCancellation(invocation.declarativeFingerprint, invocation.effects.value(), "pre-work");
  }
  const plan = resolveInvocationPlan(invocation);
  if (isRunResult(plan)) return plan;
  return executePlannedInvocation(invocation, plan);
}

function createInvocation(definition: ProjectDefinition, controls: RunControls): Invocation {
  const normalized = normalizeProjectDefinition(definition);
  const effectConfiguration = effectiveEffects(definition, controls);
  return Object.freeze({
    controls,
    declarativeFingerprint: createDeclarativeFingerprint(normalized.declarative),
    definition,
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
  if (policy === undefined) return invalidComparisonResult();
  return Object.freeze({ policy });
}

async function executePlannedInvocation(
  invocation: Invocation,
  plan: PlannedInvocation
): Promise<RunResult> {
  if (isCancelled(invocation.controls)) {
    return preExecutionCancellation(invocation.declarativeFingerprint, invocation.effects.value(), "pre-work");
  }
  const runtime = prepareRuntime(invocation);
  if (isRunResult(runtime)) return runtime;

  try {
    if (isCancelled(invocation.controls)) {
      return preExecutionCancellation(invocation.declarativeFingerprint, invocation.effects.value(), "pre-work");
    }
    const checks = resolveInvocationChecks(invocation, runtime);
    if (isRunResult(checks)) return checks;
    if (isCancelled(invocation.controls)) {
      return preExecutionCancellation(invocation.declarativeFingerprint, invocation.effects.value(), "planning");
    }
    if (!emitProgress(invocation.effects, "execution")) {
      return executionResult(invocation, "progress-failed");
    }
    const executed = await executeChecks(invocation, checks);
    if (isExecutionRunResult(executed)) return executed;
    if (executed.kind === "cancelled") {
      return executionCancellation(
        invocation.declarativeFingerprint,
        invocation.effects.value(),
        executed.snapshot
      );
    }
    let referenceFacts: ReferenceFacts | undefined;
    try {
      referenceFacts = resolveReferenceFacts(plan.policy, executed.snapshot, checks);
    } catch {
      return executionResult(invocation, "policy-validation-failed");
    }
    if (referenceFacts === undefined) return executionResult(invocation, "policy-validation-failed");
    return completeInvocation(invocation, plan.policy, Object.freeze({
      referenceFacts,
      snapshot: executed.snapshot
    }));
  } finally {
    runtime.cleanup();
  }
}

function prepareRuntime(invocation: Invocation): BuiltInRuntime | RunResult {
  try {
    return prepareBuiltInRuntime({
      cache: invocation.effectConfiguration.cache,
      checks: invocation.normalized.declarative.checks,
      controls: invocation.controls,
      definition: invocation.definition,
      onCacheActivity: (activity) => invocation.effects.cache(activity)
    });
  } catch (error: unknown) {
    if (error instanceof ScannerOperationalInputError) return scannerConfigurationResult(error);
    return planningResult(invocation, "builtin-preparation-failed");
  }
}

function resolveInvocationChecks(
  invocation: Invocation,
  runtime: BuiltInRuntime
) {
  try {
    return resolveChecks({ builtIns: runtime, normalized: invocation.normalized });
  } catch {
    return planningResult(invocation, "resolved-check-planning-failed");
  }
}

async function executeChecks(
  invocation: Invocation,
  checks: readonly ResolvedCheck[]
): Promise<ResolvedCheckExecution | RunResult> {
  try {
    return await executeResolvedChecks({
      checks,
      maxParallel: invocation.normalized.declarative.scheduler.maxParallel,
      signal: invocation.controls.signal
    });
  } catch {
    return executionResult(invocation, "task-execution-failed");
  }
}

function planningResult(
  invocation: Invocation,
  code: Extract<RunDiagnostic["code"],
    "builtin-preparation-failed" | "policy-validation-failed" | "resolved-check-planning-failed">
): RunResult {
  return planning(invocation.declarativeFingerprint, invocation.effects.value(), code);
}

function executionResult(
  invocation: Invocation,
  code: Extract<RunDiagnostic["code"],
    "progress-failed" | "publication-model-failed" | "policy-validation-failed" | "task-execution-failed">
): RunResult {
  return Object.freeze({
    kind: "execution",
    declarativeFingerprint: invocation.declarativeFingerprint,
    diagnostic: Object.freeze({ code }),
    effects: invocation.effects.value()
  });
}

function invalidComparisonResult(): RunResult {
  return Object.freeze({
    kind: "configuration",
    diagnostic: Object.freeze({
      kind: "invalid-run-controls",
      path: "controls.comparison",
      reason: "invalid-value"
    })
  });
}

function scannerConfigurationResult(error: ScannerOperationalInputError): RunResult {
  return Object.freeze({
    kind: "configuration",
    diagnostic: Object.freeze({
      kind: "invalid-scanner-operational-input",
      path: `operationalDependencies.${error.dependencyId ?? "binding"}`,
      reason: "invalid-value"
    })
  });
}

function isRunResult(value: unknown): value is RunResult {
  return typeof value === "object" && value !== null && "kind" in value;
}

function isExecutionRunResult(
  value: ResolvedCheckExecution | RunResult
): value is RunResult {
  return "declarativeFingerprint" in value;
}
