import type {
  SchedulerMeasurementIntervalContribution,
  SchedulerMeasurementTiming,
  SchedulerMeasurementTimingUnavailableReason
} from "../../../project-definition/project-definition.ts";
import type { SchedulerPerformanceState } from "./diagnostics.ts";
import {
  SchedulerPerformanceIntegrals,
  type AdmissionDelayBreakdown,
  type SchedulerPerformancePeaks
} from "./integrals.ts";

export type SchedulerPerformanceTimingSnapshot = Readonly<{
  readonly acceptedWaitCount: number;
  readonly acceptedWaitMs: number;
  readonly decisionObservationMs: number;
  readonly maxRunning: number;
  readonly peaks: SchedulerPerformancePeaks;
  readonly schedulerControlPathMs: number;
  readonly startedAtMonotonicMs: number | undefined;
  readonly timing: SchedulerMeasurementTiming;
  readonly totals: SchedulerMeasurementIntervalContribution;
}>;

/** Owns monotonic clock boundaries and delegates numeric interval accumulation. */
export class SchedulerPerformanceTiming {
  readonly #clock: Readonly<{ now(): number }>;
  readonly #integrals = new SchedulerPerformanceIntegrals();
  #lastBoundaryAt: number | undefined;
  #startedAt: number | undefined;
  #lastState: SchedulerPerformanceState;
  #timing: SchedulerMeasurementTiming = Object.freeze({ availability: "available" });
  #controlPathMs = 0;
  #decisionObservationMs = 0;
  #maxRunning: number;
  #acceptedWaitStartedAt: number | undefined;
  #acceptedWaitMs = 0;
  #acceptedWaitCount = 0;

  public constructor(clock: Readonly<{ now(): number }>, initial: SchedulerPerformanceState) {
    this.#clock = clock;
    this.#lastState = initial;
    this.#maxRunning = initial.running;
    this.#integrals.installPendingProjection(initial.admissionViablePendingTasks, true);
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
      this.#addTiming("control", startedAt, this.#sample());
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
    this.#addTiming("decision-observation", startedAt, this.#sample());
  }

  public boundary(): number | undefined {
    const now = this.#sample();
    if (now === undefined) return undefined;
    if (this.#lastBoundaryAt !== undefined) this.#addElapsed(now - this.#lastBoundaryAt);
    this.#lastBoundaryAt = now;
    return this.#timing.availability === "available" ? now : undefined;
  }

  public beginAcceptedWait(): void {
    this.#acceptedWaitCount += 1;
    const boundary = this.boundary();
    if (boundary !== undefined && this.#acceptedWaitStartedAt === undefined) {
      this.#acceptedWaitStartedAt = boundary;
    }
  }

  public closeAcceptedWait(boundary: number): void {
    if (this.#acceptedWaitStartedAt === undefined) return;
    const elapsedMs = boundary - this.#acceptedWaitStartedAt;
    if (!validElapsed(elapsedMs)) this.#markUnavailable("interval-invalid");
    else this.#acceptedWaitMs += elapsedMs;
    if (!Number.isFinite(this.#acceptedWaitMs)) this.#markUnavailable("integral-invalid");
    this.#acceptedWaitStartedAt = undefined;
  }

  public captureState(state: SchedulerPerformanceState): void {
    this.#lastState = state;
    this.#maxRunning = Math.max(this.#maxRunning, state.running);
    this.#integrals.installPendingProjection(
      state.admissionViablePendingTasks,
      this.#timing.availability === "available"
    );
  }

  public takeAdmissionDelay(taskId: string): AdmissionDelayBreakdown | undefined {
    return this.#integrals.takeAdmissionDelay(taskId);
  }

  public pendingAdmissionDelays(): ReturnType<
    SchedulerPerformanceIntegrals["pendingAdmissionDelays"]
  > {
    return this.#integrals.pendingAdmissionDelays();
  }

  public snapshot(): SchedulerPerformanceTimingSnapshot {
    const integralTotals = this.#integrals.totals();
    return Object.freeze({
      acceptedWaitCount: this.#acceptedWaitCount,
      acceptedWaitMs: this.#acceptedWaitMs,
      decisionObservationMs: this.#decisionObservationMs,
      maxRunning: this.#maxRunning,
      peaks: this.#integrals.peaks(),
      schedulerControlPathMs: this.#controlPathMs,
      startedAtMonotonicMs: this.#startedAt,
      timing: this.#timing,
      totals: Object.freeze({ ...integralTotals, acceptedWaitMs: this.#acceptedWaitMs })
    });
  }

  public invalidate(reason: SchedulerMeasurementTimingUnavailableReason): void {
    this.#markUnavailable(reason);
  }

  #sample(): number | undefined {
    if (this.#timing.availability === "unavailable") return undefined;
    try {
      const now = this.#clock.now();
      if (!Number.isFinite(now)) return this.#unavailable("clock-non-finite");
      if (this.#lastBoundaryAt !== undefined && now < this.#lastBoundaryAt) {
        return this.#unavailable("clock-backward");
      }
      return now;
    } catch {
      return this.#unavailable("clock-threw");
    }
  }

  #addTiming(
    kind: "control" | "decision-observation",
    startedAt: number | undefined,
    endedAt: number | undefined
  ): void {
    if (startedAt === undefined || endedAt === undefined) return;
    const elapsedMs = endedAt - startedAt;
    if (!validElapsed(elapsedMs)) return this.#markUnavailable("interval-invalid");
    if (kind === "control") this.#controlPathMs += elapsedMs;
    else this.#decisionObservationMs += elapsedMs;
    if (!Number.isFinite(this.#controlPathMs) || !Number.isFinite(this.#decisionObservationMs)) {
      this.#markUnavailable("integral-invalid");
    }
  }

  #addElapsed(elapsedMs: number): void {
    if (!validElapsed(elapsedMs)) {
      this.#markUnavailable(elapsedMs < 0 ? "clock-backward" : "interval-invalid");
      return;
    }
    if (this.#timing.availability !== "available") return;
    if (!this.#integrals.addInterval(elapsedMs, this.#lastState)) {
      this.#markUnavailable("integral-invalid");
    }
  }

  #unavailable(reason: SchedulerMeasurementTimingUnavailableReason): undefined {
    this.#markUnavailable(reason);
    return undefined;
  }

  #markUnavailable(reason: SchedulerMeasurementTimingUnavailableReason): void {
    if (this.#timing.availability === "available") {
      this.#timing = Object.freeze({ availability: "unavailable", reason });
    }
  }
}

function validElapsed(elapsedMs: number): boolean {
  return Number.isFinite(elapsedMs) && elapsedMs >= 0;
}
