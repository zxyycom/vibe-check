import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prepareExecutableTaskGraph, type TaskGraph } from "../graph.ts";
import {
  compilePreparedAdmissionGraph,
  createAdmissionCoreFromSettlements,
  selectAdmissionCore,
  settleAdmissionCore,
  cancelPendingAdmissionCore,
  reconcileAdmissionCore,
  type AdmissionCoreTransition
} from "../admission-core/core.ts";
import type { SchedulerSettlementKind } from "../scheduler-decision-model.ts";
import { SchedulerQueueMeasurements } from "./queue.ts";
import { QueueTraceOracle } from "./queue.test-support.ts";

function trace(
  graph: TaskGraph,
  maxParallel: number,
  now = 0,
  settlements: readonly Readonly<{ taskId: string; kind: SchedulerSettlementKind }>[] = []
) {
  const prepared = prepareExecutableTaskGraph(graph, maxParallel);
  let core = createAdmissionCoreFromSettlements(
    compilePreparedAdmissionGraph(prepared.graph, maxParallel),
    settlements
  );
  const queue = new SchedulerQueueMeasurements(core, { delays: true, peaks: true });
  const oracle = new QueueTraceOracle(prepared.graph, maxParallel, now, settlements);
  let peakViable = 0,
    peakMutex = 0,
    peakCapacity = 0,
    peakAdmissible = 0;
  function check() {
    const counts = oracle.counts();
    assert.deepEqual(queue.counts(), counts);
    peakViable = Math.max(peakViable, counts.admissionViablePending);
    peakMutex = Math.max(peakMutex, counts.mutexBlocked);
    peakCapacity = Math.max(peakCapacity, counts.capacityBlocked);
    peakAdmissible = Math.max(peakAdmissible, counts.admissiblePending);
    assert.deepEqual(queue.peaks(), {
      admissionViablePendingTaskCount: peakViable,
      mutexBlockedTaskCount: peakMutex,
      capacityBlockedTaskCount: peakCapacity,
      admissiblePendingTaskCount: peakAdmissible
    });
    assert.deepEqual(
      new Map(
        queue.pendingAdmissionDelays().map(({ taskId, admissionDelay }) => [taskId, admissionDelay])
      ),
      oracle.pendingDelays()
    );
  }
  function apply(transition: AdmissionCoreTransition, batch = false) {
    if (batch) {
      oracle.applyBatch(transition.effects);
      core = transition.state;
      queue.capture(core, true);
      check();
    } else {
      for (const [index, effect] of transition.effects.entries()) {
        const next = transition.effectStates[index];
        assert.notEqual(next, undefined);
        if (next === undefined) throw new Error("missing effect state");
        oracle.apply(effect);
        core = next;
        queue.capture(core, true);
        check();
      }
    }
    queue.capture(core, true);
    check(); // Re-reading a successor must not re-apply its transaction.
  }
  check();
  return {
    queue,
    oracle,
    get core() {
      return core;
    },
    advance(next: number) {
      queue.addInterval(oracle.advance(next));
      check();
    },
    select(taskId: string) {
      const selection = selectAdmissionCore(core, taskId);
      assert.equal(selection.accepted, true, taskId);
      if (!selection.accepted) throw new Error("expected accepted selection");
      assert.deepEqual(queue.takeAdmissionDelay(taskId), oracle.take(taskId));
      apply(selection.transition);
    },
    reject(taskId: string) {
      assert.equal(selectAdmissionCore(core, taskId).accepted, false);
      check();
    },
    settle(taskId: string, outcome: "satisfied" | "unsatisfied" = "satisfied") {
      const settlement = settleAdmissionCore(core, taskId, outcome);
      assert.equal(settlement.accepted, true, taskId);
      if (!settlement.accepted) throw new Error("expected accepted settlement");
      apply(settlement.transition);
    },
    cancel() {
      apply(cancelPendingAdmissionCore(core), true);
    },
    reconcile() {
      apply(reconcileAdmissionCore(core));
    }
  };
}

