import { diagnosticTags, type DiagnosticLogger } from "../diagnostic-logging/logger.ts";

/** Explicit, enabled-only private handoff; the Scheduler never infers this from logger behavior. */
export type SchedulerPerformanceDiagnosticsInput = Readonly<{
  readonly clock: Readonly<{ now(): number }>;
  readonly declarativeFingerprint: string;
  readonly logger: DiagnosticLogger;
}>;

const TOP_TASK_LIMIT = 3;

type TimingUnavailableReason =
  | "clock-threw"
  | "clock-non-finite"
  | "clock-backward"
  | "interval-invalid"
  | "integral-invalid";

type TimingAvailability =
  | Readonly<{ readonly availability: "available" }>
  | Readonly<{ readonly availability: "unavailable"; readonly reason: TimingUnavailableReason }>;

type AdmissionChronology = {
  readonly admissionDelay: AdmissionDelayBreakdown;
  readonly admittedAt: number;
  settledAt: number | undefined;
};

type AdmissionDelayBreakdown = Readonly<{
  readonly admissiblePendingMs: number;
  readonly capacityBlockedMs: number;
  readonly mutexBlockedMs: number;
}>;

type MutableAdmissionDelayBreakdown = {
  admissiblePendingMs: number;
  capacityBlockedMs: number;
  mutexBlockedMs: number;
};

type CompletionTailContributor = Readonly<{
  readonly settledAfterLastAdmissionMs: number;
  readonly taskId: string;
}>;

export type AdmissionViablePendingTask = Readonly<{
  readonly kind: "admissible-pending" | "capacity-blocked" | "mutex-blocked";
  readonly taskId: string;
}>;

export type SchedulerPerformanceState = Readonly<{
  readonly admissionViablePendingTasks: readonly AdmissionViablePendingTask[];
  readonly effectiveMaxParallel: number;
  readonly rootMaxParallel: number;
  readonly running: number;
}>;

/**
 * Scheduler-owned, invocation-local timing projection. It retains only prior
 * interval values; execution state remains the single source of task truth.
 */
export class SchedulerPerformanceDiagnostics {
  readonly #clock: SchedulerPerformanceDiagnosticsInput["clock"];
  readonly #declarativeFingerprint: string;
  readonly #logger: DiagnosticLogger;
  #lastBoundaryAt: number | undefined;
  #startedAt: number | undefined;
  #lastState: SchedulerPerformanceState;
  #timing: TimingAvailability = { availability: "available" };
  #controlPathMs = 0;
  #decisionObservationMs = 0;
  #taskSlotMs = 0;
  #rootCapacitySlotMs = 0;
  #effectiveCapacitySlotMs = 0;
  #mutexBlockedTaskMs = 0;
  #capacityBlockedTaskMs = 0;
  #admissiblePendingTaskMs = 0;
  #maxRunning = 0;
  #peakAdmissionViablePendingTaskCount = 0;
  #peakMutexBlockedTaskCount = 0;
  #peakCapacityBlockedTaskCount = 0;
  #peakAdmissiblePendingTaskCount = 0;
  #acceptedWaitStartedAt: number | undefined;
  #acceptedWaitMs = 0;
  #acceptedWaitCount = 0;
  #lastAdmissionAt: number | undefined;
  #lastSettledTaskId: string | undefined;
  #completionTailActiveTaskIds: readonly string[] = Object.freeze([]);
  readonly #admittedTaskIds = new Set<string>();
  readonly #admissionDelayByTaskId = new Map<string, MutableAdmissionDelayBreakdown>();
  readonly #chronologyByTaskId = new Map<string, AdmissionChronology>();

  public constructor(
    input: SchedulerPerformanceDiagnosticsInput,
    initial: SchedulerPerformanceState
  ) {
    this.#clock = input.clock;
    this.#declarativeFingerprint = input.declarativeFingerprint;
    this.#logger = input.logger;
    this.#lastState = initial;
    this.#maxRunning = initial.running;
    this.#installPendingProjection(initial.admissionViablePendingTasks);
    const boundary = this.#sample();
    if (boundary !== undefined) {
      this.#lastBoundaryAt = boundary;
      this.#startedAt = boundary;
    }
  }

