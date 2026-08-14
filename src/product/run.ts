import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import {
  createDeclarativeFingerprint,
  normalizeProjectDefinition,
  type ProjectDefinition,
  type RunControls
} from "./project-definition.ts";
import {
  validateProjectDefinition,
  validateRunControls
} from "./project-definition-validation.ts";
import { prepareBuiltInRuntime, type BuiltInRuntime } from "./run-built-ins.ts";
import {
  createEffectStatuses,
  effectiveEffects,
  emitProgress,
  publishOutput
} from "./run-effects.ts";
import { resolveReferenceFacts, resolveSelectedPolicy } from "./run-policy.ts";
import {
  cancelled,
  effectFailure,
  isCancelled,
  planning,
  type RunResult
} from "./run-result.ts";
import { ScannerOperationalInputError } from "./scanner-dependencies.ts";
import { resolveCheckCatalog } from "./quality-core/src/check-record/catalog.ts";
import {
  resolveCheckSchedules,
  resolveCheckSelection
} from "./quality-core/src/check-record/check-schedule.ts";
import { coordinateCheckRecords } from "./quality-core/src/check-record/coordinator.ts";
import type { FinalCoreSnapshot } from "./quality-core/src/check-record/model.ts";
import { evaluateDecisionPolicy } from "./quality-core/src/check-record/policy-evaluator.ts";
import { projectHumanStatus } from "./quality-core/src/check-record/human-status.ts";
import type { ReferenceFacts } from "./quality-core/src/check-record/policy-model.ts";
import {
  createPublicationModelV2,
  type ValidatedPublicationModelV2
} from "./quality-core/src/output/publication-v2/index.ts";
import { printPublicationSummaryV2 } from "./quality-core/src/scan-command/publication-v2.ts";

export type { RunEffectStatus, RunEffectStatuses } from "./run-effects.ts";
export type { RunDiagnostic, RunResult } from "./run-result.ts";

/**
 * Executes one project-owned definition in the caller's runtime.  Validation is
 * deliberately the only work before a project function, dependency resolver,
 * cache, scanner, or reporter can run.
 */
