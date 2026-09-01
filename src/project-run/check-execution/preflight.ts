import type { CheckMessage, CheckOutcome } from "../../check/check.ts";
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

const EMPTY_MESSAGES: readonly CheckMessage[] = Object.freeze([]);
const INERT_SIGNAL = new AbortController().signal;

export type PreparedCheck = Omit<NormalizedCheck, "options" | "preflight"> &
  Readonly<{ readonly options: object; readonly preflightMessages: readonly CheckMessage[] }>;

type BlockedCheck = Pick<NormalizedCheck, "definition" | "visibility"> &
  Readonly<{ readonly preflightMessages: readonly CheckMessage[] }>;

export type ReadyCheckPreflightResolution = Readonly<{
  readonly kind: "ready";
  readonly check: PreparedCheck;
}>;

export type BlockedCheckPreflightResolution = Readonly<{
  readonly kind: "blocked";
  readonly check: BlockedCheck;
  readonly outcome: CheckOutcome;
}>;

export type CheckPreflightResolution =
  | ReadyCheckPreflightResolution
  | BlockedCheckPreflightResolution;

type PreflightResolutionResult =
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
  readonly signal: AbortSignal | undefined;
}>;

type PreflightInvocation = Awaited<ReturnType<typeof invokeWithCapturedConsole<unknown>>>;

/** Resolves one Check's task-local preparation after Scheduler admission. */
export async function prepareCheck(input: PrepareCheckInput): Promise<CheckPreflightResolution> {
  if (input.signal?.aborted) {
    return observeBlockedPreflight({
      check: input.check,
      diagnosticLogger: input.diagnosticLogger,
      details: {},
      result: "cancelled-before-callback",
      reasonCode: "execution-cancelled"
    });
  }
  if (input.check.preflight === undefined) {
    return resolveAuthoredOptions(input);
  }
  return resolvePreflightInvocation(input, await invokePreflight(input.check, input.signal));
}

function resolveAuthoredOptions(input: PrepareCheckInput): CheckPreflightResolution {
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
): CheckPreflightResolution {
  if (invocation.kind === "threw") {
    return observeBlockedPreflight({
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
): CheckPreflightResolution {
  if (input.signal?.aborted) {
    return observeBlockedPreflight({
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
    return observeBlockedPreflight({
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
): CheckPreflightResolution {
  const resolution = blockedResolution({
    check: input.check,
    messages: combineCheckMessages(consoleMessages, preflightResult.messages),
    reasonCode: preflightResult.reason.code
  });
  observePreflightResolution(
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
): CheckPreflightResolution {
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
  check: NormalizedCheck,
  signal: AbortSignal | undefined
): Promise<PreflightInvocation> {
  return invokeWithCapturedConsole(() => check.preflight!(check.options, signal ?? INERT_SIGNAL));
}

function observeBlockedPreflight(
  input: Readonly<{
    readonly check: NormalizedCheck;
    readonly diagnosticLogger: DiagnosticLogger | undefined;
    readonly details: Readonly<Record<string, unknown>>;
    readonly messages?: readonly CheckMessage[];
    readonly result: PreflightResolutionResult;
    readonly reasonCode: string;
  }>
): BlockedCheckPreflightResolution {
  const resolution = blockedResolution({
    check: input.check,
    messages: input.messages ?? EMPTY_MESSAGES,
    reasonCode: input.reasonCode
  });
  observePreflightResolution(
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
  resolution: CheckPreflightResolution,
  result: "skipped" | "prepared" | "continued",
  details: Readonly<Record<string, unknown>>
): void {
  if (resolution.kind === "blocked") {
    observePreflightResolution(diagnosticLogger, checkId, resolution, "malformed", {
      raw: "raw" in details ? details.raw : summarizeDiagnosticValue(details)
    });
    return;
  }
  const messages = "messages" in details ? details.messages : EMPTY_MESSAGES;
  observePreflightResolution(diagnosticLogger, checkId, resolution, result, {
    ...(Array.isArray(messages) && messages.length > 0 ? { messages } : {}),
    options: summarizeDiagnosticValue(resolution.check.options),
    ...("reason" in details ? { reason: details.reason } : {}),
    ...("source" in details ? { source: details.source } : {})
  });
}

function observePreflightResolution(
  diagnosticLogger: DiagnosticLogger | undefined,
  checkId: string,
  resolution: CheckPreflightResolution,
  result: PreflightResolutionResult,
  details: Readonly<Record<string, unknown>>
): void {
  diagnosticLogger?.observe({
    event: "preflight.resolved",
    tags: diagnosticTags(`CHECK:${checkId}`, "PREFLIGHT", result.toUpperCase()),
    details: {
      ...details,
      ...(resolution.kind === "blocked" ? { outcome: resolution.outcome } : {})
    }
  });
}

function readyResolution(
  input: Readonly<{
    readonly authoredCheck: NormalizedCheck;
    readonly messages: readonly CheckMessage[];
    readonly preparedOptions: unknown;
  }>
): CheckPreflightResolution {
  const preparedOptions = snapshotJsonObject(input.preparedOptions);
  if (preparedOptions === undefined) {
    return blockedResolution({
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

function blockedResolution(
  input: Readonly<{
    readonly check: NormalizedCheck;
    readonly messages: readonly CheckMessage[];
    readonly reasonCode: string;
  }>
): BlockedCheckPreflightResolution {
  return Object.freeze({
    kind: "blocked",
    check: Object.freeze({
      definition: input.check.definition,
      preflightMessages: input.messages,
      visibility: input.check.visibility
    }),
    outcome: Object.freeze({
      status: "unavailable",
      reason: Object.freeze({ code: input.reasonCode })
    })
  });
}
