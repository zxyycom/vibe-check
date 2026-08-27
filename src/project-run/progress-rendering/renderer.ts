import type { CheckMessage, CheckOutcome, CheckVisibility } from "../../check/check.ts";

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
      readonly visibility: CheckVisibility;
      readonly messages: readonly CheckMessage[];
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
  refresh(): void;
  readonly refreshesRunningRegion: boolean;
  render(feedback: ProgressFeedback): void;
}

export interface ProgressClock {
  now(): number;
}

interface RunningCheck {
  readonly checkId: string;
  readonly displayName: string;
  readonly startedAtMs: number;
  elapsedMs: number | null;
}

const SYSTEM_PROGRESS_CLOCK: ProgressClock = Object.freeze({ now: () => performance.now() });

const COLOR = Object.freeze({
  error: "\u001B[31m",
  info: "\u001B[36m",
  reset: "\u001B[0m",
  warning: "\u001B[33m"
});

const NAMED_CONTROL_ESCAPES: Readonly<Partial<Record<string, string>>> = Object.freeze({
  "\n": "\\n",
  "\r": "\\r",
  "\t": "\\t"
});

/** Product-private lifecycle presentation with one owner for feedback and its writer. */
export function createProgressRenderer(
  writer: ProgressWriter,
  clock: ProgressClock = SYSTEM_PROGRESS_CLOCK
): ProgressRenderer {
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
    removeRunningCheck(running, feedback.checkId);
    if (shouldPresentSettledFeedback(feedback)) {
      writer.write(
        formatSettledBlock({
          completionOrdinal: completedCount,
          displayName: feedback.displayName,
          durationMs: feedback.durationMs,
          messages: feedback.messages,
          outcome: feedback.outcome,
          totalChecks: preparedTotal,
          usesColor
        })
      );
    }
    if (!isTTY) return;
    renderedRunningRows = redrawRunningRegion({
      completedCount,
      running,
      totalChecks: preparedTotal,
      writer
    });
  };

  return Object.freeze({
    refreshesRunningRegion: isTTY,
    refresh: (): void => {
      if (!isTTY || running.length === 0) return;
      assertPrepared(preparedTotal);
      clearRunningRegion(writer, renderedRunningRows);
      renderedRunningRows = 0;
      updateRunningDurations(running, clock.now());
      renderedRunningRows = redrawRunningRegion({
        completedCount,
        running,
        totalChecks: preparedTotal,
        writer
      });
    },
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
          running.push({
            checkId: feedback.checkId,
            displayName: feedback.displayName,
            elapsedMs: null,
            startedAtMs: clock.now()
          });
          renderedRunningRows = redrawRunningRegion({
            completedCount,
            running,
            totalChecks: preparedTotal,
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
    readonly writer: ProgressWriter;
  }>
): number {
  for (const [index, check] of input.running.entries()) {
    input.writer.write(
      formatRunningRow({
        displayIndex: input.completedCount + index + 1,
        displayName: check.displayName,
        elapsedMs: check.elapsedMs,
        totalChecks: input.totalChecks
      })
    );
  }
  return input.running.length;
}

function removeRunningCheck(running: RunningCheck[], checkId: string): void {
  const index = running.findIndex((check) => check.checkId === checkId);
  if (index >= 0) running.splice(index, 1);
}

function updateRunningDurations(running: RunningCheck[], refreshedAtMs: number): void {
  for (const check of running) {
    const elapsedMs = refreshedAtMs - check.startedAtMs;
    check.elapsedMs = Number.isFinite(elapsedMs) && elapsedMs >= 0 ? elapsedMs : 0;
  }
}

function formatRunningRow(
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

function shouldPresentSettledFeedback(
  feedback: Extract<ProgressFeedback, { readonly kind: "settled" }>
): boolean {
  return (
    feedback.visibility !== "attention" ||
    feedback.outcome.status !== "passed" ||
    feedback.messages.length > 0
  );
}

function formatSettledBlock(
  input: Readonly<{
    readonly completionOrdinal: number;
    readonly displayName: string;
    readonly durationMs: number | null;
    readonly messages: readonly CheckMessage[];
    readonly outcome: CheckOutcome;
    readonly totalChecks: number;
    readonly usesColor: boolean;
  }>
): string {
  const status = statusForOutcome(input.outcome);
  const reason = reasonForOutcome(input.outcome);
  const duration = input.durationMs === null ? "not run" : formatDuration(input.durationMs);
  const reasonSuffix = reason === undefined ? "" : ` | ${escapeTerminalText(reason)}`;
  const row = `  [${input.completionOrdinal}/${input.totalChecks}] ${escapeTerminalText(input.displayName)} | ${status} | ${duration}${reasonSuffix}\n`;
  return `${row}${input.messages.map((message) => formatMessage(message, input.usesColor)).join("")}`;
}

function formatMessage(message: CheckMessage, usesColor: boolean): string {
  const label = colorMessageLevel(message.level, usesColor);
  return `    [${label}] ${escapeTerminalText(message.message)}\n`;
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

function colorMessageLevel(level: CheckMessage["level"], usesColor: boolean): string {
  if (!usesColor) return level;
  return `${COLOR[level]}${level}${COLOR.reset}`;
}

type ProgressStatus = CheckOutcome["status"];

function formatDuration(durationMs: number): string {
  if (durationMs < 1_000) {
    return `${Number.isInteger(durationMs) ? durationMs : Number(durationMs.toFixed(1))}ms`;
  }
  const seconds = durationMs / 1_000;
  return `${Number.isInteger(seconds) ? seconds : Number(seconds.toFixed(1))}s`;
}
