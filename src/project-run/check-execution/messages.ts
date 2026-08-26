import type { CheckMessage } from "../../check/check.ts";
import {
  hasRequiredAndOptionalRecordKeys,
  snapshotClosedArray,
  snapshotClosedRecord
} from "../../data-boundary/closed-values.ts";

const EMPTY_MESSAGES: readonly CheckMessage[] = Object.freeze([]);

/** Parses the shared closed Check-message attachment without retaining author input. */
export function parseCheckMessages(value: unknown): readonly CheckMessage[] | undefined {
  if (value === undefined) return EMPTY_MESSAGES;
  const authoredMessages = snapshotClosedArray(value);
  if (authoredMessages === undefined) return undefined;

  const messages: CheckMessage[] = [];
  for (const authoredMessage of authoredMessages) {
    const message = detachedMessage(authoredMessage);
    if (message === undefined) return undefined;
    messages.push(message);
  }
  return messages.length === 0 ? EMPTY_MESSAGES : Object.freeze(messages);
}

function detachedMessage(value: unknown): CheckMessage | undefined {
  const message = snapshotClosedRecord(value);
  if (
    message === undefined ||
    !hasRequiredAndOptionalRecordKeys(message, {
      required: ["level", "code", "message"],
      optional: []
    }) ||
    !isCheckMessageLevel(message.level) ||
    typeof message.code !== "string" ||
    message.code.length === 0 ||
    typeof message.message !== "string" ||
    message.message.length === 0
  ) {
    return undefined;
  }
  return Object.freeze({ code: message.code, level: message.level, message: message.message });
}

function isCheckMessageLevel(value: unknown): value is CheckMessage["level"] {
  return value === "info" || value === "warning" || value === "error";
}
