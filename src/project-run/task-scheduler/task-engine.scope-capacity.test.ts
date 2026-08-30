import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { runTaskGraph } from "./scheduler.ts";
import type { DiagnosticObservation } from "../diagnostic-logging/logger.ts";
import {
  continuationPriorityGraph,
  createDeferred,
  decisionFor,
  delay,
  noActivationGraph,
  recordedSchedulerDecisions,
  recordingLogger,
  tighteningScopeGraph,
  waitFor
} from "./task-engine.test-support.ts";

describe("static task engine", () => {
  it("keeps a scope cap active through terminal settlement and prioritizes its continuation", async () => {
    const events: string[] = [];
    const observations: DiagnosticObservation[] = [];
    const releaseTerminal = createDeferred<void>();
    const graph = continuationPriorityGraph();

    const running = runTaskGraph({
      graph,
      maxParallel: 3,
      diagnosticLogger: recordingLogger(observations),
      execute: async (task) => {
        events.push(`start:${task.id}`);
        if (task.id === "limited-terminal") {
          await releaseTerminal.promise;
        }
        events.push(`end:${task.id}`);
        return task.id;
      }
    });

    await waitFor(() => events.includes("start:limited-terminal"));
    const scopeBudgetWait = decisionFor(graph, {
      activeScopeIds: ["limited"],
      maxParallel: 3,
      pendingTaskIds: ["wide-one", "wide-two"],
      runningTaskIds: ["limited-terminal"],
      settledTasks: [{ kind: "completed", taskId: "limited-work" }]
    });
    assert.equal(scopeBudgetWait.kind, "await-running");
    assert.equal(scopeBudgetWait.reason, "active-scope-capacity");
    assert.equal(scopeBudgetWait.blockers.scopeCapacity, true);
    assert.equal(events.includes("start:wide-one"), false);
    assert.equal(events.includes("start:wide-two"), false);
    releaseTerminal.resolve();
    await running;
    assert.ok(events.indexOf("end:limited-terminal") < events.indexOf("start:wide-one"));
    recordedSchedulerDecisions(observations);
  });

  it("uses the minimum active cap and reserves capacity for a newly ready tighter scope", async () => {
    const events: string[] = [];
    const observations: DiagnosticObservation[] = [];
    const releaseWide = createDeferred<void>();
    const releaseLow = createDeferred<void>();
    const graph = tighteningScopeGraph();

    const running = runTaskGraph({
      graph,
      maxParallel: 2,
      diagnosticLogger: recordingLogger(observations),
      execute: async (task) => {
        events.push(`start:${task.id}`);
        if (task.id === "gate") {
          await waitFor(() => events.includes("start:wide-one"));
        }
        if (task.id === "wide-one") {
          await releaseWide.promise;
        }
        if (task.id === "low") {
          await releaseLow.promise;
        }
        events.push(`end:${task.id}`);
        return task.id;
      }
    });

    await waitFor(() => events.includes("end:gate"));
    await delay(2);
    const reservationWait = decisionFor(graph, {
      activeScopeIds: ["wide"],
      maxParallel: 2,
      pendingTaskIds: ["wide-two", "wide-terminal", "low"],
      runningTaskIds: ["wide-one"],
      settledTasks: [{ kind: "completed", taskId: "gate" }]
    });
    assert.equal(reservationWait.kind, "await-running");
    assert.equal(reservationWait.reason, "reserved-tightening-scope");
    assert.deepEqual(reservationWait.reservationUpdate, { kind: "set", taskId: "low" });

    const preservedReservationWait = decisionFor(graph, {
      activeScopeIds: ["wide"],
      maxParallel: 2,
      pendingTaskIds: ["wide-two", "wide-terminal", "low"],
      reservationTaskId: "low",
      runningTaskIds: ["wide-one"],
      settledTasks: [{ kind: "completed", taskId: "gate" }]
    });
    assert.equal(preservedReservationWait.kind, "await-running");
    assert.deepEqual(preservedReservationWait.reservationUpdate, { kind: "unchanged" });

    const reservedAdmission = decisionFor(graph, {
      activeScopeIds: ["wide"],
      maxParallel: 2,
      pendingTaskIds: ["wide-two", "wide-terminal", "low"],
      reservationTaskId: "low",
      settledTasks: [{ kind: "completed", taskId: "gate" }]
    });
    assert.equal(reservedAdmission.kind, "admit");
    assert.equal(reservedAdmission.taskId, "low");
    assert.equal(reservedAdmission.reason, "reservation");
    assert.deepEqual(reservedAdmission.reservationUpdate, { kind: "clear" });
    assert.equal(reservedAdmission.scopeToActivate, "low");
    assert.equal(events.includes("start:wide-two"), false);
    assert.equal(events.includes("start:low"), false);
    releaseWide.resolve();
    await waitFor(() => events.includes("start:low"));
    assert.equal(events.includes("start:wide-two"), false);
    releaseLow.resolve();
    await running;
    assert.ok(events.indexOf("start:low") < events.indexOf("start:wide-two"));
    recordedSchedulerDecisions(observations);
  });

  it("does not activate a cap for a scope with no activation task", async () => {
    const started: string[] = [];
    const release = createDeferred<void>();
    const graph = noActivationGraph();

    const running = runTaskGraph({
      graph,
      maxParallel: 3,
      execute: async (task) => {
        started.push(task.id);
        await release.promise;
        return task.id;
      }
    });

    await waitFor(() => started.length === 3);
    assert.deepEqual([...started].sort(), ["wide-one", "wide-two", "zero-terminal"]);
    release.resolve();
    await running;
  });
});
