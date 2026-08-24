import { resolve } from "node:path";

import { failedEffect, publishOutput } from "./effects.ts";
import { effectFailure, type RunResult, type RunResultFacts } from "./run-result.ts";
import type { CoreExecution, Invocation } from "./invocation.ts";
import {
  createPublicationModelV4,
  type TrustedPublicationModelV4
} from "../output/machine-v4/publication-model.ts";

export function completeInvocation(invocation: Invocation, core: CoreExecution): RunResult {
  const facts = runFacts(core);
  if (invocation.effects.cacheStatus() === "failed") {
    return effectFailure(
      invocation.declarativeFingerprint,
      invocation.definitionWarnings,
      invocation.effects.value(),
      "cache",
      facts
    );
  }
  if (invocation.effectConfiguration.output.enabled) {
    const model = createModel(invocation, core.snapshot);
    if (isRunResult(model)) return model;
    const outputDirectory = resolve(
      invocation.projectRoot,
      invocation.effectConfiguration.output.directory
    );
    const published = publishOutput({
      effectConfiguration: invocation.effectConfiguration,
      effects: invocation.effects,
      model,
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
        facts
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
      facts
    );
  }
  return Object.freeze({
    kind: "completed",
    declarativeFingerprint: invocation.declarativeFingerprint,
    definitionWarnings: invocation.definitionWarnings,
    effects: invocation.effects.value(),
    ...facts
  });
}

function runFacts(core: CoreExecution): RunResultFacts {
  return Object.freeze({
    aggregate: core.aggregate,
    checkDurations: core.checkDurations,
    checkMessages: core.checkMessages,
    snapshot: core.snapshot
  });
}

function createModel(
  invocation: Invocation,
  snapshot: CoreExecution["snapshot"]
): TrustedPublicationModelV4 | RunResult {
  try {
    const model = createPublicationModelV4({
      invocation: {
        invocationId: invocation.invocationId,
        projectRoot: ".",
        timestamp: new Date().toISOString()
      },
      snapshot
    });
    return model;
  } catch {
    return Object.freeze({
      kind: "execution",
      declarativeFingerprint: invocation.declarativeFingerprint,
      definitionWarnings: invocation.definitionWarnings,
      diagnostic: Object.freeze({ code: "publication-model-failed" }),
      effects: invocation.effects.value()
    });
  }
}

function isRunResult(value: TrustedPublicationModelV4 | RunResult): value is RunResult {
  return "kind" in value;
}
