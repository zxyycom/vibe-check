import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { SchedulerRawMeasurement } from "../../project-definition/project-definition.ts";
import type { SchedulerSettlementKind } from "../task-scheduler/scheduler-decision.ts";
import { createSchedulerCriticalPathSnapshot, criticalPathScoreForTask } from "./critical-path.ts";
import {
  createSchedulerHistoryIdentity,
  createSchedulerPredictionSnapshot,
  type SchedulerPredictionInput
} from "./prediction.ts";
import {
  MAX_SCHEDULER_HISTORY_SERIES,
  SCHEDULER_HISTORY_ENVELOPE_VERSION
} from "./bounded-history.ts";
import { recordSchedulerHistory } from "./recording.ts";
import { loadSchedulerHistory, schedulerHistoryPath, writeSchedulerHistory } from "./storage.ts";

async function withStateDirectory(run: (directory: string) => Promise<void>): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "vibe-check-scheduler-history-"));
  try {
    await run(directory);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}

function predictionInputs(ids: readonly string[]): readonly SchedulerPredictionInput[] {
  return Object.freeze(
    ids.map((id) =>
      Object.freeze({
        authoredOptions: Object.freeze({ id, privateToken: `author-secret-${id}` }),
        checkId: id,
        flags: Object.freeze(["enabled", "flag-secret"]),
        taskId: id
      })
    )
  );
}

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

function settled(taskId: string, kind: SchedulerSettlementKind = "completed") {
  return Object.freeze({ kind, taskId });
}

