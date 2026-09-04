import type { CheckMessage, CheckOutcome } from "../../check/check.ts";
import type { CoreRecord } from "../../check-settlement/facts.ts";
import { canonicalJsonText } from "../../data-boundary/canonical-data.ts";
import { FLAG_CONDITION_NOT_MATCHED_CODE } from "../check-execution/flag-controls.ts";
import type { ProgressFeedback, ProgressOutcomeCounts } from "./renderer.ts";

const COLOR = Object.freeze({
  error: "\u001B[31m",
  info: "\u001B[36m",
  reset: "\u001B[0m",
  warning: "\u001B[33m"
});

const MAXIMUM_PREVIEW_ITEMS = 5;
const MAXIMUM_PREVIEW_CODE_POINTS = 240;
const TRUNCATION_MARKER = "… [truncated]";

const NAMED_CONTROL_ESCAPES: Readonly<Partial<Record<string, string>>> = Object.freeze({
  "\n": "\\n",
  "\r": "\\r",
  "\t": "\\t"
});

export function formatRunningRow(
  input: Readonly<{
    readonly displayIndex: number;
    readonly displayName: string;
    readonly elapsedMs: number | null;
    readonly totalChecks: number;
  }>
): string {
  const elapsed = input.elapsedMs === null ? "" : ` | ${formatDuration(input.elapsedMs)}`;
  return `  [${input.displayIndex}/${input.totalChecks}] ${escapeTerminalText(input.displayName)} | running${elapsed}\n`;
}

export function shouldPresentSettledFeedback(
  feedback: Extract<ProgressFeedback, { readonly kind: "settled" }>
): boolean {
  return (
    feedback.visibility !== "attention" ||
    feedback.outcome.status !== "passed" ||
    feedback.messages.length > 0 ||
    feedback.records.length > 0
  );
}

export function isFlagConditionNotMatchedFeedback(
  feedback: Extract<ProgressFeedback, { readonly kind: "settled" }>
): boolean {
  return (
    feedback.durationMs === null &&
    feedback.messages.length === 0 &&
    feedback.records.length === 0 &&
    feedback.outcome.status === "not-applicable" &&
    feedback.outcome.reason?.code === FLAG_CONDITION_NOT_MATCHED_CODE
  );
}

export function formatFlagConditionNotMatchedBlock(
  displayNames: readonly [string, ...string[]]
): string {
  const subject =
    displayNames.length === 1
      ? "The following check did not run because the run flags did not match its condition:"
      : `The following ${displayNames.length} checks did not run because the run flags did not match their conditions:`;
  return `  ${subject}\n${displayNames
    .map((displayName) => `    - ${escapeTerminalText(displayName)}\n`)
    .join("")}`;
}

export function formatSettledBlock(
  input: Readonly<{
    readonly completionOrdinal: number;
    readonly displayName: string;
    readonly durationMs: number | null;
    readonly messages: readonly CheckMessage[];
    readonly outcome: CheckOutcome;
    readonly records: readonly CoreRecord[];
    readonly totalChecks: number;
    readonly usesColor: boolean;
  }>
): string {
  const status = statusForOutcome(input.outcome);
  const reason = reasonForOutcome(input.outcome);
  const duration = input.durationMs === null ? "not run" : formatDuration(input.durationMs);
  const reasonSuffix = reason === undefined ? "" : ` | ${escapeTerminalText(reason)}`;
  const row = `  [${input.completionOrdinal}/${input.totalChecks}] ${escapeTerminalText(input.displayName)} | ${status} | ${duration}${reasonSuffix}\n`;
  return `${row}${formatRecords(input.records)}${formatMessages(input.messages, input.usesColor)}`;
}

export function formatFinalSummary(
  input: Extract<ProgressFeedback, { readonly kind: "final" }>
): string {
  return [
    "",
    "Execution summary:",
    `  execution: ${input.execution}`,
    `  total checks: ${totalChecks(input.counts)}`,
    `  passed: ${input.counts.passed}`,
    `  failed: ${input.counts.failed}`,
    `  not applicable: ${input.counts.notApplicable}`,
    `  unavailable: ${input.counts.unavailable}`,
    `  elapsed: ${formatDuration(input.elapsedMs)}`,
    ""
  ].join("\n");
}

