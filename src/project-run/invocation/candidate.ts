import { aggregateEffectiveChecks } from "../aggregation.ts";
import { completeInvocation, type CoreExecution } from "../completion/completion.ts";
import type { CheckAggregation } from "../controls/contract.ts";
import { diagnosticTags } from "../diagnostic-logging/logger.ts";
import type { Invocation } from "./run.ts";
import { elapsedSince, outcomeCounts } from "./progress.ts";
import { executionCancellation, type NonConfigurationRunResult } from "../result.ts";
import type { ResolvedCheckExecution } from "../check-execution/resolved-execution-result.ts";

export type ResolvedExecutionCandidateInput = Readonly<{
  readonly aggregation: CheckAggregation | undefined;
  readonly executed: ResolvedCheckExecution;
  readonly executionStartedAt: number;
  readonly invocation: Invocation;
}>;

/** Maps a sealed Scheduler result into the Run-owned candidate before terminal output closure. */
export function mapResolvedExecutionToRunCandidate(
  input: ResolvedExecutionCandidateInput
): NonConfigurationRunResult {
  const { executed, invocation } = input;
  if (executed.kind === "admission-policy-failed") return admissionPolicyFailure(invocation);

  if (executed.kind === "cancelled") {
    invocation.progressRendering.final({
      counts: outcomeCounts(executed.snapshot),
      elapsedMs: elapsedSince(input.executionStartedAt, invocation.clock),
      execution: executed.kind
    });
    return cancelledExecutionCandidate(invocation, executed);
  }
  return completedExecutionCandidate(
    invocation,
    input.aggregation,
    executed,
    input.executionStartedAt
  );
}

function admissionPolicyFailure(
  invocation: Invocation
): Extract<NonConfigurationRunResult, { readonly kind: "execution" }> {
  return Object.freeze({
    kind: "execution",
    declarativeFingerprint: invocation.declarativeFingerprint,
    definitionWarnings: invocation.definitionWarnings,
    diagnostic: Object.freeze({ code: "admission-policy-failed" }),
    outputs: invocation.outputs.value()
  });
}

function cancelledExecutionCandidate(
  invocation: Invocation,
  executed: Extract<ResolvedCheckExecution, { readonly kind: "cancelled" }>
): NonConfigurationRunResult {
  invocation.diagnosticLogging.core.observe({
    event: "run.execution.cancelled",
    tags: diagnosticTags("RUN", "EXECUTION", "CANCELLED"),
    details: { checkCount: executed.snapshot.checks.length }
  });
  return executionCancellation({
    checkDurations: executed.checkDurations,
    checkMessages: executed.checkMessages,
    declarativeFingerprint: invocation.declarativeFingerprint,
    definitionWarnings: invocation.definitionWarnings,
    outputs: invocation.outputs.value(),
    snapshot: executed.snapshot
  });
}

function completedExecutionCandidate(
  invocation: Invocation,
  aggregation: CheckAggregation | undefined,
  executed: Extract<ResolvedCheckExecution, { readonly kind: "completed" }>,
  executionStartedAt: number
): NonConfigurationRunResult {
  const aggregate = aggregateEffectiveChecks(
    executed.snapshot,
    executed.effectiveCheckIds,
    aggregation
  );
  invocation.diagnosticLogging.core.observe({
    event: "run.aggregation.completed",
    tags: diagnosticTags("RUN", "AGGREGATION", "COMPLETED"),
    details: { aggregate, aggregation: aggregation === undefined ? "default" : "custom" }
  });
  const core: CoreExecution = Object.freeze({
    aggregate,
    checkDurations: executed.checkDurations,
    checkMessages: executed.checkMessages,
    snapshot: executed.snapshot
  });
  invocation.progressRendering.final({
    counts: outcomeCounts(executed.snapshot),
    elapsedMs: elapsedSince(executionStartedAt, invocation.clock),
    execution: "completed"
  });
  return completeInvocation(invocation, core);
}
