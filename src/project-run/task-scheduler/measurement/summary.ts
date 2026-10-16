import type {
  SchedulerMeasurementAdmission,
  SchedulerRunMeasurementTimingFacts,
  SchedulerRunMeasurement,
  SchedulerTaskTimings
} from "../../../project-definition/project-definition.ts";
import type { SchedulerSummaryTiming } from "./summary-timing.ts";
const TOP_TASK_LIMIT = 3;
type AdmissionDelaySummary = Readonly<{
  admissiblePendingMs: number;
  admissionDelayMs: number;
  capacityBlockedMs: number;
  mutexBlockedMs: number;
  taskActiveMs: number;
  taskId: string;
}>;

/** Projects the sealed exact-derived numeric facts; never re-sums rounded public DTOs. */
export function summaryFromSchedulerMeasurement(
  raw: SchedulerRunMeasurement,
  tasks: SchedulerTaskTimings,
  numeric: SchedulerSummaryTiming | undefined
): Readonly<Record<string, unknown>> {
  const alwaysAvailable = alwaysAvailableSummary(raw);
  if (!hasTimingFacts(raw) || !("admissions" in tasks))
    return Object.freeze({ ...alwaysAvailable, timing: raw.timing });
  if (numeric === undefined)
    throw new Error("available Scheduler summary has no sealed numeric projection");
  const timingFacts = raw.timingFacts;
  return Object.freeze({
    ...alwaysAvailable,
    timing: raw.timing,
    schedulerControlPathMs: timingFacts.schedulerControlPathMs,
    schedulerDecisionObservationMs: timingFacts.schedulerDecisionObservationMs,
    schedulerSpanMs: numeric.schedulerSpanMs,
    taskSlotMs: timingFacts.taskSlotMs,
    rootCapacitySlotMs: timingFacts.rootCapacitySlotMs,
    effectiveCapacitySlotMs: timingFacts.effectiveCapacitySlotMs,
    rootSlotUtilization: numeric.rootSlotUtilization,
    effectiveSlotUtilization: numeric.effectiveSlotUtilization,
    acceptedWaitMs: timingFacts.acceptedWaitMs,
    admissiblePendingTaskMs: numeric.admissiblePendingTaskMs,
    capacityBlockedTaskMs: numeric.capacityBlockedTaskMs,
    mutexBlockedTaskMs: numeric.mutexBlockedTaskMs,
    admissionViablePendingTaskMs: numeric.admissionViablePendingTaskMs,
    topAdmissionDelays: topAdmissionDelays(tasks.admissions, numeric),
    completionTailMs: numeric.completionTailMs,
    topCompletionTailContributors: topCompletionTailContributors(
      raw.discrete.completionTailActiveTaskIds,
      numeric
    )
  });
}
function alwaysAvailableSummary(raw: SchedulerRunMeasurement): Readonly<Record<string, unknown>> {
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
function topAdmissionDelays(
  admissions: readonly SchedulerMeasurementAdmission[],
  numeric: SchedulerSummaryTiming
): readonly AdmissionDelaySummary[] {
  return Object.freeze(
    admissions
      .flatMap((admission) => {
        if (admission.admittedAtMonotonicMs === null || admission.settledAtMonotonicMs === null)
          return [];
        const admissionDelayMs = numeric.admissionDelayMsByTaskId.get(admission.taskId);
        const taskActiveMs = numeric.taskActiveMsByTaskId.get(admission.taskId);
        if (admissionDelayMs === undefined || taskActiveMs === undefined)
          throw new Error("sealed summary Task projection is missing");
        return [
          Object.freeze({
            admissiblePendingMs: admission.admissionDelay.admissiblePendingMs,
            admissionDelayMs,
            capacityBlockedMs: admission.admissionDelay.capacityBlockedMs,
            mutexBlockedMs: admission.admissionDelay.mutexBlockedMs,
            taskActiveMs,
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
function topCompletionTailContributors(
  activeTaskIds: readonly string[],
  numeric: SchedulerSummaryTiming
): readonly Readonly<{ settledAfterLastAdmissionMs: number; taskId: string }>[] {
  return Object.freeze(
    activeTaskIds
      .flatMap((taskId) => {
        const elapsed = numeric.settledAfterLastAdmissionMsByTaskId.get(taskId);
        return elapsed === undefined
          ? []
          : [Object.freeze({ settledAfterLastAdmissionMs: elapsed, taskId })];
      })
      .sort(
        (left, right) =>
          right.settledAfterLastAdmissionMs - left.settledAfterLastAdmissionMs ||
          compareText(left.taskId, right.taskId)
      )
      .slice(0, TOP_TASK_LIMIT)
  );
}
function hasTimingFacts(raw: SchedulerRunMeasurement): raw is SchedulerRunMeasurement &
  Readonly<{
    timing: Readonly<{ availability: "available" }>;
    timingFacts: SchedulerRunMeasurementTimingFacts;
  }> {
  return raw.timing.availability === "available";
}
function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
