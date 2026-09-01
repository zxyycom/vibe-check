import type { CheckMessage, CheckOutcome, CheckVisibility } from "../../check/check.ts";
import type { CoreCheckSession } from "../../check-settlement/session.ts";
import {
  diagnosticTags,
  summarizeDiagnosticValue,
  type DiagnosticLogger
} from "../diagnostic-logging/logger.ts";
import { parseCheckTerminalResult } from "./terminal-result.ts";
import { combineCheckMessages } from "./messages.ts";
import type { CheckExecutionLifecycle } from "./resolved-checks.ts";
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
  readonly lifecycle: CheckExecutionLifecycle | undefined;
  readonly settledFactsByCheckId: Map<string, SettledCheckFacts>;
}>;

export class CheckExecutionInvariantFailure extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CheckExecutionInvariantFailure";
  }
}

export function settleCallback(
  input: Readonly<{
    readonly callback: Awaited<ReturnType<typeof executeCheckCallback>>;
    readonly checkId: string;
    readonly diagnosticLogger: DiagnosticLogger | undefined;
    readonly preflightMessages: readonly CheckMessage[];
    readonly scope: ReturnType<CoreCheckSession["openCheckScope"]>;
  }>
): Readonly<{ readonly messages: readonly CheckMessage[]; readonly outcome: CheckOutcome }> {
  const executionTags = diagnosticTags(`CHECK:${input.checkId}`, "EXECUTION");
  const { callback } = input;
  if (callback.source === "product") {
    const outcome = input.scope.settleProduct(callback.result);
    return Object.freeze({
      messages: combineCheckMessages(input.preflightMessages, callback.consoleMessages),
      outcome
    });
  }
  const terminal = parseCheckTerminalResult(callback.result);
  if (terminal === undefined) {
    input.diagnosticLogger?.observe({
      event: "callback.malformed",
      tags: diagnosticTags(...executionTags, "MALFORMED"),
      details: { result: callback.result }
    });
  }
  const settlement = input.scope.settle(terminal?.result ?? callback.result);
  if (terminal !== undefined && !settlement.authorResultAccepted) {
    input.diagnosticLogger?.observe({
      event: "check.contained",
      tags: diagnosticTags(...executionTags, "CONTAINED"),
      details: { outcome: diagnosticOutcome(settlement.outcome), raw: callback.result }
    });
  }
  return Object.freeze({
    messages:
      terminal !== undefined && settlement.authorResultAccepted
        ? combineCheckMessages(input.preflightMessages, callback.consoleMessages, terminal.messages)
        : combineCheckMessages(input.preflightMessages, callback.consoleMessages),
    outcome: settlement.outcome
  });
}

/** Records one terminal Check lifecycle fact after its owning Core scope has closed. */
export function recordSettledCheck(
  input: Readonly<{
    readonly check: CheckIdentity;
    readonly durationMs: number | null;
    readonly messages: readonly CheckMessage[];
    readonly outcome: CheckOutcome;
    readonly phase: "dependency" | "execution" | "preflight";
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
      ...(input.messages.length === 0 ? {} : { messages: input.messages }),
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
      visibility: input.check.visibility
    })
  );
}

function diagnosticSettledOutcome(outcome: CheckOutcome): Readonly<Record<string, unknown>> {
  switch (outcome.status) {
    case "passed":
    case "failed":
      return Object.freeze({ data: summarizeDiagnosticValue(outcome.data) });
    case "not-applicable":
      return outcome.reason === undefined
        ? Object.freeze({})
        : Object.freeze({ reason: outcome.reason });
    case "unavailable":
      return Object.freeze({ reason: outcome.reason });
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
