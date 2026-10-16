import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DiagnosticObservation } from "../../diagnostic-logging/logger.ts";
import { runTaskGraph } from "../scheduler.ts";
import { recordingLogger, schedulerSummary, scriptedClock } from "../task-engine.test-support.ts";
import { SchedulerPerformanceIntegrals } from "./integrals.ts";
import { SchedulerQueueMeasurements } from "./queue.ts";
import { binaryTimeUnits } from "./exact-time.ts";
import { roundDelay } from "./exact-contributions.ts";
import { prepareExecutableTaskGraph } from "../graph.ts";
import {
  compilePreparedAdmissionGraph,
  createInitialAdmissionCoreState,
  selectAdmissionCore
} from "../admission-core/core.ts";
import { DECLARATIVE_FINGERPRINT, enabledDiagnostics } from "./diagnostics.test-support.ts";

describe("Scheduler performance diagnostics", () => {
  it("distinguishes a valid zero-span summary from unavailable timing and retains discrete facts", async () => {
    assertQueueCategoryContributions();
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

/** Independent mutex/resource constraints produce three mutually exclusive quarter-ms contributions. */
function assertQueueCategoryContributions(): void {
  const prepared = prepareExecutableTaskGraph(
    {
      resourceCapacities: { r: 1 },
      tasks: [
        { id: "holder", mutex: ["m"], resourceClaims: { r: 1 } },
        { id: "mutex", mutex: ["m"] },
        { id: "capacity", resourceClaims: { r: 1 } },
        { id: "admissible" }
      ]
    },
    2
  );
  const selection = selectAdmissionCore(
    createInitialAdmissionCoreState(compilePreparedAdmissionGraph(prepared.graph, 2)),
    "holder"
  );
  assert.equal(selection.accepted, true);
  if (!selection.accepted) throw new Error("holder selection was rejected");
  const core = selection.transition.state;
  const queue = new SchedulerQueueMeasurements(core, { delays: true, peaks: true });
  const integrals = new SchedulerPerformanceIntegrals(
    {
      cumulative: true,
      actionHistory: true,
      runMeasurement: true,
      taskTimings: true
    },
    queue
  );
  assert.deepEqual(queue.peaks(), {
    admissionViablePendingTaskCount: 3,
    admissiblePendingTaskCount: 1,
    capacityBlockedTaskCount: 1,
    mutexBlockedTaskCount: 1
  });
  assert.equal(
    integrals.addInterval(binaryTimeUnits(0.25), {
      core,
      effectiveMaxParallel: 2,
      rootMaxParallel: 4,
      running: 1
    }),
    true
  );
  queue.addInterval(binaryTimeUnits(0.25));
  assert.deepEqual(integrals.totals(), {
    acceptedWaitMs: 0,
    admissiblePendingTaskMs: 0.25,
    capacityBlockedTaskMs: 0.25,
    effectiveCapacitySlotMs: 0.5,
    mutexBlockedTaskMs: 0.25,
    rootCapacitySlotMs: 1,
    taskSlotMs: 0.25
  });
  const delay = queue.takeAdmissionDelay("capacity");
  assert.ok(delay);
  assert.deepEqual(roundDelay(delay), {
    admissiblePendingMs: 0,
    capacityBlockedMs: 0.25,
    mutexBlockedMs: 0
  });
}
