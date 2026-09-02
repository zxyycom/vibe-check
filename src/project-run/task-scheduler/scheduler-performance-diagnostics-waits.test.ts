import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DiagnosticObservation } from "../diagnostic-logging/logger.ts";
import { admissionSelectionPolicyFor } from "./custom-admission-policy.ts";
import { runTaskGraph } from "./scheduler.ts";
import {
  createDeferred,
  recordingLogger,
  schedulerSummary,
  scriptedClock,
  waitFor
} from "./task-engine.test-support.ts";
import {
  DECLARATIVE_FINGERPRINT,
  enabledDiagnostics,
  hasSchedulerDecision,
  summaryDiscreteValue
} from "./scheduler-performance-diagnostics.test-support.ts";

describe("Scheduler performance diagnostics", () => {
  it("records an accepted explicit policy wait", async () => {
    const clock = scriptedClock();
    const observations: DiagnosticObservation[] = [];
    const release = createDeferred<void>();
    let proposals = 0;
    const policy = admissionSelectionPolicyFor({
      kind: "custom",
      proposeAdmission: (context) => {
        proposals += 1;
        if (proposals === 1) return { kind: "select", taskId: "first" };
        if (proposals === 2) return { kind: "wait" };
        const candidate = context.candidates.find((item) => item.canAdmit);
        if (candidate === undefined) throw new Error("expected second Task to be admissible");
        return { kind: "select", taskId: candidate.taskId };
      }
    });
    if (policy === undefined) assert.fail("expected custom policy");

    const running = runTaskGraph({
      admissionPolicy: policy,
      diagnosticLogger: recordingLogger(observations),
      execute: async (task) => {
        if (task.id === "first") {
          await release.promise;
          clock.advance("accepted-wait", 11);
        }
        return task.id;
      },
      graph: { tasks: [{ id: "first" }, { id: "second" }] },
      maxParallel: 1,
      performanceDiagnostics: enabledDiagnostics(clock, observations)
    });
    await waitFor(() => hasSchedulerDecision(observations, "await-running", "wait"));
    release.resolve();
    const run = await running;

    assert.equal(run.admissionPolicyFault, undefined);
    const summary = schedulerSummary(observations);
    assert.equal(summary.acceptedWaitMs, 11);
    assert.equal(summaryDiscreteValue(summary, "acceptedWaitCount"), 1);
  });

  it("excludes a passive running drain with a null proposal", async () => {
    const clock = scriptedClock();
    const observations: DiagnosticObservation[] = [];
    const release = createDeferred<void>();
    const running = runTaskGraph({
      diagnosticLogger: recordingLogger(observations),
      execute: async () => {
        await release.promise;
        clock.advance("passive-drain", 11);
        return "settled";
      },
      graph: { tasks: [{ id: "only" }] },
      maxParallel: 1,
      performanceDiagnostics: enabledDiagnostics(clock, observations)
    });

    await waitFor(() => hasSchedulerDecision(observations, "await-running", null));
    release.resolve();
    await running;

    const summary = schedulerSummary(observations);
    assert.equal(summary.acceptedWaitMs, 0);
    assert.equal(summaryDiscreteValue(summary, "acceptedWaitCount"), 0);
  });

  it("retains an accepted wait count when timing becomes unavailable", async () => {
    let timingFaulted = false;
    const clock = Object.freeze({
      now: () => (timingFaulted ? Number.NaN : 0)
    });
    const observations: DiagnosticObservation[] = [];
    const release = createDeferred<void>();
    let proposals = 0;
    const policy = admissionSelectionPolicyFor({
      kind: "custom",
      proposeAdmission: () => {
        proposals += 1;
        if (proposals === 1) return { kind: "select", taskId: "first" };
        timingFaulted = true;
        return { kind: "wait" };
      }
    });
    if (policy === undefined) assert.fail("expected custom policy");

    const running = runTaskGraph({
      admissionPolicy: policy,
      diagnosticLogger: recordingLogger(observations),
      execute: async (task) => {
        if (task.id === "first") await release.promise;
        return task.id;
      },
      graph: { tasks: [{ id: "first" }, { id: "second" }] },
      maxParallel: 1,
      performanceDiagnostics: Object.freeze({
        clock,
        declarativeFingerprint: DECLARATIVE_FINGERPRINT,
        logger: recordingLogger(observations)
      })
    });

    await waitFor(() => hasSchedulerDecision(observations, "await-running", "wait"));
    release.resolve();
    await running;

    const summary = schedulerSummary(observations);
    assert.deepEqual(summary.timing, {
      availability: "unavailable",
      reason: "clock-non-finite"
    });
    assert.equal(summaryDiscreteValue(summary, "acceptedWaitCount"), 1);
  });
});
