import type { SchedulerMeasurementContext } from "../../project-definition/project-definition.ts";
import { recordSchedulerHistory, type SchedulerHistoryRecordingObservation } from "./recording.ts";
import {
  createSchedulerPredictionSnapshot,
  type SchedulerPredictionInput,
  type SchedulerPredictionSnapshot
} from "./prediction.ts";
import { loadSchedulerHistory, writeSchedulerHistory } from "./storage.ts";

export type SchedulerDurationModelPreparation =
  | Readonly<{
      readonly kind: "ready";
      readonly prediction: SchedulerPredictionSnapshot;
      readonly readObservation: Awaited<ReturnType<typeof loadSchedulerHistory>>["observation"];
      readonly retainedSeriesCount: number;
      readonly record: (
        terminalMeasurement: SchedulerMeasurementContext
      ) => Promise<SchedulerDurationModelRecordObservation>;
    }>
  | Readonly<{ readonly kind: "static-fallback" }>;

export type SchedulerDurationModelRecordObservation =
  | Readonly<{
      readonly kind: "recorded";
      readonly recording: SchedulerHistoryRecordingObservation;
      readonly writeObservation: Awaited<ReturnType<typeof writeSchedulerHistory>>;
    }>
  | Readonly<{ readonly kind: "failed" }>;

/** Prepares one immutable duration prediction and its terminal record capability outside Scheduler. */
export async function prepareSchedulerDurationModel(input: {
  readonly predictionInputs: readonly SchedulerPredictionInput[];
  readonly stateDirectory: string;
}): Promise<SchedulerDurationModelPreparation> {
  try {
    const loaded = await loadSchedulerHistory(input.stateDirectory);
    const prediction = createSchedulerPredictionSnapshot(loaded.history, input.predictionInputs);
    return Object.freeze({
      kind: "ready",
      prediction,
      readObservation: loaded.observation,
      retainedSeriesCount: loaded.history.series.length,
      record: async (terminalMeasurement) => {
        try {
          const recorded = recordSchedulerHistory({
            history: loaded.history,
            prediction,
            rawMeasurement: terminalMeasurement.rawMeasurement,
            settledTasks: terminalMeasurement.execution.settledTasks
          });
          const writeObservation = await writeSchedulerHistory(
            input.stateDirectory,
            recorded.history
          );
          return Object.freeze({
            kind: "recorded",
            recording: recorded.observation,
            writeObservation
          });
        } catch {
          return Object.freeze({ kind: "failed" });
        }
      }
    });
  } catch {
    return Object.freeze({ kind: "static-fallback" });
  }
}
