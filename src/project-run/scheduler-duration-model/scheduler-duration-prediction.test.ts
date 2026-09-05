import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { emptySchedulerHistory, freezeSchedulerHistoryModel } from "./bounded-history.ts";
import { createSchedulerHistoryIdentity, createSchedulerPredictionSnapshot } from "./prediction.ts";
import { predictionInputs } from "./scheduler-duration-model.test-support.ts";

describe("scheduler duration prediction", () => {
  it("forms a frozen digest-only summary", () => {
    const inputs = predictionInputs(["check"]);
    const input = inputs[0];
    assert.ok(input);
    const history = freezeSchedulerHistoryModel({
      latestObservationSequence: 32,
      series: [
        {
          identityDigest: createSchedulerHistoryIdentity(input),
          latestObservationSequence: 32,
          samples: Array.from({ length: 32 }, (_, index) => ({
            durationMs: index + 1,
            observationSequence: index + 1,
            settlementKind: index === 31 ? "failed" : "completed"
          }))
        }
      ]
    });

    const current = createSchedulerPredictionSnapshot(history, inputs);
    const prediction = current.predictions[0];
    assert.deepEqual(
      {
        estimatedDurationMs: prediction?.estimatedDurationMs,
        meanDurationMs: prediction?.meanDurationMs,
        p90DurationMs: prediction?.p90DurationMs,
        sampleCount: prediction?.sampleCount,
        source: prediction?.source
      },
      {
        estimatedDurationMs: 16.5,
        meanDurationMs: 16.5,
        p90DurationMs: 29,
        sampleCount: 32,
        source: "learned"
      }
    );
    assert.equal(Object.isFrozen(current), true);
    assert.equal(Object.isFrozen(current.predictions), true);
    assert.equal(JSON.stringify(current).includes("author-secret-check"), false);
    assert.equal(JSON.stringify(current).includes("flag-secret"), false);
  });

  it("uses learned means before a median project prior and cold start", () => {
    const inputs = predictionInputs(["fast", "slow", "unknown"]);
    const cold = createSchedulerPredictionSnapshot(emptySchedulerHistory(), inputs);
    assert.deepEqual(
      cold.predictions.map(({ estimatedDurationMs, source }) => ({
        estimatedDurationMs,
        source
      })),
      [
        { estimatedDurationMs: 1, source: "cold-start" },
        { estimatedDurationMs: 1, source: "cold-start" },
        { estimatedDurationMs: 1, source: "cold-start" }
      ]
    );

    const fastInput = inputs[0];
    const slowInput = inputs[1];
    assert.ok(fastInput);
    assert.ok(slowInput);
    const history = freezeSchedulerHistoryModel({
      latestObservationSequence: 2,
      series: [
        {
          identityDigest: createSchedulerHistoryIdentity(fastInput),
          latestObservationSequence: 1,
          samples: [{ durationMs: 10, observationSequence: 1, settlementKind: "completed" }]
        },
        {
          identityDigest: createSchedulerHistoryIdentity(slowInput),
          latestObservationSequence: 2,
          samples: [{ durationMs: 30, observationSequence: 2, settlementKind: "completed" }]
        }
      ]
    });
    const learned = createSchedulerPredictionSnapshot(history, inputs);
    assert.deepEqual(
      learned.predictions.map(({ estimatedDurationMs, sampleCount, source, taskId }) => ({
        estimatedDurationMs,
        sampleCount,
        source,
        taskId
      })),
      [
        { estimatedDurationMs: 10, sampleCount: 1, source: "learned", taskId: "fast" },
        { estimatedDurationMs: 30, sampleCount: 1, source: "learned", taskId: "slow" },
        { estimatedDurationMs: 20, sampleCount: 0, source: "project-prior", taskId: "unknown" }
      ]
    );
    const reversed = createSchedulerPredictionSnapshot(history, [...inputs].reverse());
    assert.equal(reversed.digest, learned.digest);
  });
});
