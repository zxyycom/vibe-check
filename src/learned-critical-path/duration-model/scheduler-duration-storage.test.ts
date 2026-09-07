import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  emptySchedulerHistory,
  freezeSchedulerHistoryModel,
  SCHEDULER_HISTORY_ENVELOPE_VERSION
} from "./bounded-history.ts";
import { createSchedulerHistoryIdentity, createSchedulerPredictionSnapshot } from "./prediction.ts";
import { predictionInputs } from "./scheduler-duration-model.test-support.ts";
import { loadSchedulerHistory, schedulerHistoryPath, writeSchedulerHistory } from "./storage.ts";

async function withStateDirectory(run: (directory: string) => Promise<void>): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "vibe-check-scheduler-history-"));
  try {
    await run(directory);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}

function closedHistory(input: { readonly durationMs: number; readonly identityDigest: string }) {
  return freezeSchedulerHistoryModel({
    latestObservationSequence: 1,
    series: [
      {
        identityDigest: input.identityDigest,
        latestObservationSequence: 1,
        samples: [
          { durationMs: input.durationMs, observationSequence: 1, settlementKind: "completed" }
        ]
      }
    ]
  });
}

describe("scheduler duration storage", () => {
  it("round-trips closed digest-only history", async () => {
    await withStateDirectory(async (directory) => {
      assert.equal((await loadSchedulerHistory(directory)).observation, "missing");
      const inputs = predictionInputs(["check"]);
      const input = inputs[0];
      assert.ok(input);
      const history = closedHistory({
        durationMs: 16.5,
        identityDigest: createSchedulerHistoryIdentity(input)
      });

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
      const floatInputs = predictionInputs(["float-duration"]);
      const floatInput = floatInputs[0];
      assert.ok(floatInput);
      const floatHistory = closedHistory({
        durationMs: 12.5,
        identityDigest: createSchedulerHistoryIdentity(floatInput)
      });
      assert.equal(await writeSchedulerHistory(floatDirectory, floatHistory), "stored");
      const floatReloaded = await loadSchedulerHistory(floatDirectory);
      const floatSnapshot = createSchedulerPredictionSnapshot(floatReloaded.history, floatInputs);
      assert.equal(floatSnapshot.predictions[0]?.meanDurationMs, 12.5);
      assert.equal(floatSnapshot.predictions[0]?.estimatedDurationMs, 12.5);
    });
  });

  it("contains read and write faults with concurrent writers", async () => {
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
      assert.equal(await writeSchedulerHistory(directory, emptySchedulerHistory()), "failed");

      const concurrentDirectory = join(directory, "concurrent");
      const leftInput = predictionInputs(["left"])[0];
      const rightInput = predictionInputs(["right"])[0];
      assert.ok(leftInput);
      assert.ok(rightInput);
      const leftHistory = closedHistory({
        durationMs: 11,
        identityDigest: createSchedulerHistoryIdentity(leftInput)
      });
      const rightHistory = closedHistory({
        durationMs: 22,
        identityDigest: createSchedulerHistoryIdentity(rightInput)
      });
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
          createSchedulerHistoryIdentity(leftInput),
          createSchedulerHistoryIdentity(rightInput)
        ].includes(concurrent.history.series[0]?.identityDigest ?? ""),
        "last-writer contention may lose a sample but must leave a complete closed model"
      );
    });
  });
});
