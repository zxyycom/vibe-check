import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { runTaskGraph } from "./scheduler.ts";
import type { DiagnosticObservation } from "../diagnostic-logging/logger.ts";
import {
  admissionDecision,
  assertSchedulerDecisionCopiesSnapshotInputs,
  awaitingDecision,
  completionDecision,
  completedValues,
  createDeferred,
  decisionFor,
  delay,
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

    const run = await runTaskGraph<string>({
      graph,
      maxParallel: 3,
      diagnosticLogger: recordingLogger(observations),
      execute: async (task) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        events.push(`start:${task.id}`);
        await delay(task.id === "base" ? 10 : 2);
        events.push(`end:${task.id}`);
        active -= 1;
        return task.id;
      }
    });

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
    assert.equal(rootAdmission.reason, "canonical-order");
    assert.equal(rootAdmission.admissionPriority, 0);
    assert.deepEqual(rootAdmission.capacity, {
      effectiveMaxParallel: 3,
      maxParallel: 3,
      running: 0
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
    assert.equal(noPreemption.reason, "root-capacity");
  });

  it("emits immutable root admission, reservation, and mutex decisions", () => {
    const graph = rootBudgetGraph();
    const initialDecision = decisionFor(graph, { maxParallel: 3 });
    assert.equal(initialDecision.kind, "admit");
    assert.equal(initialDecision.taskId, "base");
    assert.equal(initialDecision.reason, "canonical-order");
    assert.equal(Object.isFrozen(initialDecision), true);

    const staleReservation = decisionFor(graph, {
      maxParallel: 3,
      pendingTaskIds: ["independent"],
      reservationTaskId: "base"
    });
    assert.equal(staleReservation.kind, "admit");
    assert.equal(staleReservation.taskId, "independent");
    assert.deepEqual(staleReservation.reservationUpdate, { kind: "clear" });
    assert.equal(staleReservation.scopeToActivate, null);

    const mutexWait = decisionFor(graph, {
      maxParallel: 3,
      pendingTaskIds: ["mutex-two"],
      runningMutexes: ["shared"],
      runningTaskIds: ["mutex-one"]
    });
    assert.equal(mutexWait.kind, "await-running");
    assert.equal(mutexWait.reason, "dependency-or-mutex");
    assert.equal(mutexWait.blockers.mutex, 1);
    assertSchedulerDecisionCopiesSnapshotInputs();
  });

  it("emits root capacity and running-drain decisions", async () => {
    const graph = rootBudgetGraph();
    const releaseFirst = createDeferred<void>();
    const observations: DiagnosticObservation[] = [];
    const rootBudgetRun = runTaskGraph({
      graph: { tasks: [{ id: "first" }, { id: "waiting" }] },
      maxParallel: 1,
      diagnosticLogger: recordingLogger(observations),
      execute: async (task) => {
        if (task.id === "first") await releaseFirst.promise;
        return task.id;
      }
    });
    await waitFor(() =>
      observations.some((observation) => observation.event === "scheduler.decision")
    );
    const capacityDecisions = recordedSchedulerDecisions(observations);
    assert.deepEqual(
      capacityDecisions.map((decision) => decision.kind),
      ["admit", "await-running"]
    );
    const capacityAdmission = admissionDecision(capacityDecisions[0]);
    assert.equal(capacityAdmission.taskId, "first");
    assert.equal(capacityAdmission.trigger.kind, "execution-started");
    const capacityWait = awaitingDecision(capacityDecisions[1]);
    assert.equal(capacityWait.reason, "root-capacity");
    assert.equal(capacityWait.trigger.kind, "admission-continued");
    assert.deepEqual(capacityWait.capacity, {
      effectiveMaxParallel: 1,
      maxParallel: 1,
      running: 1
    });
    const rootBudgetWait = decisionFor(
      { tasks: [{ id: "first" }, { id: "waiting" }] },
      {
        maxParallel: 1,
        pendingTaskIds: ["waiting"],
        runningTaskIds: ["first"]
      }
    );
    assert.equal(rootBudgetWait.kind, "await-running");
    assert.equal(rootBudgetWait.reason, "root-capacity");

    const runningDrain = decisionFor(graph, {
      maxParallel: 3,
      pendingTaskIds: [],
      runningTaskIds: ["independent"]
    });
    assert.equal(runningDrain.kind, "await-running");
    assert.equal(runningDrain.reason, "running-drain");
    releaseFirst.resolve(undefined);
    await rootBudgetRun;
    const completedBudgetDecisions = recordedSchedulerDecisions(observations);
    assert.deepEqual(
      completedBudgetDecisions.map((decision) => decision.kind),
      ["admit", "await-running", "admit", "await-running", "complete"]
    );
    const drain = awaitingDecision(completedBudgetDecisions[3]);
    assert.equal(drain.reason, "running-drain");
    assert.equal(drain.trigger.kind, "admission-continued");
    const complete = completionDecision(completedBudgetDecisions[4]);
    assert.equal(complete.trigger.kind, "task-settled");
  });
});
