import type { CheckMessage } from "../definition/custom-check.ts";
import { isCheckTreeReferenceId } from "../definition/check-tree/identity.ts";
import {
  snapshotClosedArray,
  snapshotClosedRecord
} from "../quality-core/check-record/plain-record-values.ts";

const EMPTY_MESSAGES: readonly CheckMessage[] = Object.freeze([]);

/**
 * A terminal callback result split into the Core-owned four-state result and
 * detached presentation-only messages. The caller must still pass `result` to
 * Core; this adapter never validates outcome data or reasons.
 */
export interface ParsedCheckTerminalResult {
  readonly messages: readonly CheckMessage[];
  readonly result: StrippedTerminalResult;
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
export function parseCheckTerminalResult(value: unknown): ParsedCheckTerminalResult | undefined {
  const terminal = snapshotClosedRecord(value);
  if (terminal === undefined || typeof terminal.status !== "string") return undefined;

  const result = strippedTerminalResult(terminal);
  if (result === undefined) return undefined;
  const messages = detachedMessages(terminal);
  return messages === undefined ? undefined : Object.freeze({ messages, result });
}

function strippedTerminalResult(
  terminal: Readonly<Record<string, unknown>>
): StrippedTerminalResult | undefined {
  switch (terminal.status) {
    case "passed":
    case "failed":
      return hasSupportedKeys(terminal, ["status", "data"], ["messages"])
        ? Object.freeze({ status: terminal.status, data: terminal.data })
        : undefined;
    case "not-applicable":
      if (!hasSupportedKeys(terminal, ["status"], ["reason", "messages"])) return undefined;
      return Object.freeze(
        Object.hasOwn(terminal, "reason")
          ? { status: "not-applicable", reason: terminal.reason }
          : { status: "not-applicable" }
      );
    case "unavailable":
      return hasSupportedKeys(terminal, ["status", "reason"], ["messages"])
        ? Object.freeze({ status: "unavailable", reason: terminal.reason })
        : undefined;
    default:
      return undefined;
  }
}

function detachedMessages(
  terminal: Readonly<Record<string, unknown>>
): readonly CheckMessage[] | undefined {
  if (!Object.hasOwn(terminal, "messages") || terminal.messages === undefined) {
    return EMPTY_MESSAGES;
  }
  const rawMessages = snapshotClosedArray(terminal.messages);
  if (rawMessages === undefined) return undefined;

  const messages: CheckMessage[] = [];
  for (const rawMessage of rawMessages) {
    const message = detachedMessage(rawMessage);
    if (message === undefined) return undefined;
    messages.push(message);
  }
  return messages.length === 0 ? EMPTY_MESSAGES : Object.freeze(messages);
}

function detachedMessage(value: unknown): CheckMessage | undefined {
  const message = snapshotClosedRecord(value);
  if (
    message === undefined ||
    !hasSupportedKeys(message, ["level", "code", "message"], []) ||
    !isCheckMessageLevel(message.level) ||
    typeof message.code !== "string" ||
    !isCheckTreeReferenceId(message.code) ||
    typeof message.message !== "string" ||
    message.message.length === 0
  ) {
    return undefined;
  }
  return Object.freeze({ code: message.code, level: message.level, message: message.message });
}

function hasSupportedKeys(
  value: Readonly<Record<string, unknown>>,
  required: readonly string[],
  optional: readonly string[]
): boolean {
  const supported = new Set([...required, ...optional]);
  return (
    required.every((key) => Object.hasOwn(value, key)) &&
    Object.keys(value).every((key) => supported.has(key))
  );
}

function isCheckMessageLevel(value: unknown): value is CheckMessage["level"] {
  return value === "info" || value === "warning" || value === "error";
}
