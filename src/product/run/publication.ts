import { resolve } from "node:path";

import { failedEffect, publishOutput } from "./effects.ts";
import { effectFailure, type RunResult, type RunResultFacts } from "./result.ts";
import type { CoreExecution, Invocation } from "./invocation.ts";
import {
  createPublicationModelV4,
  type ValidatedPublicationModelV4
} from "../quality-core/output/publication-v4/index.ts";

interface PreparedPublication {
  readonly facts: RunResultFacts;
  readonly model: ValidatedPublicationModelV4;
}

export function completeInvocation(invocation: Invocation, core: CoreExecution): RunResult {
  const publication = createModel(invocation, core);
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
  const published = publishOutput({
    effectConfiguration: invocation.effectConfiguration,
    effects: invocation.effects,
    model: publication.model,
    outputDirectory
  });
  if (!published) {
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
  return completeWithLogs(invocation, publication);
}

function createModel(invocation: Invocation, core: CoreExecution): PreparedPublication | RunResult {
  try {
    const model = createPublicationModelV4({
      invocation: {
        invocationId: invocation.invocationId,
        projectRoot: ".",
        timestamp: new Date().toISOString()
      },
      snapshot: core.snapshot
    });
    return Object.freeze({
      facts: Object.freeze({
        aggregate: core.aggregate,
        checkDurations: core.checkDurations,
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

function completeWithLogs(invocation: Invocation, publication: PreparedPublication): RunResult {
  if (invocation.effectConfiguration.logs.enabled) {
    try {
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
