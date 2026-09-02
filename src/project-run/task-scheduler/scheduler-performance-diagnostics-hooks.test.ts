import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SchedulerMeasurementContext } from "../../project-definition/project-definition.ts";
import type { DiagnosticObservation } from "../diagnostic-logging/logger.ts";
import { runTaskGraph } from "./scheduler.ts";
import { assertFrozenSchedulerGraphSnapshot, scriptedClock } from "./task-engine.test-support.ts";
import { DECLARATIVE_FINGERPRINT } from "./scheduler-performance-diagnostics.test-support.ts";

describe("Scheduler measurement hooks", () => {
  it("awaits ordered hooks over one immutable terminal context without exposing Task values", async () => {
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
      measurementHooks: [
        async (context) => {
          calls.push("first-start");
          contexts.push(context);
          await Promise.resolve();
          calls.push("first-end");
        },
        (context) => {
          calls.push("second");
          contexts.push(context);
        }
      ],
      onMeasurementHooksSettled: () => {
        successes += 1;
      }
    });

    assert.deepEqual(calls, ["first-start", "first-end", "second"]);
    assert.equal(successes, 1);
    assert.equal(contexts[0], contexts[1]);
    const context = contexts[0];
    if (context === undefined) assert.fail("expected terminal measurement context");
    assertTerminalMeasurementContext(context);
  });

  it("delivers the internal summary Hook before caller Hooks through one runner", async () => {
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
      measurementHooks: [
        async () => {
          await Promise.resolve();
          calls.push("caller");
        }
      ]
    });
    assert.deepEqual(calls, ["summary", "caller"]);
  });

  it("contains summary writer failure while preserving caller Hook failure delivery", async () => {
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
      measurementHooks: [
        () => {
          calls.push("caller");
          throw new Error("caller failure");
        }
      ],
      onMeasurementHookFailure: () => {
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
      measurementHooks: [
        () => {
          calls.push("sync");
          throw new Error("sync failure");
        },
        async () => {
          calls.push("async");
          throw new Error("async failure");
        },
        () => calls.push("after")
      ],
      onMeasurementHookFailure: () => {
        failures += 1;
      },
      onMeasurementHooksSettled: () => {
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
  assert.equal(Object.isFrozen(context.rawMeasurement), true);
  assert.equal(Object.isFrozen(context.rawMeasurement.discrete), true);
  assert.equal(Object.isFrozen(context.rawMeasurement.peaks), true);
  const timingFacts = context.rawMeasurement.timingFacts;
  if (timingFacts !== undefined) {
    assert.equal(Object.isFrozen(timingFacts), true);
    assert.equal(Object.isFrozen(timingFacts.admissions), true);
    assert.equal(Object.isFrozen(timingFacts.admissions[0]), true);
    assert.equal(Object.isFrozen(timingFacts.admissions[0]?.admissionDelay), true);
  }
  assert.deepEqual(context.execution.admittedTaskIds, ["first", "second"]);
  assert.deepEqual(context.execution.settledTasks, [
    { kind: "completed", taskId: "first" },
    { kind: "completed", taskId: "second" }
  ]);
  assert.equal("values" in context.rawMeasurement, false);
  assert.equal("topAdmissionDelays" in context.rawMeasurement, false);
  assert.equal("error" in context.execution.settledTasks[0], false);
  assert.equal("value" in context.execution.settledTasks[0], false);
}
