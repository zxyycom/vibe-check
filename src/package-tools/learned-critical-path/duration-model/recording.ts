import type { SchedulerRawMeasurement } from "../../../project-definition/project-definition.ts";
import {
  freezeSchedulerHistoryModel,
  isBoundedDurationMs,
  MAX_SCHEDULER_HISTORY_SAMPLES_PER_SERIES,
  MAX_SCHEDULER_HISTORY_SERIES,
  type SchedulerDurationSettlementKind,
  type SchedulerHistoryModel,
  type SchedulerHistorySeries
} from "./bounded-history.ts";
import { predictionForTask, type SchedulerPredictionSnapshot } from "./prediction.ts";

type SchedulerMeasurementAdmission = NonNullable<
  SchedulerRawMeasurement["timingFacts"]
>["admissions"][number];

export type SchedulerHistoryRecordingObservation =
  | Readonly<{
      readonly acceptedSampleCount: number;
      readonly retainedSeriesCount: number;
      readonly status: "recorded";
    }>
  | Readonly<{
      readonly acceptedSampleCount: 0;
      readonly retainedSeriesCount: number;
      readonly status: "timing-unavailable";
    }>;

export interface SchedulerHistoryRecording {
  readonly history: SchedulerHistoryModel;
  readonly observation: SchedulerHistoryRecordingObservation;
}

/** Merges only trusted terminal Scheduler occupancy intervals; unavailable timing creates no samples. */
export function recordSchedulerHistory(input: {
  readonly history: SchedulerHistoryModel;
  readonly prediction: SchedulerPredictionSnapshot;
  readonly rawMeasurement: SchedulerRawMeasurement;
  readonly settledTasks: readonly Readonly<{
    readonly kind: SchedulerDurationSettlementKind;
    readonly taskId: string;
  }>[];
  readonly maxSamplesPerSeries?: number;
  readonly maxSeries?: number;
}): SchedulerHistoryRecording {
  const rawMeasurement = input.rawMeasurement;
  const timingFacts = rawMeasurement.timingFacts;
  if (rawMeasurement.timing.availability !== "available" || timingFacts === undefined) {
    return Object.freeze({
      history: input.history,
      observation: Object.freeze({
        acceptedSampleCount: 0,
        retainedSeriesCount: input.history.series.length,
        status: "timing-unavailable"
      })
    });
  }

  return recordedHistory(input, timingFacts.admissions);
}

function recordedHistory(
  input: Parameters<typeof recordSchedulerHistory>[0],
  admissions: readonly SchedulerMeasurementAdmission[]
): SchedulerHistoryRecording {
  const merged = mergeVerifiedAdmissionSamples({
    admissions,
    history: input.history,
    prediction: input.prediction,
    settledByTaskId: new Map(input.settledTasks.map((settled) => [settled.taskId, settled.kind])),
    maxSamplesPerSeries: input.maxSamplesPerSeries ?? MAX_SCHEDULER_HISTORY_SAMPLES_PER_SERIES
  });
  const retained = retainRecentSeries(
    merged.seriesByIdentity.values(),
    input.maxSeries ?? MAX_SCHEDULER_HISTORY_SERIES
  );
  const history = freezeSchedulerHistoryModel({
    latestObservationSequence: merged.latestObservationSequence,
    series: retained
  });
  return Object.freeze({
    history,
    observation: Object.freeze({
      acceptedSampleCount: merged.acceptedSampleCount,
      retainedSeriesCount: history.series.length,
      status: "recorded"
    })
  });
}

type VerifiedAdmissionMerge = Readonly<{
  readonly acceptedSampleCount: number;
  readonly latestObservationSequence: number;
  readonly seriesByIdentity: ReadonlyMap<string, SchedulerHistorySeries>;
}>;

/** Applies valid admissions in Scheduler order and returns the updated identity histories. */
function mergeVerifiedAdmissionSamples(input: {
  readonly admissions: readonly SchedulerMeasurementAdmission[];
  readonly history: SchedulerHistoryModel;
  readonly prediction: SchedulerPredictionSnapshot;
  readonly settledByTaskId: ReadonlyMap<string, SchedulerDurationSettlementKind>;
  readonly maxSamplesPerSeries: number;
}): VerifiedAdmissionMerge {
  const seriesByIdentity = new Map(
    input.history.series.map((series) => [series.identityDigest, series] as const)
  );
  let latestObservationSequence = input.history.latestObservationSequence;
  let acceptedSampleCount = 0;
  for (const admission of input.admissions) {
    const sample = sampleForAdmission(admission, input.prediction, input.settledByTaskId);
    if (sample === undefined || latestObservationSequence === Number.MAX_SAFE_INTEGER) continue;
    latestObservationSequence += 1;
    appendSampleToIdentityHistory(
      seriesByIdentity,
      sample,
      latestObservationSequence,
      input.maxSamplesPerSeries
    );
    acceptedSampleCount += 1;
  }
  return Object.freeze({ acceptedSampleCount, latestObservationSequence, seriesByIdentity });
}

function appendSampleToIdentityHistory(
  seriesByIdentity: Map<string, SchedulerHistorySeries>,
  sample: AdmissionSample,
  observationSequence: number,
  maxSamplesPerSeries: number
): void {
  const existing = seriesByIdentity.get(sample.identityDigest);
  const samples = [
    ...(existing?.samples ?? []),
    {
      durationMs: sample.durationMs,
      observationSequence,
      settlementKind: sample.settlementKind
    }
  ].slice(-maxSamplesPerSeries);
  seriesByIdentity.set(
    sample.identityDigest,
    Object.freeze({
      identityDigest: sample.identityDigest,
      latestObservationSequence: observationSequence,
      samples: Object.freeze(samples)
    })
  );
}

type AdmissionSample = Readonly<{
  readonly durationMs: number;
  readonly identityDigest: string;
  readonly settlementKind: SchedulerDurationSettlementKind;
}>;

function sampleForAdmission(
  admission: Readonly<{
    readonly admittedAtMonotonicMs: number | null;
    readonly settledAtMonotonicMs: number | null;
    readonly taskId: string;
  }>,
  prediction: SchedulerPredictionSnapshot,
  settledByTaskId: ReadonlyMap<string, SchedulerDurationSettlementKind>
): AdmissionSample | undefined {
  if (
    admission.admittedAtMonotonicMs === null ||
    admission.settledAtMonotonicMs === null ||
    !isFiniteMonotonicTimestamp(admission.admittedAtMonotonicMs) ||
    !isFiniteMonotonicTimestamp(admission.settledAtMonotonicMs) ||
    admission.settledAtMonotonicMs < admission.admittedAtMonotonicMs
  ) {
    return undefined;
  }
  const durationMs = admission.settledAtMonotonicMs - admission.admittedAtMonotonicMs;
  if (!isBoundedDurationMs(durationMs)) return undefined;
  const taskPrediction = predictionForTask(prediction, admission.taskId);
  const settlementKind = settledByTaskId.get(admission.taskId);
  if (taskPrediction === undefined || settlementKind === undefined) return undefined;
  return Object.freeze({
    durationMs,
    identityDigest: taskPrediction.identityDigest,
    settlementKind
  });
}

function retainRecentSeries(
  series: Iterable<SchedulerHistorySeries>,
  maxSeries: number
): readonly SchedulerHistorySeries[] {
  return Object.freeze(
    [...series]
      .sort(
        (left, right) =>
          right.latestObservationSequence - left.latestObservationSequence ||
          compareText(left.identityDigest, right.identityDigest)
      )
      .slice(0, maxSeries)
  );
}

function isFiniteMonotonicTimestamp(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
