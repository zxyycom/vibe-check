import { diagnosticTags, type DiagnosticLogger } from "../diagnostic-logging/logger.ts";

/** Explicit, enabled-only private handoff; the Scheduler never infers this from logger behavior. */
export type SchedulerPerformanceDiagnosticsInput = Readonly<{
  readonly clock: Readonly<{ now(): number }>;
  readonly logger: DiagnosticLogger;
}>;

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
  readonly admittedAt: number;
  readonly graphReadyAt: number;
  settledAt: number | undefined;
};

type SchedulerPerformanceState = Readonly<{
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
  #maxRunning = 0;
  #acceptedWaitStartedAt: number | undefined;
  #acceptedWaitMs = 0;
  #acceptedWaitCount = 0;
  #lastAdmissionAt: number | undefined;
  #lastSettledTaskId: string | undefined;
  readonly #admittedTaskIds = new Set<string>();
  readonly #graphReadyAtByTaskId = new Map<string, number>();
  readonly #chronologyByTaskId = new Map<string, AdmissionChronology>();

  public constructor(
    input: SchedulerPerformanceDiagnosticsInput,
    initial: SchedulerPerformanceState
  ) {
    this.#clock = input.clock;
    this.#logger = input.logger;
    this.#lastState = initial;
    this.#maxRunning = initial.running;
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

  /** Records all Tasks that became graph-ready at one Scheduler state boundary. */
  public recordGraphReady(taskIds: readonly string[]): void {
    const newlyReadyTaskIds = taskIds.filter((taskId) => !this.#graphReadyAtByTaskId.has(taskId));
    if (newlyReadyTaskIds.length === 0) return;
    const boundary = this.#boundary();
    if (boundary !== undefined) {
      for (const taskId of newlyReadyTaskIds) {
        this.#graphReadyAtByTaskId.set(taskId, boundary);
      }
    }
  }

  /** Flushes the old state before admission changes the real Scheduler state. */
  public beforeAdmission(taskId: string): void {
    this.#admittedTaskIds.add(taskId);
    const boundary = this.#boundary();
    if (boundary === undefined) return;
    const graphReadyAt = this.#graphReadyAtByTaskId.get(taskId);
    if (graphReadyAt === undefined) {
      this.#markUnavailable("integral-invalid");
      return;
    }
    this.#chronologyByTaskId.set(taskId, {
      admittedAt: boundary,
      graphReadyAt,
      settledAt: undefined
    });
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
    if (
      !Number.isFinite(taskSlotMs) ||
      !Number.isFinite(rootCapacitySlotMs) ||
      !Number.isFinite(effectiveCapacitySlotMs) ||
      taskSlotMs < 0 ||
      rootCapacitySlotMs < 0 ||
      effectiveCapacitySlotMs < 0
    ) {
      this.#markUnavailable("integral-invalid");
      return;
    }
    this.#taskSlotMs += taskSlotMs;
    this.#rootCapacitySlotMs += rootCapacitySlotMs;
    this.#effectiveCapacitySlotMs += effectiveCapacitySlotMs;
    if (
      !Number.isFinite(this.#taskSlotMs) ||
      !Number.isFinite(this.#rootCapacitySlotMs) ||
      !Number.isFinite(this.#effectiveCapacitySlotMs)
    ) {
      this.#markUnavailable("integral-invalid");
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
      lastSettledTaskId: this.#lastSettledTaskId ?? null,
      maxRunning: this.#maxRunning
    });
    if (this.#timing.availability === "unavailable" || endedAt === undefined) {
      return Object.freeze({ discrete, timing: this.#timing });
    }
    const rootSlotUtilization = ratio(this.#taskSlotMs, this.#rootCapacitySlotMs);
    const effectiveSlotUtilization = ratio(this.#taskSlotMs, this.#effectiveCapacitySlotMs);
    const spanMs = this.#startedAt === undefined ? 0 : endedAt - this.#startedAt;
    const topAdmissionDelays = [...this.#chronologyByTaskId.entries()]
      .flatMap(([taskId, chronology]) => {
        if (chronology.settledAt === undefined) return [];
        return [
          Object.freeze({
            admissionDelayMs: chronology.admittedAt - chronology.graphReadyAt,
            taskActiveMs: chronology.settledAt - chronology.admittedAt,
            taskId
          })
        ];
      })
      .sort(
        (left, right) =>
          right.admissionDelayMs - left.admissionDelayMs || left.taskId.localeCompare(right.taskId)
      )
      .slice(0, 3);
    const completionTailMs =
      this.#lastAdmissionAt === undefined ? null : endedAt - this.#lastAdmissionAt;
    return Object.freeze({
      discrete,
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
      topAdmissionDelays: Object.freeze(topAdmissionDelays),
      completionTailMs
    });
  }
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  const value = numerator / denominator;
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
}
