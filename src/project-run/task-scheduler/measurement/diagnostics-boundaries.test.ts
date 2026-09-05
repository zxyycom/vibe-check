import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DiagnosticObservation } from "../../diagnostic-logging/logger.ts";
import { runTaskGraph } from "../scheduler.ts";
import { recordingLogger, schedulerSummary, scriptedClock } from "../task-engine.test-support.ts";
import { DECLARATIVE_FINGERPRINT, enabledDiagnostics } from "./diagnostics.test-support.ts";

describe("Scheduler performance diagnostics", () => {
  it("distinguishes a valid zero-span summary from unavailable timing and retains discrete facts", async () => {
    const emptyClock = scriptedClock();
    const emptyObservations: DiagnosticObservation[] = [];
    await runTaskGraph({
      diagnosticLogger: recordingLogger(emptyObservations),
      execute: () => "unreachable",
      graph: { tasks: [] },
      maxParallel: 1,
      performanceDiagnostics: enabledDiagnostics(emptyClock, emptyObservations)
    });
    const emptySummary = schedulerSummary(emptyObservations);
    assert.equal(emptySummary.completionTailMs, null);
    assert.deepEqual(emptySummary.topCompletionTailContributors, []);
    assert.deepEqual(emptySummary.discrete, {
      acceptedWaitCount: 0,
      admittedCount: 0,
      completionTailActiveTaskCount: 0,
      lastSettledTaskId: null,
      maxRunning: 0
    });

    const zeroClock = scriptedClock();
    const zeroObservations: DiagnosticObservation[] = [];
    await runTaskGraph({
      diagnosticLogger: recordingLogger(zeroObservations),
      execute: () => "zero",
      graph: { tasks: [{ id: "zero" }] },
      maxParallel: 1,
      performanceDiagnostics: enabledDiagnostics(zeroClock, zeroObservations)
    });
    const zeroSummary = schedulerSummary(zeroObservations);
    assert.deepEqual(zeroSummary.timing, { availability: "available" });
    assert.equal(zeroSummary.schedulerSpanMs, 0);
    assert.equal(zeroSummary.taskSlotMs, 0);
    assert.equal(zeroSummary.completionTailMs, 0);
    assert.deepEqual(zeroSummary.topCompletionTailContributors, [
      { settledAfterLastAdmissionMs: 0, taskId: "zero" }
    ]);

    const faultObservations: DiagnosticObservation[] = [];
    await runTaskGraph({
      diagnosticLogger: recordingLogger(faultObservations),
      execute: () => "fault",
      graph: { tasks: [{ id: "fault" }] },
      maxParallel: 1,
      performanceDiagnostics: Object.freeze({
        clock: Object.freeze({ now: () => Number.NaN }),
        declarativeFingerprint: DECLARATIVE_FINGERPRINT,
        logger: recordingLogger(faultObservations)
      })
    });
    const faultSummary = schedulerSummary(faultObservations);
    assert.deepEqual(faultSummary.timing, {
      availability: "unavailable",
      reason: "clock-non-finite"
    });
    assert.equal(faultSummary.declarativeFingerprint, DECLARATIVE_FINGERPRINT);
    assert.equal(faultSummary.peakAdmissionViablePendingTaskCount, 1);
    assert.equal(faultSummary.peakMutexBlockedTaskCount, 0);
    assert.equal(faultSummary.peakCapacityBlockedTaskCount, 0);
    assert.equal(faultSummary.peakAdmissiblePendingTaskCount, 1);
    assert.equal("taskSlotMs" in faultSummary, false);
    assert.equal("admissionViablePendingTaskMs" in faultSummary, false);
    assert.equal("topCompletionTailContributors" in faultSummary, false);
    assert.deepEqual(faultSummary.discrete, {
      acceptedWaitCount: 0,
      admittedCount: 1,
      completionTailActiveTaskCount: 1,
      lastSettledTaskId: "fault",
      maxRunning: 1
    });
  });

  it("contains terminal writer failures", async () => {
    const failedWriter = Object.freeze({
      close: () => "failed" as const,
      observe: () => {
        throw new Error("writer failure");
      }
    });
    const run = await runTaskGraph({
      diagnosticLogger: failedWriter,
      execute: () => "still-settled",
      graph: { tasks: [{ id: "writer" }] },
      maxParallel: 1,
      performanceDiagnostics: Object.freeze({
        clock: scriptedClock(),
        declarativeFingerprint: DECLARATIVE_FINGERPRINT,
        logger: failedWriter
      })
    });
    assert.equal(run.settlements[0]?.settlement.kind, "completed");
  });
});
