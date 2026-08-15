import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  normalizeTask,
  runParallelTasks,
  type NormalizedTask
} from "../index.ts";

describe("parallel task admission controller", () => {
  it("rejects a pending task that is not in the current ready set", async () => {
    const started: string[] = [];
    let blockedPending: NormalizedTask | undefined;
    await assert.rejects(
      () => runParallelTasks([
        { id: "base", run: () => "base" },
        { id: "dependent", dependsOn: ["base"], run: () => "dependent" }
      ], {
        prepareTasks: (definitions) => {
          const pending = definitions.map(normalizeTask);
          blockedPending = pending.find((task) => task.id === "dependent");
          return pending;
        },
        admissionController: {
          selectNextReadyTask: () => blockedPending,
          onTaskAdmitted: () => {},
          onTaskSettled: () => {}
        },
        execute: (task) => { started.push(task.id); return task.id; }
      }),
      /not ready/
    );
    assert.deepEqual(started, []);
  });

  it("rejects synchronous admission callbacks and execution failures without pending work", async () => {
    const admitted: string[] = [];
    await assert.rejects(
      () => runParallelTasks([{ id: "first" }, { id: "second" }], {
        concurrency: 1,
        admissionController: {
          selectNextReadyTask: ({ readyTasks }) => readyTasks[0],
          onTaskAdmitted: (task) => {
            admitted.push(task.id);
            if (task.id === "first") throw new Error("admission failed");
          },
          onTaskSettled: () => {}
        },
        execute: () => { throw new Error("must not execute"); }
      }),
      /admission failed/
    );
    assert.deepEqual(admitted, ["first"]);

    const settled: string[] = [];
    await assert.rejects(
      () => runParallelTasks([{ id: "failing", mutex: "shared" }, { id: "pending", mutex: "shared" }], {
        concurrency: 1,
        admissionController: {
          selectNextReadyTask: ({ readyTasks }) => readyTasks[0],
          onTaskAdmitted: () => {},
          onTaskSettled: (task) => { settled.push(task.id); }
        },
        execute: (task) => {
          if (task.id === "failing") throw new Error("execution failed");
          return "pending";
        }
      }),
      /execution failed/
    );
    assert.deepEqual(settled, ["failing"]);
  });
});
