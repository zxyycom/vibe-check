import type { CheckMessage, CheckOutcome, CheckProjectContext } from "../../check/check.ts";
import type { NormalizedCheck } from "../../project-definition/project-definition.ts";
import { snapshotJsonObject } from "../../check/options-snapshot.ts";
import {
  diagnosticTags,
  summarizeDiagnosticValue,
  type DiagnosticLogger
} from "../diagnostic-logging/logger.ts";
import {
  parseCheckPreparationResult,
  type ParsedCheckPreparationResult
} from "./preparation-result.ts";
import { invokeWithCapturedConsole } from "./console-capture.ts";
import { combineCheckMessages } from "./messages.ts";

const EMPTY_MESSAGES: readonly CheckMessage[] = Object.freeze([]);
const INERT_SIGNAL = new AbortController().signal;

export type PreparedCheck = Omit<NormalizedCheck, "options" | "prepare"> &
  Readonly<{ readonly options: object; readonly preparationMessages: readonly CheckMessage[] }>;

type BlockedCheck = Pick<NormalizedCheck, "definition" | "omitQuietPassedRow"> &
  Readonly<{ readonly preparationMessages: readonly CheckMessage[] }>;

export type ReadyCheckPreparationResolution = Readonly<{
  readonly kind: "ready";
  readonly check: PreparedCheck;
}>;

export type BlockedCheckPreparationResolution = Readonly<{
  readonly kind: "blocked";
  readonly check: BlockedCheck;
  readonly outcome: CheckOutcome;
}>;

export type CheckPreparationResolution =
  | ReadyCheckPreparationResolution
  | BlockedCheckPreparationResolution;

type PreparationResolutionResult =
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
  readonly project: CheckProjectContext;
  readonly signal: AbortSignal | undefined;
}>;

type PreparationInvocation = Awaited<ReturnType<typeof invokeWithCapturedConsole<unknown>>>;

