import type { CheckOutcome } from "../definition/custom-check.ts";

export interface ProgressWriter {
  readonly color: boolean;
  readonly isTTY: boolean;
  readonly term: string | undefined;
  write(content: string): void;
}

export type ProgressFeedback = Readonly<
  | {
      readonly kind: "prepared";
      readonly totalChecks: number;
    }
  | {
      readonly kind: "started";
      readonly checkId: string;
      readonly displayName: string;
    }
  | {
      readonly kind: "settled";
      readonly checkId: string;
      readonly displayName: string;
      readonly outcome: CheckOutcome;
      readonly durationMs: number | null;
    }
  | {
      readonly kind: "final";
      readonly execution: "cancelled" | "completed";
      readonly counts: ProgressOutcomeCounts;
      readonly elapsedMs: number;
    }
>;

export interface ProgressOutcomeCounts {
  readonly failed: number;
  readonly notApplicable: number;
  readonly passed: number;
  readonly unavailable: number;
}

export interface ProgressRenderer {
  render(feedback: ProgressFeedback): void;
}

interface RunningCheck {
  readonly checkId: string;
  readonly displayName: string;
}

const COLOR = Object.freeze({
  failed: "\u001B[31m",
  notApplicable: "\u001B[36m",
  passed: "\u001B[32m",
  reset: "\u001B[0m",
  running: "\u001B[2m",
  unavailable: "\u001B[33m"
});

const NAMED_CONTROL_ESCAPES: Readonly<Partial<Record<string, string>>> = Object.freeze({
  "\n": "\\n",
  "\r": "\\r",
  "\t": "\\t"
});

/** Product-private lifecycle presentation with one owner for feedback and its writer. */
export function createProgressRenderer(writer: ProgressWriter): ProgressRenderer {
  const isTTY = writer.isTTY && writer.term?.toLowerCase() !== "dumb";
  const usesColor = isTTY && writer.color;
  const running: RunningCheck[] = [];
  let completedCount = 0;
  let renderedRunningRows = 0;
  let preparedTotal: number | undefined;

  const settle = (feedback: Extract<ProgressFeedback, { readonly kind: "settled" }>): void => {
    assertPrepared(preparedTotal);
    if (isTTY) {
      clearRunningRegion(writer, renderedRunningRows);
      renderedRunningRows = 0;
    }
    completedCount += 1;
    writer.write(
      formatSettledRow({
        completionOrdinal: completedCount,
        displayName: feedback.displayName,
        durationMs: feedback.durationMs,
        outcome: feedback.outcome,
        totalChecks: preparedTotal,
        usesColor
      })
    );
    if (!isTTY) return;
    removeRunningCheck(running, feedback.checkId);
    renderedRunningRows = redrawRunningRegion({
      completedCount,
      running,
      totalChecks: preparedTotal,
      usesColor,
      writer
    });
  };

  return Object.freeze({
    render: (feedback: ProgressFeedback): void => {
      switch (feedback.kind) {
        case "prepared":
          if (preparedTotal !== undefined) throw new Error("Progress feedback was prepared twice");
          preparedTotal = feedback.totalChecks;
          writer.write(`Vibe Check\ntotal ${feedback.totalChecks} checks\n\nChecks:\n`);
          return;
        case "started":
          if (!isTTY) return;
          assertPrepared(preparedTotal);
          clearRunningRegion(writer, renderedRunningRows);
          renderedRunningRows = 0;
          running.push({ checkId: feedback.checkId, displayName: feedback.displayName });
          renderedRunningRows = redrawRunningRegion({
            completedCount,
            running,
            totalChecks: preparedTotal,
            usesColor,
            writer
          });
          return;
        case "settled":
          settle(feedback);
          return;
        case "final":
          assertPrepared(preparedTotal);
          if (running.length > 0) {
            throw new Error("Progress feedback finalized while Checks are still running");
          }
          writer.write(formatFinalSummary(feedback));
          return;
      }
    }
  });
}

