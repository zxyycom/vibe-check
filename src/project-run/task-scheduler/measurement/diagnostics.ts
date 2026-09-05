import type {
  AdmissionPolicyMeasurement,
  SchedulerDecisionMeasurementCumulative,
  SchedulerMeasurementAdmission,
  SchedulerMeasurementEffect,
  SchedulerMeasurementHook,
  SchedulerRawMeasurement
} from "../../../project-definition/project-definition.ts";
import { diagnosticTags, type DiagnosticLogger } from "../../diagnostic-logging/logger.ts";
import type { AdmissionDelayBreakdown } from "./integrals.ts";
import { summaryFromSchedulerMeasurement } from "./summary.ts";
import { SchedulerPerformanceTiming } from "./timing.ts";
import { SchedulerPolicyMeasurement } from "./policy.ts";

/** Explicit, enabled-only private handoff; the Scheduler never infers this from logger behavior. */
export type SchedulerPerformanceDiagnosticsInput = Readonly<{
  readonly clock: Readonly<{ now(): number }>;
  readonly declarativeFingerprint: string;
  readonly logger?: DiagnosticLogger;
}>;

type AdmissionChronology = {
  readonly admissionDelay: AdmissionDelayBreakdown;
  readonly admittedAt: number;
  settledAt: number | undefined;
};

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
 * Scheduler-owned, invocation-local lifecycle projection. Clock boundaries and
 * numeric interval accumulation remain private collaborators of this owner.
 */
export class SchedulerPerformanceDiagnostics {
  readonly #declarativeFingerprint: string;
  readonly #logger: DiagnosticLogger | undefined;
  readonly #timing: SchedulerPerformanceTiming;
  #lastSettledTaskId: string | undefined;
  #completionTailActiveTaskIds: readonly string[] = Object.freeze([]);
  readonly #admittedTaskIds = new Set<string>();
  readonly #chronologyByTaskId = new Map<string, AdmissionChronology>();
  readonly #policyMeasurement = new SchedulerPolicyMeasurement();

  public constructor(
    input: SchedulerPerformanceDiagnosticsInput,
    initial: SchedulerPerformanceState
  ) {
    this.#declarativeFingerprint = input.declarativeFingerprint;
    this.#logger = input.logger;
    this.#timing = new SchedulerPerformanceTiming(input.clock, initial);
  }

  public measureControlPath<T>(operation: () => T): T {
    return this.#timing.measureControlPath(operation);
  }

  public observeDecision(observation: () => void): void {
    this.#timing.observeDecision(observation);
  }

