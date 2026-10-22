import assert from "node:assert/strict";

import type { AdmissionSelectionPolicy } from "./admission-selection-policy.ts";
import { runTaskGraph, type TaskGraphRun } from "./scheduler.ts";
import { createDeferred } from "./task-engine.test-support.ts";

/** Holds the first executor open until the second starts, then releases and drains both Runs. */
export async function runOverlappingPolicyConsumers(policy: AdmissionSelectionPolicy): Promise<
  Readonly<{
    readonly executionsAtOverlap: readonly string[];
    readonly firstFinishedAtOverlap: boolean;
    readonly runs: readonly [TaskGraphRun<string>, TaskGraphRun<string>];
  }>
> {
  const executions: string[] = [];
  const firstStarted = createDeferred<void>();
  const secondStarted = createDeferred<void>();
  const releaseFirst = createDeferred<void>();
  const releaseSecond = createDeferred<void>();
  let firstFinished = false;
  const firstRun = runTaskGraph({
    admissionPolicy: policy,
    execute: async (task) => {
      executions.push(task.id);
      firstStarted.resolve();
      await releaseFirst.promise;
      firstFinished = true;
      return task.id;
    },
    graph: { tasks: [{ id: "first" }] },
    maxParallel: 1
  });
  await Promise.race([
    firstStarted.promise,
    firstRun.then(() => assert.fail("first Run ended before starting its executor"))
  ]);
  const secondRun = runTaskGraph({
    admissionPolicy: policy,
    execute: async (task) => {
      executions.push(task.id);
      secondStarted.resolve();
      await releaseSecond.promise;
      return task.id;
    },
    graph: { tasks: [{ id: "second" }] },
    maxParallel: 1
  });
  let overlap: Readonly<{
    readonly executionsAtOverlap: readonly string[];
    readonly firstFinishedAtOverlap: boolean;
  }>;
  try {
    await Promise.race([
      secondStarted.promise,
      secondRun.then(() => assert.fail("second Run ended before starting its executor"))
    ]);
    overlap = Object.freeze({
      executionsAtOverlap: Object.freeze([...executions]),
      firstFinishedAtOverlap: firstFinished
    });
  } finally {
    releaseFirst.resolve();
    releaseSecond.resolve();
    await Promise.all([firstRun, secondRun]);
  }
  return Object.freeze({ ...overlap, runs: await Promise.all([firstRun, secondRun]) });
}
