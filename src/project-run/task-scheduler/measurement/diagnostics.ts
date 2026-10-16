import {
  exactAdmissionMeasurements,
  roundedAdmissionMeasurements,
  type AdmissionChronology
} from "./admission-timing.ts";
import type {
  SchedulerActionHistory,
  SchedulerDecisionMeasurementCumulative,
  SchedulerMeasurementAdmission,
  SchedulerMeasurementEffect,
  SchedulerTerminalEffect,
  SchedulerMeasurementContext,
  SchedulerRunMeasurement,
  SchedulerTaskTimings
} from "../../../project-definition/project-definition.ts";
import { diagnosticTags, type DiagnosticLogger } from "../../diagnostic-logging/logger.ts";
import type { AdmissionCoreState } from "../admission-core/selection.ts";
import { summaryTimingFor, type SchedulerSummaryTiming } from "./summary-timing.ts";
import { summaryFromSchedulerMeasurement } from "./summary.ts";
import { SchedulerPerformanceTiming } from "./timing.ts";
import { SchedulerPolicyMeasurement } from "./policy.ts";

/** Explicit, enabled-only private handoff; the Scheduler never infers this from logger behavior. */
export type SchedulerPerformanceDiagnosticsInput = Readonly<{
  readonly clock: Readonly<{ now(): number }>;
  readonly declarativeFingerprint: string;
  readonly logger?: DiagnosticLogger;
}>;

/** 在 Scheduler 首个采样前固定的四组独立生产需求。 */
export interface SchedulerMeasurementGroups {
  readonly cumulative: boolean;
  readonly actionHistory: boolean;
  readonly runMeasurement: boolean;
  readonly taskTimings: boolean;
}

