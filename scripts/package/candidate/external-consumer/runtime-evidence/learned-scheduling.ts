import assert from "node:assert/strict";

import { isRecord, requiredString } from "./values.ts";

/** Proves the public learned strategy without relying on retired Product-owned diagnostics. */
export function assertLearnedScheduling(value: unknown): void {
  if (!isRecord(value)) {
    throw new TypeError("isolated learned scheduling evidence must be an object");
  }
  assert.equal(value.stateFileExists, true);
  const history = requiredString(value.history, "isolated learned scheduler history");
  assert.match(history, /"series":\[/);
  assert.doesNotMatch(history, /installed-private-option|installed-private-flag/);

  for (const phase of ["first", "second"] as const) {
    const learnedRun: unknown = value[phase];
    if (!isRecord(learnedRun)) {
      throw new TypeError(`isolated learned ${phase} Run evidence must be an object`);
    }
    assert.equal(learnedRun.kind, "completed");
    assert.equal(learnedRun.machineHasSchedulerHistory, false);
    assert.equal(learnedRun.machineHasSchedulerPrediction, false);
    assert.equal(learnedRun.resultHasSchedulerHistory, false);
    assert.equal(learnedRun.resultHasSchedulerPrediction, false);
    assert.deepEqual(learnedRun.snapshotCheckIds, [
      "installed-learned-fast",
      "installed-learned-slow"
    ]);
    assertLearnedObservations(learnedRun.observations, phase);
  }
}

function assertLearnedObservations(value: unknown, phase: "first" | "second"): void {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(`isolated learned ${phase} observations must be a non-empty array`);
  }
  for (const observation of value) {
    if (!isRecord(observation) || observation.kind !== "selection-proposed") {
      throw new TypeError(`isolated learned ${phase} observation must be selection-proposed`);
    }
    assert.equal(observation.source, phase === "first" ? "cold-start" : "learned");
    assert.equal(typeof observation.taskId, "string");
  }
}
