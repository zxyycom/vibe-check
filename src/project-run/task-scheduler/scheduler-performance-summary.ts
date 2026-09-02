import type {
  SchedulerMeasurementAdmission,
  SchedulerMeasurementTimingFacts,
  SchedulerRawMeasurement
} from "../../project-definition/project-definition.ts";

const TOP_TASK_LIMIT = 3;

type AdmissionDelaySummary = Readonly<{
  readonly admissiblePendingMs: number;
  readonly admissionDelayMs: number;
  readonly capacityBlockedMs: number;
  readonly mutexBlockedMs: number;
  readonly taskActiveMs: number;
  readonly taskId: string;
}>;

/** Projects raw Scheduler measurement into the bounded diagnostic summary. */
export function summaryFromSchedulerMeasurement(
  raw: SchedulerRawMeasurement
): Readonly<Record<string, unknown>> {
  const alwaysAvailable = alwaysAvailableSummary(raw);
  if (!hasTimingFacts(raw)) return Object.freeze({ ...alwaysAvailable, timing: raw.timing });

  const timingFacts = raw.timingFacts;
  const delayTotals = admissionDelayTotals(timingFacts.admissions);
  const lastAdmissionAt = latestAdmissionAt(timingFacts.admissions);
  return Object.freeze({
    ...alwaysAvailable,
    timing: raw.timing,
    schedulerControlPathMs: timingFacts.schedulerControlPathMs,
    schedulerDecisionObservationMs: timingFacts.schedulerDecisionObservationMs,
    schedulerSpanMs: timingFacts.endedAtMonotonicMs - timingFacts.startedAtMonotonicMs,
    taskSlotMs: timingFacts.taskSlotMs,
    rootCapacitySlotMs: timingFacts.rootCapacitySlotMs,
    effectiveCapacitySlotMs: timingFacts.effectiveCapacitySlotMs,
    rootSlotUtilization: ratio(timingFacts.taskSlotMs, timingFacts.rootCapacitySlotMs),
    effectiveSlotUtilization: ratio(timingFacts.taskSlotMs, timingFacts.effectiveCapacitySlotMs),
    acceptedWaitMs: timingFacts.acceptedWaitMs,
    ...delayTotals,
    topAdmissionDelays: topAdmissionDelays(timingFacts.admissions),
    completionTailMs:
      lastAdmissionAt === null ? null : timingFacts.endedAtMonotonicMs - lastAdmissionAt,
    topCompletionTailContributors: topCompletionTailContributors(
      raw.discrete.completionTailActiveTaskIds,
      timingFacts.admissions,
      lastAdmissionAt
    )
  });
}

function alwaysAvailableSummary(raw: SchedulerRawMeasurement): Readonly<Record<string, unknown>> {
  return Object.freeze({
    declarativeFingerprint: raw.declarativeFingerprint,
    discrete: Object.freeze({
      acceptedWaitCount: raw.discrete.acceptedWaitCount,
      admittedCount: raw.discrete.admittedCount,
      completionTailActiveTaskCount: raw.discrete.completionTailActiveTaskIds.length,
      lastSettledTaskId: raw.discrete.lastSettledTaskId,
      maxRunning: raw.discrete.maxRunning
    }),
    peakAdmissionViablePendingTaskCount: raw.peaks.admissionViablePendingTaskCount,
    peakMutexBlockedTaskCount: raw.peaks.mutexBlockedTaskCount,
    peakCapacityBlockedTaskCount: raw.peaks.capacityBlockedTaskCount,
    peakAdmissiblePendingTaskCount: raw.peaks.admissiblePendingTaskCount
  });
}

