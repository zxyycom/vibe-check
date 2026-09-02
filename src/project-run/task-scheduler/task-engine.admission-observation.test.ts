import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DiagnosticObservation } from "../diagnostic-logging/logger.ts";
import { runTaskGraph } from "./scheduler.ts";
import {
  admissionDecision,
  assertSchedulerDecisionCopiesSnapshotInputs,
  awaitingDecision,
  completionDecision,
  createDeferred,
  decisionFor,
  recordedSchedulerDecisions,
  recordingLogger,
  rootBudgetGraph,
  waitFor
} from "./task-engine.test-support.ts";

describe("static task engine", () => {
  it("emits immutable root admission and mutex decisions", () => {
    const graph = rootBudgetGraph();
    const initialDecision = decisionFor(graph, { maxParallel: 3 });
    assert.equal(initialDecision.kind, "admit");
    assert.equal(initialDecision.taskId, "base");
    assert.equal(Object.isFrozen(initialDecision), true);

    const independentAdmission = decisionFor(graph, {
      maxParallel: 3,
      pendingTaskIds: ["independent"]
    });
    assert.equal(independentAdmission.kind, "admit");
    assert.equal(independentAdmission.taskId, "independent");
    assert.equal(independentAdmission.scopeToActivate, null);

    const mutexWait = decisionFor(graph, {
      maxParallel: 3,
      pendingTaskIds: ["mutex-two"],
      runningMutexes: ["shared"],
      runningTaskIds: ["mutex-one"]
    });
    assert.equal(mutexWait.kind, "await-running");
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

    const runningDrain = decisionFor(graph, {
      maxParallel: 3,
      pendingTaskIds: [],
      runningTaskIds: ["independent"]
    });
    assert.equal(runningDrain.kind, "await-running");
    releaseFirst.resolve(undefined);
    await rootBudgetRun;
    const completedBudgetDecisions = recordedSchedulerDecisions(observations);
    assert.deepEqual(
      completedBudgetDecisions.map((decision) => decision.kind),
      ["admit", "await-running", "admit", "await-running", "complete"]
    );
    const drain = awaitingDecision(completedBudgetDecisions[3]);
    assert.equal(drain.trigger.kind, "admission-continued");
    const complete = completionDecision(completedBudgetDecisions[4]);
    assert.equal(complete.trigger.kind, "task-settled");
  });
});
