import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  staticAdmissionSelectionPolicy,
  type AdmissionPolicyDecision,
  type AdmissionPolicyInput,
  type AdmissionSelectionPolicy
} from "./admission-selection-policy.ts";
import { prepareTaskGraph, type PlannedTaskGraph, type TaskGraph } from "./graph.ts";
import { decideScheduler, type SchedulerSnapshot } from "./scheduler-decision.ts";
import { runTaskGraph } from "./scheduler.ts";

const EXECUTION_STARTED = Object.freeze({ kind: "execution-started" as const });

function snapshot(graph: TaskGraph, overrides: Partial<SchedulerSnapshot> = {}): SchedulerSnapshot {
  const plannedGraph = prepareTaskGraph(graph, overrides.maxParallel ?? 2);
  return Object.freeze({
    activeScopeIds: Object.freeze([]),
    graph: plannedGraph,
    isAbortRequested: false,
    isCancelled: false,
    maxParallel: 2,
    pendingTaskIds: Object.freeze(plannedGraph.tasks.map((task) => task.id)),
    reservationTaskId: undefined,
    runningMutexes: Object.freeze([]),
    runningTaskIds: Object.freeze([]),
    settledTasks: Object.freeze([]),
    ...overrides
  });
}

function policy(decide: AdmissionSelectionPolicy["decide"]): AdmissionSelectionPolicy {
  return Object.freeze({ decide });
}

function invalidPolicy(
  mutate: (decision: AdmissionPolicyDecision) => void
): AdmissionSelectionPolicy {
  return policy(() => {
    const decision: AdmissionPolicyDecision = {
      kind: "select",
      reason: "policy-selection",
      reservationUpdate: { kind: "unchanged" },
      taskId: "ready"
    };
    mutate(decision);
    return decision;
  });
}

