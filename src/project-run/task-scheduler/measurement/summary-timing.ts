import type { ExactSchedulerAdmission } from "./admission-timing.ts";
import type { ExactIntervalContribution } from "./exact-contributions.ts";
import { totalDelay } from "./exact-contributions.ts";
import {
  binaryTimeUnits,
  finiteNonnegative,
  roundedMilliseconds,
  roundedRatio
} from "./exact-time.ts";
export interface SchedulerSummaryTiming {
  readonly admissiblePendingTaskMs: number;
  readonly capacityBlockedTaskMs: number;
  readonly mutexBlockedTaskMs: number;
  readonly admissionViablePendingTaskMs: number;
  readonly schedulerSpanMs: number;
  readonly completionTailMs: number | null;
  readonly rootSlotUtilization: number | null;
  readonly effectiveSlotUtilization: number | null;
  readonly admissionDelayMsByTaskId: ReadonlyMap<string, number>;
  readonly taskActiveMsByTaskId: ReadonlyMap<string, number>;
  readonly settledAfterLastAdmissionMsByTaskId: ReadonlyMap<string, number>;
}
/** Only the real diagnostic consumer asks for this terminal exact-derived projection. */
export function summaryTimingFor(
  input: Readonly<{
    admissions: readonly ExactSchedulerAdmission[];
    totals: ExactIntervalContribution;
    startedAt: number;
    endedAt: number;
    tailActiveIds: readonly string[];
    quantumExponent: number;
  }>
): SchedulerSummaryTiming | undefined {
  const { admissions, totals, startedAt, endedAt, tailActiveIds, quantumExponent } = input;
  const {
    admissible,
    capacity,
    mutex,
    lastAdmission,
    admissionDelayMsByTaskId,
    taskActiveMsByTaskId
  } = admissionSummaryFacts(admissions, quantumExponent);
  const settledAfterLastAdmissionMsByTaskId = tailSettlementSpans(
    admissions,
    tailActiveIds,
    lastAdmission
  );
  const facts: SchedulerSummaryTiming = {
    admissiblePendingTaskMs: roundedMilliseconds(admissible, quantumExponent),
    capacityBlockedTaskMs: roundedMilliseconds(capacity, quantumExponent),
    mutexBlockedTaskMs: roundedMilliseconds(mutex, quantumExponent),
    admissionViablePendingTaskMs: roundedMilliseconds(
      admissible + capacity + mutex,
      quantumExponent
    ),
    schedulerSpanMs: span(endedAt, startedAt),
    completionTailMs: lastAdmission === null ? null : span(endedAt, lastAdmission),
    rootSlotUtilization: ratio(totals.taskSlotMs, totals.rootCapacitySlotMs),
    effectiveSlotUtilization: ratio(totals.taskSlotMs, totals.effectiveCapacitySlotMs),
    admissionDelayMsByTaskId,
    taskActiveMsByTaskId,
    settledAfterLastAdmissionMsByTaskId
  };
  return validSummaryTiming(facts) ? Object.freeze(facts) : undefined;
}

/** Delay totals remain exact until the final independently rounded summary results. */
function admissionSummaryFacts(
  admissions: readonly ExactSchedulerAdmission[],
  quantumExponent: number
) {
  let admissible = 0n,
    capacity = 0n,
    mutex = 0n;
  let lastAdmission: number | null = null;
  const admissionDelayMsByTaskId = new Map<string, number>();
  const taskActiveMsByTaskId = new Map<string, number>();
  for (const admission of admissions) {
    admissible += admission.admissionDelay.admissiblePendingMs;
    capacity += admission.admissionDelay.capacityBlockedMs;
    mutex += admission.admissionDelay.mutexBlockedMs;
    if (admission.admittedAtMonotonicMs === null) continue;
    lastAdmission = Math.max(
      lastAdmission ?? admission.admittedAtMonotonicMs,
      admission.admittedAtMonotonicMs
    );
    if (admission.settledAtMonotonicMs === null) continue;
    admissionDelayMsByTaskId.set(
      admission.taskId,
      roundedMilliseconds(totalDelay(admission.admissionDelay), quantumExponent)
    );
    taskActiveMsByTaskId.set(
      admission.taskId,
      span(admission.settledAtMonotonicMs, admission.admittedAtMonotonicMs)
    );
  }
  return {
    admissible,
    capacity,
    mutex,
    lastAdmission,
    admissionDelayMsByTaskId,
    taskActiveMsByTaskId
  };
}

function tailSettlementSpans(
  admissions: readonly ExactSchedulerAdmission[],
  tailActiveIds: readonly string[],
  lastAdmission: number | null
): ReadonlyMap<string, number> {
  const settledAfterLastAdmissionMsByTaskId = new Map<string, number>();
  const byId = new Map(admissions.map((admission) => [admission.taskId, admission]));
  if (lastAdmission !== null) {
    for (const taskId of tailActiveIds) {
      const settledAt = byId.get(taskId)?.settledAtMonotonicMs;
      if (settledAt !== undefined && settledAt !== null)
        settledAfterLastAdmissionMsByTaskId.set(taskId, span(settledAt, lastAdmission));
    }
  }
  return settledAfterLastAdmissionMsByTaskId;
}

function validSummaryTiming(facts: SchedulerSummaryTiming): boolean {
  const numeric = [
    facts.admissiblePendingTaskMs,
    facts.capacityBlockedTaskMs,
    facts.mutexBlockedTaskMs,
    facts.admissionViablePendingTaskMs,
    facts.schedulerSpanMs,
    ...facts.admissionDelayMsByTaskId.values(),
    ...facts.taskActiveMsByTaskId.values(),
    ...facts.settledAfterLastAdmissionMsByTaskId.values()
  ];
  if (facts.completionTailMs !== null) numeric.push(facts.completionTailMs);
  if (facts.rootSlotUtilization !== null) numeric.push(facts.rootSlotUtilization);
  if (facts.effectiveSlotUtilization !== null) numeric.push(facts.effectiveSlotUtilization);
  return numeric.every(finiteNonnegative);
}

function span(endedAt: number, startedAt: number): number {
  return roundedMilliseconds(binaryTimeUnits(endedAt) - binaryTimeUnits(startedAt));
}
function ratio(numerator: bigint, denominator: bigint): number | null {
  if (denominator === 0n || numerator < 0n || numerator > denominator) return null;
  return roundedRatio(numerator, denominator);
}