export async function run(
  definition: ProjectDefinition,
  controls?: RunControls
): Promise<RunResult>;
export async function run(definition: unknown, controls?: unknown): Promise<RunResult>;
export async function run(definition: unknown, controls: unknown = {}): Promise<RunResult> {
  const validatedDefinition = validateProjectDefinition(definition);
  if (!validatedDefinition.ok) {
    return Object.freeze({ kind: "configuration", diagnostic: validatedDefinition.error });
  }
  const validatedControls = validateRunControls(controls);
  if (!validatedControls.ok) {
    return Object.freeze({ kind: "configuration", diagnostic: validatedControls.error });
  }

  const normalized = normalizeProjectDefinition(validatedDefinition.value);
  const declarativeFingerprint = createDeclarativeFingerprint(normalized.declarative);
  const effectConfiguration = effectiveEffects(validatedDefinition.value, validatedControls.value);
  const effects = createEffectStatuses(effectConfiguration);
  const qualityConfig = validatedDefinition.value.quality;
  const projectRoot = resolve(validatedControls.value.projectRoot ?? process.cwd());
  if (isCancelled(validatedControls.value)) {
    return cancelled(declarativeFingerprint, effects.value(), "pre-work");
  }

  const definitions = Object.freeze([
    ...normalized.declarative.checks.builtIn,
    ...normalized.declarative.checks.custom
  ]);
  const schedules = resolveCheckSchedules(
    normalized.declarative.checks.schedules,
    definitions
  );
  const selectedCheckIds = schedules === undefined
    ? undefined
    : resolveCheckSelection(
      normalized.declarative.checks.selected,
      definitions,
      schedules
    );
  if (selectedCheckIds === undefined) {
    return planning(declarativeFingerprint, effects.value(), "catalog-resolution-failed");
  }
  const policy = resolveSelectedPolicy(
    validatedDefinition.value,
    validatedControls.value,
    definitions
  );
  if (policy === undefined) {
    return Object.freeze({
      kind: "configuration",
      diagnostic: Object.freeze({
        kind: "invalid-run-controls",
        path: "controls.comparison",
        reason: "invalid-value"
      })
    });
  }
  if (isCancelled(validatedControls.value)) {
    return cancelled(declarativeFingerprint, effects.value(), "pre-work");
  }
  let builtInRuntime: BuiltInRuntime;
  try {
    builtInRuntime = prepareBuiltInRuntime(
      validatedDefinition.value,
      validatedControls.value,
      [...selectedCheckIds],
      effectConfiguration.cache,
      (activity) => effects.cache(activity)
    );
  } catch (error) {
    if (error instanceof ScannerOperationalInputError) {
      return Object.freeze({
        kind: "configuration",
        diagnostic: Object.freeze({
          kind: "invalid-scanner-operational-input",
          path: `operationalDependencies.${error.dependencyId ?? "binding"}`,
          reason: "invalid-value"
        })
      });
    }
    return planning(declarativeFingerprint, effects.value(), "builtin-preparation-failed");
  }
  if (isCancelled(validatedControls.value)) {
    builtInRuntime.cleanup();
    return cancelled(declarativeFingerprint, effects.value(), "pre-work");
  }

  let snapshot: FinalCoreSnapshot;
  let referenceFacts: ReferenceFacts | undefined;
  try {
    const catalogResult = resolveCheckCatalog({
      invocationKey: `invocation/v1:${randomUUID()}`,
      definitions,
      bindings: definitions.map((check) => {
        const custom = normalized.bindings.customChecks.get(check.checkId);
        return custom === undefined
          ? builtInRuntime.bindings.get(check.checkId)
            ?? { checkId: check.checkId, execute: unavailableBuiltinBinding }
          : custom.binding.kind === "direct"
            ? { checkId: check.checkId, execute: custom.binding.execute }
            : { checkId: check.checkId, createTaskPlan: custom.binding.createTaskPlan };
      }),
      schedules: normalized.declarative.checks.schedules,
      selectedCheckIds: normalized.declarative.checks.selected,
      resolveApplicability: (check) => {
        const custom = normalized.bindings.customChecks.get(check.checkId);
        return custom === undefined
          ? builtInRuntime.applicability.get(check.checkId)?.()
            ?? { status: "not-applicable" }
          : custom.applicability(check);
      }
    });
    if (!catalogResult.ok) {
      return planning(declarativeFingerprint, effects.value(), "catalog-resolution-failed");
    }
    if (isCancelled(validatedControls.value)) {
      return cancelled(declarativeFingerprint, effects.value(), "planning");
    }
    if (!emitProgress(effects, "execution")) {
      return Object.freeze({
        kind: "execution",
        declarativeFingerprint,
        diagnostic: Object.freeze({ code: "progress-failed" }),
        effects: effects.value()
      });
    }
    try {
      snapshot = await coordinateCheckRecords(catalogResult.value, {
        schedulerPolicy: normalized.declarative.scheduler
      });
    } catch {
      return Object.freeze({
        kind: "execution",
        declarativeFingerprint,
        diagnostic: Object.freeze({ code: "task-execution-failed" }),
        effects: effects.value()
      });
    }
    referenceFacts = resolveReferenceFacts(policy, snapshot, builtInRuntime);
  } finally {
    builtInRuntime.cleanup();
  }
  if (referenceFacts === undefined) {
    return planning(declarativeFingerprint, effects.value(), "policy-validation-failed");
  }
  const decision = evaluateDecisionPolicy(policy, snapshot, referenceFacts);
  let model: ValidatedPublicationModelV2;
  try {
    model = createPublicationModelV2({
      decision,
      humanStatus: projectHumanStatus({ decision, snapshot, verificationOutput: false }),
      invocation: {
        invocationId: `invocation/v1:${randomUUID()}`,
        projectRoot: ".",
        timestamp: new Date().toISOString()
      },
      referenceFacts,
      references: policy.references,
      snapshot,
      verificationOutput: false
    });
  } catch {
    return Object.freeze({
      kind: "execution",
      declarativeFingerprint,
      diagnostic: Object.freeze({ code: "publication-model-failed" }),
      effects: effects.value()
    });
  }
  if (effects.cacheStatus() === "failed") {
    return effectFailure(declarativeFingerprint, effects.value(), "cache", model);
  }
  if (!emitProgress(effects, "effects")) {
    return effectFailure(declarativeFingerprint, effects.value(), "progress", model);
  }
  const outputDirectory = resolve(
    projectRoot,
    effectConfiguration.output.directory
  );
  const readable = publishOutput({
    changedFiles: validatedControls.value.changedFiles ?? [],
    effectConfiguration,
    effects,
    model,
    outputDirectory,
    reportPresentation: qualityConfig.report
  });
  if (readable === undefined) {
    return effectFailure(declarativeFingerprint, effects.value(), "output", model);
  }
  if (effectConfiguration.logs.enabled) {
    try {
      printPublicationSummaryV2({
        ...(effectConfiguration.output.enabled ? { artifactDir: outputDirectory } : {}),
        model,
        readable
      });
      effects.succeeded("logs");
    } catch {
      effects.failed("logs");
      return effectFailure(declarativeFingerprint, effects.value(), "logs", model);
    }
  }
  return Object.freeze({
    kind: "completed",
    declarativeFingerprint,
    decision: model.decision,
    effects: effects.value(),
    model,
    referenceFacts: model.referenceFacts,
    snapshot: model.snapshot
  });
}

function unavailableBuiltinBinding(): never {
  throw new TypeError("Built-in Check binding was scheduled without Product runtime preparation");
}