function recordOneSample(input: {
  readonly durationMs: number;
  readonly history: Awaited<ReturnType<typeof loadSchedulerHistory>>["history"];
  readonly prediction: ReturnType<typeof createSchedulerPredictionSnapshot>;
  readonly settlementKind?: SchedulerSettlementKind;
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

describe("scheduler history and prediction", () => {
  it("persists bounded admitted Task samples without retaining authored inputs", async () => {
    await withStateDirectory(async (directory) => {
      const initial = await loadSchedulerHistory(directory);
      assert.equal(initial.observation, "missing");
      const inputs = predictionInputs(["check"]);
      let history = initial.history;
      for (let durationMs = 0; durationMs <= 32; durationMs += 1) {
        const prediction = createSchedulerPredictionSnapshot(history, inputs);
        history = recordOneSample({
          durationMs,
          history,
          prediction,
          settlementKind: durationMs === 32 ? "failed" : "completed"
        }).history;
      }

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
      assert.equal(history.series[0]?.samples.length, 32);
      assert.equal(history.series[0]?.samples[0]?.durationMs, 1);
      assert.equal(history.series[0]?.samples.at(-1)?.settlementKind, "failed");

      assert.equal(await writeSchedulerHistory(directory, history), "stored");
      const persisted = await readFile(schedulerHistoryPath(directory), "utf8");
      assert.equal(persisted.includes('"id":"check"'), false);
      assert.equal(persisted.includes("author-secret-check"), false);
      assert.equal(persisted.includes("flag-secret"), false);
      assert.equal((await loadSchedulerHistory(directory)).observation, "loaded");
      assert.equal(
        (await readdir(directory)).some((name) => name.endsWith(".tmp")),
        false,
        "temporary publication files must be cleaned after atomic replacement"
      );

      const floatDirectory = join(directory, "floating-duration");
      const floatInitial = await loadSchedulerHistory(floatDirectory);
      const floatInputs = predictionInputs(["float-duration"]);
      const floatPrediction = createSchedulerPredictionSnapshot(floatInitial.history, floatInputs);
      const floatRecorded = recordOneSample({
        durationMs: 12.5,
        history: floatInitial.history,
        prediction: floatPrediction,
        taskId: "float-duration"
      });
      assert.equal(floatRecorded.observation.acceptedSampleCount, 1);
      assert.equal(await writeSchedulerHistory(floatDirectory, floatRecorded.history), "stored");
      const floatReloaded = await loadSchedulerHistory(floatDirectory);
      const floatSnapshot = createSchedulerPredictionSnapshot(floatReloaded.history, floatInputs);
      assert.equal(floatSnapshot.predictions[0]?.meanDurationMs, 12.5);
      assert.equal(floatSnapshot.predictions[0]?.estimatedDurationMs, 12.5);
    });
  });

  it("isolates missing, malformed, incompatible, failed, and concurrent local state", async () => {
    await withStateDirectory(async (directory) => {
      const targetPath = schedulerHistoryPath(directory);
      assert.equal((await loadSchedulerHistory(directory)).observation, "missing");

      await writeFile(targetPath, "not json", "utf8");
      assert.equal((await loadSchedulerHistory(directory)).observation, "invalid");

      await writeFile(
        targetPath,
        JSON.stringify({
          envelopeVersion: SCHEDULER_HISTORY_ENVELOPE_VERSION,
          latestObservationSequence: 0,
          modelVersion: "future-model",
          series: []
        }),
        "utf8"
      );
      assert.equal((await loadSchedulerHistory(directory)).observation, "incompatible");

      await rm(targetPath);
      await mkdir(targetPath);
      assert.equal((await loadSchedulerHistory(directory)).observation, "failed");
      const emptyHistory = (await loadSchedulerHistory(join(directory, "fresh"))).history;
      assert.equal(await writeSchedulerHistory(directory, emptyHistory), "failed");

      const concurrentDirectory = join(directory, "concurrent");
      const concurrentHistory = (await loadSchedulerHistory(concurrentDirectory)).history;
      const leftInput = predictionInputs(["left"]);
      const rightInput = predictionInputs(["right"]);
      const leftPrediction = createSchedulerPredictionSnapshot(concurrentHistory, leftInput);
      const rightPrediction = createSchedulerPredictionSnapshot(concurrentHistory, rightInput);
      const leftHistory = recordOneSample({
        durationMs: 11,
        history: concurrentHistory,
        prediction: leftPrediction,
        taskId: "left"
      }).history;
      const rightHistory = recordOneSample({
        durationMs: 22,
        history: concurrentHistory,
        prediction: rightPrediction,
        taskId: "right"
      }).history;
      const writes = await Promise.all([
        writeSchedulerHistory(concurrentDirectory, leftHistory),
        writeSchedulerHistory(concurrentDirectory, rightHistory)
      ]);
      assert.ok(writes.includes("stored"));
      const concurrent = await loadSchedulerHistory(concurrentDirectory);
      assert.equal(concurrent.observation, "loaded");
      assert.equal(concurrent.history.series.length, 1);
      assert.ok(
        [
          createSchedulerHistoryIdentity(leftInput[0]),
          createSchedulerHistoryIdentity(rightInput[0])
        ].includes(concurrent.history.series[0]?.identityDigest ?? ""),
        "last-writer contention may lose a sample but must leave a complete closed model"
      );
    });
  });

  it("uses learned means before a median project prior and a cold-start fallback", async () => {
    await withStateDirectory(async (directory) => {
      const inputs = predictionInputs(["fast", "slow", "unknown"]);
      const initial = await loadSchedulerHistory(directory);
      const cold = createSchedulerPredictionSnapshot(initial.history, inputs);
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

      const recorded = recordSchedulerHistory({
        history: initial.history,
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
      const learned = createSchedulerPredictionSnapshot(recorded.history, inputs);
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
      const reversed = createSchedulerPredictionSnapshot(recorded.history, [...inputs].reverse());
      assert.equal(reversed.digest, learned.digest);
      assert.equal(Object.isFrozen(learned), true);
      assert.equal(Object.isFrozen(learned.predictions), true);
      assert.equal(JSON.stringify(learned).includes("author-secret-fast"), false);
      assert.equal(JSON.stringify(learned).includes("flag-secret"), false);

      const timingUnavailable = recordSchedulerHistory({
        history: recorded.history,
        prediction: learned,
        rawMeasurement: unavailableMeasurement(),
        settledTasks: [settled("fast")]
      });
      assert.equal(timingUnavailable.observation.status, "timing-unavailable");
      assert.equal(timingUnavailable.history, recorded.history);
    });
  });

  it("evicts the oldest series and scores both dependency and observation downstream paths once", async () => {
    await withStateDirectory(async (directory) => {
      const ids = Array.from(
        { length: MAX_SCHEDULER_HISTORY_SERIES + 1 },
        (_, index) => `check-${index}`
      );
      const inputs = predictionInputs(ids);
      const initial = await loadSchedulerHistory(directory);
      const prediction = createSchedulerPredictionSnapshot(initial.history, inputs);
      const recorded = recordSchedulerHistory({
        history: initial.history,
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
          (series) => series.identityDigest === createSchedulerHistoryIdentity(inputs[0])
        ),
        false
      );

      const graph = Object.freeze({
        scopes: Object.freeze([]),
        tasks: Object.freeze([
          Object.freeze({
            admissionPriority: 0,
            dependsOn: Object.freeze([]),
            mutex: Object.freeze([]),
            observes: Object.freeze([]),
            scopeId: null,
            taskId: "source"
          }),
          Object.freeze({
            admissionPriority: 0,
            dependsOn: Object.freeze(["source"]),
            mutex: Object.freeze([]),
            observes: Object.freeze([]),
            scopeId: null,
            taskId: "dependency"
          }),
          Object.freeze({
            admissionPriority: 0,
            dependsOn: Object.freeze([]),
            mutex: Object.freeze([]),
            observes: Object.freeze(["source"]),
            scopeId: null,
            taskId: "observer"
          })
        ])
      });
      const scoreInputs = predictionInputs(["source", "dependency", "observer"]);
      const scoreHistory = recordSchedulerHistory({
        history: initial.history,
        prediction: createSchedulerPredictionSnapshot(initial.history, scoreInputs),
        rawMeasurement: availableMeasurement([
          { admittedAtMonotonicMs: 0, settledAtMonotonicMs: 2, taskId: "source" },
          { admittedAtMonotonicMs: 0, settledAtMonotonicMs: 5, taskId: "dependency" },
          { admittedAtMonotonicMs: 0, settledAtMonotonicMs: 7, taskId: "observer" }
        ]),
        settledTasks: [settled("source"), settled("dependency"), settled("observer")]
      }).history;
      const scorePrediction = createSchedulerPredictionSnapshot(scoreHistory, scoreInputs);
      const score = createSchedulerCriticalPathSnapshot(graph, scorePrediction);
      assert.deepEqual(score.scores, [
        { criticalPathScore: 9, taskId: "source" },
        { criticalPathScore: 5, taskId: "dependency" },
        { criticalPathScore: 7, taskId: "observer" }
      ]);
      assert.equal(criticalPathScoreForTask(score, "source"), 9);
      assert.equal(Object.isFrozen(score), true);
      assert.equal(Object.isFrozen(score.scores), true);
    });
  });
});