function assertPrepared(preparedTotal: number | undefined): asserts preparedTotal is number {
  if (preparedTotal === undefined) throw new Error("Progress feedback arrived before preparation");
}

function clearRunningRegion(writer: ProgressWriter, rowCount: number): void {
  for (let index = 0; index < rowCount; index += 1) writer.write("\u001B[1A\u001B[2K");
}

function redrawRunningRegion(
  input: Readonly<{
    readonly completedCount: number;
    readonly running: readonly RunningCheck[];
    readonly totalChecks: number;
    readonly usesColor: boolean;
    readonly writer: ProgressWriter;
  }>
): number {
  for (const [index, check] of input.running.entries()) {
    input.writer.write(
      formatRunningRow({
        displayIndex: input.completedCount + index + 1,
        displayName: check.displayName,
        totalChecks: input.totalChecks,
        usesColor: input.usesColor
      })
    );
  }
  return input.running.length;
}

function removeRunningCheck(running: RunningCheck[], checkId: string): void {
  const index = running.findIndex((check) => check.checkId === checkId);
  if (index >= 0) running.splice(index, 1);
}

function formatRunningRow(
  input: Readonly<{
    readonly displayIndex: number;
    readonly displayName: string;
    readonly totalChecks: number;
    readonly usesColor: boolean;
  }>
): string {
  return `  [${input.displayIndex}/${input.totalChecks}] ${escapeTerminalText(input.displayName)} | ${colorStatus(
    "running",
    input.usesColor
  )}\n`;
}

function formatSettledRow(
  input: Readonly<{
    readonly completionOrdinal: number;
    readonly displayName: string;
    readonly durationMs: number | null;
    readonly outcome: CheckOutcome;
    readonly totalChecks: number;
    readonly usesColor: boolean;
  }>
): string {
  const status = statusForOutcome(input.outcome);
  const reason = reasonForOutcome(input.outcome);
  const duration = input.durationMs === null ? "not run" : formatDuration(input.durationMs);
  const reasonSuffix = reason === undefined ? "" : ` | ${escapeTerminalText(reason)}`;
  return `  [${input.completionOrdinal}/${input.totalChecks}] ${escapeTerminalText(input.displayName)} | ${colorStatus(
    status,
    input.usesColor
  )} | ${duration}${reasonSuffix}\n`;
}

function formatFinalSummary(input: Extract<ProgressFeedback, { readonly kind: "final" }>): string {
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

function totalChecks(counts: ProgressOutcomeCounts): number {
  return counts.passed + counts.failed + counts.notApplicable + counts.unavailable;
}

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
    const terminalControl = isTerminalControl(codePoint);
    escaped += terminalControl
      ? `\\u${codePoint.toString(16).padStart(4, "0").toUpperCase()}`
      : character;
  }
  return escaped;
}

function isTerminalControl(codePoint: number): boolean {
  return (
    codePoint <= 0x1f ||
    (codePoint >= 0x7f && codePoint <= 0x9f) ||
    codePoint === 0x2028 ||
    codePoint === 0x2029
  );
}

function colorStatus(status: ProgressStatus, usesColor: boolean): string {
  if (!usesColor) return status;
  return `${COLOR[colorKeyForStatus(status)]}${status}${COLOR.reset}`;
}

type ProgressStatus = "failed" | "not-applicable" | "passed" | "running" | "unavailable";

type ColorKey = Exclude<keyof typeof COLOR, "reset">;

function colorKeyForStatus(status: ProgressStatus): ColorKey {
  switch (status) {
    case "failed":
      return "failed";
    case "not-applicable":
      return "notApplicable";
    case "passed":
      return "passed";
    case "running":
      return "running";
    case "unavailable":
      return "unavailable";
  }
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1_000) {
    return `${Number.isInteger(durationMs) ? durationMs : Number(durationMs.toFixed(1))}ms`;
  }
  const seconds = durationMs / 1_000;
  return `${Number.isInteger(seconds) ? seconds : Number(seconds.toFixed(1))}s`;
}
