import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prepareExecutableTaskGraph } from "../graph.ts";
import {
  compilePreparedAdmissionGraph,
  createInitialAdmissionCoreState,
  selectAdmissionCore,
  cancelPendingAdmissionCore,
  type AdmissionCoreState
} from "../admission-core/core.ts";
import { capacityForCore } from "../admission-core/scheduler-queries.ts";
import { SchedulerPerformanceDiagnostics, type SchedulerPerformanceState } from "./diagnostics.ts";
import { assertRoundedUnits, oracleUnits } from "./exact-time.test-support.ts";

function initial(ids: readonly string[], maxParallel: number): AdmissionCoreState {
  const prepared = prepareExecutableTaskGraph({ tasks: ids.map((id) => ({ id })) }, maxParallel);
  return createInitialAdmissionCoreState(
    compilePreparedAdmissionGraph(prepared.graph, maxParallel)
  );
}
function state(core: AdmissionCoreState): SchedulerPerformanceState {
  const capacity = capacityForCore(core);
  return {
    core,
    running: capacity.running,
    rootMaxParallel: capacity.maxParallel,
    effectiveMaxParallel: capacity.effectiveMaxParallel
  };
}

describe("Scheduler numerical checkpoints", () => {
  it("keeps action-only local intervals accurate when unrelated private prefixes are huge or overflow", () => {
    for (const [first, middle, last] of [
      [-(2 ** 900), 0, Number.MIN_VALUE],
      [-Number.MAX_VALUE / 2, 0, Number.MAX_VALUE / 2]
    ]) {
      let now = first ?? 0;
      let core = initial(["a", "b"], 2);
      const measurement = new SchedulerPerformanceDiagnostics(
        {
          clock: { now: () => now },
          declarativeFingerprint: "numeric",
          groups: {
            cumulative: false,
            actionHistory: true,
            runMeasurement: false,
            taskTimings: false
          }
        },
        state(core)
      );
      function select(taskId: string) {
        const selection = selectAdmissionCore(core, taskId);
        assert.equal(selection.accepted, true);
        if (!selection.accepted) throw new Error("selection was rejected");
        measurement.beforeAdmission(taskId, () => []);
        core = selection.transition.state;
        measurement.captureState(state(core));
        measurement.beginSelectedPolicyAction(taskId);
        measurement.recordEffect({ kind: "admitted", taskId });
      }
      select("a");
      now = middle ?? 0;
      const old = measurement.decisionMeasurement().actionHistory;
      assert.ok(old);
      assert.equal(old.measurementCount, 1);
      assert.equal(old.measurementAt(1), undefined);
      select("b");
      now = last ?? 0;
      const current = measurement.decisionMeasurement().actionHistory;
      assert.ok(current);
      const interval = current.measurementAt(1)?.interval;
      assert.equal(interval?.availability, "available");
      if (interval?.availability !== "available")
        throw new Error("local interval became unavailable");
      const exact = 2n * (oracleUnits(last ?? 0) - oracleUnits(middle ?? 0));
      assertRoundedUnits(interval.contribution.rootCapacitySlotMs, exact);
      assertRoundedUnits(interval.contribution.taskSlotMs, exact);
      assert.equal(old.measurementCount, 1);
      assert.equal(old.measurementAt(1), undefined);
    }
  });
  it("seals derived summary faults before terminal getters regardless of field read order", () => {
    for (const firstField of ["run", "tasks"] as const) {
      let now = 0;
      let core = initial(["a", "b", "c"], 1);
      const measurement = new SchedulerPerformanceDiagnostics(
        {
          clock: { now: () => now },
          declarativeFingerprint: "read-order",
          logger: { close: () => "succeeded", observe: () => {} },
          groups: {
            cumulative: true,
            actionHistory: false,
            runMeasurement: true,
            taskTimings: true
          }
        },
        state(core)
      );
      const old = measurement.decisionMeasurement().cumulative;
      assert.ok(old);
      now = Number.MAX_VALUE / 2;
      measurement.beforePendingSettlement(["a", "b", "c"]);
      core = cancelPendingAdmissionCore(core).state;
      measurement.captureState(state(core));
      if (firstField === "run") measurement.runMeasurement();
      else measurement.taskTimings();
      const run = measurement.runMeasurement(),
        tasks = measurement.taskTimings();
      assert.deepEqual(run.timing, { availability: "unavailable", reason: "integral-invalid" });
      assert.equal(run.timing, tasks.timing);
      assert.equal("admissions" in tasks, false);
      assert.equal("timingFacts" in run, false);
      assert.deepEqual(old.timing, { availability: "available" });
      assert.equal(old.peaks.admissionViablePendingTaskCount, 3);
    }
  });
  it("keeps an invocation-local exact quantum through binade crossings and clock faults", () => {
    const starts = [
      -1,
      -0,
      0,
      Number.MIN_VALUE,
      2 ** -1022,
      1 - 2 ** -53,
      1,
      1 + 2 ** -52,
      2 ** 20 - 2 ** -33,
      2 ** 20,
      2 ** 20 + 2 ** -32
    ];
    for (const first of starts) {
      let now = first;
      const core = initial(["pending"], 1);
      const measurement = new SchedulerPerformanceDiagnostics(
        {
          clock: { now: () => now },
          declarativeFingerprint: "local-scale",
          groups: {
            cumulative: false,
            actionHistory: false,
            runMeasurement: false,
            taskTimings: true
          }
        },
        state(core)
      );
      now = first <= 0 ? Number.MIN_VALUE : Math.max(2, first * 2);
      const tasks = measurement.taskTimings();
      assert.equal(tasks.timing.availability, "available");
      if (!("admissions" in tasks)) throw new Error("exact local timing was unavailable");
      const delay = tasks.admissions[0]?.admissionDelay;
      assert.notEqual(delay, undefined);
      if (delay === undefined) throw new Error("pending Task delay was not sealed");
      assertRoundedUnits(delay.admissiblePendingMs, oracleUnits(now) - oracleUnits(first));
      assert.equal(delay.capacityBlockedMs, 0);
      assert.equal(delay.mutexBlockedMs, 0);
    }
    let emptyNow = -Number.MAX_VALUE;
    const empty = new SchedulerPerformanceDiagnostics(
      {
        clock: { now: () => emptyNow },
        declarativeFingerprint: "empty-local-scale",
        groups: {
          cumulative: false,
          actionHistory: false,
          runMeasurement: false,
          taskTimings: true
        }
      },
      state(initial([], 1))
    );
    emptyNow = Number.MAX_VALUE;
    assert.deepEqual(empty.taskTimings(), {
      timing: { availability: "available" },
      admissions: []
    });
    const faultReasons = {
      backward: "clock-backward",
      "non-finite": "clock-non-finite",
      throw: "clock-threw"
    } as const;
    for (const fault of ["backward", "non-finite", "throw"] as const) {
      let failed = false;
      const core = initial(["pending"], 1);
      const measurement = new SchedulerPerformanceDiagnostics(
        {
          clock: {
            now: () => {
              if (!failed) return 2 ** 20;
              if (fault === "throw") throw new Error("clock failure");
              return fault === "backward" ? 2 ** 20 - 2 ** -33 : Number.NaN;
            }
          },
          declarativeFingerprint: "scale-fault",
          groups: {
            cumulative: false,
            actionHistory: false,
            runMeasurement: false,
            taskTimings: true
          }
        },
        state(core)
      );
      failed = true;
      const tasks = measurement.taskTimings();
      assert.deepEqual(tasks.timing, {
        availability: "unavailable",
        reason: faultReasons[fault]
      });
    }
  });
});
