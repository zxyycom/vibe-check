import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AdmissionPolicyContext } from "../../project-definition/project-definition.ts";
import { admissionSelectionPolicyFor } from "./custom-admission-policy.ts";
import { prepareTaskGraph } from "./graph.ts";
import { decideScheduler, type SchedulerSnapshot } from "./scheduler-decision.ts";
import { runTaskGraph } from "./scheduler.ts";
import { staticAdmissionSelectionPolicy } from "./admission-selection-policy.ts";
import { assertFrozenSchedulerGraphSnapshot } from "./task-engine.test-support.ts";

const EXECUTION_STARTED = Object.freeze({ kind: "execution-started" as const });

describe("task engine admission policy", () => {
  it("recomputes static select or wait from each frozen scheduler snapshot without reservation state", () => {
    const graph = prepareTaskGraph(
      {
        tasks: [
          { id: "first", admissionPriority: 1 },
          { id: "second", dependsOn: ["first"], admissionPriority: 9 }
        ]
      },
      1
    );
    const initial = decideScheduler(
      snapshot(graph),
      EXECUTION_STARTED,
      staticAdmissionSelectionPolicy
    );
    const capacityBlocked = decideScheduler(
      snapshot(graph, { pendingTaskIds: ["second"], runningTaskIds: ["first"] }),
      EXECUTION_STARTED,
      staticAdmissionSelectionPolicy
    );
    const afterSettlement = decideScheduler(
      snapshot(graph, {
        pendingTaskIds: ["second"],
        settledTasks: [{ kind: "completed", taskId: "first" }]
      }),
      EXECUTION_STARTED,
      staticAdmissionSelectionPolicy
    );

    assert.equal(initial.kind, "admit");
    assert.equal(initial.taskId, "first");
    assert.equal(capacityBlocked.kind, "await-running");
    assert.equal(afterSettlement.kind, "admit");
    assert.equal(afterSettlement.taskId, "second");
    assert.equal("reason" in initial, false);
    assert.equal("reservation" in initial, false);
    assert.equal("reservationUpdate" in initial, false);
  });

  it("adapts custom select from a detached frozen full-graph context", async () => {
    let received: AdmissionPolicyContext | undefined;
    const selected: string[] = [];
    const policy = admissionSelectionPolicyFor((context) => {
      if (received === undefined) received = context;
      const admissible = context.candidates.find((candidate) => candidate.canAdmit);
      if (admissible === undefined) return { kind: "wait" };
      return {
        kind: "select",
        taskId:
          context.candidates.find(
            (candidate) => candidate.canAdmit && candidate.taskId === "second"
          )?.taskId ?? admissible.taskId
      };
    });

    const graph = {
      tasks: [
        { id: "first", admissionPriority: 1, mutex: ["shared"], scopeId: "limited" },
        { id: "second", admissionPriority: 9 }
      ],
      scopes: [
        {
          activationTaskIds: ["first"],
          id: "limited",
          maxParallel: 1,
          terminalTaskId: "first"
        }
      ]
    };
    const graphRun = await runTaskGraph({
      admissionPolicy: policy,
      execute: (task) => {
        selected.push(task.id);
        return task.id;
      },
      graph,
      maxParallel: 1
    });

    assert.deepEqual(selected, ["second", "first"]);
    assert.equal(graphRun.admissionPolicyFault, undefined);
    assert.ok(received);
    const context = received;
    assert.deepEqual(context.graph.tasks, [
      {
        admissionPriority: 1,
        dependsOn: [],
        mutex: ["shared"],
        observes: [],
        scopeId: "limited",
        taskId: "first"
      },
      {
        admissionPriority: 9,
        dependsOn: [],
        mutex: [],
        observes: [],
        scopeId: null,
        taskId: "second"
      }
    ]);
    assert.deepEqual(context.graph.scopes, [
      {
        activationTaskIds: ["first"],
        id: "limited",
        maxParallel: 1,
        terminalTaskId: "first"
      }
    ]);
    assert.deepEqual(context.candidates, [
      { canAdmit: true, taskId: "first" },
      { canAdmit: true, taskId: "second" }
    ]);
    assert.deepEqual(context.capacity, { effectiveMaxParallel: 1, maxParallel: 1, running: 0 });
    assert.deepEqual(context.runtime, { abortRequested: false, cancelled: false });
    assert.equal(Object.isFrozen(context), true);
    assertFrozenSchedulerGraphSnapshot(context.graph);
    assert.equal(Object.isFrozen(context.candidates), true);
    assert.equal(context.graph.tasks instanceof Map, false);
    assert.equal(context.candidates instanceof Set, false);
    assert.equal("priority" in context, false);
    assert.throws(
      () => Reflect.apply(Array.prototype.push, context.graph.tasks, [context.graph.tasks[0]]),
      TypeError
    );
    assert.throws(
      () =>
        Reflect.apply(Array.prototype.push, context.candidates, [
          { canAdmit: true, taskId: "other" }
        ]),
      TypeError
    );
  });
});

function snapshot(
  graph: ReturnType<typeof prepareTaskGraph>,
  overrides: Partial<SchedulerSnapshot> = {}
): SchedulerSnapshot {
  return Object.freeze({
    activeScopeIds: [],
    graph,
    isAbortRequested: false,
    isCancelled: false,
    maxParallel: 1,
    pendingTaskIds: graph.tasks.map((task) => task.id),
    runningMutexes: [],
    runningTaskIds: [],
    settledTasks: [],
    ...overrides
  });
}
