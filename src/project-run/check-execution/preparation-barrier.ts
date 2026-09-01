import type { CheckMessage } from "../../check/check.ts";
import type { NormalizedCheck } from "../../project-definition/project-definition.ts";
import { snapshotJsonObject } from "../../check/options-snapshot.ts";
import {
  diagnosticTags,
  summarizeDiagnosticValue,
  type DiagnosticLogger
} from "../diagnostic-logging/logger.ts";
import { parseCheckPreflightResult, type ParsedCheckPreflightResult } from "./preflight-result.ts";
import { invokeWithCapturedConsole } from "./console-capture.ts";
import { combineCheckMessages } from "./messages.ts";
import {
  FLAG_CONDITION_NOT_MATCHED_CODE,
  resolveFlagEnablement,
  unavailablePreflightResolution,
  type SettledPreparationResolution
} from "./preparation-settlement.ts";

const EMPTY_MESSAGES: readonly CheckMessage[] = Object.freeze([]);
const INERT_SIGNAL = new AbortController().signal;

export type PreparedCheck = Omit<NormalizedCheck, "options" | "preflight"> &
  Readonly<{ readonly options: object; readonly preflightMessages: readonly CheckMessage[] }>;

export type ReadyCheckPreparationResolution = Readonly<{
  readonly kind: "ready";
  readonly check: PreparedCheck;
}>;

export type CheckPreparationResolution =
  | ReadyCheckPreparationResolution
  | SettledPreparationResolution;

type PreparationResolutionResult =
  | typeof FLAG_CONDITION_NOT_MATCHED_CODE
  | "skipped"
  | "prepared"
  | "continued"
  | "blocked"
  | "cancelled-before-callback"
  | "cancelled-after-callback"
  | "cancelled-after-throw"
  | "threw"
  | "malformed";

type PrepareCheckInput = Readonly<{
  readonly check: NormalizedCheck;
  readonly diagnosticLogger: DiagnosticLogger | undefined;
  readonly flags: readonly string[];
  readonly signal: AbortSignal | undefined;
}>;

type PreflightInvocation = Awaited<ReturnType<typeof invokeWithCapturedConsole<unknown>>>;

/** Resolves cancellation, flag enablement, and preflight before any Check enters the Task graph. */
export async function prepareChecks(
  input: Readonly<{
    readonly checks: readonly NormalizedCheck[];
    readonly diagnosticLogger?: DiagnosticLogger;
    readonly flags: readonly string[];
    readonly signal: AbortSignal | undefined;
  }>
): Promise<readonly CheckPreparationResolution[]> {
  const resolutions: CheckPreparationResolution[] = [];
  for (const check of input.checks) {
    resolutions.push(
      await prepareCheck({
        check,
        diagnosticLogger: input.diagnosticLogger,
        flags: input.flags,
        signal: input.signal
      })
    );
  }
  return Object.freeze(resolutions);
}

async function prepareCheck(input: PrepareCheckInput): Promise<CheckPreparationResolution> {
  if (input.signal?.aborted) {
    return observeUnavailablePreflight({
      check: input.check,
      diagnosticLogger: input.diagnosticLogger,
      details: {},
      result: "cancelled-before-callback",
      reasonCode: "execution-cancelled"
    });
  }
  const flagSettlement = resolveFlagEnablement(input.check, input.flags);
  if (flagSettlement !== undefined) {
    observePreparationResolution(
      input.diagnosticLogger,
      input.check.definition.checkId,
      flagSettlement,
      FLAG_CONDITION_NOT_MATCHED_CODE,
      { enabledByFlags: input.check.enabledByFlags }
    );
    return flagSettlement;
  }
  const preflight = input.check.preflight;
  if (preflight === undefined) {
    return resolveAuthoredOptions(input);
  }
  return resolvePreflightInvocation(
    input,
    await invokePreflight(preflight, input.check.options, input.signal)
  );
}

function resolveAuthoredOptions(input: PrepareCheckInput): CheckPreparationResolution {
  const resolution = readyResolution({
    authoredCheck: input.check,
    messages: EMPTY_MESSAGES,
    preparedOptions: input.check.options
  });
  observeReadyOrMalformedResolution(
    input.diagnosticLogger,
    input.check.definition.checkId,
    resolution,
    "skipped",
    { source: "authored" }
  );
  return resolution;
}

function resolvePreflightInvocation(
  input: PrepareCheckInput,
  invocation: PreflightInvocation
): CheckPreparationResolution {
  if (invocation.kind === "threw") {
    return observeUnavailablePreflight({
      check: input.check,
      diagnosticLogger: input.diagnosticLogger,
      details: { error: invocation.error },
      messages: invocation.messages,
      result: input.signal?.aborted ? "cancelled-after-throw" : "threw",
      reasonCode: input.signal?.aborted ? "execution-cancelled" : "preflight-threw"
    });
  }
  return resolveReturnedPreflight(input, invocation.output, invocation.messages);
}

function resolveReturnedPreflight(
  input: PrepareCheckInput,
  preflightOutput: unknown,
  consoleMessages: readonly CheckMessage[]
): CheckPreparationResolution {
  if (input.signal?.aborted) {
    return observeUnavailablePreflight({
      check: input.check,
      diagnosticLogger: input.diagnosticLogger,
      details: { raw: preflightOutput },
      messages: consoleMessages,
      result: "cancelled-after-callback",
      reasonCode: "execution-cancelled"
    });
  }
  const preflightResult = parseCheckPreflightResult(preflightOutput);
  if (preflightResult === undefined) {
    return observeUnavailablePreflight({
      check: input.check,
      diagnosticLogger: input.diagnosticLogger,
      details: { raw: preflightOutput },
      messages: consoleMessages,
      result: "malformed",
      reasonCode: "invalid-preflight-result"
    });
  }
  if (preflightResult.status === "failure" && preflightResult.action === "block") {
    return resolveBlockedPreflightResult(input, preflightResult, consoleMessages);
  }
  return resolveReadyPreflightResult(input, preflightOutput, preflightResult, consoleMessages);
}

