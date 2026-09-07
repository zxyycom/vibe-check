export const SCHEDULER_HISTORY_ENVELOPE_VERSION = "scheduler-history-envelope-v1";
export const SCHEDULER_HISTORY_FILE_NAME = "scheduler-history.json";
export const SCHEDULER_HISTORY_MODEL_VERSION = "scheduler-duration-model-v1";
export const MAX_SCHEDULER_HISTORY_SAMPLES_PER_SERIES = 32;
export const MAX_SCHEDULER_HISTORY_SERIES = 4_096;

/** Bound persisted task-active durations so aggregates remain exact safe integers. */
export const MAX_SCHEDULER_HISTORY_DURATION_MS = 2_147_483_647;

/** Persisted terminal kind vocabulary; duration storage does not depend on Scheduler ownership. */
export type SchedulerDurationSettlementKind =
  | "completed"
  | "prerequisite-unsatisfied"
  | "failed"
  | "blocked"
  | "cancelled-before-start";

export interface SchedulerHistorySample {
  readonly durationMs: number;
  readonly observationSequence: number;
  readonly settlementKind: SchedulerDurationSettlementKind;
}

export interface SchedulerHistorySeries {
  readonly identityDigest: string;
  readonly latestObservationSequence: number;
  readonly samples: readonly SchedulerHistorySample[];
}

/** Immutable, Product-private local model; the only persisted state is its closed envelope. */
export interface SchedulerHistoryModel {
  readonly latestObservationSequence: number;
  readonly series: readonly SchedulerHistorySeries[];
}

export function emptySchedulerHistory(): SchedulerHistoryModel {
  return Object.freeze({ latestObservationSequence: 0, series: Object.freeze([]) });
}

export function schedulerHistorySeries(
  history: SchedulerHistoryModel,
  identityDigest: string
): SchedulerHistorySeries | undefined {
  return history.series.find((series) => series.identityDigest === identityDigest);
}

export function freezeSchedulerHistoryModel(input: {
  readonly latestObservationSequence: number;
  readonly series: readonly SchedulerHistorySeries[];
}): SchedulerHistoryModel {
  return Object.freeze({
    latestObservationSequence: input.latestObservationSequence,
    series: Object.freeze(
      [...input.series]
        .sort((left, right) => compareText(left.identityDigest, right.identityDigest))
        .map((series) =>
          Object.freeze({
            identityDigest: series.identityDigest,
            latestObservationSequence: series.latestObservationSequence,
            samples: Object.freeze(
              series.samples.map((sample) =>
                Object.freeze({
                  durationMs: sample.durationMs,
                  observationSequence: sample.observationSequence,
                  settlementKind: sample.settlementKind
                })
              )
            )
          })
        )
    )
  });
}

export function isSchedulerHistoryIdentityDigest(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[0-9a-f]{64}$/.test(value);
}

export function isSchedulerSettlementKind(
  value: unknown
): value is SchedulerDurationSettlementKind {
  return (
    value === "completed" ||
    value === "prerequisite-unsatisfied" ||
    value === "failed" ||
    value === "blocked" ||
    value === "cancelled-before-start"
  );
}

export function isBoundedDurationMs(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= MAX_SCHEDULER_HISTORY_DURATION_MS
  );
}

export function isObservationSequence(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
