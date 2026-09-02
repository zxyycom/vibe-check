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
  enabledDiagnostics,
  hasSchedulerAdmission,
  hasSchedulerDecision,
  hasSchedulerSettlementTrigger,
  mixedQueuePressureSummary,
  postMutationProjectionSummary,
  summaryDiscreteValue
} from "./scheduler-performance-diagnostics.test-support.ts";

describe("Scheduler performance diagnostics", () => {
  it("keeps control-path and decision observation separate while integrating real running slots", async () => {
    const clock = scriptedClock();
    const observations: DiagnosticObservation[] = [];
    const customPolicy = admissionSelectionPolicyFor({
      kind: "custom",
      proposeAdmission: (context) => {
        clock.advance("custom-selection", 5);
        const candidate = context.candidates.find((item) => item.canAdmit);
        return candidate === undefined
          ? { kind: "wait" }
          : { kind: "select", taskId: candidate.taskId };
      }
    });
    if (customPolicy === undefined) assert.fail("expected custom policy");
    const logger: DiagnosticLogger = Object.freeze({
      close: () => "disabled" as const,
      observe: (observation: DiagnosticObservation) => {
        observations.push(observation);
        if (observation.event === "scheduler.decision") clock.advance("decision-observation", 2);
      }
    });

    await runTaskGraph({
      admissionPolicy: customPolicy,
      execute: async () => {
        clock.advance("task-active", 10);
        return "done";
      },
      graph: { tasks: [{ id: "only" }] },
      maxParallel: 1,
      diagnosticLogger: logger,
      performanceDiagnostics: Object.freeze({
        clock,
        declarativeFingerprint: DECLARATIVE_FINGERPRINT,
        logger
      })
    });

    const summary = schedulerSummary(observations);
    assert.equal(summary.schedulerControlPathMs, 5);
    assert.equal(summary.schedulerDecisionObservationMs, 6);
    assert.equal(summary.taskSlotMs, 12);
    assert.equal(summary.rootCapacitySlotMs, 21);
    assert.equal(summary.effectiveCapacitySlotMs, 21);
    assert.equal(summary.rootSlotUtilization, 12 / 21);
    assert.equal(summary.effectiveSlotUtilization, 12 / 21);
    assert.equal(summary.declarativeFingerprint, DECLARATIVE_FINGERPRINT);
    assert.deepEqual(summary.topAdmissionDelays, [
      {
        admissiblePendingMs: 7,
        admissionDelayMs: 7,
        capacityBlockedMs: 0,
        mutexBlockedMs: 0,
        taskActiveMs: 12,
        taskId: "only"
      }
    ]);
    assert.equal(summary.completionTailMs, 14);
    assert.deepEqual(summary.topCompletionTailContributors, [
      { settledAfterLastAdmissionMs: 12, taskId: "only" }
    ]);
  });

  it("bounds top admission delays and breaks equal delays by Task ID", async () => {
    const clock = scriptedClock();
    const observations: DiagnosticObservation[] = [];
    await runTaskGraph({
      diagnosticLogger: recordingLogger(observations),
      execute: (task) => task.id,
      graph: {
        tasks: [{ id: "zeta" }, { id: "beta" }, { id: "alpha" }, { id: "delta" }]
      },
      maxParallel: 4,
      performanceDiagnostics: enabledDiagnostics(clock, observations)
    });

    const summary = schedulerSummary(observations);
    assert.deepEqual(summary.topAdmissionDelays, [
      {
        admissiblePendingMs: 0,
        admissionDelayMs: 0,
        capacityBlockedMs: 0,
        mutexBlockedMs: 0,
        taskActiveMs: 0,
        taskId: "alpha"
      },
      {
        admissiblePendingMs: 0,
        admissionDelayMs: 0,
        capacityBlockedMs: 0,
        mutexBlockedMs: 0,
        taskActiveMs: 0,
        taskId: "beta"
      },
      {
        admissiblePendingMs: 0,
        admissionDelayMs: 0,
        capacityBlockedMs: 0,
        mutexBlockedMs: 0,
        taskActiveMs: 0,
        taskId: "delta"
      }
    ]);
    assert.deepEqual(summary.topCompletionTailContributors, [
      { settledAfterLastAdmissionMs: 0, taskId: "alpha" },
      { settledAfterLastAdmissionMs: 0, taskId: "beta" },
      { settledAfterLastAdmissionMs: 0, taskId: "delta" }
    ]);

    const pressureSummary = await mixedQueuePressureSummary();
    assert.equal(pressureSummary.admissionViablePendingTaskMs, 50);
    assert.equal(pressureSummary.mutexBlockedTaskMs, 10);
    assert.equal(pressureSummary.capacityBlockedTaskMs, 10);
    assert.equal(pressureSummary.admissiblePendingTaskMs, 30);
    assert.equal(pressureSummary.peakAdmissionViablePendingTaskCount, 6);
    assert.equal(pressureSummary.peakMutexBlockedTaskCount, 1);
    assert.equal(pressureSummary.peakCapacityBlockedTaskCount, 4);
    assert.equal(pressureSummary.peakAdmissiblePendingTaskCount, 6);
    assert.equal(summaryDiscreteValue(pressureSummary, "admittedCount"), 8);
    assert.deepEqual(pressureSummary.topAdmissionDelays, [
      {
        admissiblePendingMs: 0,
        admissionDelayMs: 10,
        capacityBlockedMs: 0,
        mutexBlockedMs: 10,
        taskActiveMs: 0,
        taskId: "a-mutex"
      },
      {
        admissiblePendingMs: 0,
        admissionDelayMs: 10,
        capacityBlockedMs: 10,
        mutexBlockedMs: 0,
        taskActiveMs: 0,
        taskId: "b-capacity"
      },
      {
        admissiblePendingMs: 10,
        admissionDelayMs: 10,
        capacityBlockedMs: 0,
        mutexBlockedMs: 0,
        taskActiveMs: 0,
        taskId: "c-admissible"
      }
    ]);

    const postMutationSummary = await postMutationProjectionSummary();
    assert.equal(postMutationSummary.admissionViablePendingTaskMs, 6);
    assert.equal(postMutationSummary.mutexBlockedTaskMs, 0);
    assert.equal(postMutationSummary.capacityBlockedTaskMs, 0);
    assert.equal(postMutationSummary.admissiblePendingTaskMs, 6);
    assert.deepEqual(postMutationSummary.topAdmissionDelays, [
      {
        admissiblePendingMs: 6,
        admissionDelayMs: 6,
        capacityBlockedMs: 0,
        mutexBlockedMs: 0,
        taskActiveMs: 0,
        taskId: "observer"
      },
      {
        admissiblePendingMs: 0,
        admissionDelayMs: 0,
        capacityBlockedMs: 0,
        mutexBlockedMs: 0,
        taskActiveMs: 0,
        taskId: "source"
      }
    ]);

    const tailClock = scriptedClock();
    const tailObservations: DiagnosticObservation[] = [];
    const releaseEarly = createDeferred<void>();
    const releaseAlpha = createDeferred<void>();
    const releaseBeta = createDeferred<void>();
    const releaseZeta = createDeferred<void>();
    const releaseLate = createDeferred<void>();
    const tailRunning = runTaskGraph({
      diagnosticLogger: recordingLogger(tailObservations),
      execute: async (task) => {
        switch (task.id) {
          case "early":
            await releaseEarly.promise;
            tailClock.advance("early settlement before last admission", 2);
            break;
          case "alpha":
            await releaseAlpha.promise;
            tailClock.advance("alpha tail settlement", 0);
            break;
          case "beta":
            await releaseBeta.promise;
            tailClock.advance("beta tail settlement", 1);
            break;
          case "zeta":
            await releaseZeta.promise;
            tailClock.advance("zeta tail settlement", 4);
            break;
          case "late":
            await releaseLate.promise;
            tailClock.advance("late tail settlement", 2);
            break;
          default:
            assert.fail(`unexpected tail Task ${task.id}`);
        }
        return task.id;
      },
      graph: {
        tasks: [{ id: "early" }, { id: "alpha" }, { id: "beta" }, { id: "zeta" }, { id: "late" }]
      },
      maxParallel: 4,
      performanceDiagnostics: enabledDiagnostics(tailClock, tailObservations)
    });
    await waitFor(() => hasSchedulerDecision(tailObservations, "await-running", "wait"));
    releaseEarly.resolve();
    await waitFor(() => hasSchedulerAdmission(tailObservations, "late"));
    releaseBeta.resolve();
    await waitFor(() => hasSchedulerSettlementTrigger(tailObservations, "beta"));
    releaseZeta.resolve();
    await waitFor(() => hasSchedulerSettlementTrigger(tailObservations, "zeta"));
    releaseAlpha.resolve();
    await waitFor(() => hasSchedulerSettlementTrigger(tailObservations, "alpha"));
    releaseLate.resolve();
    await tailRunning;

    const tailSummary = schedulerSummary(tailObservations);
    assert.equal(tailSummary.completionTailMs, 7);
    assert.equal(summaryDiscreteValue(tailSummary, "completionTailActiveTaskCount"), 4);
    assert.deepEqual(tailSummary.topCompletionTailContributors, [
      { settledAfterLastAdmissionMs: 7, taskId: "late" },
      { settledAfterLastAdmissionMs: 5, taskId: "alpha" },
      { settledAfterLastAdmissionMs: 5, taskId: "zeta" }
    ]);
  });
});
