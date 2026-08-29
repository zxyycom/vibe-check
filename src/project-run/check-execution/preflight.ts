import type { CheckMessage, CheckOutcome } from "../../check/check.ts";
import type { NormalizedCheck } from "../../project-definition/project-definition.ts";
import { snapshotJsonObject } from "../../check/options-snapshot.ts";
import { summarizeDiagnosticValue, type DiagnosticLogger } from "../diagnostic-logging/logger.ts";
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
  const scope = preflightScope(input.check.definition.checkId);
  input.diagnosticLogger?.observe({
    scope,
    event: "preflight.started",
    summary: "Check preflight started",
    details: { authoredOptions: summarizeDiagnosticValue(input.check.options) }
  });
  if (input.signal?.aborted) {
    const resolution = blockedResolution({
      check: input.check,
      messages: EMPTY_MESSAGES,
      reasonCode: "execution-cancelled"
    });
    input.diagnosticLogger?.observe({
      scope,
      event: "preflight.finished",
      summary: "Check preflight was cancelled before callback handoff",
      details: { outcome: resolution.outcome, result: "cancelled-before-callback" }
    });
    return resolution;
  }
  if (input.check.preflight === undefined) {
    const resolution = readyResolution({
      authoredCheck: input.check,
      messages: EMPTY_MESSAGES,
      preparedOptions: input.check.options
    });
    observePreflightResolution(input.diagnosticLogger, scope, resolution, "skipped", {
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
    input.diagnosticLogger?.observe({
      scope,
      event: "preflight.finished",
      summary: input.signal?.aborted
        ? "Check preflight was cancelled while callback ran"
        : "Check preflight callback threw",
      details: {
        error,
        outcome: resolution.outcome,
        result: input.signal?.aborted ? "cancelled-after-throw" : "threw"
      }
    });
    return resolution;
  }
  if (input.signal?.aborted) {
    const resolution = blockedResolution({
      check: input.check,
      messages: EMPTY_MESSAGES,
      reasonCode: "execution-cancelled"
    });
    input.diagnosticLogger?.observe({
      scope,
      event: "preflight.finished",
      summary: "Check preflight was cancelled after callback returned",
      details: {
        outcome: resolution.outcome,
        raw: preflightOutput,
        result: "cancelled-after-callback"
      }
    });
    return resolution;
  }
  const preflightResult = parseCheckPreflightResult(preflightOutput);
  if (preflightResult === undefined) {
    const resolution = blockedResolution({
      check: input.check,
      messages: EMPTY_MESSAGES,
      reasonCode: "invalid-preflight-result"
    });
    input.diagnosticLogger?.observe({
      scope,
      event: "preflight.finished",
      summary: "Check preflight returned an invalid result",
      details: { outcome: resolution.outcome, raw: preflightOutput, result: "malformed" }
    });
    return resolution;
  }
  if (preflightResult.status === "failure" && preflightResult.action === "block") {
    const resolution = blockedResolution({
      check: input.check,
      messages: preflightResult.messages,
      reasonCode: preflightResult.reason.code
    });
    input.diagnosticLogger?.observe({
      scope,
      event: "preflight.finished",
      summary: "Check preflight blocked execution",
      details: {
        messages: preflightResult.messages,
        outcome: resolution.outcome,
        reason: preflightResult.reason,
        result: "blocked"
      }
    });
    return resolution;
  }
  const resolution = readyResolution({
    authoredCheck: input.check,
    messages: preflightResult.messages,
    preparedOptions:
      preflightResult.status === "success"
        ? preflightResult.preparedOptions
        : preflightResult.fallback
  });
  observePreflightResolution(
    input.diagnosticLogger,
    scope,
    resolution,
    preflightResult.status === "success" ? "prepared" : "continued",
    {
      messages: preflightResult.messages,
      raw: preflightOutput,
      ...(preflightResult.status === "success"
        ? { preparedOptions: preflightResult.preparedOptions }
        : { fallback: preflightResult.fallback, reason: preflightResult.reason })
    }
  );
  return resolution;
}

function observePreflightResolution(
  diagnosticLogger: DiagnosticLogger | undefined,
  scope: string,
  resolution: CheckPreflightResolution,
  result: "skipped" | "prepared" | "continued",
  details: Readonly<Record<string, unknown>>
): void {
  if (resolution.kind === "blocked") {
    diagnosticLogger?.observe({
      scope,
      event: "preflight.finished",
      summary: "Check preflight options were not canonical",
      details: {
        outcome: resolution.outcome,
        raw: "raw" in details ? details.raw : details,
        result: "malformed"
      }
    });
    return;
  }
  let summary: string;
  switch (result) {
    case "skipped":
      summary = "Check authored options were accepted without preflight";
      break;
    case "prepared":
      summary = "Check preflight prepared options were accepted";
      break;
    case "continued":
      summary = "Check preflight fallback options were accepted";
      break;
  }
  diagnosticLogger?.observe({
    scope,
    event: "preflight.finished",
    summary,
    details: {
      messages: "messages" in details ? details.messages : [],
      options: summarizeDiagnosticValue(resolution.check.options),
      reason: "reason" in details ? details.reason : null,
      result
    }
  });
}

function preflightScope(checkId: string): string {
  return `CHECK ${checkId} / preflight`;
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
