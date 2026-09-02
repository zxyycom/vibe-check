import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { prepareTaskGraph } from "./graph.ts";
import { learnedCriticalPathAdmissionSelectionPolicy } from "./learned-critical-path-admission-policy.ts";
import { decideScheduler, type SchedulerSnapshot } from "./scheduler-decision.ts";

const EXECUTION_STARTED = Object.freeze({ kind: "execution-started" as const });

describe("learned critical-path task engine", () => {
  it("uses score, effective priority, and canonical order within each existing selection layer", () => {
    const graph = prepareTaskGraph(
      {
        tasks: [
          { id: "ordinary-low-priority", admissionPriority: 1 },
          { id: "ordinary-high-priority", admissionPriority: 9 },
          { id: "ordinary-a", admissionPriority: 4 },
          { id: "ordinary-b", admissionPriority: 4 },
          {
            id: "tight-low-score",
            admissionPriority: 99,
            scopeId: "tight-low"
          },
          {
            id: "tight-high-score",
            admissionPriority: 1,
            scopeId: "tight-high"
          },
          { id: "tighter", admissionPriority: 0, scopeId: "tighter" }
        ],
        scopes: [
          {
            activationTaskIds: ["tight-low-score"],
            id: "tight-low",
            maxParallel: 2,
            terminalTaskId: "tight-low-score"
          },
          {
            activationTaskIds: ["tight-high-score"],
            id: "tight-high",
            maxParallel: 2,
            terminalTaskId: "tight-high-score"
          },
          {
            activationTaskIds: ["tighter"],
            id: "tighter",
            maxParallel: 1,
            terminalTaskId: "tighter"
          }
        ]
      },
      3
    );
    const policy = learnedCriticalPathAdmissionSelectionPolicy(
      scores({
        "ordinary-low-priority": 9,
        "ordinary-high-priority": 9,
        "ordinary-a": 4,
        "ordinary-b": 4,
        "tight-low-score": 1,
        "tight-high-score": 100,
        tighter: 0
      })
    );

    const tighterLayer = decideScheduler(snapshot(graph), EXECUTION_STARTED, policy);
    assert.equal(tighterLayer.kind, "admit");
    assert.equal(tighterLayer.taskId, "tighter");

    const tighteningScore = decideScheduler(
      snapshot(graph, {
        pendingTaskIds: ["tight-low-score", "tight-high-score"]
      }),
      EXECUTION_STARTED,
      policy
    );
    assert.equal(tighteningScore.kind, "admit");
    assert.equal(tighteningScore.taskId, "tight-high-score");

    const ordinaryPriority = decideScheduler(
      snapshot(graph, {
        pendingTaskIds: ["ordinary-low-priority", "ordinary-high-priority"]
      }),
      EXECUTION_STARTED,
      policy
    );
    assert.equal(ordinaryPriority.kind, "admit");
    assert.equal(ordinaryPriority.taskId, "ordinary-high-priority");

    const ordinaryCanonicalTie = decideScheduler(
      snapshot(graph, { pendingTaskIds: ["ordinary-b", "ordinary-a"] }),
      EXECUTION_STARTED,
      policy
    );
    assert.equal(ordinaryCanonicalTie.kind, "admit");
    assert.equal(ordinaryCanonicalTie.taskId, "ordinary-a");
  });

  it("keeps the Scheduler capacity wait guard when the highest score cannot admit", () => {
    const graph = prepareTaskGraph(
      { tasks: [{ id: "running" }, { id: "highest-score" }, { id: "other" }] },
      1
    );
    const policy = learnedCriticalPathAdmissionSelectionPolicy(
      scores({
        running: 0,
        "highest-score": 100,
        other: 1
      })
    );

    const decision = decideScheduler(
      snapshot(graph, {
        maxParallel: 1,
        pendingTaskIds: ["highest-score", "other"],
        runningTaskIds: ["running"]
      }),
      EXECUTION_STARTED,
      policy
    );

    assert.equal(decision.kind, "await-running");
    assert.deepEqual(decision.proposal, { kind: "wait" });
    assert.deepEqual(decision.hardGuard, {
      kind: "wait",
      runningCanDrain: true
    });
  });
});

function scores(values: Readonly<Record<string, number>>) {
  return Object.freeze({
    scores: Object.freeze(
      Object.entries(values).map(([taskId, criticalPathScore]) =>
        Object.freeze({ criticalPathScore, taskId })
      )
    )
  });
}

function snapshot(
  graph: ReturnType<typeof prepareTaskGraph>,
  overrides: Partial<SchedulerSnapshot> = {}
): SchedulerSnapshot {
  return Object.freeze({
    activeScopeIds: [],
    graph,
    isAbortRequested: false,
    isCancelled: false,
    maxParallel: 3,
    pendingTaskIds: graph.tasks.map((task) => task.id),
    runningMutexes: [],
    runningTaskIds: [],
    settledTasks: [],
    ...overrides
  });
}
