import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DiagnosticLogger, DiagnosticObservation } from "../diagnostic-logging/logger.ts";
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
  enabledDiagnostics
} from "./scheduler-performance-diagnostics.test-support.ts";

describe("Scheduler performance diagnostics terminal drains", () => {
  it("contains a policy diagnostic writer failure while draining admitted work", async () => {
    const clock = scriptedClock();
    const observations: DiagnosticObservation[] = [];
    let policyDiagnosticAttempts = 0;
    let calls = 0;
    const policy = admissionSelectionPolicyFor({
      kind: "custom",
      proposeAdmission: () => {
        calls += 1;
        if (calls === 1) return { kind: "select", taskId: "started" };
        throw new Error("policy fault");
      }
    });
    if (policy === undefined) assert.fail("expected custom policy");
    const logger: DiagnosticLogger = Object.freeze({
      close: () => "failed" as const,
      observe: (observation: DiagnosticObservation) => {
        if (observation.event === "scheduler.admission-policy-failed") {
          policyDiagnosticAttempts += 1;
          clock.advance("policy-diagnostic-writer", 5);
          throw new Error("policy diagnostic writer failure");
        }
        observations.push(observation);
      }
    });
    const run = await runTaskGraph({
      admissionPolicy: policy,
      diagnosticLogger: logger,
      execute: () => "settled",
      graph: { tasks: [{ id: "started" }, { id: "cancelled" }] },
      maxParallel: 2,
      performanceDiagnostics: Object.freeze({
        clock,
        declarativeFingerprint: DECLARATIVE_FINGERPRINT,
        logger
      })
    });

    assert.equal(policyDiagnosticAttempts, 1);
    assert.equal(run.admissionPolicyFault, "callback-threw");
    assert.deepEqual(
      run.settlements.map(({ settlement }) => settlement.kind),
      ["completed", "cancelled-before-start"]
    );
    const summary = schedulerSummary(observations);
    assert.equal(summary.schedulerControlPathMs, 0);
    assert.deepEqual(summary.discrete, {
      acceptedWaitCount: 0,
      admittedCount: 1,
      completionTailActiveTaskCount: 1,
      lastSettledTaskId: "started",
      maxRunning: 1
    });
    assert.deepEqual(summary.topCompletionTailContributors, [
      { settledAfterLastAdmissionMs: 5, taskId: "started" }
    ]);
  });

  it("emits exactly one summary after caller cancellation drains admitted work", async () => {
    const clock = scriptedClock();
    const observations: DiagnosticObservation[] = [];
    const controller = new AbortController();
    const release = createDeferred<void>();
    const running = runTaskGraph({
      diagnosticLogger: recordingLogger(observations),
      execute: async () => {
        await release.promise;
        clock.advance("cancelled drain", 4);
        return "settled";
      },
      graph: { tasks: [{ id: "started" }, { id: "cancelled" }] },
      maxParallel: 1,
      performanceDiagnostics: enabledDiagnostics(clock, observations),
      signal: controller.signal
    });
    await waitFor(() =>
      observations.some((observation) => observation.event === "scheduler.decision")
    );
    controller.abort();
    release.resolve();
    const run = await running;
    assert.equal(run.cancelled, true);
    const summary = schedulerSummary(observations);
    assert.deepEqual(summary.discrete, {
      acceptedWaitCount: 1,
      admittedCount: 1,
      completionTailActiveTaskCount: 1,
      lastSettledTaskId: "cancelled",
      maxRunning: 1
    });
    assert.deepEqual(summary.topCompletionTailContributors, [
      { settledAfterLastAdmissionMs: 4, taskId: "started" }
    ]);
  });
});
