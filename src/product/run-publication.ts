import { resolve } from "node:path";

import { emitProgress, publishOutput } from "./run-effects.ts";
import { effectFailure, type RunResult } from "./run-result.ts";
import type { CoreExecution, Invocation } from "./run-invocation.ts";
import type { PolicyResolution } from "./quality-core/src/check-record/policy-model.ts";
import { evaluateDecisionPolicy } from "./quality-core/src/check-record/policy-evaluator.ts";
import { projectHumanStatus } from "./quality-core/src/check-record/human-status.ts";
import {
  createPublicationModelV2,
  type ValidatedPublicationModelV2
} from "./quality-core/src/output/publication-v2/index.ts";
import { printPublicationSummaryV2 } from "./quality-core/src/scan-command/publication-v2.ts";

export function completeInvocation(
  invocation: Invocation,
  policy: PolicyResolution,
  core: CoreExecution
): RunResult {
  const model = createModel(invocation, policy, core);
  if (isRunResult(model)) return model;
  if (invocation.effects.cacheStatus() === "failed") {
    return effectFailure(invocation.declarativeFingerprint, invocation.effects.value(), "cache", model);
  }
  if (!emitProgress(invocation.effects, "effects")) {
    return effectFailure(invocation.declarativeFingerprint, invocation.effects.value(), "progress", model);
  }
  const outputDirectory = resolve(invocation.projectRoot, invocation.effectConfiguration.output.directory);
  const readable = publishOutput({
    changedFiles: invocation.controls.changedFiles ?? [],
    effectConfiguration: invocation.effectConfiguration,
    effects: invocation.effects,
    model,
    outputDirectory,
    reportPresentation: invocation.definition.quality.report
  });
  if (readable === undefined) {
    return effectFailure(invocation.declarativeFingerprint, invocation.effects.value(), "output", model);
  }
  return completeWithLogs(invocation, model, readable, outputDirectory);
}

function createModel(
  invocation: Invocation,
  policy: PolicyResolution,
  core: CoreExecution
): ValidatedPublicationModelV2 | RunResult {
  const decision = evaluateDecisionPolicy(policy, core.snapshot, core.referenceFacts);
  try {
    return createPublicationModelV2({
      decision,
      humanStatus: projectHumanStatus({ decision, snapshot: core.snapshot, verificationOutput: false }),
      invocation: {
        invocationId: invocation.invocationId,
        projectRoot: ".",
        timestamp: new Date().toISOString()
      },
      referenceFacts: core.referenceFacts,
      references: policy.references,
      snapshot: core.snapshot,
      verificationOutput: false
    });
  } catch (_error: unknown) {
    return Object.freeze({
      kind: "execution",
      declarativeFingerprint: invocation.declarativeFingerprint,
      diagnostic: Object.freeze({ code: "publication-model-failed" }),
      effects: invocation.effects.value()
    });
  }
}

function completeWithLogs(
  invocation: Invocation,
  model: ValidatedPublicationModelV2,
  readable: NonNullable<ReturnType<typeof publishOutput>>,
  outputDirectory: string
): RunResult {
  if (invocation.effectConfiguration.logs.enabled) {
    try {
      printPublicationSummaryV2({
        ...(invocation.effectConfiguration.output.enabled ? { artifactDir: outputDirectory } : {}),
        model,
        readable
      });
      invocation.effects.succeeded("logs");
    } catch (_error: unknown) {
      invocation.effects.failed("logs");
      return effectFailure(invocation.declarativeFingerprint, invocation.effects.value(), "logs", model);
    }
  }
  return Object.freeze({
    kind: "completed",
    declarativeFingerprint: invocation.declarativeFingerprint,
    decision: model.decision,
    effects: invocation.effects.value(),
    model,
    referenceFacts: model.referenceFacts,
    snapshot: model.snapshot
  });
}

function isRunResult(value: ValidatedPublicationModelV2 | RunResult): value is RunResult {
  return "kind" in value;
}
