import { failedOutput } from "../outputs/status.ts";
import { resolveFinalRunResult } from "./result-resolver.ts";
import { publishMachineOutput } from "./machine-publication.ts";
import {
  outputFailure,
  type CheckDuration,
  type CheckRunMessage,
  type NonConfigurationRunResult,
  type RunResultFacts
} from "../result.ts";
import type { CheckAggregate } from "../controls/contract.ts";
import { DIAGNOSTIC_CHANNELS, diagnosticTags } from "../diagnostic-logging/logger.ts";
import type { Invocation } from "../invocation/run.ts";
import {
  createPublicationModelV4,
  type TrustedPublicationModelV4
} from "../../machine-output/v4/publication-model.ts";
import type { CoreCheck, CoreSnapshot } from "../../check-settlement/facts.ts";

type OutcomeCounts = {
  readonly failed: number;
  readonly notApplicable: number;
  readonly passed: number;
  readonly unavailable: number;
};

/** Settled Check facts consumed by completion and output publication. */
export type CoreExecution = Readonly<{
  readonly aggregate: CheckAggregate | null;
  readonly checkDurations: readonly CheckDuration[];
  readonly checkMessages: readonly CheckRunMessage[];
  readonly snapshot: CoreSnapshot;
}>;

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
      directory: invocation.paths.machinePublicationDirectory
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
    if (invocation.startedAtUtc === null)
      throw new Error("Machine publication requires an invocation timestamp");
    return createPublicationModelV4({
      invocation: {
        invocationId: invocation.invocationId,
        projectRoot: ".",
        timestamp: invocation.startedAtUtc
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
  invocation.diagnosticLogging.core.observe({
    event: "run.terminal-before-log-close",
    tags: diagnosticTags("RUN", "TERMINAL", terminalStatusTag(candidate)),
    details: {
      ...closingFacts(candidate),
      diagnosticLogging: "close-not-yet-confirmed",
      outputs: preCloseOutputDetails(preCloseOutputs)
    }
  });
  const diagnosticLoggingStatuses = invocation.diagnosticLogging.close();
  for (const channel of DIAGNOSTIC_CHANNELS) {
    const status = diagnosticLoggingStatuses[channel];
    if (status === "failed") invocation.outputs.failedDiagnosticChannel(channel);
    if (status === "succeeded") invocation.outputs.succeededDiagnosticChannel(channel);
  }
  invocation.progressRendering.close();
  return resolveFinalRunResult(candidate, invocation.outputs.value());
}

function terminalStatusTag(candidate: NonConfigurationRunResult): string {
  if ("aggregate" in candidate && candidate.aggregate !== null)
    return candidate.aggregate.toUpperCase();
  if (candidate.kind === "cancelled") return "CANCELLED";
  return candidate.kind.toUpperCase();
}

function preCloseOutputDetails(outputs: ReturnType<Invocation["outputs"]["value"]>): Readonly<{
  readonly machinePublication: (typeof outputs)["machinePublication"];
  readonly progressRendering: (typeof outputs)["progressRendering"];
}> {
  return Object.freeze({
    machinePublication: outputs.machinePublication,
    progressRendering: outputs.progressRendering
  });
}

function closingFacts(candidate: NonConfigurationRunResult): Readonly<{
  readonly aggregate: CheckAggregate | null;
  readonly candidateKind: NonConfigurationRunResult["kind"];
  readonly counts: Readonly<{
    readonly failed: number;
    readonly notApplicable: number;
    readonly passed: number;
    readonly unavailable: number;
  }> | null;
  readonly nonPassed: readonly Readonly<{
    readonly checkId: string;
    readonly reason: unknown;
    readonly status: string;
  }>[];
}> {
  if (!("snapshot" in candidate)) {
    return Object.freeze({
      aggregate: null,
      candidateKind: candidate.kind,
      counts: null,
      nonPassed: []
    });
  }
  const summary = summarizeSnapshot(candidate.snapshot);
  return Object.freeze({
    aggregate: "aggregate" in candidate ? candidate.aggregate : null,
    candidateKind: candidate.kind,
    ...summary
  });
}

function summarizeSnapshot(snapshot: CoreSnapshot): Readonly<{
  readonly counts: OutcomeCounts;
  readonly nonPassed: readonly Readonly<{
    readonly checkId: string;
    readonly reason: unknown;
    readonly status: string;
  }>[];
}> {
  const counts = { failed: 0, notApplicable: 0, passed: 0, unavailable: 0 };
  const nonPassed: Array<Readonly<{ checkId: string; reason: unknown; status: string }>> = [];
  for (const check of snapshot.checks) {
    counts[statusCountKey(check)] += 1;
    const fact = nonPassedFact(check);
    if (fact !== undefined) nonPassed.push(fact);
  }
  return Object.freeze({
    counts: Object.freeze(counts),
    nonPassed: Object.freeze(nonPassed)
  });
}

function statusCountKey(check: CoreCheck): keyof OutcomeCounts {
  return check.outcome.status === "not-applicable" ? "notApplicable" : check.outcome.status;
}

function nonPassedFact(
  check: CoreCheck
):
  | Readonly<{ readonly checkId: string; readonly reason: unknown; readonly status: string }>
  | undefined {
  if (check.outcome.status === "passed") return undefined;
  return Object.freeze({
    checkId: check.checkId,
    reason: check.outcome.status === "failed" ? null : (check.outcome.reason ?? null),
    status: check.outcome.status
  });
}
