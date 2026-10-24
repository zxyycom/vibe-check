import assert from "node:assert/strict";

import { describe, it } from "node:test";

import { runTaskGraph } from "./scheduler.ts";
import type { DiagnosticObservation } from "../diagnostic-logging/logger.ts";
import {
  completedValues,
  createDeferred,
  decisionFor,
  recordedSchedulerDecisions,
  recordingLogger,
  rootBudgetGraph,
  waitFor
} from "./task-engine.test-support.ts";

describe("static task engine", () => {
  it("respects one root budget for dependency order and named mutex execution", async () => {
    const events: string[] = [];
    const observations: DiagnosticObservation[] = [];
    let active = 0;
    let maxActive = 0;
    const graph = rootBudgetGraph();
    const firstCohortStarted = createDeferred<void>();
    const releaseFirstCohort = createDeferred<void>();

    const running = runTaskGraph<string>({
      graph,
      maxParallel: 3,
      diagnosticLogger: recordingLogger(observations),
      execute: async (task) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        events.push(`start:${task.id}`);
        if (active === 3) firstCohortStarted.resolve();
        await releaseFirstCohort.promise;
        events.push(`end:${task.id}`);
        active -= 1;
        return task.id;
      }
    });

    await firstCohortStarted.promise;
    assert.equal(active, 3);
    assert.equal(events.includes("start:dependent"), false);
    assert.equal(events.includes("start:mutex-two"), false);
    releaseFirstCohort.resolve();
    const run = await running;
    assert.equal(maxActive, 3);
    assert.ok(events.indexOf("end:base") < events.indexOf("start:dependent"));
    assert.ok(events.indexOf("end:mutex-one") < events.indexOf("start:mutex-two"));
    assert.deepEqual(completedValues(run), [
      "base",
      "dependent",
      "mutex-one",
      "mutex-two",
      "independent"
    ]);
    const rootDecisions = recordedSchedulerDecisions(observations);
    const rootAdmission = rootDecisions[0];
    if (rootAdmission?.kind !== "admit") assert.fail("expected initial scheduler admission");
    assert.equal(rootAdmission.trigger.kind, "execution-started");
    assert.equal(rootAdmission.taskId, "base");
    assert.equal(rootAdmission.admissionPriority, 0);
    assert.deepEqual(rootAdmission.capacity, {
      effectiveMaxParallel: 3,
      maxParallel: 3,
      running: 0
    });
    assert.deepEqual(rootAdmission.graphIdentity, {
      resourceCapacities: [],
      scopes: [],
      tasks: [
        {
          admissionPriority: 0,
          dependsOn: [],
          taskId: "base",
          mutex: [],
          observes: [],
          resourceClaims: [],
          scopeId: null
        },
        {
          admissionPriority: 0,
          dependsOn: ["base"],
          taskId: "dependent",
          mutex: [],
          observes: [],
          resourceClaims: [],
          scopeId: null
        },
        {
          admissionPriority: 0,
          dependsOn: [],
          taskId: "mutex-one",
          mutex: ["shared"],
          observes: [],
          resourceClaims: [],
          scopeId: null
        },
        {
          admissionPriority: 0,
          dependsOn: [],
          taskId: "mutex-two",
          mutex: ["shared"],
          observes: [],
          resourceClaims: [],
          scopeId: null
        },
        {
          admissionPriority: 0,
          dependsOn: [],
          taskId: "independent",
          mutex: [],
          observes: [],
          resourceClaims: [],
          scopeId: null
        }
      ]
    });
    assert.deepEqual(rootAdmission.candidates, [
      { canAdmit: true, taskId: "base" },
      { canAdmit: true, taskId: "mutex-one" },
      { canAdmit: true, taskId: "mutex-two" },
      { canAdmit: true, taskId: "independent" }
    ]);
    assert.deepEqual(rootAdmission.proposal, { kind: "select", taskId: "base" });
    assert.deepEqual(rootAdmission.hardGuard, {
      canAdmit: true,
      isCandidate: true,
      kind: "select",
      lifecycleOpen: true,
      taskId: "base"
    });
  });

  it("uses priority only among dependency and mutex eligible ordinary ready tasks", () => {
    const graph = {
      tasks: [
        { id: "low", admissionPriority: -1 },
        { id: "high", admissionPriority: 4 },
        { id: "blocked", admissionPriority: 99, dependsOn: ["missing-ready"] },
        { id: "missing-ready" },
        { id: "mutex-blocked", admissionPriority: 98, mutex: ["shared"] }
      ]
    };
    const selected = decisionFor(graph, {
      maxParallel: 2,
      pendingTaskIds: ["low", "high", "blocked"]
    });
    assert.equal(selected.kind, "admit");
    assert.equal(selected.taskId, "high");
    assert.equal(selected.admissionPriority, 4);

    const stableTie = decisionFor(
      {
        tasks: [
          { id: "first", admissionPriority: 3 },
          { id: "second", admissionPriority: 3 }
        ]
      },
      { maxParallel: 2 }
    );
    assert.equal(stableTie.kind, "admit");
    assert.equal(stableTie.taskId, "first");

    const dependencyBlocked = decisionFor(graph, {
      maxParallel: 2,
      pendingTaskIds: ["low", "blocked"],
      settledTasks: []
    });
    assert.equal(dependencyBlocked.kind, "admit");
    assert.equal(dependencyBlocked.taskId, "low");

    const mutexBlocked = decisionFor(graph, {
      maxParallel: 2,
      pendingTaskIds: ["low", "mutex-blocked"],
      runningMutexes: ["shared"],
      runningTaskIds: ["running"]
    });
    assert.equal(mutexBlocked.kind, "admit");
    assert.equal(mutexBlocked.taskId, "low");

    const noPreemption = decisionFor(
      { tasks: [{ id: "running" }, { id: "high", admissionPriority: 4 }] },
      { maxParallel: 1, pendingTaskIds: ["high"], runningTaskIds: ["running"] }
    );
    assert.equal(noPreemption.kind, "await-running");
  });

  it("limits named resource concurrency without withholding unrelated root slots", async () => {
    const observations: DiagnosticObservation[] = [];
    const started: string[] = [];
    const gates = new Map(
      ["browser-one", "browser-two", "browser-three", "unrelated"].map((taskId) => [
        taskId,
        createDeferred<void>()
      ])
    );
    const running = runTaskGraph({
      diagnosticLogger: recordingLogger(observations),
      graph: {
        resourceCapacities: { browser: 2 },
        tasks: [
          { id: "browser-one", resourceClaims: { browser: 1 } },
          { id: "browser-two", resourceClaims: { browser: 1 } },
          { id: "browser-three", resourceClaims: { browser: 1 } },
          { id: "unrelated" }
        ]
      },
      maxParallel: 3,
      execute: async (task) => {
        started.push(task.id);
        await gates.get(task.id)?.promise;
        return task.id;
      }
    });

    await waitFor(() => started.length === 3);
    assert.deepEqual(started, ["browser-one", "browser-two", "unrelated"]);
    assert.equal(
      recordedSchedulerDecisions(observations).some(
        (decision) => decision.blockers.resourceCapacity === 1
      ),
      true
    );

    gates.get("browser-one")?.resolve(undefined);
    await waitFor(() => started.includes("browser-three"));
    for (const gate of gates.values()) gate.resolve(undefined);
    assert.deepEqual(completedValues(await running), [
      "browser-one",
      "browser-two",
      "browser-three",
      "unrelated"
    ]);

    const afterFailure = await runTaskGraph({
      graph: {
        resourceCapacities: { browser: 1 },
        tasks: [
          { id: "failing", resourceClaims: { browser: 1 } },
          { id: "after-failure", resourceClaims: { browser: 1 } }
        ]
      },
      maxParallel: 2,
      execute: (task) => {
        if (task.id === "failing") throw new Error("fixture failure");
        return task.id;
      }
    });
    assert.deepEqual(completedValues(afterFailure), ["after-failure"]);
  });
});
