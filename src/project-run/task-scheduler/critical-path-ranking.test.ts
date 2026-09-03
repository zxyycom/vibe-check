import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createSchedulerCriticalPathSnapshot,
  criticalPathScoreForTask
} from "./critical-path-ranking.ts";

describe("critical-path ranking", () => {
  it("scores both dependency and observation downstream paths once", () => {
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
    const prediction = Object.freeze({
      predictions: Object.freeze([
        Object.freeze({ estimatedDurationMs: 2, taskId: "source" }),
        Object.freeze({ estimatedDurationMs: 5, taskId: "dependency" }),
        Object.freeze({ estimatedDurationMs: 7, taskId: "observer" })
      ])
    });

    const score = createSchedulerCriticalPathSnapshot(graph, prediction);

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
