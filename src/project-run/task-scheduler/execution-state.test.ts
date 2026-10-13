import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createSchedulerState, type PreAdmissionTaskResult } from "./execution-state.ts";
import { prepareTaskGraph } from "./graph.ts";
import { taskIdsForCore } from "./admission-core/scheduler-queries.ts";

describe("Scheduler pre-admission initialization", () => {
  it("initializes terminal facts while preserving input validation and satisfaction callback order", () => {
    const graph = prepareTaskGraph({ tasks: [{ id: "first" }, { id: "second" }] }, 2);
    const calls: number[] = [];
    const failure = new Error("satisfaction failed");
    const create = (results: readonly PreAdmissionTaskResult<number>[], maxParallel = 2) =>
      createSchedulerState(graph, {
        maxParallel,
        preAdmissionTaskResults: results,
        execute: () => 0,
        isPrerequisiteSatisfied(value) {
          calls.push(value);
          if (value === 9) throw failure;
          return value !== 0;
        }
      });
    assert.throws(() => create([{ taskId: "first", value: 9 }], 0), /positive safe integer/);
    assert.deepEqual(calls, []);
    assert.throws(() => create([{ taskId: "unknown", value: 9 }]), /unknown or duplicate/);
    assert.deepEqual(calls, []);
    assert.throws(
      () =>
        create([
          { taskId: "first", value: 9 },
          { taskId: "unknown", value: 1 }
        ]),
      (error: unknown) => error === failure
    );
    assert.deepEqual(calls, [9]);
    calls.length = 0;
    assert.throws(
      () =>
        create([
          { taskId: "first", value: 1 },
          { taskId: "first", value: 9 }
        ]),
      /unknown or duplicate/
    );
    assert.deepEqual(calls, [1]);
    calls.length = 0;
    const state = create([
      { taskId: "second", value: 0 },
      { taskId: "first", value: 1 }
    ]);
    assert.deepEqual(calls, [0, 1]);
    assert.deepEqual(state.pending, []);
    assert.deepEqual(taskIdsForCore(state.admissionCore, "settled"), ["first", "second"]);
    assert.deepEqual(
      [...state.settlementsByTaskId],
      [
        ["second", { kind: "prerequisite-unsatisfied", value: 0 }],
        ["first", { kind: "completed", value: 1 }]
      ]
    );
    assert.equal(state.admissionCore.selection.runningTotal, 0);
    assert.equal(state.admissionCore.selection.remainingTaskCount, 0);
  });
});
