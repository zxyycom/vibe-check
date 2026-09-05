import type { SchedulerMeasurementIntervalContribution } from "../../../project-definition/project-definition.ts";
import type { AdmissionViablePendingTask, SchedulerPerformanceState } from "./diagnostics.ts";

export type AdmissionDelayBreakdown = Readonly<{
  readonly admissiblePendingMs: number;
  readonly capacityBlockedMs: number;
  readonly mutexBlockedMs: number;
}>;

type MutableAdmissionDelayBreakdown = {
  admissiblePendingMs: number;
  capacityBlockedMs: number;
  mutexBlockedMs: number;
};

export type SchedulerPerformancePeaks = Readonly<{
  readonly admissionViablePendingTaskCount: number;
  readonly admissiblePendingTaskCount: number;
  readonly capacityBlockedTaskCount: number;
  readonly mutexBlockedTaskCount: number;
}>;

/** Accumulates interval-weighted capacity and admission-delay measurements. */
export class SchedulerPerformanceIntegrals {
  #taskSlotMs = 0;
  #rootCapacitySlotMs = 0;
  #effectiveCapacitySlotMs = 0;
  #mutexBlockedTaskMs = 0;
  #capacityBlockedTaskMs = 0;
  #admissiblePendingTaskMs = 0;
  #peakAdmissionViablePendingTaskCount = 0;
  #peakMutexBlockedTaskCount = 0;
  #peakCapacityBlockedTaskCount = 0;
  #peakAdmissiblePendingTaskCount = 0;
  readonly #admissionDelayByTaskId = new Map<string, MutableAdmissionDelayBreakdown>();

  public installPendingProjection(
    pendingTasks: readonly AdmissionViablePendingTask[],
    timingAvailable: boolean
  ): void {
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
    if (!timingAvailable) return;
    for (const pendingTask of pendingTasks) {
      if (this.#admissionDelayByTaskId.has(pendingTask.taskId)) continue;
      this.#admissionDelayByTaskId.set(pendingTask.taskId, {
        admissiblePendingMs: 0,
        capacityBlockedMs: 0,
        mutexBlockedMs: 0
      });
    }
  }

  /** Returns false when an interval cannot be represented as finite non-negative totals. */
  public addInterval(elapsedMs: number, state: SchedulerPerformanceState): boolean {
    const contribution = intervalContribution(elapsedMs, state);
    if (contribution === undefined) return false;
    this.#taskSlotMs += contribution.taskSlotMs;
    this.#rootCapacitySlotMs += contribution.rootCapacitySlotMs;
    this.#effectiveCapacitySlotMs += contribution.effectiveCapacitySlotMs;
    this.#mutexBlockedTaskMs += contribution.mutexBlockedTaskMs;
    this.#capacityBlockedTaskMs += contribution.capacityBlockedTaskMs;
    this.#admissiblePendingTaskMs += contribution.admissiblePendingTaskMs;
    if (!finiteContribution(this.totals())) return false;
    return this.#addAdmissionDelay(elapsedMs, state.admissionViablePendingTasks);
  }

  public takeAdmissionDelay(taskId: string): AdmissionDelayBreakdown | undefined {
    const delay = this.#admissionDelayByTaskId.get(taskId);
    if (delay === undefined) return undefined;
    this.#admissionDelayByTaskId.delete(taskId);
    return Object.freeze({ ...delay });
  }

  public pendingAdmissionDelays(): readonly Readonly<{
    readonly admissionDelay: AdmissionDelayBreakdown;
    readonly taskId: string;
  }>[] {
    return Object.freeze(
      [...this.#admissionDelayByTaskId].map(([taskId, admissionDelay]) =>
        Object.freeze({ admissionDelay: Object.freeze({ ...admissionDelay }), taskId })
      )
    );
  }

  public peaks(): SchedulerPerformancePeaks {
    return Object.freeze({
      admissionViablePendingTaskCount: this.#peakAdmissionViablePendingTaskCount,
      admissiblePendingTaskCount: this.#peakAdmissiblePendingTaskCount,
      capacityBlockedTaskCount: this.#peakCapacityBlockedTaskCount,
      mutexBlockedTaskCount: this.#peakMutexBlockedTaskCount
    });
  }

  public totals(): SchedulerMeasurementIntervalContribution {
    return Object.freeze({
      admissiblePendingTaskMs: this.#admissiblePendingTaskMs,
      acceptedWaitMs: 0,
      capacityBlockedTaskMs: this.#capacityBlockedTaskMs,
      effectiveCapacitySlotMs: this.#effectiveCapacitySlotMs,
      mutexBlockedTaskMs: this.#mutexBlockedTaskMs,
      rootCapacitySlotMs: this.#rootCapacitySlotMs,
      taskSlotMs: this.#taskSlotMs
    });
  }

  #addAdmissionDelay(
    elapsedMs: number,
    pendingTasks: readonly AdmissionViablePendingTask[]
  ): boolean {
    for (const pendingTask of pendingTasks) {
      const delay = this.#admissionDelayByTaskId.get(pendingTask.taskId);
      if (delay === undefined) continue;
      addDelay(delay, pendingTask.kind, elapsedMs);
      if (!finiteAdmissionDelay(delay)) return false;
    }
    return true;
  }
}

function intervalContribution(
  elapsedMs: number,
  state: SchedulerPerformanceState
): SchedulerMeasurementIntervalContribution | undefined {
  const contribution = Object.freeze({
    admissiblePendingTaskMs:
      elapsedMs * pendingCount(state.admissionViablePendingTasks, "admissible-pending"),
    acceptedWaitMs: 0,
    capacityBlockedTaskMs:
      elapsedMs * pendingCount(state.admissionViablePendingTasks, "capacity-blocked"),
    effectiveCapacitySlotMs: elapsedMs * state.effectiveMaxParallel,
    mutexBlockedTaskMs:
      elapsedMs * pendingCount(state.admissionViablePendingTasks, "mutex-blocked"),
    rootCapacitySlotMs: elapsedMs * state.rootMaxParallel,
    taskSlotMs: elapsedMs * state.running
  });
  return finiteContribution(contribution) ? contribution : undefined;
}

function finiteContribution(contribution: SchedulerMeasurementIntervalContribution): boolean {
  return Object.values(contribution).every((value) => Number.isFinite(value) && value >= 0);
}

function addDelay(
  delay: MutableAdmissionDelayBreakdown,
  kind: AdmissionViablePendingTask["kind"],
  elapsedMs: number
): void {
  if (kind === "mutex-blocked") delay.mutexBlockedMs += elapsedMs;
  if (kind === "capacity-blocked") delay.capacityBlockedMs += elapsedMs;
  if (kind === "admissible-pending") delay.admissiblePendingMs += elapsedMs;
}

function finiteAdmissionDelay(delay: MutableAdmissionDelayBreakdown): boolean {
  return Object.values(delay).every((value) => Number.isFinite(value) && value >= 0);
}

function pendingCount(
  pendingTasks: readonly AdmissionViablePendingTask[],
  kind: AdmissionViablePendingTask["kind"]
): number {
  return pendingTasks.filter((task) => task.kind === kind).length;
}
