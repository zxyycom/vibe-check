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

/** 在 Scheduler 首个采样前固定的四组独立生产需求。 */
export interface SchedulerMeasurementGroups {
  readonly cumulative: boolean;
  readonly actionHistory: boolean;
  readonly runMeasurement: boolean;
  readonly taskTimings: boolean;
}

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
  readonly #chronologyByTaskId: Map<string, AdmissionChronology> | undefined;
  readonly #policyMeasurement: SchedulerPolicyMeasurement | undefined;
  readonly #groups: SchedulerMeasurementGroups;
  #admittedCount = 0;
  #sealedAt: number | undefined;
  #sealed = false;

  public constructor(
    input: SchedulerPerformanceDiagnosticsInput &
      Readonly<{ readonly groups: SchedulerMeasurementGroups }>,
    initial: SchedulerPerformanceState
  ) {
    this.#declarativeFingerprint = input.declarativeFingerprint;
    this.#logger = input.logger;
    this.#groups = input.groups;
    this.#chronologyByTaskId = this.#groups.taskTimings ? new Map() : undefined;
    this.#policyMeasurement = this.#groups.actionHistory
      ? new SchedulerPolicyMeasurement()
      : undefined;
    this.#timing = new SchedulerPerformanceTiming(input.clock, initial, this.#groups);
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
    return Object.freeze({ timing, admissions: Object.freeze(this.#admissionMeasurements()) });
  }

  public beginSelectedPolicyAction(taskId: string): void {
    this.#policyMeasurement?.beginSelected(taskId, this.#timing.snapshot().totals);
  }

  public beginWaitPolicyAction(): void {
    this.#policyMeasurement?.beginWait(this.#timing.snapshot().totals);
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
            details: summaryFromSchedulerMeasurement(context.runMeasurement, context.taskTimings)
          });
        } catch {
          // Summary writer failure is contained by this hook, not the shared runner.
        }
      }
    };
  }

  #completePolicyAction(): void {
    if (this.#policyMeasurement === undefined) return;
    const timing = this.#timing.snapshot();
    this.#policyMeasurement.complete(timing.totals, timing.timing);
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

  #admissionMeasurements(): SchedulerMeasurementAdmission[] {
    const pendingByTaskId = new Map(
      this.#timing
        .pendingAdmissionDelays()
        .map(({ admissionDelay, taskId }) => [taskId, admissionDelay])
    );
    const taskIds = new Set([
      ...pendingByTaskId.keys(),
      ...(this.#chronologyByTaskId?.keys() ?? [])
    ]);
    return [...taskIds]
      .map((taskId) => this.#admissionMeasurement(taskId, pendingByTaskId))
      .sort((left, right) => compareText(left.taskId, right.taskId));
  }

  #admissionMeasurement(
    taskId: string,
    pendingByTaskId: ReadonlyMap<string, AdmissionDelayBreakdown>
  ): SchedulerMeasurementAdmission {
    const chronology = this.#chronologyByTaskId?.get(taskId);
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