export type SchedulerPerformanceState = Readonly<{
  readonly core: AdmissionCoreState;
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
  readonly #chronologyByTaskId: Map<string, AdmissionChronology> | undefined;
  readonly #policyMeasurement: SchedulerPolicyMeasurement | undefined;
  readonly #groups: SchedulerMeasurementGroups;
  #admittedCount = 0;
  #sealedAt: number | undefined;
  #sealed = false;
  #sealedAdmissions: readonly SchedulerMeasurementAdmission[] | undefined;
  #summaryTiming: SchedulerSummaryTiming | undefined;

  public constructor(
    input: SchedulerPerformanceDiagnosticsInput &
      Readonly<{ readonly groups: SchedulerMeasurementGroups }>,
    initial: SchedulerPerformanceState
  ) {
    this.#declarativeFingerprint = input.declarativeFingerprint;
    this.#logger = input.logger;
    this.#groups = input.groups;
    this.#chronologyByTaskId = this.#groups.taskTimings ? new Map() : undefined;
    this.#timing = new SchedulerPerformanceTiming(input.clock, initial, this.#groups);
    this.#policyMeasurement = this.#groups.actionHistory
      ? new SchedulerPolicyMeasurement(this.#timing.timeQuantumExponent)
      : undefined;
  }

  public measureControlPath<T>(operation: () => T): T {
    return this.#timing.measureControlPath(operation);
  }

  public observeDecision(observation: () => void): void {
    this.#timing.observeDecision(observation);
  }

  /** Flushes the old state before admission changes the real Scheduler state. */
  public beforeAdmission(taskId: string, runningTaskIds: () => readonly string[]): void {
    this.#admittedCount++;
    if (this.#groups.runMeasurement)
      this.#completionTailActiveTaskIds = Object.freeze([...runningTaskIds(), taskId]);
    const boundary = this.#timing.boundary();
    if (boundary === undefined || this.#chronologyByTaskId === undefined) return;
    const admissionDelay = this.#timing.takeAdmissionDelay(taskId);
    if (admissionDelay === undefined) {
      this.#timing.invalidate("integral-invalid");
      return;
    }
    this.#chronologyByTaskId.set(taskId, {
      admissionDelay,
      admittedAt: boundary,
      settledAt: undefined
    });
  }

  /** Flushes the old state before blocked/cancelled changes the real Scheduler state. */
  public beforePendingSettlement(taskIds: readonly string[] = []): void {
    const lastTaskId = taskIds.at(-1);
    if (this.#groups.runMeasurement && lastTaskId !== undefined)
      this.#lastSettledTaskId = lastTaskId;
    this.#timing.boundary();
  }

  /** Flushes the old running interval before removing the actual running Task. */
  public beforeRunningSettlement(taskId: string): void {
    if (this.#groups.runMeasurement) this.#lastSettledTaskId = taskId;
    const boundary = this.#timing.boundary();
    if (boundary === undefined) return;
    this.#timing.closeAcceptedWait(boundary);
    if (this.#chronologyByTaskId === undefined) return;
    const chronology = this.#chronologyByTaskId.get(taskId);
    if (chronology === undefined) {
      this.#timing.invalidate("integral-invalid");
      return;
    }
    chronology.settledAt = boundary;
  }

  public beforeAcceptedWait(): void {
    this.#timing.beginAcceptedWait();
  }

  public captureState(state: SchedulerPerformanceState): void {
    this.#timing.captureState(state);
  }

  public seal(): void {
    if (this.#sealed) return;
    this.#sealedAt = this.#timing.boundary();
    if (this.#sealedAt !== undefined) this.#timing.closeAcceptedWait(this.#sealedAt);
    this.#sealTaskMeasurements();
    this.#completePolicyAction();
    this.#sealed = true;
  }

  public runMeasurement(): SchedulerRunMeasurement {
    if (!this.#groups.runMeasurement) throw new Error("Run measurement was not enabled");
    this.seal();
    return this.#measurement();
  }

  public taskTimings(): SchedulerTaskTimings {
    if (!this.#groups.taskTimings) throw new Error("Task timings were not enabled");
    this.seal();
    const timing = this.#timing.availability;
    if (timing.availability === "unavailable") return Object.freeze({ timing });
    if (this.#sealedAdmissions === undefined)
      throw new Error("available task timing was not sealed");
    return Object.freeze({ timing, admissions: this.#sealedAdmissions });
  }

  public beginSelectedPolicyAction(taskId: string): void {
    this.#policyMeasurement?.beginSelected(taskId, this.#timing.exactCheckpoint());
  }

  public beginWaitPolicyAction(): void {
    this.#policyMeasurement?.beginWait(this.#timing.exactCheckpoint());
  }

  public recordEffect(effect: SchedulerMeasurementEffect): void {
    this.#policyMeasurement?.recordEffect(effect);
  }

  public decisionMeasurement(): Readonly<{
    readonly cumulative?: SchedulerDecisionMeasurementCumulative;
    readonly actionHistory?: SchedulerActionHistory;
  }> {
    this.#timing.boundary();
    this.#completePolicyAction();
    return Object.freeze({
      ...(this.#groups.cumulative ? { cumulative: this.#cumulativeMeasurement() } : {}),
      ...(this.#policyMeasurement === undefined
        ? {}
        : { actionHistory: this.#policyMeasurement.snapshot() })
    });
  }

  public completePendingActionObservation(): void {
    this.#timing.boundary();
    this.#completePolicyAction();
  }

  /** Internal default terminal hook; it contains writer failure without runner special-casing. */
  public defaultSummaryHook(): SchedulerTerminalEffect | undefined {
    if (this.#logger === undefined) return undefined;
    const logger = this.#logger;
    return {
      contextNeeds: ["runMeasurement", "taskTimings"],
      callback: (context: Pick<SchedulerMeasurementContext, "runMeasurement" | "taskTimings">) => {
        try {
          logger.observe({
            event: "scheduler.summary",
            tags: diagnosticTags("SUMMARY"),
            details: summaryFromSchedulerMeasurement(
              context.runMeasurement,
              context.taskTimings,
              this.#summaryTiming
            )
          });
        } catch {
          // Summary writer failure is contained by this hook, not the shared runner.
        }
      }
    };
  }

  #completePolicyAction(): void {
    if (this.#policyMeasurement === undefined) return;
    const valid = this.#policyMeasurement.complete(
      this.#timing.exactCheckpoint(),
      this.#timing.availability
    );
    if (!valid) this.#timing.invalidate("integral-invalid");
  }

  #cumulativeMeasurement(): SchedulerDecisionMeasurementCumulative {
    const snapshot = this.#timing.snapshot();
    const facts = Object.freeze({
      declarativeFingerprint: this.#declarativeFingerprint,
      discrete: Object.freeze({
        acceptedWaitCount: snapshot.acceptedWaitCount,
        admittedCount: this.#admittedCount,
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

  #measurement(): SchedulerRunMeasurement {
    const endedAt = this.#sealedAt;
    const snapshot = this.#timing.snapshot();
    const facts = Object.freeze({
      declarativeFingerprint: this.#declarativeFingerprint,
      discrete: Object.freeze({
        acceptedWaitCount: snapshot.acceptedWaitCount,
        admittedCount: this.#admittedCount,
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

  #sealTaskMeasurements(): void {
    if (!this.#groups.taskTimings || this.#timing.availability.availability === "unavailable")
      return;
    const exactAdmissions = exactAdmissionMeasurements(
      this.#chronologyByTaskId,
      this.#timing.pendingAdmissionDelays()
    );
    const admissions = roundedAdmissionMeasurements(
      exactAdmissions,
      this.#timing.timeQuantumExponent
    );
    if (admissions === undefined) {
      this.#timing.invalidate("integral-invalid");
      return;
    }
    this.#sealedAdmissions = Object.freeze(admissions);
    if (this.#logger === undefined) return;
    const startedAt = this.#timing.snapshot().startedAtMonotonicMs;
    const endedAt = this.#sealedAt;
    if (startedAt === undefined || endedAt === undefined)
      throw new Error("available summary timing has no boundaries");
    this.#summaryTiming = summaryTimingFor({
      admissions: exactAdmissions,
      totals: this.#timing.exactCheckpoint(),
      startedAt,
      endedAt,
      tailActiveIds: this.#completionTailActiveTaskIds,
      quantumExponent: this.#timing.timeQuantumExponent
    });
    if (this.#summaryTiming === undefined) this.#timing.invalidate("integral-invalid");
  }
}
