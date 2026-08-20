import { resolve } from "node:path";

import { failedEffect, publishOutput } from "./effects.ts";
import { effectFailure, type RunResult, type RunResultFacts } from "./result.ts";
import type { CoreExecution, Invocation } from "./invocation.ts";
import type { PolicyResolution } from "../quality-core/check-record/policy-model.ts";
import { evaluateDecisionPolicy } from "../quality-core/check-record/policy-evaluator.ts";
import { projectHumanStatus } from "../quality-core/check-record/human-status.ts";
import {
  createPublicationModelV3,
  type ValidatedPublicationModelV3
} from "../quality-core/output/publication-v3/index.ts";
import { printPublicationSummaryV3 } from "../quality-core/scan-command/publication-v3.ts";

interface PreparedPublication {
  readonly facts: RunResultFacts;
  readonly model: ValidatedPublicationModelV3;
}

export function completeInvocation(
  invocation: Invocation,
  policy: PolicyResolution,
  core: CoreExecution
): RunResult {
  const publication = createModel(invocation, policy, core);
  if (isRunResult(publication)) return publication;
  if (invocation.effects.cacheStatus() === "failed") {
    return effectFailure(
      invocation.declarativeFingerprint,
      invocation.definitionWarnings,
      invocation.effects.value(),
      "cache",
      publication.facts
    );
  }
  const outputDirectory = resolve(
    invocation.projectRoot,
    invocation.effectConfiguration.output.directory
  );
  const readable = publishOutput({
    changedFiles: invocation.controls.changedFiles ?? [],
    effectConfiguration: invocation.effectConfiguration,
    effects: invocation.effects,
    model: publication.model,
    outputDirectory,
    reportPresentation: invocation.definition.quality.report
  });
  if (readable === undefined) {
    const effect = failedEffect(invocation.effects.value());
    if (effect === undefined)
      throw new Error("Output publication failed without a failed effect status");
    return effectFailure(
      invocation.declarativeFingerprint,
      invocation.definitionWarnings,
      invocation.effects.value(),
      effect,
      publication.facts
    );
  }
  return completeWithLogs(invocation, publication, readable, outputDirectory);
}

function createModel(
  invocation: Invocation,
  policy: PolicyResolution,
  core: CoreExecution
): PreparedPublication | RunResult {
  try {
    const decision = evaluateDecisionPolicy(policy, core.snapshot, core.referenceFacts);
    const model = createPublicationModelV3({
      decision,
      humanStatus: projectHumanStatus({
        decision,
        snapshot: core.snapshot,
        verificationOutput: false
      }),
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
    return Object.freeze({
      facts: Object.freeze({
        checkDurations: core.checkDurations,
        decision: model.decision,
        referenceFacts: model.referenceFacts,
        snapshot: model.snapshot
      }),
      model
    });
  } catch (_error: unknown) {
    return Object.freeze({
      kind: "execution",
      declarativeFingerprint: invocation.declarativeFingerprint,
      definitionWarnings: invocation.definitionWarnings,
      diagnostic: Object.freeze({ code: "publication-model-failed" }),
      effects: invocation.effects.value()
    });
  }
}

function completeWithLogs(
  invocation: Invocation,
  publication: PreparedPublication,
  readable: NonNullable<ReturnType<typeof publishOutput>>,
  outputDirectory: string
): RunResult {
  if (invocation.effectConfiguration.logs.enabled) {
    try {
      printPublicationSummaryV3({
        ...(invocation.effectConfiguration.output.enabled ? { artifactDir: outputDirectory } : {}),
        model: publication.model,
        readable
      });
      invocation.effects.succeeded("logs");
    } catch (error: unknown) {
      invocation.effects.failed("logs");
      const effect = failedEffect(invocation.effects.value());
      if (effect === undefined) {
        throw new Error("Log publication failed without a failed effect status", { cause: error });
      }
      return effectFailure(
        invocation.declarativeFingerprint,
        invocation.definitionWarnings,
        invocation.effects.value(),
        effect,
        publication.facts
      );
    }
  }
  const effect = failedEffect(invocation.effects.value());
  if (effect !== undefined) {
    return effectFailure(
      invocation.declarativeFingerprint,
      invocation.definitionWarnings,
      invocation.effects.value(),
      effect,
      publication.facts
    );
  }
  return Object.freeze({
    kind: "completed",
    declarativeFingerprint: invocation.declarativeFingerprint,
    definitionWarnings: invocation.definitionWarnings,
    effects: invocation.effects.value(),
    ...publication.facts
  });
}

function isRunResult(value: PreparedPublication | RunResult): value is RunResult {
  return "kind" in value;
}