  /** Flushes the old state before admission changes the real Scheduler state. */
  public beforeAdmission(taskId: string, runningTaskIds: readonly string[]): void {
    this.#admittedTaskIds.add(taskId);
    this.#completionTailActiveTaskIds = Object.freeze([...runningTaskIds, taskId]);
    const boundary = this.#timing.boundary();
    if (boundary === undefined) return;
    const admissionDelay = this.#timing.takeAdmissionDelay(taskId);
    if (admissionDelay === undefined) return this.#timing.invalidate("integral-invalid");
    this.#chronologyByTaskId.set(taskId, {
      admissionDelay,
      admittedAt: boundary,
      settledAt: undefined
    });
  }

  /** Flushes the old state before blocked/cancelled changes the real Scheduler state. */
  public beforePendingSettlement(taskIds: readonly string[] = []): void {
    const lastTaskId = taskIds.at(-1);
    if (lastTaskId !== undefined) this.#lastSettledTaskId = lastTaskId;
    this.#timing.boundary();
  }

  /** Flushes the old running interval before removing the actual running Task. */
  public beforeRunningSettlement(taskId: string): void {
    this.#lastSettledTaskId = taskId;
    const boundary = this.#timing.boundary();
    if (boundary === undefined) return;
    this.#timing.closeAcceptedWait(boundary);
    const chronology = this.#chronologyByTaskId.get(taskId);
    if (chronology === undefined) return this.#timing.invalidate("integral-invalid");
    chronology.settledAt = boundary;
  }

  public beforeAcceptedWait(): void {
    this.#timing.beginAcceptedWait();
  }

  public captureState(state: SchedulerPerformanceState): void {
    this.#timing.captureState(state);
  }

  public rawMeasurement(): SchedulerRawMeasurement {
    return this.#measurement(true);
  }

  public beginSelectedPolicyAction(taskId: string): void {
    this.#policyMeasurement.beginSelected(taskId, this.#timing.snapshot().totals);
  }

  public beginWaitPolicyAction(): void {
    this.#policyMeasurement.beginWait(this.#timing.snapshot().totals);
  }

  public recordEffect(effect: SchedulerMeasurementEffect): void {
    this.#policyMeasurement.recordEffect(effect);
  }

  public policyMeasurement(): AdmissionPolicyMeasurement {
    this.#timing.boundary();
    this.#completePolicyAction();
    return this.#policyMeasurement.snapshot(this.#cumulativeMeasurement());
  }

  public completePendingActionObservation(): void {
    this.#timing.boundary();
    this.#completePolicyAction();
  }

  public admittedTaskIds(): readonly string[] {
    return Object.freeze([...this.#admittedTaskIds]);
  }

  /** Internal default terminal hook; it contains writer failure without runner special-casing. */
  public defaultSummaryHook(): SchedulerMeasurementHook | undefined {
    if (this.#logger === undefined) return undefined;
    const logger = this.#logger;
    return (context) => {
      try {
        logger.observe({
          event: "scheduler.summary",
          tags: diagnosticTags("SUMMARY"),
          details: summaryFromSchedulerMeasurement(context.rawMeasurement)
        });
      } catch {
        // Summary writer failure is contained by this hook, not the shared runner.
      }
    };
  }

  #completePolicyAction(): void {
    const timing = this.#timing.snapshot();
    this.#policyMeasurement.complete(timing.totals, timing.timing);
  }

  #cumulativeMeasurement(): SchedulerDecisionMeasurementCumulative {
    const snapshot = this.#timing.snapshot();
    const facts = Object.freeze({
      declarativeFingerprint: this.#declarativeFingerprint,
      discrete: Object.freeze({
        acceptedWaitCount: snapshot.acceptedWaitCount,
        admittedCount: this.#admittedTaskIds.size,
        maxRunning: snapshot.maxRunning
      }),
      peaks: snapshot.peaks
    });
    if (snapshot.timing.availability === "unavailable") {
      return Object.freeze({ ...facts, timing: snapshot.timing });
    }
    return Object.freeze({
      ...facts,
      timing: snapshot.timing,
      timingFacts: Object.freeze({
        acceptedWaitMs: snapshot.acceptedWaitMs,
        effectiveCapacitySlotMs: snapshot.totals.effectiveCapacitySlotMs,
        rootCapacitySlotMs: snapshot.totals.rootCapacitySlotMs,
        taskSlotMs: snapshot.totals.taskSlotMs
      })
    });
  }

  #measurement(terminal: boolean): SchedulerRawMeasurement {
    const endedAt = this.#timing.boundary();
    if (terminal && endedAt !== undefined) this.#timing.closeAcceptedWait(endedAt);
    const snapshot = this.#timing.snapshot();
    const facts = Object.freeze({
      declarativeFingerprint: this.#declarativeFingerprint,
      discrete: Object.freeze({
        acceptedWaitCount: snapshot.acceptedWaitCount,
        admittedCount: this.#admittedTaskIds.size,
        completionTailActiveTaskIds: Object.freeze([...this.#completionTailActiveTaskIds]),
        lastSettledTaskId: this.#lastSettledTaskId ?? null,
        maxRunning: snapshot.maxRunning
      }),
      peaks: snapshot.peaks
    });
    if (snapshot.timing.availability === "unavailable") {
      return Object.freeze({ ...facts, timing: snapshot.timing });
    }
    if (endedAt === undefined)
      throw new Error("available Scheduler timing has no terminal boundary");
    return Object.freeze({
      ...facts,
      timing: snapshot.timing,
      timingFacts: Object.freeze({
        acceptedWaitMs: snapshot.acceptedWaitMs,
        admissions: Object.freeze(this.#admissionMeasurements()),
        effectiveCapacitySlotMs: snapshot.totals.effectiveCapacitySlotMs,
        endedAtMonotonicMs: endedAt,
        rootCapacitySlotMs: snapshot.totals.rootCapacitySlotMs,
        schedulerControlPathMs: snapshot.schedulerControlPathMs,
        schedulerDecisionObservationMs: snapshot.decisionObservationMs,
        startedAtMonotonicMs: snapshot.startedAtMonotonicMs ?? endedAt,
        taskSlotMs: snapshot.totals.taskSlotMs
      })
    });
  }

  #admissionMeasurements(): SchedulerMeasurementAdmission[] {
    const pendingByTaskId = new Map(
      this.#timing
        .pendingAdmissionDelays()
        .map(({ admissionDelay, taskId }) => [taskId, admissionDelay])
    );
    const taskIds = new Set([...pendingByTaskId.keys(), ...this.#chronologyByTaskId.keys()]);
    return [...taskIds]
      .map((taskId) => this.#admissionMeasurement(taskId, pendingByTaskId))
      .sort((left, right) => compareText(left.taskId, right.taskId));
  }

  #admissionMeasurement(
    taskId: string,
    pendingByTaskId: ReadonlyMap<string, AdmissionDelayBreakdown>
  ): SchedulerMeasurementAdmission {
    const chronology = this.#chronologyByTaskId.get(taskId);
    const admissionDelay = chronology?.admissionDelay ?? pendingByTaskId.get(taskId);
    if (admissionDelay === undefined)
      throw new Error(`missing admission measurement for ${taskId}`);
    return Object.freeze({
      admissionDelay,
      admittedAtMonotonicMs: chronology?.admittedAt ?? null,
      settledAtMonotonicMs: chronology?.settledAt ?? null,
      taskId
    });
  }
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
