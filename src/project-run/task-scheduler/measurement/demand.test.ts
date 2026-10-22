import type {
  SchedulerActionHistory,
  SchedulerDecisionMeasurementCumulative,
  SchedulerMeasurementContext
} from "../../../project-definition/scheduler-policy.ts";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { defineContextCallback } from "../../../package-tools/context-callback/define-context-callback.ts";
import { admissionSelectionPolicyFor } from "../custom-admission-policy.ts";
import { prepareExecutableTaskGraph } from "../graph.ts";
import { runPreparedTaskGraph } from "../scheduler.ts";
import { ShellAdmissionFacts } from "../shell-admission-facts.ts";
import { SchedulerPerformanceIntegrals } from "./integrals.ts";
import { SchedulerPolicyMeasurement } from "./policy.ts";
import { SchedulerPerformanceTiming } from "./timing.ts";
import { SchedulerQueueMeasurements } from "./queue.ts";
import { binaryTimeUnits } from "./exact-time.ts";
import { roundDelay } from "./exact-contributions.ts";
import {
  compilePreparedAdmissionGraph,
  createInitialAdmissionCoreState,
  selectAdmissionCore
} from "../admission-core/core.ts";

describe("Scheduler grouped measurement production", () => {
  it("starts only declared producers and never materializes aggregate views for task-only consumers", async () => {
    // Capture methods only for receiver-preserving call(this) and restoration below.
    /* oxlint-disable typescript/unbound-method */
    const originalSnapshot = SchedulerPerformanceTiming.prototype.snapshot;
    const originalDelay = SchedulerQueueMeasurements.prototype.takeAdmissionDelay;
    const originalHistory = SchedulerPolicyMeasurement.prototype.beginSelected;
    const originalAdmission = ShellAdmissionFacts.prototype.recordAdmission;
    /* oxlint-enable typescript/unbound-method */
    let snapshots = 0,
      delays = 0,
      history = 0,
      admissionOrder = 0;
    SchedulerPerformanceTiming.prototype.snapshot = function () {
      snapshots++;
      return originalSnapshot.call(this);
    };
    SchedulerQueueMeasurements.prototype.takeAdmissionDelay = function (taskId) {
      delays++;
      return originalDelay.call(this, taskId);
    };
    SchedulerPolicyMeasurement.prototype.beginSelected = function (taskId, baseline) {
      history++;
      originalHistory.call(this, taskId, baseline);
    };
    ShellAdmissionFacts.prototype.recordAdmission = function (taskId) {
      admissionOrder++;
      originalAdmission.call(this, taskId);
    };
    try {
      for (const group of [
        "none",
        "cumulative",
        "actionHistory",
        "runMeasurement",
        "taskTimings",
        "execution"
      ] as const) {
        snapshots = delays = history = admissionOrder = 0;
        let samples = 0,
          graphReads = 0,
          decisions = 0,
          deliveries = 0;
        const prepared = prepareExecutableTaskGraph({ tasks: [{ id: "a" }, { id: "b" }] }, 1);
        const graph = new Proxy(prepared.graph, {
          get(target, key, receiver) {
            if (key === "schedulerGraphSnapshot") graphReads++;
            const projection: unknown = Reflect.get(target, key, receiver);
            return projection;
          }
        });
        const decisionNeeds = group === "cumulative" || group === "actionHistory" ? [group] : [];
        const terminalNeeds =
          group === "runMeasurement" || group === "taskTimings" || group === "execution"
            ? [group]
            : [];
        const run = await runPreparedTaskGraph(
          { ...prepared, graph },
          {
            admissionPolicy: admissionSelectionPolicyFor(
              defineContextCallback("scheduler.decide", {
                contextNeeds: decisionNeeds,
                callback(context) {
                  assert.deepEqual(Object.keys(context), decisionNeeds);
                  assert.equal(Object.isFrozen(context), true);
                  decisions++;
                  if (decisions === 1) return { kind: "select", taskId: "a" };
                  if (decisions === 2) return { kind: "wait" };
                  return { kind: "select", taskId: "b" };
                }
              })
            ),
            execute: () => undefined,
            performanceDiagnostics: {
              clock: {
                now: () => {
                  samples++;
                  return 0;
                }
              },
              declarativeFingerprint: "group-probe"
            },
            terminalEffects: [
              defineContextCallback("scheduler.terminal", {
                contextNeeds: terminalNeeds,
                callback(context) {
                  assert.deepEqual(Object.keys(context), terminalNeeds);
                  deliveries++;
                }
              })
            ]
          }
        );
        assert.equal(run.admissionPolicyFault, undefined, group);
        assert.equal(deliveries, 1, group);
        assert.equal(graphReads, 0, group);
        assert.equal(samples > 0, !["none", "execution"].includes(group), group);
        assert.equal(delays, group === "taskTimings" ? 2 : 0, group);
        assert.equal(history, group === "actionHistory" ? 2 : 0, group);
        assert.equal(admissionOrder, group === "execution" ? 2 : 0, group);
        assert.equal(snapshots > 0, ["cumulative", "runMeasurement"].includes(group), group);
      }
    } finally {
      SchedulerPerformanceTiming.prototype.snapshot = originalSnapshot;
      SchedulerQueueMeasurements.prototype.takeAdmissionDelay = originalDelay;
      SchedulerPolicyMeasurement.prototype.beginSelected = originalHistory;
      ShellAdmissionFacts.prototype.recordAdmission = originalAdmission;
    }
  });

  it("keeps per-task delay maintenance independent of aggregate and action interval integrals", () => {
    for (const group of ["cumulative", "actionHistory", "runMeasurement", "taskTimings"] as const) {
      let aggregateReads = 0;
      const prepared = prepareExecutableTaskGraph(
        { tasks: [{ id: "holder" }, { id: "pending" }] },
        1
      );
      const selection = selectAdmissionCore(
        createInitialAdmissionCoreState(compilePreparedAdmissionGraph(prepared.graph, 1)),
        "holder"
      );
      assert.equal(selection.accepted, true);
      if (!selection.accepted) throw new Error("holder selection was rejected");
      const core = selection.transition.state;
      const queue = new SchedulerQueueMeasurements(core, {
        delays: group === "taskTimings",
        peaks: group === "cumulative" || group === "runMeasurement"
      });
      const integrals = new SchedulerPerformanceIntegrals(
        {
          cumulative: group === "cumulative",
          actionHistory: group === "actionHistory",
          runMeasurement: group === "runMeasurement",
          taskTimings: group === "taskTimings"
        },
        queue
      );
      const state = {
        core,
        get effectiveMaxParallel() {
          aggregateReads++;
          return 2;
        },
        get rootMaxParallel() {
          aggregateReads++;
          return 2;
        },
        get running() {
          aggregateReads++;
          return 1;
        }
      };
      assert.equal(integrals.addInterval(binaryTimeUnits(3), state), true);
      queue.addInterval(binaryTimeUnits(3));
      assert.equal(queue.pendingAdmissionDelays().length, group === "taskTimings" ? 1 : 0, group);
      assert.equal(aggregateReads > 0, group !== "taskTimings", group);
      const delay = queue.takeAdmissionDelay("pending");
      assert.deepEqual(
        delay === undefined ? undefined : roundDelay(delay),
        group === "taskTimings"
          ? { admissiblePendingMs: 0, capacityBlockedMs: 3, mutexBlockedMs: 0 }
          : undefined
      );
      assert.equal(integrals.totals().capacityBlockedTaskMs, group === "actionHistory" ? 3 : 0);
    }
  });
});

