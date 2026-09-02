import type { SchedulerRawMeasurement } from "../../project-definition/project-definition.ts";
import type { SchedulerSettlementKind } from "../task-scheduler/scheduler-decision.ts";
import {
  freezeSchedulerHistoryModel,
  isBoundedDurationMs,
  MAX_SCHEDULER_HISTORY_SAMPLES_PER_SERIES,
  MAX_SCHEDULER_HISTORY_SERIES,
  type SchedulerHistoryModel,
  type SchedulerHistorySeries
} from "./bounded-history.ts";
import { predictionForTask, type SchedulerPredictionSnapshot } from "./prediction.ts";

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
    readonly kind: SchedulerSettlementKind;
    readonly taskId: string;
  }>[];
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

  const settledByTaskId = new Map(
    input.settledTasks.map((settled) => [settled.taskId, settled.kind])
  );
  const historyByIdentity = new Map(
    input.history.series.map((series) => [series.identityDigest, series] as const)
  );
  let latestObservationSequence = input.history.latestObservationSequence;
  let acceptedSampleCount = 0;
  for (const admission of timingFacts.admissions) {
    const sample = sampleForAdmission(admission, input.prediction, settledByTaskId);
    if (sample === undefined || latestObservationSequence === Number.MAX_SAFE_INTEGER) continue;
    latestObservationSequence += 1;
    const existing = historyByIdentity.get(sample.identityDigest);
    const samples = [
      ...(existing?.samples ?? []),
      {
        durationMs: sample.durationMs,
        observationSequence: latestObservationSequence,
        settlementKind: sample.settlementKind
      }
    ].slice(-MAX_SCHEDULER_HISTORY_SAMPLES_PER_SERIES);
    historyByIdentity.set(
      sample.identityDigest,
      Object.freeze({
        identityDigest: sample.identityDigest,
        latestObservationSequence,
        samples: Object.freeze(samples)
      })
    );
    acceptedSampleCount += 1;
  }

  const retained = retainRecentSeries(historyByIdentity.values());
  const history = freezeSchedulerHistoryModel({ latestObservationSequence, series: retained });
  return Object.freeze({
    history,
    observation: Object.freeze({
      acceptedSampleCount,
      retainedSeriesCount: history.series.length,
      status: "recorded"
    })
  });
}

type AdmissionSample = Readonly<{
  readonly durationMs: number;
  readonly identityDigest: string;
  readonly settlementKind: SchedulerSettlementKind;
}>;

function sampleForAdmission(
  admission: Readonly<{
    readonly admittedAtMonotonicMs: number | null;
    readonly settledAtMonotonicMs: number | null;
    readonly taskId: string;
  }>,
  prediction: SchedulerPredictionSnapshot,
  settledByTaskId: ReadonlyMap<string, SchedulerSettlementKind>
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
  series: Iterable<SchedulerHistorySeries>
): readonly SchedulerHistorySeries[] {
  return Object.freeze(
    [...series]
      .sort(
        (left, right) =>
          right.latestObservationSequence - left.latestObservationSequence ||
          compareText(left.identityDigest, right.identityDigest)
      )
      .slice(0, MAX_SCHEDULER_HISTORY_SERIES)
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