describe("Scheduler incremental queue measurements", () => {
  it("matches independent per-Task classification through resources, mutex sources, scopes and cancellation", () => {
    const run = trace(
      {
        resourceCapacities: { r: 8 },
        tasks: [
          { id: "x", mutex: ["x", "x"], resourceClaims: { r: 2 } },
          { id: "y", mutex: ["y"], resourceClaims: { r: 3 } },
          { id: "both", mutex: ["x", "y"], resourceClaims: { r: 1 } },
          { id: "small", resourceClaims: { r: 1 } },
          { id: "medium", resourceClaims: { r: 4 } },
          { id: "large", resourceClaims: { r: 7 } },
          { id: "start-narrow", scopeId: "narrow" },
          { id: "end-narrow", scopeId: "narrow", dependsOn: ["start-narrow"] },
          { id: "start-wide", scopeId: "wide" },
          { id: "end-wide", scopeId: "wide", dependsOn: ["start-wide"] },
          { id: "failed" },
          { id: "child", dependsOn: ["failed"] },
          { id: "observer", observes: ["child"] },
          { id: "cancel-gate" },
          { id: "cancel-observer", observes: ["cancel-gate"] }
        ],
        scopes: [
          {
            id: "narrow",
            maxParallel: 1,
            activationTaskIds: ["start-narrow"],
            terminalTaskId: "end-narrow"
          },
          {
            id: "wide",
            maxParallel: 2,
            activationTaskIds: ["start-wide"],
            terminalTaskId: "end-wide"
          }
        ]
      },
      4
    );
    run.advance(1);
    run.select("x");
    run.advance(2);
    run.select("y");
    run.advance(3);
    run.reject("start-narrow");
    run.advance(10);
    run.settle("x");
    run.advance(11);
    run.select("start-wide");
    run.advance(12);
    run.settle("y");
    run.advance(13);
    run.settle("start-wide");
    run.advance(14);
    run.select("end-wide");
    run.advance(15);
    run.settle("end-wide");
    run.advance(16);
    run.select("start-narrow");
    run.advance(17);
    run.settle("start-narrow");
    run.advance(18);
    run.select("end-narrow");
    run.advance(19);
    run.settle("end-narrow");
    run.advance(20);
    run.select("failed");
    run.advance(21);
    run.settle("failed", "unsatisfied");
    run.advance(22);
    run.cancel();
    assert.equal(
      run.queue.pendingAdmissionDelays().some((delay) => delay.taskId === "child"),
      false
    );
    assert.equal(
      run.queue.pendingAdmissionDelays().some((delay) => delay.taskId === "cancel-observer"),
      false
    );
  });
  it("excludes unsatisfied prerequisites from seed peaks and preserves tiny late waits after huge category prefixes", () => {
    const seeded = trace(
      {
        tasks: [
          { id: "failed" },
          { id: "child", dependsOn: ["failed"] },
          { id: "observer", observes: ["child"] }
        ]
      },
      1,
      0,
      [{ taskId: "failed", kind: "prerequisite-unsatisfied" }]
    );
    assert.equal(seeded.queue.peaks().admissionViablePendingTaskCount, 0);
    seeded.reconcile();
    seeded.advance(1);
    seeded.select("observer");
    seeded.settle("observer");
    const run = trace(
      { tasks: [{ id: "source" }, { id: "late", dependsOn: ["source"] }] },
      1,
      -(2 ** 900)
    );
    run.select("source");
    run.advance(0);
    run.settle("source");
    run.advance(Number.MIN_VALUE);
    assert.deepEqual(run.queue.takeAdmissionDelay("late"), {
      admissiblePendingMs: 1n,
      capacityBlockedMs: 0n,
      mutexBlockedMs: 0n
    });
  });
});