/** Resolves one Check's task-local preparation after Scheduler admission. */
export async function prepareCheck(input: PrepareCheckInput): Promise<CheckPreparationResolution> {
  if (input.signal?.aborted === true) {
    return observeBlockedPreparation({
      check: input.check,
      diagnosticLogger: input.diagnosticLogger,
      details: {},
      result: "cancelled-before-callback",
      reasonCode: "execution-cancelled"
    });
  }
  if (input.check.prepare === undefined) {
    return resolveAuthoredOptions(input);
  }
  return resolvePreparationInvocation(input, await invokePreparation(input));
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

function resolvePreparationInvocation(
  input: PrepareCheckInput,
  invocation: PreparationInvocation
): CheckPreparationResolution {
  if (invocation.kind === "threw") {
    return observeBlockedPreparation({
      check: input.check,
      diagnosticLogger: input.diagnosticLogger,
      details: { error: invocation.error },
      messages: invocation.messages,
      result: input.signal?.aborted === true ? "cancelled-after-throw" : "threw",
      reasonCode: input.signal?.aborted === true ? "execution-cancelled" : "preparation-threw"
    });
  }
  return resolveReturnedPreparation(input, invocation.output, invocation.messages);
}

function resolveReturnedPreparation(
  input: PrepareCheckInput,
  preparationOutput: unknown,
  consoleMessages: readonly CheckMessage[]
): CheckPreparationResolution {
  if (input.signal?.aborted === true) {
    return observeBlockedPreparation({
      check: input.check,
      diagnosticLogger: input.diagnosticLogger,
      details: { raw: preparationOutput },
      messages: consoleMessages,
      result: "cancelled-after-callback",
      reasonCode: "execution-cancelled"
    });
  }
  const preparationResult = parseCheckPreparationResult(preparationOutput);
  if (preparationResult === undefined) {
    return observeBlockedPreparation({
      check: input.check,
      diagnosticLogger: input.diagnosticLogger,
      details: { raw: preparationOutput },
      messages: consoleMessages,
      result: "malformed",
      reasonCode: "invalid-preparation-result"
    });
  }
  if (preparationResult.status === "failure" && preparationResult.action === "block") {
    return resolveBlockedPreparationResult(input, preparationResult, consoleMessages);
  }
  return resolveReadyPreparationResult(
    input,
    preparationOutput,
    preparationResult,
    consoleMessages
  );
}

function resolveBlockedPreparationResult(
  input: PrepareCheckInput,
  preparationResult: Extract<ParsedCheckPreparationResult, { readonly action: "block" }>,
  consoleMessages: readonly CheckMessage[]
): CheckPreparationResolution {
  const resolution = blockedResolution({
    check: input.check,
    messages: combineCheckMessages(consoleMessages, preparationResult.messages),
    reasonCode: preparationResult.reason.code
  });
  observePreparationResolution(
    input.diagnosticLogger,
    input.check.definition.checkId,
    resolution,
    "blocked",
    {
      ...(preparationResult.messages.length === 0 ? {} : { messages: preparationResult.messages }),
      reason: preparationResult.reason
    }
  );
  return resolution;
}

function resolveReadyPreparationResult(
  input: PrepareCheckInput,
  preparationOutput: unknown,
  preparationResult: Exclude<ParsedCheckPreparationResult, { readonly action: "block" }>,
  consoleMessages: readonly CheckMessage[]
): CheckPreparationResolution {
  const checkId = input.check.definition.checkId;
  const result = preparationResult.status === "success" ? "prepared" : "continued";
  const resolution = readyResolution({
    authoredCheck: input.check,
    messages: combineCheckMessages(consoleMessages, preparationResult.messages),
    preparedOptions:
      preparationResult.status === "success"
        ? preparationResult.preparedOptions
        : preparationResult.fallback
  });
  observeReadyOrMalformedResolution(input.diagnosticLogger, checkId, resolution, result, {
    messages: preparationResult.messages,
    ...(preparationResult.status === "success" ? {} : { reason: preparationResult.reason }),
    raw: preparationOutput
  });
  return resolution;
}

async function invokePreparation(input: PrepareCheckInput): Promise<PreparationInvocation> {
  return invokeWithCapturedConsole(() =>
    input.check.prepare!(input.check.options, input.signal ?? INERT_SIGNAL, input.project)
  );
}

function observeBlockedPreparation(
  input: Readonly<{
    readonly check: NormalizedCheck;
    readonly diagnosticLogger: DiagnosticLogger | undefined;
    readonly details: Readonly<Record<string, unknown>>;
    readonly messages?: readonly CheckMessage[];
    readonly result: PreparationResolutionResult;
    readonly reasonCode: string;
  }>
): BlockedCheckPreparationResolution {
  const resolution = blockedResolution({
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
  if (resolution.kind === "blocked") {
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
  diagnosticLogger?.observe({
    event: "preparation.resolved",
    tags: diagnosticTags(`CHECK:${checkId}`, "PREPARATION", result.toUpperCase()),
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
): CheckPreparationResolution {
  const preparedOptions = snapshotJsonObject(input.preparedOptions);
  if (preparedOptions === undefined) {
    return blockedResolution({
      check: input.authoredCheck,
      messages: input.messages,
      reasonCode: "invalid-preparation-result"
    });
  }
  const { prepare: _preparation, ...check } = input.authoredCheck;
  return Object.freeze({
    kind: "ready",
    check: Object.freeze({
      ...check,
      options: preparedOptions,
      preparationMessages: input.messages
    })
  });
}

function blockedResolution(
  input: Readonly<{
    readonly check: NormalizedCheck;
    readonly messages: readonly CheckMessage[];
    readonly reasonCode: string;
  }>
): BlockedCheckPreparationResolution {
  return Object.freeze({
    kind: "blocked",
    check: Object.freeze({
      definition: input.check.definition,
      preparationMessages: input.messages,
      omitQuietPassedRow: input.check.omitQuietPassedRow
    }),
    outcome: Object.freeze({
      status: "unavailable",
      reason: Object.freeze({ code: input.reasonCode })
    })
  });
}