describe("Scheduler grouped measurement validity", () => {
  it("shares one first fault across enabled groups without revising older decision snapshots", async () => {
    let now = 0;
    const oldCumulative: SchedulerDecisionMeasurementCumulative[] = [];
    const oldHistory: SchedulerActionHistory[] = [];
    const terminalContexts: Pick<SchedulerMeasurementContext, "runMeasurement" | "taskTimings">[] =
      [];
    const result = await runPreparedTaskGraph(
      prepareExecutableTaskGraph({ tasks: [{ id: "a" }, { id: "b" }] }, 1),
      {
        admissionPolicy: admissionSelectionPolicyFor(
          defineContextCallback("scheduler.decide", {
            contextNeeds: ["candidates", "cumulative", "actionHistory"],
            callback(context) {
              oldCumulative.push(context.cumulative);
              oldHistory.push(context.actionHistory);
              const candidate = context.candidates.find((task) => task.canAdmit);
              return candidate === undefined
                ? { kind: "wait" }
                : { kind: "select", taskId: candidate.taskId };
            }
          })
        ),
        execute: () => {
          now = Number.NaN;
        },
        performanceDiagnostics: {
          clock: { now: () => now },
          declarativeFingerprint: "shared-fault"
        },
        terminalEffects: [
          defineContextCallback("scheduler.terminal", {
            contextNeeds: ["runMeasurement", "taskTimings"],
            callback(context) {
              terminalContexts.push(context);
            }
          })
        ]
      }
    );
    assert.equal(result.admissionPolicyFault, undefined);
    assert.equal(terminalContexts.length, 1);
    const terminalContext = terminalContexts[0];
    assert.ok(terminalContext !== undefined);
    const { runMeasurement, taskTimings } = terminalContext;
    assert.deepEqual(runMeasurement.timing, {
      availability: "unavailable",
      reason: "clock-non-finite"
    });
    assert.equal(runMeasurement.timing, taskTimings.timing);
    assert.equal("timingFacts" in runMeasurement, false);
    assert.equal("admissions" in taskTimings, false);
    assert.equal(runMeasurement.discrete.admittedCount, 2);
    assert.deepEqual(oldCumulative[0]?.timing, { availability: "available" });
    assert.equal(oldHistory[0]?.measurementCount, 0);
    assert.equal(oldHistory[0]?.measurementAt(0), undefined);
    assert.ok(
      oldHistory.some(
        (reader) =>
          reader.measurementAt(reader.measurementCount - 1)?.interval.availability === "unavailable"
      )
    );
  });
});
