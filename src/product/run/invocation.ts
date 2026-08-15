import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import {
  createDeclarativeFingerprint,
  normalizeProjectDefinition,
  type NormalizedProjectDefinition,
  type ProjectDefinition,
  type RunControls
} from "../definition/project.ts";
import { prepareBuiltInRuntime, type BuiltInRuntime } from "./built-ins.ts";
import { createEffectStatuses, effectiveEffects, emitProgress, type EffectStatuses } from "./effects.ts";
import { completeInvocation } from "./publication.ts";
import { resolveReferenceFacts, resolveSelectedPolicy } from "./policy.ts";
import {
  cancelled,
  isCancelled,
  planning,
  type RunResult
} from "./result.ts";
import { ScannerOperationalInputError } from "../scanner-dependencies/index.ts";
import { resolveCheckCatalog } from "../quality-core/check-record/catalog.ts";
import { coordinateCheckRecords } from "../quality-core/check-record/coordinator.ts";
import type { CheckDefinition, FinalCoreSnapshot } from "../quality-core/check-record/model.ts";
import type { PolicyResolution, ReferenceFacts } from "../quality-core/check-record/policy-model.ts";

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

type PlannedInvocation = Readonly<{
  definitions: readonly CheckDefinition[];
  policy: PolicyResolution;
  selectedCheckIds: ReadonlySet<string>;
}>;

export type CoreExecution = Readonly<{
  referenceFacts: ReferenceFacts;
  snapshot: FinalCoreSnapshot;
}>;

export async function executeValidatedRun(
  definition: ProjectDefinition,
  controls: RunControls
): Promise<RunResult> {
  const invocation = createInvocation(definition, controls);
  if (isCancelled(controls)) {
    return cancelled(invocation.declarativeFingerprint, invocation.effects.value(), "pre-work");
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
  const definitions = invocation.normalized.declarative.checks.definitions;
  const selectedCheckIds = new Set(invocation.normalized.declarative.checks.selected);
  const policy = resolveSelectedPolicy(invocation.definition, invocation.controls, definitions);
  if (policy === undefined) return invalidComparisonResult();
  return Object.freeze({ definitions, policy, selectedCheckIds });
}

async function executePlannedInvocation(
  invocation: Invocation,
  plan: PlannedInvocation
): Promise<RunResult> {
  if (isCancelled(invocation.controls)) {
    return cancelled(invocation.declarativeFingerprint, invocation.effects.value(), "pre-work");
  }
  const runtime = prepareRuntime(invocation, plan.selectedCheckIds);
  if (isRunResult(runtime)) return runtime;
  if (isCancelled(invocation.controls)) {
    runtime.cleanup();
    return cancelled(invocation.declarativeFingerprint, invocation.effects.value(), "pre-work");
  }
  const core = await executeCore(invocation, plan, runtime);
  if (isRunResult(core)) return core;
  return completeInvocation(invocation, plan.policy, core);
}

function prepareRuntime(
  invocation: Invocation,
  selectedCheckIds: ReadonlySet<string>
): BuiltInRuntime | RunResult {
  try {
    return prepareBuiltInRuntime({
      cache: invocation.effectConfiguration.cache,
      controls: invocation.controls,
      definition: invocation.definition,
      onCacheActivity: (activity) => invocation.effects.cache(activity),
      builtInOptions: invocation.normalized.builtInOptions,
      selectedCheckIds: [...selectedCheckIds]
    });
  } catch (error: unknown) {
    if (error instanceof ScannerOperationalInputError) return scannerConfigurationResult(error);
    return planningResult(invocation, "builtin-preparation-failed");
  }
}

async function executeCore(
  invocation: Invocation,
  plan: PlannedInvocation,
  runtime: BuiltInRuntime
): Promise<CoreExecution | RunResult> {
  try {
    const catalog = resolveCatalog(invocation, plan.definitions, runtime);
    if (!catalog.ok) return planningResult(invocation, "catalog-resolution-failed");
    if (isCancelled(invocation.controls)) {
      return cancelled(invocation.declarativeFingerprint, invocation.effects.value(), "planning");
    }
    if (!emitProgress(invocation.effects, "execution")) return executionResult(invocation, "progress-failed");
    let snapshot: FinalCoreSnapshot;
    try {
      snapshot = await coordinateCheckRecords(catalog.value, {
        checkMaxParallelById: invocation.normalized.checkMaxParallelById,
        schedulerPolicy: invocation.normalized.declarative.scheduler
      });
    } catch (_error: unknown) {
      return executionResult(invocation, "task-execution-failed");
    }
    const referenceFacts = resolveReferenceFacts(plan.policy, snapshot, runtime);
    return referenceFacts === undefined
      ? planningResult(invocation, "policy-validation-failed")
      : Object.freeze({ referenceFacts, snapshot });
  } finally {
    runtime.cleanup();
  }
}

function resolveCatalog(
  invocation: Invocation,
  definitions: readonly CheckDefinition[],
  runtime: BuiltInRuntime
) {
  return resolveCheckCatalog({
    invocationKey: invocation.invocationId,
    definitions,
    bindings: definitions.map((definition) => resolveBinding(invocation, runtime, definition)),
    schedules: invocation.normalized.declarative.checks.schedules,
    mutexes: invocation.normalized.declarative.checks.mutexes,
    selectedCheckIds: invocation.normalized.declarative.checks.selected,
    resolveApplicability: (definition) => resolveApplicability(invocation, runtime, definition)
  });
}

function resolveBinding(invocation: Invocation, runtime: BuiltInRuntime, definition: CheckDefinition) {
  const custom = invocation.normalized.bindings.customChecks.get(definition.checkId);
  if (custom === undefined) {
    return runtime.bindings.get(definition.checkId)
      ?? { checkId: definition.checkId, execute: unavailableBuiltinBinding };
  }
  return custom.binding.kind === "direct"
    ? { checkId: definition.checkId, execute: custom.binding.execute }
    : { checkId: definition.checkId, createTaskPlan: custom.binding.createTaskPlan };
}

function resolveApplicability(invocation: Invocation, runtime: BuiltInRuntime, definition: CheckDefinition) {
  const custom = invocation.normalized.bindings.customChecks.get(definition.checkId);
  return custom === undefined
    ? runtime.applicability.get(definition.checkId)?.() ?? { status: "not-applicable" }
    : custom.applicability(definition);
}

function planningResult(
  invocation: Invocation,
  code: Parameters<typeof planning>[2]
): RunResult {
  return planning(invocation.declarativeFingerprint, invocation.effects.value(), code);
}

function executionResult(invocation: Invocation, code: "progress-failed" | "publication-model-failed" | "task-execution-failed"): RunResult {
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

function isRunResult(value: PlannedInvocation | BuiltInRuntime | CoreExecution | RunResult): value is RunResult {
  return "kind" in value;
}

function unavailableBuiltinBinding(): never {
  throw new TypeError("Built-in Check binding was scheduled without Product runtime preparation");
}