function admissionDelayTotals(admissions: readonly SchedulerMeasurementAdmission[]): Readonly<{
  readonly admissiblePendingTaskMs: number;
  readonly admissionViablePendingTaskMs: number;
  readonly capacityBlockedTaskMs: number;
  readonly mutexBlockedTaskMs: number;
}> {
  let admissiblePendingTaskMs = 0;
  let capacityBlockedTaskMs = 0;
  let mutexBlockedTaskMs = 0;
  for (const admission of admissions) {
    admissiblePendingTaskMs += admission.admissionDelay.admissiblePendingMs;
    capacityBlockedTaskMs += admission.admissionDelay.capacityBlockedMs;
    mutexBlockedTaskMs += admission.admissionDelay.mutexBlockedMs;
  }
  return Object.freeze({
    admissiblePendingTaskMs,
    admissionViablePendingTaskMs:
      admissiblePendingTaskMs + capacityBlockedTaskMs + mutexBlockedTaskMs,
    capacityBlockedTaskMs,
    mutexBlockedTaskMs
  });
}

function topAdmissionDelays(
  admissions: readonly SchedulerMeasurementAdmission[]
): readonly AdmissionDelaySummary[] {
  return Object.freeze(
    admissions
      .flatMap((admission) => {
        if (admission.admittedAtMonotonicMs === null || admission.settledAtMonotonicMs === null) {
          return [];
        }
        return [
          Object.freeze({
            admissiblePendingMs: admission.admissionDelay.admissiblePendingMs,
            admissionDelayMs: admissionDelayMsFor(admission.admissionDelay),
            capacityBlockedMs: admission.admissionDelay.capacityBlockedMs,
            mutexBlockedMs: admission.admissionDelay.mutexBlockedMs,
            taskActiveMs: admission.settledAtMonotonicMs - admission.admittedAtMonotonicMs,
            taskId: admission.taskId
          })
        ];
      })
      .sort(
        (left, right) =>
          right.admissionDelayMs - left.admissionDelayMs || compareText(left.taskId, right.taskId)
      )
      .slice(0, TOP_TASK_LIMIT)
  );
}

function latestAdmissionAt(admissions: readonly SchedulerMeasurementAdmission[]): number | null {
  let latest: number | null = null;
  for (const admission of admissions) {
    if (admission.admittedAtMonotonicMs === null) continue;
    latest = Math.max(latest ?? admission.admittedAtMonotonicMs, admission.admittedAtMonotonicMs);
  }
  return latest;
}

function topCompletionTailContributors(
  activeTaskIds: readonly string[],
  admissions: readonly SchedulerMeasurementAdmission[],
  lastAdmissionAt: number | null
): readonly Readonly<{ readonly settledAfterLastAdmissionMs: number; readonly taskId: string }>[] {
  if (lastAdmissionAt === null) return Object.freeze([]);
  const admittedByTaskId = new Map(admissions.map((admission) => [admission.taskId, admission]));
  return Object.freeze(
    activeTaskIds
      .flatMap((taskId) => {
        const settledAt = admittedByTaskId.get(taskId)?.settledAtMonotonicMs;
        return settledAt === undefined || settledAt === null
          ? []
          : [Object.freeze({ settledAfterLastAdmissionMs: settledAt - lastAdmissionAt, taskId })];
      })
      .sort(
        (left, right) =>
          right.settledAfterLastAdmissionMs - left.settledAfterLastAdmissionMs ||
          compareText(left.taskId, right.taskId)
      )
      .slice(0, TOP_TASK_LIMIT)
  );
}

function hasTimingFacts(raw: SchedulerRawMeasurement): raw is SchedulerRawMeasurement &
  Readonly<{
    readonly timing: Readonly<{ readonly availability: "available" }>;
    readonly timingFacts: SchedulerMeasurementTimingFacts;
  }> {
  return raw.timing.availability === "available";
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  const value = numerator / denominator;
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
}

function admissionDelayMsFor(breakdown: SchedulerMeasurementAdmission["admissionDelay"]): number {
  return breakdown.mutexBlockedMs + breakdown.capacityBlockedMs + breakdown.admissiblePendingMs;
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
