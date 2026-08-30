import {
  isMaintenanceCommitId,
  type MaintenanceReminderAssessment,
  type MaintenanceReminderUnavailableReason
} from "./final-data.ts";
import { completedMeasurement, modeOf, unavailableAssessment } from "./assessment-results.ts";
import { runGit } from "./maintenance-support.ts";
import type {
  FirstParentHistory,
  MaintenanceReminder,
  ReminderMeasurement
} from "./maintenance-reminders.ts";

export async function measureReminder(input: {
  readonly entry: Readonly<MaintenanceReminder>;
  readonly executable: string;
  readonly history: FirstParentHistory;
  readonly projectRoot: string;
  readonly signal: AbortSignal;
}): Promise<ReminderMeasurement> {
  const base = await resolvedBaseCommit(input);
  if (base.kind === "cancelled") return base;
  if (base.kind === "unavailable") return unavailableMeasurement(input, base.reason);
  const changedLines = await measuredChangedLines(input, base.value);
  if (changedLines.kind === "cancelled") return changedLines;
  if (changedLines.kind === "unavailable")
    return unavailableMeasurement(input, changedLines.reason);
  return completedMeasurement(
    input.entry,
    measuredAssessment(input, base.value, changedLines.value)
  );
}

type ReminderMeasureStage<T> =
  | Readonly<{ readonly kind: "cancelled" }>
  | Readonly<{ readonly kind: "complete"; readonly value: T }>
  | Readonly<{
      readonly kind: "unavailable";
      readonly reason: MaintenanceReminderUnavailableReason;
    }>;

async function resolvedBaseCommit(input: {
  readonly entry: Readonly<MaintenanceReminder>;
  readonly executable: string;
  readonly history: FirstParentHistory;
  readonly projectRoot: string;
  readonly signal: AbortSignal;
}): Promise<ReminderMeasureStage<number>> {
  const base = await runGit({
    args: ["rev-parse", "--verify", `${input.entry.baseCommit}^{commit}`],
    executable: input.executable,
    projectRoot: input.projectRoot,
    signal: input.signal
  });
  if (base.kind === "cancelled") return base;
  if (base.kind === "failed") return unavailableMeasure("base-commit-unavailable");

  const baseCommit = parseCommitId(base.stdout);
  if (baseCommit === null) return unavailableMeasure("base-commit-unavailable");

  const baseIndex = input.history.commits.indexOf(baseCommit);
  return baseIndex < 0
    ? unavailableMeasure("base-not-first-parent-ancestor")
    : completeMeasure(baseIndex);
}

async function measuredChangedLines(
  input: {
    readonly executable: string;
    readonly history: FirstParentHistory;
    readonly projectRoot: string;
    readonly signal: AbortSignal;
  },
  baseIndex: number
): Promise<ReminderMeasureStage<number>> {
  let changedLines = 0;
  for (const commit of input.history.commits.slice(0, baseIndex)) {
    const numstat = await runGit({
      args: ["diff-tree", "--no-commit-id", "--numstat", "-r", `${commit}^`, commit],
      executable: input.executable,
      projectRoot: input.projectRoot,
      signal: input.signal
    });
    if (numstat.kind === "cancelled") return numstat;
    if (numstat.kind === "failed") return unavailableMeasure("numstat-unavailable");
    const count = parseChangedLines(numstat.stdout);
    if (count === null || !Number.isSafeInteger(changedLines + count))
      return unavailableMeasure("numstat-invalid");
    changedLines += count;
  }
  return completeMeasure(changedLines);
}

function measuredAssessment(
  input: Readonly<{
    readonly entry: Readonly<MaintenanceReminder>;
    readonly history: FirstParentHistory;
  }>,
  baseIndex: number,
  changedLines: number
): MaintenanceReminderAssessment {
  const mode = modeOf(input.entry);
  const exceeded = [
    ...(input.entry.limits.commits !== undefined && baseIndex > input.entry.limits.commits
      ? (["commits"] as const)
      : []),
    ...(input.entry.limits.changedLines !== undefined &&
    changedLines > input.entry.limits.changedLines
      ? (["changed-lines"] as const)
      : [])
  ];
  return {
    assessment: exceeded.length > 0 ? "due" : "clear",
    baseCommit: input.entry.baseCommit,
    changedLines,
    commitCount: baseIndex,
    exceeded,
    headCommit: input.history.headCommit,
    id: input.entry.id,
    mode
  };
}

function unavailableMeasurement(
  input: Readonly<{
    readonly entry: Readonly<MaintenanceReminder>;
    readonly history: FirstParentHistory;
  }>,
  reason: MaintenanceReminderUnavailableReason
): ReminderMeasurement {
  return completedMeasurement(
    input.entry,
    unavailableAssessment(input.entry, input.history.headCommit, reason)
  );
}

function completeMeasure<T>(value: T): ReminderMeasureStage<T> {
  return { kind: "complete", value };
}

function unavailableMeasure(
  reason: MaintenanceReminderUnavailableReason
): ReminderMeasureStage<never> {
  return { kind: "unavailable", reason };
}

export function parseCommitId(stdout: string): string | null {
  const value = stdout.trim();
  return isMaintenanceCommitId(value) ? value.toLowerCase() : null;
}

export function parseFirstParentHistory(
  stdout: string,
  headCommit: string
): FirstParentHistory | undefined {
  const commits: string[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    if (line.trim().length === 0) continue;
    const commit = parseCommitId(line);
    if (commit === null) return undefined;
    commits.push(commit);
  }
  if (commits.length === 0 || commits[0] !== headCommit) return undefined;
  return Object.freeze({ commits: Object.freeze(commits), headCommit });
}

function parseChangedLines(stdout: string): number | null {
  let changedLines = 0;
  for (const line of stdout.split(/\r?\n/)) {
    if (line.length === 0) continue;
    const [additions, deletions] = line.split("\t", 3);
    if (additions === "-" && deletions === "-") continue;
    if (!decimal(additions) || !decimal(deletions)) return null;
    const count = Number(additions) + Number(deletions);
    if (!Number.isSafeInteger(count) || !Number.isSafeInteger(changedLines + count)) return null;
    changedLines += count;
  }
  return changedLines;
}

function decimal(value: string | undefined): value is string {
  return value !== undefined && /^(?:0|[1-9]\d*)$/.test(value);
}
