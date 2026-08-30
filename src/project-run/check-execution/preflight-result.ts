import {
  hasRequiredAndOptionalRecordKeys,
  snapshotClosedRecord
} from "../../data-boundary/closed-values.ts";
import type { CheckMessage } from "../../check/check.ts";
import { parseCheckMessages } from "./messages.ts";

export type ParsedCheckPreflightResult =
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

/** Parses the closed result vocabulary returned by one trusted Check preflight. */
export function parseCheckPreflightResult(value: unknown): ParsedCheckPreflightResult | undefined {
  const preflightResult = snapshotClosedRecord(value);
  if (preflightResult === undefined) {
    return undefined;
  }
  const messages = parseCheckMessages(preflightResult.messages);
  if (messages === undefined) return undefined;
  switch (preflightResult.status) {
    case "success":
      return parseSuccessfulPreflight(preflightResult, messages);
    case "failure":
      return parseFailedPreflight(preflightResult, messages);
    default:
      return undefined;
  }
}

function parseSuccessfulPreflight(
  preflightResult: Readonly<Record<string, unknown>>,
  messages: readonly CheckMessage[]
): ParsedCheckPreflightResult | undefined {
  if (
    !hasRequiredAndOptionalRecordKeys(preflightResult, {
      optional: ["messages"],
      required: ["status", "preparedOptions"]
    })
  ) {
    return undefined;
  }
  return Object.freeze({
    status: "success",
    preparedOptions: preflightResult.preparedOptions,
    messages
  });
}

function parseFailedPreflight(
  preflightResult: Readonly<Record<string, unknown>>,
  messages: readonly CheckMessage[]
): ParsedCheckPreflightResult | undefined {
  if (typeof preflightResult.action !== "string") return undefined;
  const reason = parsePreflightReason(preflightResult.reason);
  if (reason === undefined) return undefined;
  switch (preflightResult.action) {
    case "block":
      return parseBlockedPreflight(preflightResult, reason, messages);
    case "continue":
      return parseContinuedPreflight(preflightResult, reason, messages);
    default:
      return undefined;
  }
}

function parseBlockedPreflight(
  preflightResult: Readonly<Record<string, unknown>>,
  reason: Readonly<{ readonly code: string }>,
  messages: readonly CheckMessage[]
): ParsedCheckPreflightResult | undefined {
  if (
    !hasRequiredAndOptionalRecordKeys(preflightResult, {
      optional: ["messages"],
      required: ["status", "action", "reason"]
    })
  ) {
    return undefined;
  }
  return Object.freeze({ status: "failure", action: "block", reason, messages });
}

function parseContinuedPreflight(
  preflightResult: Readonly<Record<string, unknown>>,
  reason: Readonly<{ readonly code: string }>,
  messages: readonly CheckMessage[]
): ParsedCheckPreflightResult | undefined {
  if (
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