function resolveBlockedPreflightResult(
  input: PrepareCheckInput,
  preflightResult: Extract<ParsedCheckPreflightResult, { readonly action: "block" }>,
  consoleMessages: readonly CheckMessage[]
): CheckPreparationResolution {
  const resolution = unavailablePreflightResolution({
    check: input.check,
    messages: combineCheckMessages(consoleMessages, preflightResult.messages),
    reasonCode: preflightResult.reason.code
  });
  observePreparationResolution(
    input.diagnosticLogger,
    input.check.definition.checkId,
    resolution,
    "blocked",
    {
      ...(preflightResult.messages.length === 0 ? {} : { messages: preflightResult.messages }),
      reason: preflightResult.reason
    }
  );
  return resolution;
}

function resolveReadyPreflightResult(
  input: PrepareCheckInput,
  preflightOutput: unknown,
  preflightResult: Exclude<ParsedCheckPreflightResult, { readonly action: "block" }>,
  consoleMessages: readonly CheckMessage[]
): CheckPreparationResolution {
  const checkId = input.check.definition.checkId;
  const result = preflightResult.status === "success" ? "prepared" : "continued";
  const resolution = readyResolution({
    authoredCheck: input.check,
    messages: combineCheckMessages(consoleMessages, preflightResult.messages),
    preparedOptions:
      preflightResult.status === "success"
        ? preflightResult.preparedOptions
        : preflightResult.fallback
  });
  observeReadyOrMalformedResolution(input.diagnosticLogger, checkId, resolution, result, {
    messages: preflightResult.messages,
    ...(preflightResult.status === "success" ? {} : { reason: preflightResult.reason }),
    raw: preflightOutput
  });
  return resolution;
}

async function invokePreflight(
  preflight: NonNullable<NormalizedCheck["preflight"]>,
  options: object,
  signal: AbortSignal | undefined
): Promise<PreflightInvocation> {
  return invokeWithCapturedConsole(() => preflight(options, signal ?? INERT_SIGNAL));
}

function observeUnavailablePreflight(
  input: Readonly<{
    readonly check: NormalizedCheck;
    readonly diagnosticLogger: DiagnosticLogger | undefined;
    readonly details: Readonly<Record<string, unknown>>;
    readonly messages?: readonly CheckMessage[];
    readonly result: PreparationResolutionResult;
    readonly reasonCode: string;
  }>
): SettledPreparationResolution {
  const resolution = unavailablePreflightResolution({
    check: input.check,
    messages: input.messages ?? EMPTY_MESSAGES,
    reasonCode: input.reasonCode
  });
  observePreparationResolution(
    input.diagnosticLogger,
    input.check.definition.checkId,
    resolution,
    input.result,
    input.details
  );
  return resolution;
}

function observeReadyOrMalformedResolution(
  diagnosticLogger: DiagnosticLogger | undefined,
  checkId: string,
  resolution: CheckPreparationResolution,
  result: "skipped" | "prepared" | "continued",
  details: Readonly<Record<string, unknown>>
): void {
  if (resolution.kind === "settled") {
    observePreparationResolution(diagnosticLogger, checkId, resolution, "malformed", {
      raw: "raw" in details ? details.raw : summarizeDiagnosticValue(details)
    });
    return;
  }
  const messages = "messages" in details ? details.messages : EMPTY_MESSAGES;
  observePreparationResolution(diagnosticLogger, checkId, resolution, result, {
    ...(Array.isArray(messages) && messages.length > 0 ? { messages } : {}),
    options: summarizeDiagnosticValue(resolution.check.options),
    ...("reason" in details ? { reason: details.reason } : {}),
    ...("source" in details ? { source: details.source } : {})
  });
}

function observePreparationResolution(
  diagnosticLogger: DiagnosticLogger | undefined,
  checkId: string,
  resolution: CheckPreparationResolution,
  result: PreparationResolutionResult,
  details: Readonly<Record<string, unknown>>
): void {
  const phase = resolution.kind === "settled" ? resolution.phase : "preflight";
  diagnosticLogger?.observe({
    event: phase === "control" ? "control.resolved" : "preflight.resolved",
    tags: diagnosticTags(`CHECK:${checkId}`, phase.toUpperCase(), result.toUpperCase()),
    details: {
      ...details,
      ...(resolution.kind === "settled" ? { outcome: resolution.outcome } : {})
    }
  });
}

function readyResolution(
  input: Readonly<{
    readonly authoredCheck: NormalizedCheck;
    readonly messages: readonly CheckMessage[];
    readonly preparedOptions: unknown;
  }>
): CheckPreparationResolution {
  const preparedOptions = snapshotJsonObject(input.preparedOptions);
  if (preparedOptions === undefined) {
    return unavailablePreflightResolution({
      check: input.authoredCheck,
      messages: input.messages,
      reasonCode: "invalid-preflight-result"
    });
  }
  const { preflight: _preflight, ...check } = input.authoredCheck;
  return Object.freeze({
    kind: "ready",
    check: Object.freeze({
      ...check,
      options: preparedOptions,
      preflightMessages: input.messages
    })
  });
}
