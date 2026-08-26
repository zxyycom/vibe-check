import type { CheckMessage } from "../../check/check.ts";
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
  const messages = parseCheckMessages(terminal.messages);
  return messages === undefined ? undefined : Object.freeze({ messages, result });
}

function strippedTerminalResult(
  terminal: Readonly<Record<string, unknown>>
): StrippedTerminalResult | undefined {
  switch (terminal.status) {
    case "passed":
    case "failed":
      return hasRequiredAndOptionalRecordKeys(terminal, {
        required: ["status", "data"],
        optional: ["messages"]
      })
        ? Object.freeze({ status: terminal.status, data: terminal.data })
        : undefined;
    case "not-applicable":
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
    case "unavailable":
      return hasRequiredAndOptionalRecordKeys(terminal, {
        required: ["status", "reason"],
        optional: ["messages"]
      })
        ? Object.freeze({ status: "unavailable", reason: terminal.reason })
        : undefined;
    default:
      return undefined;
  }
}