describe("task engine admission policy", () => {
  it("keeps the static policy trace identical for omitted and explicit policy handoff", async () => {
    const graph = {
      tasks: [
        { id: "source" },
        { id: "dependent", dependsOn: ["source"], admissionPriority: 4 },
        { id: "ordinary", admissionPriority: 2 }
      ]
    };
    const scenarios = [
      snapshot(graph),
      snapshot(graph, { pendingTaskIds: Object.freeze(["dependent", "ordinary"]) }),
      snapshot(graph, {
        pendingTaskIds: Object.freeze(["dependent", "ordinary"]),
        runningTaskIds: Object.freeze(["source"])
      }),
      snapshot(graph, {
        pendingTaskIds: Object.freeze(["dependent", "ordinary"]),
        settledTasks: Object.freeze([
          Object.freeze({ kind: "completed" as const, taskId: "source" })
        ])
      })
    ];

    for (const current of scenarios) {
      assert.deepEqual(
        decideScheduler(current, EXECUTION_STARTED),
        decideScheduler(current, EXECUTION_STARTED, staticAdmissionSelectionPolicy)
      );
    }

    const defaultRun = await runTaskGraph({ graph, maxParallel: 2, execute: (task) => task.id });
    const explicitStaticRun = await runTaskGraph({
      admissionPolicy: staticAdmissionSelectionPolicy,
      graph,
      maxParallel: 2,
      execute: (task) => task.id
    });
    assert.deepEqual(
      defaultRun.settlements.map(({ settlement, task }) => [task.id, settlement.kind]),
      explicitStaticRun.settlements.map(({ settlement, task }) => [task.id, settlement.kind])
    );
  });

  it("hands a policy the frozen full graph and immutable dynamic facts without a priority side input", () => {
    const graph = prepareTaskGraph(
      {
        tasks: [
          { id: "first", admissionPriority: 1 },
          { id: "second", dependsOn: ["first"], admissionPriority: 9 }
        ]
      },
      2
    );
    let received: AdmissionPolicyInput | undefined;
    const inspected = snapshotFromGraph(graph, {
      runningTaskIds: Object.freeze(["running"]),
      settledTasks: Object.freeze([Object.freeze({ kind: "completed", taskId: "first" })])
    });
    const selected = decideScheduler(
      inspected,
      EXECUTION_STARTED,
      policy((input) => {
        received = input;
        return {
          kind: "select",
          reason: "policy-selection",
          reservationUpdate: { kind: "unchanged" },
          taskId: "second"
        };
      })
    );

    assert.equal(selected.kind, "admit");
    assert.equal(selected.taskId, "second");
    assert.ok(received);
    const policyInput = received;
    assert.equal(policyInput.graph, graph);
    assert.deepEqual(
      policyInput.graph.tasks.map((task) => task.id),
      ["first", "second"]
    );
    assert.equal("priority" in policyInput, false);
    assert.equal("priorities" in policyInput, false);
    assert.equal(Object.isFrozen(policyInput), true);
    assert.equal(Object.isFrozen(policyInput.candidates), true);
    assert.equal(Object.isFrozen(policyInput.inspection), true);
    assert.equal(Object.isFrozen(policyInput.inspection.runningTaskIds), true);
    assert.equal(Object.isFrozen(policyInput.inspection.settledTasks), true);
    assert.equal(policyInput.inspection.runningTaskIds instanceof Set, false);
    assert.equal(policyInput.inspection.settledTasks instanceof Map, false);
    assert.throws(
      () => Reflect.apply(Array.prototype.push, policyInput.candidates, [{}]),
      TypeError
    );
    assert.throws(
      () => Reflect.apply(Array.prototype.push, policyInput.inspection.runningTaskIds, ["other"]),
      TypeError
    );
    assert.throws(
      () => Reflect.apply(Array.prototype.push, policyInput.graph.tasks, [{}]),
      TypeError
    );
  });

  it("rejects invalid policy selections and malformed results before execution", async () => {
    const selectedTaskIds: string[] = [];
    const graph = {
      tasks: [{ id: "source" }, { id: "ready" }, { id: "blocked", dependsOn: ["source"] }]
    };
    const candidateSnapshot = snapshot(graph, {
      pendingTaskIds: Object.freeze(["ready", "blocked"])
    });
    const capacitySnapshot = snapshot(
      { tasks: [{ id: "waiting" }] },
      { maxParallel: 1, runningTaskIds: Object.freeze(["running"]) }
    );
    const invalidResults = [
      invalidPolicy((decision) => Reflect.set(decision, "taskId", "unknown")),
      invalidPolicy((decision) => Reflect.set(decision, "taskId", "blocked")),
      invalidPolicy((decision) => Reflect.set(decision, "taskId", "waiting")),
      invalidPolicy((decision) => Reflect.set(decision, "reason", "unknown")),
      invalidPolicy((decision) =>
        Reflect.set(decision, "reservationUpdate", { kind: "set", taskId: "blocked" })
      ),
      invalidPolicy((decision) => {
        Reflect.set(decision, "kind", "wait");
        Reflect.set(decision, "reason", "policy-wait");
      }),
      invalidPolicy((decision) => Reflect.set(decision, "reservationUpdate", { kind: "set" })),
      invalidPolicy((decision) => Reflect.defineProperty(decision, "unexpected", { value: true }))
    ];

    assert.throws(
      () => decideScheduler(candidateSnapshot, EXECUTION_STARTED, invalidResults[0]),
      /cannot be admitted/
    );
    assert.throws(
      () => decideScheduler(candidateSnapshot, EXECUTION_STARTED, invalidResults[1]),
      /cannot be admitted/
    );
    assert.throws(
      () => decideScheduler(capacitySnapshot, EXECUTION_STARTED, invalidResults[2]),
      /cannot be admitted/
    );
    for (const invalid of invalidResults.slice(3)) {
      assert.throws(() => decideScheduler(candidateSnapshot, EXECUTION_STARTED, invalid));
    }
    await assert.rejects(
      () =>
        runTaskGraph({
          admissionPolicy: invalidResults[0],
          execute: (task) => {
            selectedTaskIds.push(task.id);
            return task.id;
          },
          graph: { tasks: [{ id: "ready" }] },
          maxParallel: 1
        }),
      /cannot be admitted/
    );
    assert.deepEqual(selectedTaskIds, []);
  });

  it("allows a policy-owned deliberate wait with a candidate reservation but rejects an undrainable wait", () => {
    const waitingSnapshot = snapshot(
      { tasks: [{ id: "first" }, { id: "second" }] },
      { maxParallel: 1, runningTaskIds: Object.freeze(["running"]) }
    );
    const deliberateWait = decideScheduler(
      waitingSnapshot,
      EXECUTION_STARTED,
      policy(() => ({
        kind: "wait",
        reason: "policy-wait",
        reservationUpdate: { kind: "set", taskId: "second" }
      }))
    );
    assert.equal(deliberateWait.kind, "await-running");
    assert.equal(deliberateWait.reason, "policy-wait");
    assert.deepEqual(deliberateWait.reservationUpdate, { kind: "set", taskId: "second" });
    assert.throws(
      () =>
        decideScheduler(
          snapshot({ tasks: [{ id: "ready" }] }),
          EXECUTION_STARTED,
          policy(() => ({
            kind: "wait",
            reason: "policy-wait",
            reservationUpdate: { kind: "unchanged" }
          }))
        ),
      /cannot wait when no task is running/
    );
  });

  it("does not invoke the policy for cancellation, blocked settlement, or completion", () => {
    let calls = 0;
    const neverCalled = policy(() => {
      calls += 1;
      return {
        kind: "select",
        reason: "policy-selection",
        reservationUpdate: { kind: "unchanged" },
        taskId: "ready"
      };
    });
    const graph = { tasks: [{ id: "source" }, { id: "blocked", dependsOn: ["source"] }] };

    assert.equal(
      decideScheduler(snapshot(graph, { isAbortRequested: true }), EXECUTION_STARTED, neverCalled)
        .kind,
      "cancel-pending"
    );
    assert.equal(
      decideScheduler(
        snapshot(graph, {
          pendingTaskIds: Object.freeze(["blocked"]),
          settledTasks: Object.freeze([Object.freeze({ kind: "failed", taskId: "source" })])
        }),
        EXECUTION_STARTED,
        neverCalled
      ).kind,
      "settle-blocked"
    );
    assert.equal(
      decideScheduler(snapshot({ tasks: [] }), EXECUTION_STARTED, neverCalled).kind,
      "complete"
    );
    assert.equal(calls, 0);
  });

  it("requires a frozen policy value when the imperative task engine receives one", async () => {
    await assert.rejects(
      () =>
        runTaskGraph({
          admissionPolicy: { decide: staticAdmissionSelectionPolicy.decide },
          execute: () => undefined,
          graph: { tasks: [{ id: "ready" }] },
          maxParallel: 1
        }),
      /must be a frozen policy value/
    );
  });
});

function snapshotFromGraph(
  graph: PlannedTaskGraph,
  overrides: Partial<SchedulerSnapshot> = {}
): SchedulerSnapshot {
  return Object.freeze({
    activeScopeIds: Object.freeze([]),
    graph,
    isAbortRequested: false,
    isCancelled: false,
    maxParallel: 2,
    pendingTaskIds: Object.freeze(graph.tasks.map((task) => task.id)),
    reservationTaskId: undefined,
    runningMutexes: Object.freeze([]),
    runningTaskIds: Object.freeze([]),
    settledTasks: Object.freeze([]),
    ...overrides
  });
}
