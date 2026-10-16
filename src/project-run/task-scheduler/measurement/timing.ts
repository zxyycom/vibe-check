import type {
  SchedulerMeasurementIntervalContribution,
  SchedulerMeasurementTiming,
  SchedulerMeasurementTimingUnavailableReason
} from "../../../project-definition/project-definition.ts";
import { SchedulerPerformanceIntegrals } from "./integrals.ts";
import type { SchedulerPerformanceState, SchedulerMeasurementGroups } from "./diagnostics.ts";
import type { ExactAdmissionDelay, ExactIntervalContribution } from "./exact-contributions.ts";
import { roundDelay } from "./exact-contributions.ts";
import {
  binaryTimeUnits,
  roundedMilliseconds,
  finiteNonnegative,
  timeQuantumExponent
} from "./exact-time.ts";
import { SchedulerQueueMeasurements, type QueuePeaks } from "./queue.ts";
export type SchedulerPerformanceTimingSnapshot = Readonly<{
  acceptedWaitCount: number;
  acceptedWaitMs: number;
  decisionObservationMs: number;
  maxRunning: number;
  peaks: QueuePeaks;
  schedulerControlPathMs: number;
  startedAtMonotonicMs: number | undefined;
  timing: SchedulerMeasurementTiming;
  totals: SchedulerMeasurementIntervalContribution;
}>;
/** Sole clock boundary owner. Exact arithmetic changes neither clock calls nor state attribution. */
export class SchedulerPerformanceTiming {
  readonly #clock: Readonly<{ now(): number }>;
  readonly #integrals: SchedulerPerformanceIntegrals;
  readonly #queue: SchedulerQueueMeasurements;
  readonly #groups: SchedulerMeasurementGroups;
  readonly #quantumExponent: number;
  #lastBoundaryAt: number | undefined;
  #lastBoundaryUnits: bigint | undefined;
  readonly #startedAt: number | undefined;
  #lastState: SchedulerPerformanceState;
  #timing: SchedulerMeasurementTiming = Object.freeze({ availability: "available" });
  #controlPath = 0n;
  #observation = 0n;
  #maxRunning: number;
  #acceptedWaitStartedAt: bigint | undefined;
  #acceptedWait = 0n;
  #acceptedWaitCount = 0;
  constructor(
    clock: Readonly<{ now(): number }>,
    initial: SchedulerPerformanceState,
    groups: SchedulerMeasurementGroups
  ) {
    this.#groups = groups;
    this.#clock = clock;
    this.#lastState = initial;
    this.#maxRunning = initial.running;
    this.#queue = new SchedulerQueueMeasurements(initial.core, {
      delays: groups.taskTimings,
      peaks: groups.cumulative || groups.runMeasurement
    });
    const boundary = this.#sample();
    this.#quantumExponent = boundary === undefined ? -1074 : timeQuantumExponent(boundary);
    this.#integrals = new SchedulerPerformanceIntegrals(groups, this.#queue, this.#quantumExponent);
    if (boundary !== undefined) {
      this.#lastBoundaryAt = boundary;
      this.#lastBoundaryUnits = binaryTimeUnits(boundary, this.#quantumExponent);
      this.#startedAt = boundary;
    }
  }
  public measureControlPath<T>(operation: () => T): T {
    const startedAt = this.#sample();
    try {
      return operation();
    } finally {
      this.#addTiming("control", startedAt, this.#sample());
    }
  }
  public observeDecision(observation: () => void): void {
    const startedAt = this.#sample();
    try {
      observation();
    } catch {
      /* Observational writers cannot revise execution. */
    }
    this.#addTiming("decision-observation", startedAt, this.#sample());
  }
  public boundary(): number | undefined {
    const now = this.#sample();
    if (now === undefined) return undefined;
    const units = binaryTimeUnits(now, this.#quantumExponent);
    if (this.#lastBoundaryUnits !== undefined) this.#addElapsed(units - this.#lastBoundaryUnits);
    this.#lastBoundaryAt = now;
    this.#lastBoundaryUnits = units;
    this.#validateRequestedTotals();
    return this.#timing.availability === "available" ? now : undefined;
  }
  public beginAcceptedWait(): void {
    if (!this.#groups.cumulative && !this.#groups.actionHistory && !this.#groups.runMeasurement) {
      this.boundary();
      return;
    }
    this.#acceptedWaitCount++;
    const boundary = this.boundary();
    if (boundary !== undefined && this.#acceptedWaitStartedAt === undefined)
      this.#acceptedWaitStartedAt = binaryTimeUnits(boundary, this.#quantumExponent);
  }
  public closeAcceptedWait(boundary: number): void {
    if (this.#acceptedWaitStartedAt === undefined) return;
    const elapsed = binaryTimeUnits(boundary, this.#quantumExponent) - this.#acceptedWaitStartedAt;
    if (elapsed < 0n) this.#markUnavailable("interval-invalid");
    else this.#acceptedWait += elapsed;
    this.#acceptedWaitStartedAt = undefined;
    this.#validateRequestedTotals();
  }
  public captureState(state: SchedulerPerformanceState): void {
    this.#queue.capture(state.core, this.#timing.availability === "available");
    this.#lastState = state;
    this.#maxRunning = Math.max(this.#maxRunning, state.running);
  }
  public takeAdmissionDelay(taskId: string): ExactAdmissionDelay | undefined {
    const delay = this.#queue.takeAdmissionDelay(taskId);
    if (
      delay !== undefined &&
      !Object.values(roundDelay(delay, this.#quantumExponent)).every(finiteNonnegative)
    )
      this.#markUnavailable("integral-invalid");
    return delay;
  }
  public pendingAdmissionDelays(): ReturnType<
    SchedulerQueueMeasurements["pendingAdmissionDelays"]
  > {
    return this.#queue.pendingAdmissionDelays();
  }
  public get availability(): SchedulerMeasurementTiming {
    return this.#timing;
  }
  public get timeQuantumExponent(): number {
    return this.#quantumExponent;
  }
  public exactCheckpoint(): ExactIntervalContribution {
    return Object.freeze({ ...this.#integrals.exactTotals(), acceptedWaitMs: this.#acceptedWait });
  }
  public snapshot(): SchedulerPerformanceTimingSnapshot {
    return Object.freeze({
      acceptedWaitCount: this.#acceptedWaitCount,
      acceptedWaitMs: roundedMilliseconds(this.#acceptedWait, this.#quantumExponent),
      decisionObservationMs: roundedMilliseconds(this.#observation, this.#quantumExponent),
      maxRunning: this.#maxRunning,
      peaks: this.#queue.peaks(),
      schedulerControlPathMs: roundedMilliseconds(this.#controlPath, this.#quantumExponent),
      startedAtMonotonicMs: this.#startedAt,
      timing: this.#timing,
      totals: Object.freeze({
        ...this.#integrals.totals(),
        acceptedWaitMs: roundedMilliseconds(this.#acceptedWait, this.#quantumExponent)
      })
    });
  }
  public invalidate(reason: SchedulerMeasurementTimingUnavailableReason): void {
    this.#markUnavailable(reason);
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
  #addTiming(
    kind: "control" | "decision-observation",
    startedAt: number | undefined,
    endedAt: number | undefined
  ): void {
    if (!this.#groups.runMeasurement || startedAt === undefined || endedAt === undefined) return;
    const elapsed =
      binaryTimeUnits(endedAt, this.#quantumExponent) -
      binaryTimeUnits(startedAt, this.#quantumExponent);
    if (elapsed < 0n) {
      this.#markUnavailable("interval-invalid");
      return;
    }
    if (kind === "control") this.#controlPath += elapsed;
    else this.#observation += elapsed;
    this.#validateRequestedTotals();
  }
  #addElapsed(elapsed: bigint): void {
    if (elapsed < 0n) {
      this.#markUnavailable("clock-backward");
      return;
    }
    if (this.#timing.availability !== "available") return;
    if (!this.#integrals.addInterval(elapsed, this.#lastState)) {
      this.#markUnavailable("integral-invalid");
      return;
    }
    this.#queue.addInterval(elapsed);
  }
  #validateRequestedTotals(): void {
    if (!this.#integrals.validAggregateTotals()) {
      this.#markUnavailable("integral-invalid");
      return;
    }
    if (
      (this.#groups.cumulative || this.#groups.runMeasurement) &&
      !finiteNonnegative(roundedMilliseconds(this.#acceptedWait, this.#quantumExponent))
    )
      this.#markUnavailable("integral-invalid");
    if (
      this.#groups.runMeasurement &&
      (!finiteNonnegative(roundedMilliseconds(this.#controlPath, this.#quantumExponent)) ||
        !finiteNonnegative(roundedMilliseconds(this.#observation, this.#quantumExponent)))
    )
      this.#markUnavailable("integral-invalid");
  }
  #markUnavailable(reason: SchedulerMeasurementTimingUnavailableReason): void {
    if (this.#timing.availability === "available")
      this.#timing = Object.freeze({ availability: "unavailable", reason });
  }
}
