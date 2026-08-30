import type { CheckMessage, CheckOutcome } from "../../check/check.ts";
import type { NormalizedCheck } from "../../project-definition/project-definition.ts";
import { snapshotJsonObject } from "../../check/options-snapshot.ts";
import {
  diagnosticTags,
  summarizeDiagnosticValue,
  type DiagnosticLogger
} from "../diagnostic-logging/logger.ts";
import {
  hasRequiredAndOptionalRecordKeys,
  snapshotClosedRecord
} from "../../data-boundary/closed-values.ts";
import { parseCheckMessages } from "./messages.ts";

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

/** Completes the sequential invocation-wide barrier before any Check enters the Task graph. */
export async function prepareChecks(
  input: Readonly<{
    readonly checks: readonly NormalizedCheck[];
    readonly diagnosticLogger?: DiagnosticLogger;
    readonly signal: AbortSignal | undefined;
  }>
): Promise<readonly CheckPreflightResolution[]> {
  const resolutions: CheckPreflightResolution[] = [];
  for (const check of input.checks) {
    resolutions.push(
      await prepareCheck({
        check,
        diagnosticLogger: input.diagnosticLogger,
        signal: input.signal
      })
    );
  }
  return Object.freeze(resolutions);
}

async function prepareCheck(
  input: Readonly<{
    readonly check: NormalizedCheck;
    readonly diagnosticLogger: DiagnosticLogger | undefined;
    readonly signal: AbortSignal | undefined;
  }>
): Promise<CheckPreflightResolution> {
  const checkId = input.check.definition.checkId;
  if (input.signal?.aborted) {
    const resolution = blockedResolution({
      check: input.check,
      messages: EMPTY_MESSAGES,
      reasonCode: "execution-cancelled"
    });
    observePreflightResolution(
      input.diagnosticLogger,
      checkId,
      resolution,
      "cancelled-before-callback",
      {}
    );
    return resolution;
  }
  if (input.check.preflight === undefined) {
    const resolution = readyResolution({
      authoredCheck: input.check,
      messages: EMPTY_MESSAGES,
      preparedOptions: input.check.options
    });
    observeReadyOrMalformedResolution(input.diagnosticLogger, checkId, resolution, "skipped", {
      source: "authored"
    });
    return resolution;
  }
  let preflightOutput: unknown;
  try {
    preflightOutput = await input.check.preflight(
      input.check.options,
      input.signal ?? INERT_SIGNAL
    );
  } catch (error) {
    const resolution = blockedResolution({
      check: input.check,
      messages: EMPTY_MESSAGES,
      reasonCode: input.signal?.aborted ? "execution-cancelled" : "preflight-threw"
    });
    observePreflightResolution(
      input.diagnosticLogger,
      checkId,
      resolution,
      input.signal?.aborted ? "cancelled-after-throw" : "threw",
      { error }
    );
    return resolution;
  }
  if (input.signal?.aborted) {
    const resolution = blockedResolution({
      check: input.check,
      messages: EMPTY_MESSAGES,
      reasonCode: "execution-cancelled"
    });
    observePreflightResolution(
      input.diagnosticLogger,
      checkId,
      resolution,
      "cancelled-after-callback",
      {
        raw: preflightOutput
      }
    );
    return resolution;
  }
  const preflightResult = parseCheckPreflightResult(preflightOutput);
  if (preflightResult === undefined) {
    const resolution = blockedResolution({
      check: input.check,
      messages: EMPTY_MESSAGES,
      reasonCode: "invalid-preflight-result"
    });
    observePreflightResolution(input.diagnosticLogger, checkId, resolution, "malformed", {
      raw: preflightOutput
    });
    return resolution;
  }
  if (preflightResult.status === "failure" && preflightResult.action === "block") {
    const resolution = blockedResolution({
      check: input.check,
      messages: preflightResult.messages,
      reasonCode: preflightResult.reason.code
    });
    observePreflightResolution(input.diagnosticLogger, checkId, resolution, "blocked", {
      ...(preflightResult.messages.length === 0 ? {} : { messages: preflightResult.messages }),
      reason: preflightResult.reason
    });
    return resolution;
  }
  const result = preflightResult.status === "success" ? "prepared" : "continued";
  const resolution = readyResolution({
    authoredCheck: input.check,
    messages: preflightResult.messages,
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
      messages: EMPTY_MESSAGES,
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

type ParsedCheckPreflightResult =
  | Readonly<{
      readonly status: "success";
      readonly preparedOptions: unknown;
      readonly messages: readonly CheckMessage[];
    }>
  | Readonly<{
      readonly status: "failure";
      readonly action: "block";
      readonly reason: { readonly code: string };
      readonly messages: readonly CheckMessage[];
    }>
  | Readonly<{
      readonly status: "failure";
      readonly action: "continue";
      readonly fallback: unknown;
      readonly reason: { readonly code: string };
      readonly messages: readonly CheckMessage[];
    }>;

function parseCheckPreflightResult(value: unknown): ParsedCheckPreflightResult | undefined {
  const preflightResult = snapshotClosedRecord(value);
  if (preflightResult === undefined || typeof preflightResult.status !== "string") {
    return undefined;
  }
  const messages = parseCheckMessages(preflightResult.messages);
  if (messages === undefined) return undefined;
  if (preflightResult.status === "success") {
    return hasRequiredAndOptionalRecordKeys(preflightResult, {
      optional: ["messages"],
      required: ["status", "preparedOptions"]
    })
      ? Object.freeze({
          status: "success",
          preparedOptions: preflightResult.preparedOptions,
          messages
        })
      : undefined;
  }
  if (preflightResult.status !== "failure" || typeof preflightResult.action !== "string") {
    return undefined;
  }
  const reason = parsePreflightReason(preflightResult.reason);
  if (reason === undefined) return undefined;
  if (preflightResult.action === "block") {
    return hasRequiredAndOptionalRecordKeys(preflightResult, {
      optional: ["messages"],
      required: ["status", "action", "reason"]
    })
      ? Object.freeze({ status: "failure", action: "block", reason, messages })
      : undefined;
  }
  if (
    preflightResult.action !== "continue" ||
    !hasRequiredAndOptionalRecordKeys(preflightResult, {
      optional: ["messages"],
      required: ["status", "action", "fallback", "reason"]
    })
  ) {
    return undefined;
  }
  return Object.freeze({
    status: "failure",
    action: "continue" as const,
    fallback: preflightResult.fallback,
    reason,
    messages
  });
}

function parsePreflightReason(value: unknown): Readonly<{ readonly code: string }> | undefined {
  const reason = snapshotClosedRecord(value);
  if (
    reason === undefined ||
    Object.keys(reason).length !== 1 ||
    typeof reason.code !== "string" ||
    reason.code.length === 0
  ) {
    return undefined;
  }
  return Object.freeze({ code: reason.code });
}