function formatRecords(records: readonly CoreRecord[]): string {
  return formatPreview(records, formatRecord, "record");
}

function formatMessages(messages: readonly CheckMessage[], usesColor: boolean): string {
  return formatPreview(messages, (message) => formatMessage(message, usesColor), "message");
}

function formatPreview<Item>(
  items: readonly Item[],
  formatItem: (item: Item) => string,
  name: "message" | "record"
): string {
  const preview = items.slice(0, MAXIMUM_PREVIEW_ITEMS);
  const omittedCount = items.length - preview.length;
  return `${preview.map(formatItem).join("")}${
    omittedCount === 0
      ? ""
      : `    [${name}s] ${omittedCount} additional ${name}(s) were omitted from terminal preview.\n`
  }`;
}

function formatRecord(record: CoreRecord): string {
  return `    [record] ${boundedTerminalText(`${record.id} | ${canonicalJsonText(record.data)}`)}\n`;
}

function formatMessage(message: CheckMessage, usesColor: boolean): string {
  const label = colorMessageLevel(message.level, usesColor);
  return `    [${label}] ${boundedTerminalText(message.message)}\n`;
}

function boundedTerminalText(value: string): string {
  const escaped = escapeTerminalText(value);
  if (codePointLength(escaped) <= MAXIMUM_PREVIEW_CODE_POINTS) return escaped;
  return `${prefixByCodePoints(
    escaped,
    MAXIMUM_PREVIEW_CODE_POINTS - codePointLength(TRUNCATION_MARKER)
  )}${TRUNCATION_MARKER}`;
}

/** Human-only fields must not control the terminal that presents them. */
function escapeTerminalText(value: string): string {
  let escaped = "";
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    const namedEscape = NAMED_CONTROL_ESCAPES[character];
    if (namedEscape !== undefined) {
      escaped += namedEscape;
      continue;
    }
    escaped += isTerminalControl(codePoint)
      ? `\\u${codePoint.toString(16).padStart(4, "0").toUpperCase()}`
      : character;
  }
  return escaped;
}

function codePointLength(value: string): number {
  let length = 0;
  for (const _character of value) length += 1;
  return length;
}

function prefixByCodePoints(value: string, limit: number): string {
  let prefix = "";
  let length = 0;
  for (const character of value) {
    if (length === limit) break;
    prefix += character;
    length += 1;
  }
  return prefix;
}

function isTerminalControl(codePoint: number): boolean {
  return (
    codePoint <= 0x1f ||
    (codePoint >= 0x7f && codePoint <= 0x9f) ||
    codePoint === 0x2028 ||
    codePoint === 0x2029
  );
}

function colorMessageLevel(level: CheckMessage["level"], usesColor: boolean): string {
  if (!usesColor) return level;
  return `${COLOR[level]}${level}${COLOR.reset}`;
}

type ProgressStatus = CheckOutcome["status"];

function statusForOutcome(outcome: CheckOutcome): ProgressStatus {
  switch (outcome.status) {
    case "passed":
    case "failed":
      return outcome.status;
    case "not-applicable":
      return "not-applicable";
    case "unavailable":
      return "unavailable";
  }
}

function reasonForOutcome(outcome: CheckOutcome): string | undefined {
  return outcome.status === "passed" || outcome.status === "failed"
    ? undefined
    : outcome.reason?.code;
}

function totalChecks(counts: ProgressOutcomeCounts): number {
  return counts.passed + counts.failed + counts.notApplicable + counts.unavailable;
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1_000) {
    return `${Number.isInteger(durationMs) ? durationMs : Number(durationMs.toFixed(1))}ms`;
  }
  const seconds = durationMs / 1_000;
  return `${Number.isInteger(seconds) ? seconds : Number(seconds.toFixed(1))}s`;
}
