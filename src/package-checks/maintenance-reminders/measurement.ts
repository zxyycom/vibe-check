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

type MeasurementSessionInput = Readonly<{
  readonly executable: string;
  readonly history: FirstParentHistory;
  readonly projectRoot: string;
  readonly signal: AbortSignal;
}>;

type ReminderMeasureStage<T> =
  | Readonly<{ readonly kind: "cancelled" }>
  | Readonly<{ readonly kind: "complete"; readonly value: T }>
  | Readonly<{
      readonly kind: "unavailable";
      readonly reason: MaintenanceReminderUnavailableReason;
    }>;

/** Successful immutable Git measurements live only for one ordered Check execution. */
export class MaintenanceReminderMeasurementSession {
  readonly #input: MeasurementSessionInput;
  readonly #historyIndices = new Map<string, number>();
  readonly #resolvedBases = new Map<string, number>();
  readonly #changedLinePrefixes: number[] = [0];

  constructor(input: MeasurementSessionInput) {
    this.#input = input;
    for (const [index, commit] of input.history.commits.entries()) {
      if (!this.#historyIndices.has(commit)) this.#historyIndices.set(commit, index);
    }
  }

  async measure(entry: Readonly<MaintenanceReminder>): Promise<ReminderMeasurement> {
    if (this.#input.signal.aborted) return { kind: "cancelled" };
    const input = { entry, history: this.#input.history };
    const base = await this.#resolvedBaseIndex(entry.baseCommit);
    if (base.kind === "cancelled") return base;
    if (base.kind === "unavailable") return unavailableMeasurement(input, base.reason);
    const changedLines = await this.#measuredChangedLines(base.value);
    if (changedLines.kind === "cancelled") return changedLines;
    if (changedLines.kind === "unavailable")
      return unavailableMeasurement(input, changedLines.reason);
    if (this.#input.signal.aborted) return { kind: "cancelled" };
    return completedMeasurement(entry, measuredAssessment(input, base.value, changedLines.value));
  }

  async #resolvedBaseIndex(baseCommit: string): Promise<ReminderMeasureStage<number>> {
    if (this.#input.signal.aborted) return { kind: "cancelled" };
    const key = baseCommit.toLowerCase();
    const cachedIndex = this.#resolvedBases.get(key);
    if (cachedIndex !== undefined) return completeMeasure(cachedIndex);
    const base = await runGit({
      args: ["rev-parse", "--verify", `${baseCommit}^{commit}`],
      executable: this.#input.executable,
      projectRoot: this.#input.projectRoot,
      signal: this.#input.signal
    });
    if (base.kind === "cancelled") return base;
    if (base.kind === "failed") return unavailableMeasure("base-commit-unavailable");
    const resolvedCommit = parseCommitId(base.stdout);
    if (resolvedCommit === null) return unavailableMeasure("base-commit-unavailable");
    const baseIndex = this.#historyIndices.get(resolvedCommit);
    if (baseIndex === undefined) return unavailableMeasure("base-not-first-parent-ancestor");
    this.#resolvedBases.set(key, baseIndex);
    return completeMeasure(baseIndex);
  }

  async #measuredChangedLines(baseIndex: number): Promise<ReminderMeasureStage<number>> {
    if (this.#input.signal.aborted) return { kind: "cancelled" };
    while (this.#changedLinePrefixes.length <= baseIndex) {
      if (this.#input.signal.aborted) return { kind: "cancelled" };
      const index = this.#changedLinePrefixes.length - 1;
      const commit = this.#input.history.commits[index];
      const previousCount = this.#changedLinePrefixes[index];
      if (commit === undefined || previousCount === undefined)
        throw new Error("Maintenance history prefix is incomplete");
      const nextPrefix = await this.#measuredCommitPrefix({ commit, previousCount });
      if (nextPrefix.kind === "cancelled") return nextPrefix;
      if (nextPrefix.kind === "unavailable") return nextPrefix;
      // A failed step stays retryable; shorter successful prefixes remain usable.
      this.#changedLinePrefixes.push(nextPrefix.value);
    }
    const changedLines = this.#changedLinePrefixes[baseIndex];
    if (changedLines === undefined) throw new Error("Maintenance history prefix is incomplete");
    return completeMeasure(changedLines);
  }

  async #measuredCommitPrefix(input: {
    readonly commit: string;
    readonly previousCount: number;
  }): Promise<ReminderMeasureStage<number>> {
    const numstat = await runGit({
      args: ["diff-tree", "--no-commit-id", "--numstat", "-r", `${input.commit}^`, input.commit],
      executable: this.#input.executable,
      projectRoot: this.#input.projectRoot,
      signal: this.#input.signal
    });
    if (numstat.kind === "cancelled") return numstat;
    if (numstat.kind === "failed") return unavailableMeasure("numstat-unavailable");
    const count = parseChangedLines(numstat.stdout);
    if (count === null || !Number.isSafeInteger(input.previousCount + count))
      return unavailableMeasure("numstat-invalid");
    return completeMeasure(input.previousCount + count);
  }
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
