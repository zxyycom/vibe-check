import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createSchedulerCriticalPathSnapshot,
  criticalPathScoreForTask
} from "./critical-path-ranking.ts";
import {
  schedulerGraphSnapshot,
  schedulerGraphTask
} from "../../project-run/task-scheduler/scheduler-graph-snapshot.test-support.ts";

describe("critical-path ranking", () => {
  it("scores both dependency and observation downstream paths once", () => {
    const graph = schedulerGraphSnapshot([
      schedulerGraphTask("source"),
      schedulerGraphTask("dependency", { dependsOn: ["source"] }),
      schedulerGraphTask("observer", { observes: ["source"] }),
      schedulerGraphTask("tail", { observes: ["dependency"] })
    ]);
    const prediction = Object.freeze({
      predictions: Object.freeze([
        Object.freeze({ estimatedDurationMs: 2, taskId: "source" }),
        Object.freeze({ estimatedDurationMs: 5, taskId: "dependency" }),
        Object.freeze({ estimatedDurationMs: 7, taskId: "observer" }),
        Object.freeze({ estimatedDurationMs: 11, taskId: "tail" })
      ])
    });

    const score = createSchedulerCriticalPathSnapshot(graph, prediction);

    assert.deepEqual(score.scores, [
      { criticalPathScore: 18, taskId: "source" },
      { criticalPathScore: 16, taskId: "dependency" },
      { criticalPathScore: 7, taskId: "observer" },
      { criticalPathScore: 11, taskId: "tail" }
    ]);
    assert.equal(criticalPathScoreForTask(score, "source"), 18);
    assert.equal(Object.isFrozen(score), true);
    assert.equal(Object.isFrozen(score.scores), true);
    assert.deepEqual(
      createSchedulerCriticalPathSnapshot(graph, {
        predictions: [...prediction.predictions, { estimatedDurationMs: 99, taskId: "source" }]
      }),
      score
    );
    assert.throws(
      () => {
        createSchedulerCriticalPathSnapshot(
          schedulerGraphSnapshot([schedulerGraphTask("source", { dependsOn: ["missing"] })]),
          { predictions: [] }
        );
      },
      { message: "critical path graph has unknown task missing" }
    );
    assert.throws(
      () => {
        createSchedulerCriticalPathSnapshot(graph, { predictions: [] });
      },
      { message: "critical path prediction missing task source" }
    );
  });
});
