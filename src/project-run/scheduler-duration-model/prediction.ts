import { createHash } from "node:crypto";

import { canonicalJsonBytes, type CanonicalJsonValue } from "../../data-boundary/canonical-data.ts";
import {
  SCHEDULER_HISTORY_MODEL_VERSION,
  schedulerHistorySeries,
  type SchedulerHistoryModel
} from "./bounded-history.ts";

export type SchedulerPredictionSource = "learned" | "project-prior" | "cold-start";

export interface SchedulerPredictionInput {
  readonly authoredOptions: CanonicalJsonValue;
  readonly checkId: string;
  readonly flags: CanonicalJsonValue;
  readonly taskId: string;
}

export interface SchedulerTaskPrediction {
  readonly estimatedDurationMs: number;
  readonly identityDigest: string;
  readonly meanDurationMs: number | null;
  readonly p90DurationMs: number | null;
  readonly sampleCount: number;
  readonly source: SchedulerPredictionSource;
  readonly taskId: string;
}

/** Frozen before Scheduler admission; it does not retain authored options or flag values. */
export interface SchedulerPredictionSnapshot {
  readonly digest: string;
  readonly modelVersion: string;
  readonly predictions: readonly SchedulerTaskPrediction[];
}

export function createSchedulerHistoryIdentity(input: {
  readonly authoredOptions: CanonicalJsonValue;
  readonly checkId: string;
  readonly flags: CanonicalJsonValue;
}): string {
  const authoredOptionsDigest = digestCanonicalValue(input.authoredOptions);
  const flagsDigest = digestCanonicalValue(input.flags);
  return digestCanonicalValue({
    authoredOptionsDigest,
    checkId: input.checkId,
    flagsDigest,
    modelVersion: SCHEDULER_HISTORY_MODEL_VERSION
  });
}

/** Forms learned means first, then one project median prior, without invoking preflight. */
export function createSchedulerPredictionSnapshot(
  history: SchedulerHistoryModel,
  inputs: readonly SchedulerPredictionInput[]
): SchedulerPredictionSnapshot {
  const learned = inputs.map((input) => learnedPrediction(history, input));
  const projectPrior = median(
    learned.flatMap((prediction) =>
      prediction.source === "learned" ? [prediction.estimatedDurationMs] : []
    )
  );
  const predictions = learned.map((prediction) => {
    if (prediction.source === "learned") return prediction;
    if (projectPrior === undefined) return coldStartPrediction(prediction);
    return projectPriorPrediction(prediction, projectPrior);
  });
  const digest = digestCanonicalValue({
    modelVersion: SCHEDULER_HISTORY_MODEL_VERSION,
    predictions: [...predictions]
      .sort((left, right) => compareText(left.taskId, right.taskId))
      .map((prediction) => ({
        estimatedDurationMs: prediction.estimatedDurationMs,
        identityDigest: prediction.identityDigest,
        meanDurationMs: prediction.meanDurationMs,
        p90DurationMs: prediction.p90DurationMs,
        sampleCount: prediction.sampleCount,
        source: prediction.source,
        taskId: prediction.taskId
      }))
  });
  return Object.freeze({
    digest,
    modelVersion: SCHEDULER_HISTORY_MODEL_VERSION,
    predictions: Object.freeze(predictions.map(freezePrediction))
  });
}

export function predictionForTask(
  snapshot: SchedulerPredictionSnapshot,
  taskId: string
): SchedulerTaskPrediction | undefined {
  return snapshot.predictions.find((prediction) => prediction.taskId === taskId);
}

function learnedPrediction(
  history: SchedulerHistoryModel,
  input: SchedulerPredictionInput
): SchedulerTaskPrediction {
  const identityDigest = createSchedulerHistoryIdentity(input);
  const samples = schedulerHistorySeries(history, identityDigest)?.samples ?? [];
  if (samples.length === 0) {
    return Object.freeze({
      estimatedDurationMs: 0,
      identityDigest,
      meanDurationMs: null,
      p90DurationMs: null,
      sampleCount: 0,
      source: "cold-start",
      taskId: input.taskId
    });
  }
  const meanDurationMs = arithmeticMean(samples.map((sample) => sample.durationMs));
  return Object.freeze({
    estimatedDurationMs: meanDurationMs,
    identityDigest,
    meanDurationMs,
    p90DurationMs: p90(samples.map((sample) => sample.durationMs)),
    sampleCount: samples.length,
    source: "learned",
    taskId: input.taskId
  });
}

function projectPriorPrediction(
  prediction: SchedulerTaskPrediction,
  projectPrior: number
): SchedulerTaskPrediction {
  return Object.freeze({
    ...prediction,
    estimatedDurationMs: projectPrior,
    source: "project-prior"
  });
}

function coldStartPrediction(prediction: SchedulerTaskPrediction): SchedulerTaskPrediction {
  return Object.freeze({ ...prediction, estimatedDurationMs: 1, source: "cold-start" });
}

function freezePrediction(prediction: SchedulerTaskPrediction): SchedulerTaskPrediction {
  return Object.freeze({ ...prediction });
}

function digestCanonicalValue(value: CanonicalJsonValue): string {
  return `sha256:${createHash("sha256").update(canonicalJsonBytes(value)).digest("hex")}`;
}

function arithmeticMean(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

/** The p90 is the nearest-rank element from an ascending finite duration window. */
function p90(values: readonly number[]): number {
  const ordered = [...values].sort((left, right) => left - right);
  const index = Math.ceil(ordered.length * 0.9) - 1;
  return ordered[index] ?? 0;
}

function median(values: readonly number[]): number | undefined {
  if (values.length === 0) return undefined;
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  const upper = ordered[middle];
  if (upper === undefined) return undefined;
  if (ordered.length % 2 === 1) return upper;
  const lower = ordered[middle - 1];
  return lower === undefined ? undefined : (lower + upper) / 2;
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
