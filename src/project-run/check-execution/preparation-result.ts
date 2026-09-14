import {
  hasRequiredAndOptionalRecordKeys,
  snapshotClosedRecord
} from "../../data-boundary/closed-values.ts";
import type { CheckMessage } from "../../check/check.ts";
import { parseCheckMessages } from "./messages.ts";

export type ParsedCheckPreparationResult =
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

/** Parses the closed result vocabulary returned by one trusted Check preparation. */
export function parseCheckPreparationResult(
  value: unknown
): ParsedCheckPreparationResult | undefined {
  const preparationResult = snapshotClosedRecord(value);
  if (preparationResult === undefined) {
    return undefined;
  }
  const messages = parseCheckMessages(preparationResult.messages);
  if (messages === undefined) return undefined;
  switch (preparationResult.status) {
    case "success":
      return parseSuccessfulPreparation(preparationResult, messages);
    case "failure":
      return parseFailedPreparation(preparationResult, messages);
    default:
      return undefined;
  }
}

function parseSuccessfulPreparation(
  preparationResult: Readonly<Record<string, unknown>>,
  messages: readonly CheckMessage[]
): ParsedCheckPreparationResult | undefined {
  if (
    !hasRequiredAndOptionalRecordKeys(preparationResult, {
      optional: ["messages"],
      required: ["status", "preparedOptions"]
    })
  ) {
    return undefined;
  }
  return Object.freeze({
    status: "success",
    preparedOptions: preparationResult.preparedOptions,
    messages
  });
}

function parseFailedPreparation(
  preparationResult: Readonly<Record<string, unknown>>,
  messages: readonly CheckMessage[]
): ParsedCheckPreparationResult | undefined {
  if (typeof preparationResult.action !== "string") return undefined;
  const reason = parsePreparationReason(preparationResult.reason);
  if (reason === undefined) return undefined;
  switch (preparationResult.action) {
    case "block":
      return parseBlockedPreparation(preparationResult, reason, messages);
    case "continue":
      return parseContinuedPreparation(preparationResult, reason, messages);
    default:
      return undefined;
  }
}

function parseBlockedPreparation(
  preparationResult: Readonly<Record<string, unknown>>,
  reason: Readonly<{ readonly code: string }>,
  messages: readonly CheckMessage[]
): ParsedCheckPreparationResult | undefined {
  if (
    !hasRequiredAndOptionalRecordKeys(preparationResult, {
      optional: ["messages"],
      required: ["status", "action", "reason"]
    })
  ) {
    return undefined;
  }
  return Object.freeze({ status: "failure", action: "block", reason, messages });
}

function parseContinuedPreparation(
  preparationResult: Readonly<Record<string, unknown>>,
  reason: Readonly<{ readonly code: string }>,
  messages: readonly CheckMessage[]
): ParsedCheckPreparationResult | undefined {
  if (
    !hasRequiredAndOptionalRecordKeys(preparationResult, {
      optional: ["messages"],
      required: ["status", "action", "fallback", "reason"]
    })
  ) {
    return undefined;
  }
  return Object.freeze({
    status: "failure",
    action: "continue" as const,
    fallback: preparationResult.fallback,
    reason,
    messages
  });
}

function parsePreparationReason(value: unknown): Readonly<{ readonly code: string }> | undefined {
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
