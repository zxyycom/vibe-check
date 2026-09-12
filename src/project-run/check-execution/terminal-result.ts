import type { CheckMessage } from "../../check/check.ts";
import type { HandoffProviderIdentity } from "../../check/handoff-provider-identity.ts";
import {
  hasRequiredAndOptionalRecordKeys,
  snapshotClosedRecord
} from "../../data-boundary/closed-values.ts";
import { parseCheckMessages } from "./messages.ts";

/**
 * A terminal callback result split into the Core-owned four-state result and
 * detached presentation-only messages. The caller must still pass `result` to
 * Core; this adapter never validates outcome data or reasons.
 */
export interface ParsedCheckTerminalResult {
  readonly handoff: ParsedCheckTerminalHandoff | undefined;
  readonly messages: readonly CheckMessage[];
  readonly result: StrippedTerminalResult;
}

/** A validated reference held only until its owning Core terminal settlement accepts it. */
export interface ParsedCheckTerminalHandoff {
  readonly identity: HandoffProviderIdentity;
  readonly value: object;
}

type StrippedTerminalResult =
  | Readonly<{ readonly status: "passed" | "failed"; readonly data: unknown }>
  | Readonly<{ readonly status: "not-applicable"; readonly reason?: unknown }>
  | Readonly<{ readonly status: "unavailable"; readonly reason: unknown }>;

/**
 * Safely removes an optional terminal-message attachment from an otherwise
 * closed author result. Any malformed attachment rejects the whole value so a
 * valid prefix can never escape into lifecycle or Run result state.
 */
export function parseCheckTerminalResult(
  value: unknown,
  handoffIdentity: HandoffProviderIdentity | undefined
): ParsedCheckTerminalResult | undefined {
  const terminal = snapshotClosedRecord(value);
  if (terminal === undefined || typeof terminal.status !== "string") return undefined;

  const result = strippedTerminalResult(terminal, handoffIdentity);
  if (result === undefined) return undefined;
  const messages = parseCheckMessages(terminal.messages);
  const handoff = terminalHandoff(terminal, handoffIdentity);
  return messages === undefined || handoff === null
    ? undefined
    : Object.freeze({ handoff, messages, result });
}

/**
 * A declared provider result can contain an invocation-private reference. Diagnostics
 * retain only its parsed terminal result, and represent malformed values as null.
 */
export function diagnosticCallbackResult(
  value: unknown,
  handoffIdentity: HandoffProviderIdentity | undefined
): unknown {
  const terminal = snapshotClosedRecord(value);
  if (
    handoffIdentity === undefined &&
    (terminal === undefined || !Object.hasOwn(terminal, "handoff"))
  ) {
    return value;
  }
  return parseCheckTerminalResult(value, handoffIdentity)?.result ?? null;
}

function strippedTerminalResult(
  terminal: Readonly<Record<string, unknown>>,
  handoffIdentity: HandoffProviderIdentity | undefined
): StrippedTerminalResult | undefined {
  switch (terminal.status) {
    case "passed":
      return strippedPassedTerminalResult(terminal, handoffIdentity);
    case "failed":
      return strippedFailedTerminalResult(terminal);
    case "not-applicable":
      return strippedNotApplicableTerminalResult(terminal);
    case "unavailable":
      return strippedUnavailableTerminalResult(terminal);
    default:
      return undefined;
  }
}

/** A declared provider can only publish its reference alongside a passed data result. */
function strippedPassedTerminalResult(
  terminal: Readonly<Record<string, unknown>>,
  handoffIdentity: HandoffProviderIdentity | undefined
): StrippedTerminalResult | undefined {
  const required =
    handoffIdentity === undefined ? ["status", "data"] : ["status", "data", "handoff"];
  return hasRequiredAndOptionalRecordKeys(terminal, { required, optional: ["messages"] })
    ? Object.freeze({ status: "passed", data: terminal.data })
    : undefined;
}

/** Failed results retain canonical data but never carry an invocation-private handoff. */
function strippedFailedTerminalResult(
  terminal: Readonly<Record<string, unknown>>
): StrippedTerminalResult | undefined {
  return hasRequiredAndOptionalRecordKeys(terminal, {
    required: ["status", "data"],
    optional: ["messages"]
  })
    ? Object.freeze({ status: "failed", data: terminal.data })
    : undefined;
}

function strippedNotApplicableTerminalResult(
  terminal: Readonly<Record<string, unknown>>
): StrippedTerminalResult | undefined {
  if (
    !hasRequiredAndOptionalRecordKeys(terminal, {
      required: ["status"],
      optional: ["reason", "messages"]
    })
  ) {
    return undefined;
  }
  return Object.freeze(
    Object.hasOwn(terminal, "reason")
      ? { status: "not-applicable", reason: terminal.reason }
      : { status: "not-applicable" }
  );
}

function strippedUnavailableTerminalResult(
  terminal: Readonly<Record<string, unknown>>
): StrippedTerminalResult | undefined {
  return hasRequiredAndOptionalRecordKeys(terminal, {
    required: ["status", "reason"],
    optional: ["messages"]
  })
    ? Object.freeze({ status: "unavailable", reason: terminal.reason })
    : undefined;
}

function terminalHandoff(
  terminal: Readonly<Record<string, unknown>>,
  handoffIdentity: HandoffProviderIdentity | undefined
): ParsedCheckTerminalHandoff | null | undefined {
  if (handoffIdentity === undefined) return undefined;
  if (terminal.status !== "passed") return undefined;
  if (!isHandoffReference(terminal.handoff)) return null;
  return Object.freeze({ identity: handoffIdentity, value: terminal.handoff });
}

function isHandoffReference(value: unknown): value is object {
  return value !== null && (typeof value === "object" || typeof value === "function");
}
