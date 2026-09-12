import type { CheckMessage, CheckOutcome, CheckVisibility } from "../../check/check.ts";
import type { HandoffProviderIdentity } from "../../check/handoff-provider-identity.ts";
import type { CoreCheckSession } from "../../check-settlement/session.ts";
import {
  diagnosticTags,
  summarizeDiagnosticValue,
  type DiagnosticLogger
} from "../diagnostic-logging/logger.ts";
import {
  diagnosticCallbackResult,
  parseCheckTerminalResult,
  type ParsedCheckTerminalHandoff
} from "./terminal-result.ts";
import { combineCheckMessages } from "./messages.ts";
import type { CheckExecutionLifecycle } from "./lifecycle.ts";
import type { executeCheckCallback } from "./callback.ts";

export type CheckIdentity = Readonly<{
  readonly checkId: string;
  readonly displayName: string;
  readonly visibility: CheckVisibility;
}>;

export interface SettledCheckFacts {
  readonly durationMs: number | null;
  readonly messages: readonly CheckMessage[];
}

export type CheckExecutionSettlementState = Readonly<{
  readonly diagnosticLogger: DiagnosticLogger | undefined;
  readonly handoffsByCheckId: Map<string, ParsedCheckTerminalHandoff>;
  readonly lifecycle: CheckExecutionLifecycle | undefined;
  readonly session: CoreCheckSession;
  readonly settledFactsByCheckId: Map<string, SettledCheckFacts>;
}>;

/** Mutable execution session state shared by execution and terminal finalization. */
export type CheckExecutionState = CheckExecutionSettlementState;

export class CheckExecutionInvariantFailure extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CheckExecutionInvariantFailure";
  }
}

type SettleCallbackInput = Readonly<{
  readonly callback: Awaited<ReturnType<typeof executeCheckCallback>>;
  readonly checkId: string;
  readonly diagnosticLogger: DiagnosticLogger | undefined;
  readonly handoff: HandoffProviderIdentity | undefined;
  readonly preflightMessages: readonly CheckMessage[];
  readonly scope: ReturnType<CoreCheckSession["openCheckScope"]>;
  readonly state: CheckExecutionSettlementState;
}>;

type SettledCallback = Readonly<{
  readonly messages: readonly CheckMessage[];
  readonly outcome: CheckOutcome;
}>;
type ProductCallback = Extract<SettleCallbackInput["callback"], { readonly source: "product" }>;
type AuthorCallback = Extract<SettleCallbackInput["callback"], { readonly source: "author" }>;

export function settleCallback(input: SettleCallbackInput): SettledCallback {
  return input.callback.source === "product"
    ? settleProductCallback(input, input.callback)
    : settleAuthorCallback(input, input.callback);
}

/** Product-controlled callback failures settle without author-result parsing or handoff publication. */
function settleProductCallback(
  input: SettleCallbackInput,
  callback: ProductCallback
): SettledCallback {
  const outcome = input.scope.settleProduct(callback.result);
  return Object.freeze({
    messages: combineCheckMessages(input.preflightMessages, callback.consoleMessages),
    outcome
  });
}

/** Parses an author result, settles it in Core, then commits its reference only after acceptance. */
function settleAuthorCallback(
  input: SettleCallbackInput,
  callback: AuthorCallback
): SettledCallback {
  const executionTags = diagnosticTags(`CHECK:${input.checkId}`, "EXECUTION");
  const terminal = parseCheckTerminalResult(callback.result, input.handoff);
  if (terminal === undefined) {
    input.diagnosticLogger?.observe({
      event: "callback.malformed",
      tags: diagnosticTags(...executionTags, "MALFORMED"),
      details: { result: diagnosticCallbackResult(callback.result, input.handoff) }
    });
  }
  const settlement = input.scope.settle(
    callbackSettlementCandidate(terminal, input.handoff, callback.result)
  );
  if (terminal !== undefined && !settlement.authorResultAccepted) {
    input.diagnosticLogger?.observe({
      event: "check.contained",
      tags: diagnosticTags(...executionTags, "CONTAINED"),
      details: { outcome: diagnosticOutcome(settlement.outcome), raw: terminal.result }
    });
  }
  if (terminal?.handoff !== undefined && settlement.authorResultAccepted) {
    commitAcceptedHandoff(input.checkId, terminal.handoff, input.state);
  }
  return Object.freeze({
    messages:
      terminal !== undefined && settlement.authorResultAccepted
        ? combineCheckMessages(input.preflightMessages, callback.consoleMessages, terminal.messages)
        : combineCheckMessages(input.preflightMessages, callback.consoleMessages),
    outcome: settlement.outcome
  });
}

