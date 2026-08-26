import { resolve } from "node:path";
import { failedOutput } from "./output-status.ts";
import { publishMachineOutput } from "./machine-publication.ts";
import { outputFailure, type RunResult, type RunResultFacts } from "./result.ts";
import type { CoreExecution, Invocation } from "./invocation.ts";
import {
  createPublicationModelV4,
  type TrustedPublicationModelV4
} from "../machine-output/v4/publication-model.ts";
export function completeInvocation(invocation: Invocation, core: CoreExecution): RunResult {
  const facts = runFacts(core);
  if (invocation.outputConfiguration.machinePublication.enabled) {
    const model = createModel(invocation, core.snapshot);
    if (isRunResult(model)) return model;
    const published = publishMachineOutput({
      configuration: invocation.outputConfiguration.machinePublication,
      statuses: invocation.outputs,
      model,
      directory: resolve(
        invocation.projectRoot,
        invocation.outputConfiguration.machinePublication.directory
      )
    });
    if (!published) return failure(invocation, facts);
  }
  const output = failedOutput(invocation.outputs.value());
  return output === undefined
    ? Object.freeze({
        kind: "completed",
        declarativeFingerprint: invocation.declarativeFingerprint,
        definitionWarnings: invocation.definitionWarnings,
        outputs: invocation.outputs.value(),
        ...facts
      })
    : failure(invocation, facts);
}
function failure(invocation: Invocation, facts: RunResultFacts): RunResult {
  const output = failedOutput(invocation.outputs.value());
  if (output === undefined) throw new Error("Run output failed without a failed status");
  return outputFailure(
    invocation.declarativeFingerprint,
    invocation.definitionWarnings,
    invocation.outputs.value(),
    output,
    facts
  );
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
    return createPublicationModelV4({
      invocation: {
        invocationId: invocation.invocationId,
        projectRoot: ".",
        timestamp: new Date().toISOString()
      },
      snapshot
    });
  } catch {
    return Object.freeze({
      kind: "execution",
      declarativeFingerprint: invocation.declarativeFingerprint,
      definitionWarnings: invocation.definitionWarnings,
      diagnostic: Object.freeze({ code: "publication-model-failed" }),
      outputs: invocation.outputs.value()
    });
  }
}
function isRunResult(value: TrustedPublicationModelV4 | RunResult): value is RunResult {
  return "kind" in value;
}
