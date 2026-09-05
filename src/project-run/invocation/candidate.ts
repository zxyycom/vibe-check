import { aggregateCheckOutcomes } from "../aggregation.ts";
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

  invocation.progressRendering.final({
    counts: outcomeCounts(executed.snapshot),
    elapsedMs: elapsedSince(input.executionStartedAt, invocation.clock),
    execution: executed.kind
  });

  if (executed.kind === "cancelled") return cancelledExecutionCandidate(invocation, executed);
  return completedExecutionCandidate(invocation, input.aggregation, executed);
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
  executed: Extract<ResolvedCheckExecution, { readonly kind: "completed" }>
): NonConfigurationRunResult {
  const aggregate =
    aggregation === undefined
      ? null
      : aggregateCheckOutcomes(executed.snapshot, aggregation, executed.effectiveCheckIds);
  invocation.diagnosticLogging.core.observe({
    event: "run.aggregation.completed",
    tags: diagnosticTags("RUN", "AGGREGATION", "COMPLETED"),
    details: { aggregate, selection: aggregation ?? null }
  });
  const core: CoreExecution = Object.freeze({
    aggregate,
    checkDurations: executed.checkDurations,
    checkMessages: executed.checkMessages,
    snapshot: executed.snapshot
  });
  return completeInvocation(invocation, core);
}