  /** Accounts a synchronous shell operation, never an await or author callback. */
  public measureControlPath<T>(operation: () => T): T {
    const startedAt = this.#sample();
    try {
      return operation();
    } finally {
      const endedAt = this.#sample();
      if (startedAt !== undefined && endedAt !== undefined) {
        this.#addTiming("control", endedAt - startedAt);
      }
    }
  }

  /** Keeps decision writer work separate from the shell control-path projection. */
  public observeDecision(observation: () => void): void {
    const startedAt = this.#sample();
    try {
      observation();
    } catch {
      // Diagnostic writers are observational; a direct test seam must preserve that containment too.
    }
    const endedAt = this.#sample();
    if (startedAt !== undefined && endedAt !== undefined) {
      this.#addTiming("decision-observation", endedAt - startedAt);
    }
  }

  /** Flushes the old state before admission changes the real Scheduler state. */
  public beforeAdmission(taskId: string, runningTaskIds: readonly string[]): void {
    this.#admittedTaskIds.add(taskId);
    this.#completionTailActiveTaskIds = Object.freeze([...runningTaskIds, taskId]);
    const boundary = this.#boundary();
    if (boundary === undefined) return;
    const admissionDelay = this.#admissionDelayByTaskId.get(taskId);
    if (admissionDelay === undefined) {
      this.#markUnavailable("integral-invalid");
      return;
    }
    this.#chronologyByTaskId.set(taskId, {
      admissionDelay: Object.freeze({ ...admissionDelay }),
      admittedAt: boundary,
      settledAt: undefined
    });
    this.#admissionDelayByTaskId.delete(taskId);
    this.#lastAdmissionAt = boundary;
  }

  /** Flushes the old state before blocked/cancelled changes the real Scheduler state. */
  public beforePendingSettlement(taskIds: readonly string[] = []): void {
    const lastTaskId = taskIds.at(-1);
    if (lastTaskId !== undefined) this.#lastSettledTaskId = lastTaskId;
    this.#boundary();
  }

  /** Flushes the old running interval before removing the actual running Task. */
  public beforeRunningSettlement(taskId: string): void {
    this.#lastSettledTaskId = taskId;
    const boundary = this.#boundary();
    if (boundary === undefined) return;
    this.#closeAcceptedWait(boundary);
    const chronology = this.#chronologyByTaskId.get(taskId);
    if (chronology === undefined) {
      this.#markUnavailable("integral-invalid");
      return;
    }
    chronology.settledAt = boundary;
  }

  /** An accepted policy wait is a phase boundary, unlike a passive null-proposal drain. */
  public beforeAcceptedWait(): void {
    this.#acceptedWaitCount += 1;
    const boundary = this.#boundary();
    if (boundary === undefined) return;
    if (this.#acceptedWaitStartedAt === undefined) {
      this.#acceptedWaitStartedAt = boundary;
    }
  }

  /** Captures real state only after the caller has completed its mutation. */
  public captureState(state: SchedulerPerformanceState): void {
    this.#lastState = state;
    this.#maxRunning = Math.max(this.#maxRunning, state.running);
    this.#installPendingProjection(state.admissionViablePendingTasks);
  }

  /** Terminal sampling flushes the final interval before emitting a one-shot summary. */
  public observeSummary(): void {
    const boundary = this.#boundary();
    if (boundary !== undefined) this.#closeAcceptedWait(boundary);
    try {
      this.#logger.observe({
        event: "scheduler.summary",
        tags: diagnosticTags("SCHEDULER", "SUMMARY"),
        details: this.#summary(boundary)
      });
    } catch {
      // Summary emission cannot revise the Scheduler result or terminal drain.
    }
  }

  #boundary(): number | undefined {
    const now = this.#sample();
    if (now === undefined) return undefined;
    if (this.#lastBoundaryAt !== undefined) {
      const elapsedMs = now - this.#lastBoundaryAt;
      if (elapsedMs < 0 || !Number.isFinite(elapsedMs)) {
        this.#markUnavailable(elapsedMs < 0 ? "clock-backward" : "interval-invalid");
      } else if (this.#timing.availability === "available") {
        this.#addIntegral(elapsedMs, this.#lastState);
      }
    }
    this.#lastBoundaryAt = now;
    return this.#timing.availability === "available" ? now : undefined;
  }

  #sample(): number | undefined {
    if (this.#timing.availability === "unavailable") return undefined;
    try {
      const now = this.#clock.now();
      if (!Number.isFinite(now)) {
        this.#markUnavailable("clock-non-finite");
        return undefined;
      }
      if (this.#lastBoundaryAt !== undefined && now < this.#lastBoundaryAt) {
        this.#markUnavailable("clock-backward");
        return undefined;
      }
      return now;
    } catch {
      this.#markUnavailable("clock-threw");
      return undefined;
    }
  }

  #addTiming(kind: "control" | "decision-observation", elapsedMs: number): void {
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
      this.#markUnavailable("interval-invalid");
      return;
    }
    if (kind === "control") this.#controlPathMs += elapsedMs;
    else this.#decisionObservationMs += elapsedMs;
    if (!Number.isFinite(this.#controlPathMs) || !Number.isFinite(this.#decisionObservationMs)) {
      this.#markUnavailable("integral-invalid");
    }
  }

  #addIntegral(elapsedMs: number, state: SchedulerPerformanceState): void {
    const taskSlotMs = elapsedMs * state.running;
    const rootCapacitySlotMs = elapsedMs * state.rootMaxParallel;
    const effectiveCapacitySlotMs = elapsedMs * state.effectiveMaxParallel;
    const mutexBlockedCount = pendingCount(state.admissionViablePendingTasks, "mutex-blocked");
    const capacityBlockedCount = pendingCount(
      state.admissionViablePendingTasks,
      "capacity-blocked"
    );
    const admissiblePendingCount = pendingCount(
      state.admissionViablePendingTasks,
      "admissible-pending"
    );
    const mutexBlockedTaskMs = elapsedMs * mutexBlockedCount;
    const capacityBlockedTaskMs = elapsedMs * capacityBlockedCount;
    const admissiblePendingTaskMs = elapsedMs * admissiblePendingCount;
    if (
      !Number.isFinite(taskSlotMs) ||
      !Number.isFinite(rootCapacitySlotMs) ||
      !Number.isFinite(effectiveCapacitySlotMs) ||
      !Number.isFinite(mutexBlockedTaskMs) ||
      !Number.isFinite(capacityBlockedTaskMs) ||
      !Number.isFinite(admissiblePendingTaskMs) ||
      taskSlotMs < 0 ||
      rootCapacitySlotMs < 0 ||
      effectiveCapacitySlotMs < 0 ||
      mutexBlockedTaskMs < 0 ||
      capacityBlockedTaskMs < 0 ||
      admissiblePendingTaskMs < 0
    ) {
      this.#markUnavailable("integral-invalid");
      return;
    }
    this.#taskSlotMs += taskSlotMs;
    this.#rootCapacitySlotMs += rootCapacitySlotMs;
    this.#effectiveCapacitySlotMs += effectiveCapacitySlotMs;
    this.#mutexBlockedTaskMs += mutexBlockedTaskMs;
    this.#capacityBlockedTaskMs += capacityBlockedTaskMs;
    this.#admissiblePendingTaskMs += admissiblePendingTaskMs;
    if (
      !Number.isFinite(this.#taskSlotMs) ||
      !Number.isFinite(this.#rootCapacitySlotMs) ||
      !Number.isFinite(this.#effectiveCapacitySlotMs) ||
      !Number.isFinite(this.#mutexBlockedTaskMs) ||
      !Number.isFinite(this.#capacityBlockedTaskMs) ||
      !Number.isFinite(this.#admissiblePendingTaskMs) ||
      !Number.isFinite(this.#admissionViablePendingTaskMs())
    ) {
      this.#markUnavailable("integral-invalid");
      return;
    }
    for (const pendingTask of state.admissionViablePendingTasks) {
      const admissionDelay = this.#admissionDelayByTaskId.get(pendingTask.taskId);
      if (admissionDelay === undefined) continue;
      switch (pendingTask.kind) {
        case "mutex-blocked":
          admissionDelay.mutexBlockedMs += elapsedMs;
          break;
        case "capacity-blocked":
          admissionDelay.capacityBlockedMs += elapsedMs;
          break;
        case "admissible-pending":
          admissionDelay.admissiblePendingMs += elapsedMs;
          break;
        default: {
          const exhaustiveKind: never = pendingTask.kind;
          return exhaustiveKind;
        }
      }
      if (
        !Number.isFinite(admissionDelay.mutexBlockedMs) ||
        !Number.isFinite(admissionDelay.capacityBlockedMs) ||
        !Number.isFinite(admissionDelay.admissiblePendingMs)
      ) {
        this.#markUnavailable("integral-invalid");
        return;
      }
    }
  }

  #installPendingProjection(pendingTasks: readonly AdmissionViablePendingTask[]): void {
    this.#peakAdmissionViablePendingTaskCount = Math.max(
      this.#peakAdmissionViablePendingTaskCount,
      pendingTasks.length
    );
    this.#peakMutexBlockedTaskCount = Math.max(
      this.#peakMutexBlockedTaskCount,
      pendingCount(pendingTasks, "mutex-blocked")
    );
    this.#peakCapacityBlockedTaskCount = Math.max(
      this.#peakCapacityBlockedTaskCount,
      pendingCount(pendingTasks, "capacity-blocked")
    );
    this.#peakAdmissiblePendingTaskCount = Math.max(
      this.#peakAdmissiblePendingTaskCount,
      pendingCount(pendingTasks, "admissible-pending")
    );
    if (this.#timing.availability === "unavailable") return;
    for (const pendingTask of pendingTasks) {
      if (this.#admissionDelayByTaskId.has(pendingTask.taskId)) continue;
      this.#admissionDelayByTaskId.set(pendingTask.taskId, {
        admissiblePendingMs: 0,
        capacityBlockedMs: 0,
        mutexBlockedMs: 0
      });
    }
  }

  #closeAcceptedWait(boundary: number): void {
    if (this.#acceptedWaitStartedAt === undefined) return;
    const elapsedMs = boundary - this.#acceptedWaitStartedAt;
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
      this.#markUnavailable("interval-invalid");
    } else {
      this.#acceptedWaitMs += elapsedMs;
      if (!Number.isFinite(this.#acceptedWaitMs)) this.#markUnavailable("integral-invalid");
    }
    this.#acceptedWaitStartedAt = undefined;
  }

  #markUnavailable(reason: TimingUnavailableReason): void {
    if (this.#timing.availability === "available") {
      this.#timing = Object.freeze({ availability: "unavailable", reason });
    }
  }

  #summary(endedAt: number | undefined): Readonly<Record<string, unknown>> {
    const discrete = Object.freeze({
      admittedCount: this.#admittedTaskIds.size,
      acceptedWaitCount: this.#acceptedWaitCount,
      completionTailActiveTaskCount: this.#completionTailActiveTaskIds.length,
      lastSettledTaskId: this.#lastSettledTaskId ?? null,
      maxRunning: this.#maxRunning
    });
    const alwaysAvailable = Object.freeze({
      declarativeFingerprint: this.#declarativeFingerprint,
      discrete,
      peakAdmissionViablePendingTaskCount: this.#peakAdmissionViablePendingTaskCount,
      peakMutexBlockedTaskCount: this.#peakMutexBlockedTaskCount,
      peakCapacityBlockedTaskCount: this.#peakCapacityBlockedTaskCount,
      peakAdmissiblePendingTaskCount: this.#peakAdmissiblePendingTaskCount
    });
    if (this.#timing.availability === "unavailable" || endedAt === undefined) {
      return Object.freeze({ ...alwaysAvailable, timing: this.#timing });
    }
    const rootSlotUtilization = ratio(this.#taskSlotMs, this.#rootCapacitySlotMs);
    const effectiveSlotUtilization = ratio(this.#taskSlotMs, this.#effectiveCapacitySlotMs);
    const spanMs = this.#startedAt === undefined ? 0 : endedAt - this.#startedAt;
    const topAdmissionDelays = [...this.#chronologyByTaskId.entries()]
      .flatMap(([taskId, chronology]) => {
        if (chronology.settledAt === undefined) return [];
        const admissionDelayMs = admissionDelayMsFor(chronology.admissionDelay);
        return [
          Object.freeze({
            admissiblePendingMs: chronology.admissionDelay.admissiblePendingMs,
            admissionDelayMs,
            capacityBlockedMs: chronology.admissionDelay.capacityBlockedMs,
            mutexBlockedMs: chronology.admissionDelay.mutexBlockedMs,
            taskActiveMs: chronology.settledAt - chronology.admittedAt,
            taskId
          })
        ];
      })
      .sort(
        (left, right) =>
          right.admissionDelayMs - left.admissionDelayMs || compareText(left.taskId, right.taskId)
      )
      .slice(0, TOP_TASK_LIMIT);
    const topCompletionTailContributors = this.#topCompletionTailContributors();
    if (topCompletionTailContributors === undefined) {
      return Object.freeze({ ...alwaysAvailable, timing: this.#timing });
    }
    const completionTailMs =
      this.#lastAdmissionAt === undefined ? null : endedAt - this.#lastAdmissionAt;
    return Object.freeze({
      ...alwaysAvailable,
      timing: Object.freeze({ availability: "available" }),
      schedulerControlPathMs: this.#controlPathMs,
      schedulerDecisionObservationMs: this.#decisionObservationMs,
      schedulerSpanMs: spanMs,
      taskSlotMs: this.#taskSlotMs,
      rootCapacitySlotMs: this.#rootCapacitySlotMs,
      effectiveCapacitySlotMs: this.#effectiveCapacitySlotMs,
      rootSlotUtilization,
      effectiveSlotUtilization,
      acceptedWaitMs: this.#acceptedWaitMs,
      admissionViablePendingTaskMs: this.#admissionViablePendingTaskMs(),
      mutexBlockedTaskMs: this.#mutexBlockedTaskMs,
      capacityBlockedTaskMs: this.#capacityBlockedTaskMs,
      admissiblePendingTaskMs: this.#admissiblePendingTaskMs,
      topAdmissionDelays: Object.freeze(topAdmissionDelays),
      completionTailMs,
      topCompletionTailContributors
    });
  }

  #topCompletionTailContributors(): readonly CompletionTailContributor[] | undefined {
    if (this.#lastAdmissionAt === undefined) return Object.freeze([]);
    const contributors: CompletionTailContributor[] = [];
    for (const taskId of this.#completionTailActiveTaskIds) {
      const settledAt = this.#chronologyByTaskId.get(taskId)?.settledAt;
      if (settledAt === undefined) {
        this.#markUnavailable("integral-invalid");
        return undefined;
      }
      const settledAfterLastAdmissionMs = settledAt - this.#lastAdmissionAt;
      if (!Number.isFinite(settledAfterLastAdmissionMs) || settledAfterLastAdmissionMs < 0) {
        this.#markUnavailable("integral-invalid");
        return undefined;
      }
      contributors.push(Object.freeze({ settledAfterLastAdmissionMs, taskId }));
    }
    contributors.sort(
      (left, right) =>
        right.settledAfterLastAdmissionMs - left.settledAfterLastAdmissionMs ||
        compareText(left.taskId, right.taskId)
    );
    return Object.freeze(contributors.slice(0, TOP_TASK_LIMIT));
  }

  #admissionViablePendingTaskMs(): number {
    return this.#mutexBlockedTaskMs + this.#capacityBlockedTaskMs + this.#admissiblePendingTaskMs;
  }
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  const value = numerator / denominator;
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
}

function admissionDelayMsFor(breakdown: AdmissionDelayBreakdown): number {
  return breakdown.mutexBlockedMs + breakdown.capacityBlockedMs + breakdown.admissiblePendingMs;
}

function pendingCount(
  pendingTasks: readonly AdmissionViablePendingTask[],
  kind: AdmissionViablePendingTask["kind"]
): number {
  return pendingTasks.filter((task) => task.kind === kind).length;
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
