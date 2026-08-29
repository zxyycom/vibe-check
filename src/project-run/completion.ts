import { resolve } from "node:path";
import { failedOutput } from "./output-status.ts";
import { publishMachineOutput } from "./machine-publication.ts";
import { outputFailure, type NonConfigurationRunResult, type RunResultFacts } from "./result.ts";
import type { CoreExecution, Invocation } from "./invocation.ts";
import {
  createPublicationModelV4,
  type TrustedPublicationModelV4
} from "../machine-output/v4/publication-model.ts";
export function completeInvocation(
  invocation: Invocation,
  core: CoreExecution
): NonConfigurationRunResult {
  const facts = runFacts(core);
  if (invocation.outputConfiguration.machinePublication.enabled) {
    const model = createModel(invocation, core.snapshot);
    if (isExecutionResult(model)) return model;
    const published = publishMachineOutput({
      configuration: invocation.outputConfiguration.machinePublication,
      statuses: invocation.outputs,
      model,
      directory: resolve(
        invocation.projectRoot,
        invocation.outputConfiguration.machinePublication.directory
      )
    });
    invocation.diagnosticLogger.observe({
      scope: "output:machinePublication",
      event: published ? "output.succeeded" : "output.failed",
      summary: published
        ? "machine publication output was closed"
        : "machine publication output was closed after a publish failure",
      details: { status: invocation.outputs.value().machinePublication.status }
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
function failure(invocation: Invocation, facts: RunResultFacts): ReturnType<typeof outputFailure> {
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
): TrustedPublicationModelV4 | Extract<NonConfigurationRunResult, { readonly kind: "execution" }> {
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
function isExecutionResult(
  value:
    | TrustedPublicationModelV4
    | Extract<NonConfigurationRunResult, { readonly kind: "execution" }>
): value is Extract<NonConfigurationRunResult, { readonly kind: "execution" }> {
  return "kind" in value;
}

/** Closes diagnostic logging and applies final output priority to a non-configuration candidate. */
export function finalizeInvocation(
  invocation: Invocation,
  candidate: NonConfigurationRunResult
): NonConfigurationRunResult {
  const preCloseOutputs = invocation.outputs.value();
  invocation.diagnosticLogger.observe({
    scope: "run",
    event: "invocation.closing",
    summary: "pre-logging result selected",
    details: { candidateKind: candidate.kind, outputs: preCloseOutputs }
  });
  const diagnosticLoggingStatus = invocation.diagnosticLogger.close();
  if (diagnosticLoggingStatus === "failed") invocation.outputs.failed("diagnosticLogging");
  if (diagnosticLoggingStatus === "succeeded") invocation.outputs.succeeded("diagnosticLogging");

  const outputs = invocation.outputs.value();
  switch (candidate.kind) {
    case "completed": {
      const output = failedOutput(outputs);
      return output === undefined
        ? Object.freeze({ ...candidate, outputs })
        : outputFailure(
            candidate.declarativeFingerprint,
            candidate.definitionWarnings,
            outputs,
            output,
            finalSnapshotFacts(candidate)
          );
    }
    case "output": {
      const output = failedOutput(outputs);
      if (output === undefined) throw new Error("Run output failed without a failed status");
      return outputFailure(
        candidate.declarativeFingerprint,
        candidate.definitionWarnings,
        outputs,
        output,
        finalSnapshotFacts(candidate)
      );
    }
    case "planning":
    case "cancelled":
    case "execution":
      return Object.freeze({ ...candidate, outputs });
  }
}

function finalSnapshotFacts(
  candidate: Extract<NonConfigurationRunResult, RunResultFacts>
): RunResultFacts {
  return Object.freeze({
    aggregate: candidate.aggregate,
    checkDurations: candidate.checkDurations,
    checkMessages: candidate.checkMessages,
    snapshot: candidate.snapshot
  });
}
