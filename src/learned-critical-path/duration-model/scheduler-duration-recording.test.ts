import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SchedulerRawMeasurement } from "../../project-definition/project-definition.ts";
import {
  emptySchedulerHistory,
  MAX_SCHEDULER_HISTORY_SERIES,
  type SchedulerDurationSettlementKind
} from "./bounded-history.ts";
import { createSchedulerPredictionSnapshot } from "./prediction.ts";
import { recordSchedulerHistory } from "./recording.ts";
import { predictionInputs } from "./scheduler-duration-model.test-support.ts";

function availableMeasurement(
  admissions: readonly Readonly<{
    readonly admittedAtMonotonicMs: number | null;
    readonly settledAtMonotonicMs: number | null;
    readonly taskId: string;
  }>[]
): SchedulerRawMeasurement {
  return Object.freeze({
    declarativeFingerprint: "sha256:measurement",
    discrete: Object.freeze({
      acceptedWaitCount: 0,
      admittedCount: admissions.filter((admission) => admission.admittedAtMonotonicMs !== null)
        .length,
      completionTailActiveTaskIds: Object.freeze([]),
      lastSettledTaskId: null,
      maxRunning: 1
    }),
    peaks: Object.freeze({
      admissiblePendingTaskCount: 0,
      admissionViablePendingTaskCount: 0,
      capacityBlockedTaskCount: 0,
      mutexBlockedTaskCount: 0
    }),
    timing: Object.freeze({ availability: "available" as const }),
    timingFacts: Object.freeze({
      acceptedWaitMs: 0,
      admissions: Object.freeze(
        admissions.map((admission) =>
          Object.freeze({
            admissionDelay: Object.freeze({
              admissiblePendingMs: 0,
              capacityBlockedMs: 0,
              mutexBlockedMs: 0
            }),
            admittedAtMonotonicMs: admission.admittedAtMonotonicMs,
            settledAtMonotonicMs: admission.settledAtMonotonicMs,
            taskId: admission.taskId
          })
        )
      ),
      effectiveCapacitySlotMs: 0,
      endedAtMonotonicMs: 0,
      rootCapacitySlotMs: 0,
      schedulerControlPathMs: 0,
      schedulerDecisionObservationMs: 0,
      startedAtMonotonicMs: 0,
      taskSlotMs: 0
    })
  });
}

function unavailableMeasurement(): SchedulerRawMeasurement {
  return Object.freeze({
    declarativeFingerprint: "sha256:measurement",
    discrete: Object.freeze({
      acceptedWaitCount: 0,
      admittedCount: 0,
      completionTailActiveTaskIds: Object.freeze([]),
      lastSettledTaskId: null,
      maxRunning: 0
    }),
    peaks: Object.freeze({
      admissiblePendingTaskCount: 0,
      admissionViablePendingTaskCount: 0,
      capacityBlockedTaskCount: 0,
      mutexBlockedTaskCount: 0
    }),
    timing: Object.freeze({ availability: "unavailable" as const, reason: "clock-threw" as const })
  });
}

function settled(taskId: string, kind: SchedulerDurationSettlementKind = "completed") {
  return Object.freeze({ kind, taskId });
}

function recordOneSample(input: {
  readonly durationMs: number;
  readonly history: ReturnType<typeof emptySchedulerHistory>;
  readonly prediction: ReturnType<typeof createSchedulerPredictionSnapshot>;
  readonly settlementKind?: SchedulerDurationSettlementKind;
  readonly taskId?: string;
}) {
  const taskId = input.taskId ?? "check";
  return recordSchedulerHistory({
    history: input.history,
    prediction: input.prediction,
    rawMeasurement: availableMeasurement([
      { admittedAtMonotonicMs: 10, settledAtMonotonicMs: 10 + input.durationMs, taskId }
    ]),
    settledTasks: [settled(taskId, input.settlementKind)]
  });
}

describe("scheduler duration recording", () => {
  it("retains bounded admitted samples", () => {
    const inputs = predictionInputs(["check"]);
    let history = emptySchedulerHistory();
    for (let durationMs = 0; durationMs <= 32; durationMs += 1) {
      const prediction = createSchedulerPredictionSnapshot(history, inputs);
      history = recordOneSample({
        durationMs,
        history,
        prediction,
        settlementKind: durationMs === 32 ? "failed" : "completed"
      }).history;
    }

    assert.equal(history.series[0]?.samples.length, 32);
    assert.equal(history.series[0]?.samples[0]?.durationMs, 1);
    assert.equal(history.series[0]?.samples.at(-1)?.settlementKind, "failed");

    const floatInputs = predictionInputs(["float-duration"]);
    const floatPrediction = createSchedulerPredictionSnapshot(emptySchedulerHistory(), floatInputs);
    const floatRecorded = recordOneSample({
      durationMs: 12.5,
      history: emptySchedulerHistory(),
      prediction: floatPrediction,
      taskId: "float-duration"
    });
    assert.equal(floatRecorded.observation.acceptedSampleCount, 1);
  });

  it("does not create samples when timing is unavailable", () => {
    const inputs = predictionInputs(["fast", "slow", "unknown"]);
    const initial = emptySchedulerHistory();
    const cold = createSchedulerPredictionSnapshot(initial, inputs);
    const recorded = recordSchedulerHistory({
      history: initial,
      prediction: cold,
      rawMeasurement: availableMeasurement([
        { admittedAtMonotonicMs: 0, settledAtMonotonicMs: 10, taskId: "fast" },
        { admittedAtMonotonicMs: 0, settledAtMonotonicMs: 30, taskId: "slow" },
        { admittedAtMonotonicMs: null, settledAtMonotonicMs: null, taskId: "unknown" }
      ]),
      settledTasks: [settled("fast"), settled("slow"), settled("unknown")]
    });
    assert.deepEqual(recorded.observation, {
      acceptedSampleCount: 2,
      retainedSeriesCount: 2,
      status: "recorded"
    });

    const timingUnavailable = recordSchedulerHistory({
      history: recorded.history,
      prediction: createSchedulerPredictionSnapshot(recorded.history, inputs),
      rawMeasurement: unavailableMeasurement(),
      settledTasks: [settled("fast")]
    });
    assert.equal(timingUnavailable.observation.status, "timing-unavailable");
    assert.equal(timingUnavailable.history, recorded.history);
  });

  it("evicts the oldest series beyond capacity", () => {
    const ids = Array.from(
      { length: MAX_SCHEDULER_HISTORY_SERIES + 1 },
      (_, index) => `check-${index}`
    );
    const inputs = predictionInputs(ids);
    const prediction = createSchedulerPredictionSnapshot(emptySchedulerHistory(), inputs);
    const recorded = recordSchedulerHistory({
      history: emptySchedulerHistory(),
      prediction,
      rawMeasurement: availableMeasurement(
        ids.map((taskId, index) => ({
          admittedAtMonotonicMs: index,
          settledAtMonotonicMs: index + 1,
          taskId
        }))
      ),
      settledTasks: ids.map((taskId) => settled(taskId))
    });
    assert.equal(recorded.history.series.length, MAX_SCHEDULER_HISTORY_SERIES);
    assert.equal(
      recorded.history.series.some(
        (series) => series.identityDigest === prediction.predictions[0]?.identityDigest
      ),
      false
    );
  });
});
