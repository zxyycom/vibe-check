import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { runTaskGraph } from "./scheduler.ts";
import type { TaskGraph } from "./graph.ts";
import type { DiagnosticObservation } from "../diagnostic-logging/logger.ts";
import {
  decisionFor,
  failureGraph,
  recordedSchedulerDecisions,
  recordingLogger,
  settlementFor,
  waitFor
} from "./task-engine.test-support.ts";

describe("static task engine", () => {
  it("settles executor failures and blocks only their dependent tasks", async () => {
    const calls: string[] = [];
    const observations: DiagnosticObservation[] = [];
    const run = await runTaskGraph<string>({
      graph: failureGraph(),
      maxParallel: 2,
      diagnosticLogger: recordingLogger(observations),
      execute: (task) => {
        calls.push(task.id);
        if (task.id === "failure") {
          throw new Error("task failure");
        }
        return task.id;
      }
    });

    assert.deepEqual(calls.sort(), ["failure", "independent"]);
    assert.equal(settlementFor(run, "failure").kind, "failed");
    assert.deepEqual(settlementFor(run, "blocked"), {
      kind: "blocked",
      dependencyIds: ["failure"]
    });
    assert.deepEqual(settlementFor(run, "independent"), {
      kind: "completed",
      value: "independent"
    });

    const blockedDecision = decisionFor(failureGraph(), {
      maxParallel: 2,
      pendingTaskIds: ["blocked"],
      settledTasks: [{ kind: "failed", taskId: "failure" }]
    });
    assert.equal(blockedDecision.kind, "settle-blocked");
    assert.deepEqual(blockedDecision.dependencyIds, ["failure"]);
    const failureDecisions = recordedSchedulerDecisions(observations);
    const appliedBlock = failureDecisions.find((decision) => decision.kind === "settle-blocked");
    if (appliedBlock === undefined) assert.fail("expected a blocked settlement decision");
    assert.equal(appliedBlock.taskId, "blocked");
    assert.deepEqual(appliedBlock.dependencyIds, ["failure"]);
    assert.equal(appliedBlock.trigger.kind, "task-settled");
  });

  it("stops new admission after abort while admitted work receives the same signal and drains", async () => {
    const controller = new AbortController();
    const started: string[] = [];
    const observations: DiagnosticObservation[] = [];
    let observedSignal: AbortSignal | undefined;
    const graph: TaskGraph = {
      tasks: [{ id: "started-one" }, { id: "started-two" }, { id: "pending" }]
    };

    const running = runTaskGraph({
      graph,
      maxParallel: 2,
      diagnosticLogger: recordingLogger(observations),
      signal: controller.signal,
      execute: async (task, context) => {
        started.push(task.id);
        observedSignal = context.signal;
        await waitFor(() => context.signal?.aborted === true);
        return task.id;
      }
    });

    await waitFor(() => started.length === 2);
    controller.abort();
    const run = await running;

    assert.equal(observedSignal, controller.signal);
    assert.deepEqual([...started].sort(), ["started-one", "started-two"]);
    assert.equal(run.cancelled, true);
    assert.deepEqual(settlementFor(run, "started-one"), {
      kind: "completed",
      value: "started-one"
    });
    assert.deepEqual(settlementFor(run, "started-two"), {
      kind: "completed",
      value: "started-two"
    });
    assert.deepEqual(settlementFor(run, "pending"), { kind: "cancelled-before-start" });
    const cancellationDecisions = recordedSchedulerDecisions(observations);
    assert.deepEqual(
      cancellationDecisions.map((decision) => decision.kind),
      ["admit", "admit", "await-running", "cancel-pending", "await-running", "complete"]
    );
    const appliedCancellation = cancellationDecisions[3];
    if (appliedCancellation?.kind !== "cancel-pending") {
      assert.fail("expected pending cancellation decision");
    }
    assert.deepEqual(appliedCancellation.taskIds, ["pending"]);
    assert.equal(appliedCancellation.trigger.kind, "cancellation-observed");
    const appliedCancellationDrain = cancellationDecisions[4];
    if (appliedCancellationDrain?.kind !== "await-running") {
      assert.fail("expected cancellation drain decision");
    }
    assert.equal(appliedCancellationDrain.reason, "cancellation-drain");
    assert.equal(appliedCancellationDrain.trigger.kind, "cancellation-applied");
    const cancellationComplete = cancellationDecisions[5];
    if (cancellationComplete?.kind !== "complete") {
      assert.fail("expected cancellation completion decision");
    }
    assert.equal(cancellationComplete.trigger.kind, "task-settled");
    const cancellation = decisionFor(graph, {
      isAbortRequested: true,
      maxParallel: 2,
      pendingTaskIds: ["pending"],
      runningTaskIds: ["started-one", "started-two"]
    });
    assert.equal(cancellation.kind, "cancel-pending");
    assert.deepEqual(cancellation.taskIds, ["pending"]);
    assert.equal(Object.isFrozen(cancellation.taskIds), true);
    assert.deepEqual(cancellation.reservation, { taskId: null });
    assert.equal(cancellation.trigger.kind, "cancellation-observed");

    const cancellationDrain = decisionFor(graph, {
      isCancelled: true,
      maxParallel: 2,
      pendingTaskIds: [],
      runningTaskIds: ["started-one"]
    });
    assert.equal(cancellationDrain.kind, "await-running");
    assert.equal(cancellationDrain.reason, "cancellation-drain");

    const complete = decisionFor(graph, { isCancelled: true, maxParallel: 2, pendingTaskIds: [] });
    assert.equal(complete.kind, "complete");
  });
});