/** A declared callback never sends its raw result to Core when terminal parsing rejects the handoff. */
function callbackSettlementCandidate(
  terminal: ReturnType<typeof parseCheckTerminalResult>,
  handoff: HandoffProviderIdentity | undefined,
  rawResult: unknown
): unknown {
  if (terminal !== undefined) return terminal.result;
  return handoff === undefined ? rawResult : undefined;
}

function commitAcceptedHandoff(
  checkId: string,
  handoff: ParsedCheckTerminalHandoff,
  state: CheckExecutionSettlementState
): void {
  if (state.handoffsByCheckId.has(checkId)) {
    throw new CheckExecutionInvariantFailure("Check handoff published more than once");
  }
  state.handoffsByCheckId.set(checkId, handoff);
}

/** Records one terminal Check lifecycle fact after its owning Core scope has closed. */
export function recordSettledCheck(
  input: Readonly<{
    readonly check: CheckIdentity;
    readonly durationMs: number | null;
    readonly messages: readonly CheckMessage[];
    readonly outcome: CheckOutcome;
    readonly phase: "control" | "dependency" | "execution" | "preflight";
    readonly state: CheckExecutionSettlementState;
  }>
): void {
  if (input.state.settledFactsByCheckId.has(input.check.checkId)) {
    throw new CheckExecutionInvariantFailure("Check lifecycle settled more than once");
  }
  input.state.settledFactsByCheckId.set(
    input.check.checkId,
    Object.freeze({ durationMs: input.durationMs, messages: input.messages })
  );
  input.state.diagnosticLogger?.observe({
    event: "check.finished",
    tags: diagnosticTags(
      `CHECK:${input.check.checkId}`,
      input.phase.toUpperCase(),
      "FINISHED",
      input.outcome.status.toUpperCase()
    ),
    details: {
      durationMs: input.durationMs,
      messageCount: input.messages.length,
      phase: input.phase,
      ...diagnosticSettledOutcome(input.outcome)
    }
  });
  input.state.lifecycle?.settled(
    Object.freeze({
      checkId: input.check.checkId,
      displayName: input.check.displayName,
      outcome: input.outcome,
      durationMs: input.durationMs,
      messages: input.messages,
      records: input.state.session.readSettledCheckRecords(input.check.checkId),
      visibility: input.check.visibility
    })
  );
}

function diagnosticSettledOutcome(outcome: CheckOutcome): Readonly<Record<string, unknown>> {
  switch (outcome.status) {
    case "passed":
    case "failed":
      return Object.freeze({ status: outcome.status });
    case "not-applicable":
      return Object.freeze({ reasonCode: outcome.reason?.code ?? null, status: outcome.status });
    case "unavailable":
      return Object.freeze({ reasonCode: outcome.reason.code, status: outcome.status });
  }
}

function diagnosticOutcome(outcome: CheckOutcome): Readonly<Record<string, unknown>> {
  switch (outcome.status) {
    case "passed":
    case "failed":
      return Object.freeze({
        data: summarizeDiagnosticValue(outcome.data),
        status: outcome.status
      });
    case "not-applicable":
      return Object.freeze({ reason: outcome.reason ?? null, status: outcome.status });
    case "unavailable":
      return Object.freeze({ reason: outcome.reason, status: outcome.status });
  }
}
