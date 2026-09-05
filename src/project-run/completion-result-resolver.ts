import { failedOutput, type RunOutputStatuses } from "./output-status.ts";
import { outputFailure, type NonConfigurationRunResult, type RunResultFacts } from "./result.ts";

/** Resolves a terminal candidate against the output statuses after all owners have closed. */
export function resolveFinalRunResult(
  candidate: NonConfigurationRunResult,
  outputs: RunOutputStatuses
): NonConfigurationRunResult {
  switch (candidate.kind) {
    case "completed":
      return resolveCompletedCandidate(candidate, outputs);
    case "output":
      return resolveExistingOutputCandidate(candidate, outputs);
    case "planning":
    case "cancelled":
    case "execution":
      return Object.freeze({ ...candidate, outputs });
  }
}

function resolveCompletedCandidate(
  candidate: Extract<NonConfigurationRunResult, { readonly kind: "completed" }>,
  outputs: RunOutputStatuses
): NonConfigurationRunResult {
  const output = failedOutput(outputs);
  if (output === undefined) return Object.freeze({ ...candidate, outputs });
  return outputFailure(
    candidate.declarativeFingerprint,
    candidate.definitionWarnings,
    outputs,
    output,
    finalSnapshotFacts(candidate)
  );
}

function resolveExistingOutputCandidate(
  candidate: Extract<NonConfigurationRunResult, { readonly kind: "output" }>,
  outputs: RunOutputStatuses
): NonConfigurationRunResult {
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
