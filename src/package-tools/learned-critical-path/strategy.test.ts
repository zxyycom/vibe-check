import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { SchedulerGraphSnapshot } from "../../project-definition/project-definition.ts";
import { createLearnedCriticalPathStrategy } from "./strategy.ts";
import { firstCandidateBy } from "./selection-layers.ts";
import { context, contextFor, graph, graphFor, task } from "./strategy.test-support.ts";

describe("public learned critical-path strategy", () => {
  it("uses the public scope layers and returns wait for an unavailable learned preference", async () => {
    const stateDirectory = await mkdtemp(join(tmpdir(), "vibe-check-public-learned-"));
    try {
      const strategy = createLearnedCriticalPathStrategy({
        identityForTask: (graphTask) => ({ taskId: graphTask.taskId }),
        stateDirectory
      });
      if (strategy.kind !== "prepared") throw new Error("expected prepared strategy");
      const prepared = await strategy.prepare.callback({ graph: graph() });
      const tightening = prepared.decide.callback(
        context([
          { canAdmit: true, taskId: "ordinary" },
          { canAdmit: true, taskId: "activate" }
        ])
      );
      assert.deepEqual(tightening, { kind: "select", taskId: "activate" });
      const wait = prepared.decide.callback(context([{ canAdmit: false, taskId: "ordinary" }]));
      assert.deepEqual(wait, { kind: "wait" });
      const changingBoundary = context([
        { canAdmit: true, taskId: "ordinary" },
        { canAdmit: true, taskId: "activate" }
      ]);
      assert.deepEqual(prepared.decide.callback(changingBoundary), {
        kind: "select",
        taskId: "activate"
      });
      assert.deepEqual(
        prepared.decide.callback({
          ...changingBoundary,
          activeScopeIds: ["limited"],
          capacity: { effectiveMaxParallel: 1, maxParallel: 1, running: 0 }
        }),
        { kind: "select", taskId: "ordinary" }
      );
      assert.deepEqual(prepared.decide.callback(changingBoundary), {
        kind: "select",
        taskId: "activate"
      });
    } finally {
      await rm(stateDirectory, { force: true, recursive: true });
    }
  });

  it("orders score, priority, canonical IDs, constrained scope caps, continuations, and static fallback through public data", async () => {
    const stateDirectory = await mkdtemp(join(tmpdir(), "vibe-check-public-learned-order-"));
    try {
      const rankedGraph = graphFor([
        task("high-priority", { admissionPriority: 99 }),
        task("critical-source", { dependsOn: ["critical-tail"] }),
        task("critical-tail")
      ]);
      const learned = await preparedStrategy(stateDirectory, rankedGraph);
      assert.deepEqual(
        learned.decide.callback(
          contextFor(rankedGraph, [
            { canAdmit: true, taskId: "high-priority" },
            { canAdmit: true, taskId: "critical-tail" }
          ])
        ),
        { kind: "select", taskId: "critical-tail" }
      );
      const tieGraph = graphFor([
        task("z", { admissionPriority: 2 }),
        task("a", { admissionPriority: 2 })
      ]);
      const tied = await preparedStrategy(stateDirectory, tieGraph);
      assert.deepEqual(
        tied.decide.callback(
          contextFor(tieGraph, [
            { canAdmit: true, taskId: "z" },
            { canAdmit: true, taskId: "a" }
          ])
        ),
        { kind: "select", taskId: "a" }
      );
      const priorityGraph = graphFor([
        task("low-priority", { admissionPriority: 1 }),
        task("high-priority", { admissionPriority: 2 })
      ]);
      const priority = await preparedStrategy(stateDirectory, priorityGraph);
      assert.deepEqual(
        priority.decide.callback(
          contextFor(priorityGraph, [
            { canAdmit: true, taskId: "low-priority" },
            { canAdmit: true, taskId: "high-priority" }
          ])
        ),
        { kind: "select", taskId: "high-priority" }
      );
      const scopes = Object.freeze([
        Object.freeze({
          activationTaskIds: Object.freeze(["cap-one"]),
          id: "one",
          maxParallel: 1,
          terminalTaskId: "cap-one"
        }),
        Object.freeze({
          activationTaskIds: Object.freeze(["cap-two"]),
          id: "two",
          maxParallel: 2,
          terminalTaskId: "cap-two"
        })
      ]);
      const scopedGraph = graphFor(
        [
          task("cap-one", { scopeId: "one" }),
          task("cap-two", { scopeId: "two" }),
          task("longer-critical-source", { dependsOn: ["cap-two"] })
        ],
        scopes
      );
      const scoped = await preparedStrategy(stateDirectory, scopedGraph);
      assert.deepEqual(
        scoped.decide.callback(
          contextFor(scopedGraph, [
            { canAdmit: true, taskId: "cap-two" },
            { canAdmit: true, taskId: "cap-one" }
          ])
        ),
        { kind: "select", taskId: "cap-one" }
      );
      assert.deepEqual(
        scoped.decide.callback(
          contextFor(
            scopedGraph,
            [
              { canAdmit: true, taskId: "cap-two" },
              { canAdmit: true, taskId: "longer-critical-source" }
            ],
            ["two"]
          )
        ),
        { kind: "select", taskId: "cap-two" }
      );
      const fallback = createLearnedCriticalPathStrategy({
        identityForTask: () => () => undefined,
        stateDirectory
      });
      if (fallback.kind !== "prepared") throw new Error("expected prepared strategy");
      let graphReads = 0;
      const countedGraph: SchedulerGraphSnapshot = {
        ...scopedGraph,
        get tasks() {
          graphReads += 1;
          return scopedGraph.tasks;
        }
      };
      const fallbackPrepared = await fallback.prepare.callback({ graph: countedGraph });
      const preparedGraphReads = graphReads;
      const fallbackContext = contextFor(scopedGraph, [
        { canAdmit: true, taskId: "cap-two" },
        { canAdmit: true, taskId: "cap-one" }
      ]);
      for (let boundary = 0; boundary < 8; boundary += 1) {
        assert.deepEqual(fallbackPrepared.decide.callback(fallbackContext), {
          kind: "select",
          taskId: "cap-one"
        });
      }
      assert.equal(graphReads, preparedGraphReads, "fallback rebuilt its prepared graph index");
      const ordinaryFallback = await fallback.prepare.callback({ graph: priorityGraph });
      assert.deepEqual(
        ordinaryFallback.decide.callback(
          contextFor(priorityGraph, [
            { canAdmit: false, taskId: "high-priority" },
            { canAdmit: true, taskId: "low-priority" }
          ])
        ),
        { kind: "select", taskId: "low-priority" }
      );
      assert.deepEqual(
        priority.decide.callback(
          contextFor(priorityGraph, [
            { canAdmit: false, taskId: "high-priority" },
            { canAdmit: true, taskId: "low-priority" }
          ])
        ),
        { kind: "wait" }
      );
      assertLinearStableMinimum();
      assert.deepEqual(
        fallbackPrepared.decide.callback(
          contextFor(scopedGraph, [
            { canAdmit: true, taskId: "cap-two" },
            { canAdmit: true, taskId: "cap-one" }
          ])
        ),
        { kind: "select", taskId: "cap-one" }
      );
    } finally {
      await rm(stateDirectory, { force: true, recursive: true });
    }
  });

  it("rejects a non-absolute history path and contains rejected caller observations", async () => {
    assert.throws(
      () =>
        createLearnedCriticalPathStrategy({
          identityForTask: () => ({}),
          stateDirectory: "relative"
        }),
      /absolute path/
    );
    assert.throws(
      () =>
        createLearnedCriticalPathStrategy({
          identityForTask: () => ({}),
          sampleWindow: 33,
          stateDirectory: "/tmp/state"
        }),
      /sampleWindow/
    );
    const stateDirectory = await mkdtemp(join(tmpdir(), "vibe-check-public-learned-observer-"));
    try {
      const strategy = createLearnedCriticalPathStrategy({
        identityForTask: () => ({ key: "invalid-observer" }),
        observe: async () => Promise.reject(new Error("observer failed")),
        stateDirectory
      });
      if (strategy.kind !== "prepared") throw new Error("expected prepared strategy");
      const prepared = await strategy.prepare.callback({ graph: graph() });
      assert.doesNotThrow(() =>
        prepared.decide.callback(context([{ canAdmit: true, taskId: "ordinary" }]))
      );
    } finally {
      await rm(stateDirectory, { force: true, recursive: true });
    }
  });
});

function preparedStrategy(stateDirectory: string, schedulerGraph: SchedulerGraphSnapshot) {
  const strategy = createLearnedCriticalPathStrategy({
    identityForTask: (graphTask) => ({ taskId: graphTask.taskId }),
    stateDirectory
  });
  if (strategy.kind !== "prepared") throw new Error("expected prepared strategy");
  return strategy.prepare.callback({ graph: schedulerGraph });
}

/** A minimum keeps stable ties and requires only one comparison per subsequent candidate. */
function assertLinearStableMinimum(): void {
  for (const width of [32, 512]) {
    const candidates = Array.from({ length: width }, (_, slot) => ({
      canAdmit: slot % 2 === 0,
      taskId: String((slot * 37) % width)
    }));
    const compare = (left: (typeof candidates)[number], right: (typeof candidates)[number]) =>
      (Number(right.taskId) % 7) - (Number(left.taskId) % 7);
    let comparisons = 0;
    const selected = firstCandidateBy(candidates, (left, right) => {
      comparisons += 1;
      return compare(left, right);
    });
    assert.equal(selected, [...candidates].sort(compare)[0]);
    assert.equal(comparisons, width - 1);
    assert.equal(firstCandidateBy([], compare), undefined);
  }
}
