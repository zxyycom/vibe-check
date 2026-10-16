import { defineContextCallback } from "../../../package-tools/context-callback/define-context-callback.ts";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SchedulerMeasurementContext } from "../../../project-definition/project-definition.ts";
import type { DiagnosticObservation } from "../../diagnostic-logging/logger.ts";
import { runTaskGraph } from "../scheduler.ts";
import { assertFrozenSchedulerGraphSnapshot, scriptedClock } from "../task-engine.test-support.ts";
import { DECLARATIVE_FINGERPRINT } from "./diagnostics.test-support.ts";

describe("Scheduler terminal effects", () => {
  it("awaits ordered hooks over exact immutable terminal views without exposing Task values", async () => {
    const calls: string[] = [];
    let successes = 0;
    const contexts: SchedulerMeasurementContext[] = [];
    await runTaskGraph({
      execute: () => ({ private: "Task value" }),
      graph: { tasks: [{ id: "first" }, { id: "second" }] },
      maxParallel: 2,
      performanceDiagnostics: Object.freeze({
        clock: scriptedClock(),
        declarativeFingerprint: DECLARATIVE_FINGERPRINT
      }),
      terminalEffects: [
        defineContextCallback("scheduler.terminal", {
          contextNeeds: ["execution", "graph", "runMeasurement", "taskTimings"],
          callback: async (context) => {
            calls.push("first-start");
            contexts.push(context);
            await Promise.resolve();
            calls.push("first-end");
          }
        }),
        defineContextCallback("scheduler.terminal", {
          contextNeeds: ["execution", "graph", "runMeasurement", "taskTimings"],
          callback: (context) => {
            calls.push("second");
            contexts.push(context);
          }
        })
      ],
      onTerminalEffectsSettled: () => {
        successes += 1;
      }
    });

    assert.deepEqual(calls, ["first-start", "first-end", "second"]);
    assert.equal(successes, 1);
    assert.notEqual(contexts[0], contexts[1]);
    const context = contexts[0];
    if (context === undefined) assert.fail("expected terminal measurement context");
    assertTerminalMeasurementContext(context);
  });

  it("delivers the internal summary Hook before caller terminal effects through one runner", async () => {
    const calls: string[] = [];
    const logger = {
      close: () => "succeeded" as const,
      observe: (observation: DiagnosticObservation) => {
        if (observation.event === "scheduler.summary") calls.push("summary");
      }
    };
    await runTaskGraph({
      execute: () => undefined,
      graph: { tasks: [{ id: "task" }] },
      maxParallel: 1,
      performanceDiagnostics: Object.freeze({
        clock: scriptedClock(),
        declarativeFingerprint: DECLARATIVE_FINGERPRINT,
        logger
      }),
      terminalEffects: [
        defineContextCallback("scheduler.terminal", {
          contextNeeds: ["execution", "graph", "runMeasurement", "taskTimings"],
          callback: async () => {
            await Promise.resolve();
            calls.push("caller");
          }
        })
      ]
    });
    assert.deepEqual(calls, ["summary", "caller"]);
  });

  it("contains summary writer failure while preserving caller terminal effect failure delivery", async () => {
    let callerFailureCount = 0;
    const calls: string[] = [];
    const run = await runTaskGraph({
      execute: () => undefined,
      graph: { tasks: [{ id: "task" }] },
      maxParallel: 1,
      performanceDiagnostics: Object.freeze({
        clock: scriptedClock(),
        declarativeFingerprint: DECLARATIVE_FINGERPRINT,
        logger: {
          close: () => "succeeded" as const,
          observe: () => {
            throw new Error("summary writer failure");
          }
        }
      }),
      terminalEffects: [
        defineContextCallback("scheduler.terminal", {
          contextNeeds: ["execution", "graph", "runMeasurement", "taskTimings"],
          callback: () => {
            calls.push("caller");
            throw new Error("caller failure");
          }
        })
      ],
      onTerminalEffectFailure: () => {
        callerFailureCount += 1;
      }
    });
    assert.equal(run.admissionPolicyFault, undefined);
    assert.deepEqual(calls, ["caller"]);
    assert.equal(callerFailureCount, 1);
  });

  it("continues after synchronous and asynchronous hook failures", async () => {
    const calls: string[] = [];
    let failures = 0;
    let successes = 0;
    const run = await runTaskGraph({
      execute: () => "settled",
      graph: { tasks: [{ id: "task" }] },
      maxParallel: 1,
      performanceDiagnostics: Object.freeze({
        clock: scriptedClock(),
        declarativeFingerprint: DECLARATIVE_FINGERPRINT
      }),
      terminalEffects: [
        defineContextCallback("scheduler.terminal", {
          contextNeeds: ["execution", "graph", "runMeasurement", "taskTimings"],
          callback: () => {
            calls.push("sync");
            throw new Error("sync failure");
          }
        }),
        defineContextCallback("scheduler.terminal", {
          contextNeeds: ["execution", "graph", "runMeasurement", "taskTimings"],
          callback: async () => {
            calls.push("async");
            throw new Error("async failure");
          }
        }),
        defineContextCallback("scheduler.terminal", {
          contextNeeds: ["execution", "graph", "runMeasurement", "taskTimings"],
          callback: () => {
            calls.push("after");
          }
        })
      ],
      onTerminalEffectFailure: () => {
        failures += 1;
      },
      onTerminalEffectsSettled: () => {
        successes += 1;
      }
    });

    assert.equal(run.settlements[0]?.settlement.kind, "completed");
    assert.deepEqual(calls, ["sync", "async", "after"]);
    assert.equal(failures, 2);
    assert.equal(successes, 0);
  });
});

function assertTerminalMeasurementContext(context: SchedulerMeasurementContext): void {
  assert.equal(Object.isFrozen(context), true);
  assertFrozenSchedulerGraphSnapshot(context.graph);
  assert.equal(Object.isFrozen(context.execution), true);
  assert.equal(Object.isFrozen(context.execution.settledTasks), true);
  assert.equal(Object.isFrozen(context.execution.settledTasks[0]), true);
  assert.equal(Object.isFrozen(context.runMeasurement), true);
  assert.equal(Object.isFrozen(context.runMeasurement.discrete), true);
  assert.equal(Object.isFrozen(context.runMeasurement.peaks), true);
  const timingFacts = context.runMeasurement.timingFacts;
  if (timingFacts !== undefined) {
    assert.equal(Object.isFrozen(timingFacts), true);
    assert.equal("admissions" in timingFacts, false);
    if (!("admissions" in context.taskTimings)) assert.fail("expected available task timings");
    assert.equal(Object.isFrozen(context.taskTimings.admissions), true);
    assert.equal(Object.isFrozen(context.taskTimings.admissions[0]), true);
    assert.equal(Object.isFrozen(context.taskTimings.admissions[0]?.admissionDelay), true);
  }
  assert.deepEqual(context.execution.admittedTaskIds, ["first", "second"]);
  assert.deepEqual(context.execution.settledTasks, [
    { kind: "completed", taskId: "first" },
    { kind: "completed", taskId: "second" }
  ]);
  assert.equal("values" in context.runMeasurement, false);
  assert.equal("topAdmissionDelays" in context.runMeasurement, false);
  const firstSettledTask = context.execution.settledTasks[0];
  if (firstSettledTask === undefined) throw new Error("expected first settled task");
  assert.equal("error" in firstSettledTask, false);
  assert.equal("value" in firstSettledTask, false);
}
