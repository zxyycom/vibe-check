import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  compilePreparedAdmissionGraph,
  createAdmissionCoreFromSchedulerSnapshot,
  createInitialAdmissionCoreState
} from "./admission-core.ts";
import { traceAdmissionCore } from "./admission-core-trace.ts";
import { prepareTaskGraph } from "./graph.ts";
import { runTaskGraph } from "./scheduler.ts";

describe("admission core trace", () => {
  it("traces public and private binary/failed/cancellation transitions through one reducer", async () => {
    const planned = prepareTaskGraph(
      { tasks: [{ id: "source" }, { id: "dependent", dependsOn: ["source"] }, { id: "other" }] },
      2
    );
    const trace = traceAdmissionCore(
      createInitialAdmissionCoreState(compilePreparedAdmissionGraph(planned, 2)),
      [
        { kind: "select", taskId: "source" },
        { kind: "settle-running", settlementKind: "failed", taskId: "source" },
        { kind: "select", taskId: "other" },
        { kind: "cancel-pending" }
      ]
    );

    assert.deepEqual(
      trace.map((step) => step.result),
      [
        { accepted: true, reasonKind: null },
        { accepted: true, reasonKind: null },
        { accepted: true, reasonKind: null },
        { accepted: true, reasonKind: null }
      ]
    );
    assert.deepEqual(trace[1]?.effects, [
      { kind: "settled", settlementKind: "failed", taskId: "source" },
      {
        dependencyIds: ["source"],
        kind: "settled",
        settlementKind: "blocked",
        taskId: "dependent"
      }
    ]);
    assert.deepEqual(
      trace[1]?.post.validation.find((entry) => entry.taskId === "dependent"),
      {
        taskId: "dependent",
        value: { accepted: false, reason: { kind: "not-pending", status: "settled" } }
      }
    );
    assert.deepEqual(trace[3]?.post.inspection.nextBoundary, "wait");

    const mutexTrace = traceFromTaskGraph(
      {
        tasks: [
          { id: "left", mutex: ["shared"] },
          { id: "right", mutex: ["shared"] }
        ]
      },
      2,
      [{ kind: "select", taskId: "left" }]
    );
    assert.deepEqual(traceValidation(mutexTrace[0], "right"), {
      accepted: false,
      reason: { kind: "mutex-held", mutexIds: ["shared"] }
    });

    const rootCapacityTrace = traceFromTaskGraph(
      { tasks: [{ id: "first" }, { id: "second" }] },
      1,
      [{ kind: "select", taskId: "first" }]
    );
    assert.deepEqual(traceValidation(rootCapacityTrace[0], "second"), {
      accepted: false,
      reason: { kind: "root-capacity-reached", maxParallel: 1, running: 1 }
    });

    const scopeCapacityTrace = traceFromTaskGraph(
      {
        scopes: [
          { activationTaskIds: ["worker"], id: "scope", maxParallel: 1, terminalTaskId: "terminal" }
        ],
        tasks: [
          { id: "worker", scopeId: "scope" },
          { id: "peer", scopeId: "scope" },
          { id: "terminal", dependsOn: ["worker", "peer"], scopeId: "scope" }
        ]
      },
      2,
      [{ kind: "select", taskId: "worker" }]
    );
    assert.deepEqual(traceValidation(scopeCapacityTrace[0], "peer"), {
      accepted: false,
      reason: { kind: "scope-capacity-reached", maxParallel: 1, running: 1, scopeId: "scope" }
    });

    const completeTrace = traceFromTaskGraph({ tasks: [{ id: "only" }] }, 1, [
      { kind: "select", taskId: "only" },
      { kind: "settle", outcome: "satisfied", taskId: "only" }
    ]);
    assert.equal(completeTrace[1]?.post.inspection.nextBoundary, "complete");

    const forcedOrderTrace = traceFromTaskGraph(
      {
        tasks: [
          { id: "source" },
          { id: "first-dependent", dependsOn: ["source"] },
          { id: "last-dependent", dependsOn: ["source"] }
        ]
      },
      1,
      [
        { kind: "select", taskId: "source" },
        { kind: "settle-running", settlementKind: "failed", taskId: "source" }
      ]
    );
    assert.deepEqual(
      forcedOrderTrace[1]?.effects.map((effect) => effect.taskId),
      ["source", "last-dependent", "first-dependent"]
    );

    const liveGraph = prepareTaskGraph(
      { tasks: [{ id: "running" }, { id: "dependent", dependsOn: ["running"] }] },
      1
    );
    const liveTrace = traceAdmissionCore(
      createAdmissionCoreFromSchedulerSnapshot(compilePreparedAdmissionGraph(liveGraph, 1), {
        activeScopeIds: [],
        graph: liveGraph,
        isAbortRequested: false,
        isCancelled: false,
        maxParallel: 1,
        pendingTaskIds: ["dependent"],
        runningMutexes: [],
        runningTaskIds: ["running"],
        settledTasks: []
      }),
      [{ kind: "settle-running", settlementKind: "failed", taskId: "running" }]
    );
    assert.deepEqual(liveTrace[0]?.pre.inspection.runningTaskIds, ["running"]);
    assert.deepEqual(
      liveTrace[0]?.effects.map((effect) => effect.taskId),
      ["running", "dependent"]
    );

    const realRun = await runTaskGraph({
      execute: (task) => {
        if (task.id === "source") throw new Error("failed source");
        return task.id;
      },
      graph: {
        tasks: [{ id: "source" }, { id: "dependent", dependsOn: ["source"] }, { id: "other" }]
      },
      maxParallel: 2
    });
    assert.deepEqual(
      realRun.settlements.map(({ settlement, task }) => ({
        kind: settlement.kind,
        taskId: task.id
      })),
      [
        { kind: "failed", taskId: "source" },
        { kind: "blocked", taskId: "dependent" },
        { kind: "completed", taskId: "other" }
      ]
    );
  });
});

function traceFromTaskGraph(
  graph: Parameters<typeof prepareTaskGraph>[0],
  maxParallel: number,
  actions: Parameters<typeof traceAdmissionCore>[1]
) {
  const planned = prepareTaskGraph(graph, maxParallel);
  return traceAdmissionCore(
    createInitialAdmissionCoreState(compilePreparedAdmissionGraph(planned, maxParallel)),
    actions
  );
}

function traceValidation(
  step: ReturnType<typeof traceAdmissionCore>[number] | undefined,
  taskId: string
) {
  return step?.post.validation.find((entry) => entry.taskId === taskId)?.value;
}
