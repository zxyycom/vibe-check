import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SchedulerMeasurementContext } from "../../project-definition/project-definition.ts";
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

const DECLARATIVE_FINGERPRINT = "scheduler-performance-fixture";

function enabledDiagnostics(
  clock: ReturnType<typeof scriptedClock>,
  observations: DiagnosticObservation[]
) {
  return Object.freeze({
    clock,
    declarativeFingerprint: DECLARATIVE_FINGERPRINT,
    logger: recordingLogger(observations)
  });
}

function hasSchedulerDecision(
  observations: readonly DiagnosticObservation[],
  kind: "await-running",
  proposalKind: "wait" | null
): boolean {
  return observations.some((observation) => {
    if (observation.event !== "scheduler.decision" || !isRecord(observation.details)) return false;
    if (Reflect.get(observation.details, "kind") !== kind) return false;
    const proposal = Reflect.get(observation.details, "proposal");
    if (proposalKind === null) return proposal === null;
    return isRecord(proposal) && Reflect.get(proposal, "kind") === proposalKind;
  });
}

function hasSchedulerAdmission(
  observations: readonly DiagnosticObservation[],
  taskId: string
): boolean {
  return observations.some(
    (observation) =>
      observation.event === "scheduler.decision" &&
      isRecord(observation.details) &&
      Reflect.get(observation.details, "kind") === "admit" &&
      Reflect.get(observation.details, "taskId") === taskId
  );
}

function hasSchedulerSettlementTrigger(
  observations: readonly DiagnosticObservation[],
  taskId: string
): boolean {
  return observations.some((observation) => {
    if (observation.event !== "scheduler.decision" || !isRecord(observation.details)) return false;
    const trigger = Reflect.get(observation.details, "trigger");
    return (
      isRecord(trigger) &&
      Reflect.get(trigger, "kind") === "task-settled" &&
      Reflect.get(trigger, "taskId") === taskId
    );
  });
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function summaryDiscreteValue(
  summary: Readonly<Record<string, unknown>>,
  key: "acceptedWaitCount" | "admittedCount" | "completionTailActiveTaskCount"
): unknown {
  const discrete = summary.discrete;
  if (discrete === null || typeof discrete !== "object" || Array.isArray(discrete)) {
    assert.fail("scheduler summary must retain discrete facts");
  }
  return Reflect.get(discrete, key);
}

async function mixedQueuePressureSummary(): Promise<Readonly<Record<string, unknown>>> {
  const clock = scriptedClock();
  const observations: DiagnosticObservation[] = [];
  const releaseHolder = createDeferred<void>();
  let acceptedMixedPressureWait = false;
  const policy = admissionSelectionPolicyFor({
    kind: "custom",
    proposeAdmission: (context) => {
      if (
        !acceptedMixedPressureWait &&
        context.candidates.some((candidate) => candidate.taskId === "b-capacity")
      ) {
        acceptedMixedPressureWait = true;
        clock.advance("mixed queue pressure", 10);
        return { kind: "wait" };
      }
      const candidate = context.candidates.find((item) => item.canAdmit);
      return candidate === undefined
        ? { kind: "wait" }
        : { kind: "select", taskId: candidate.taskId };
    }
  });
  if (policy === undefined) assert.fail("expected custom policy");
  const running = runTaskGraph({
    admissionPolicy: policy,
    diagnosticLogger: recordingLogger(observations),
    execute: async (task) => {
      if (task.id === "holder") await releaseHolder.promise;
      if (task.id === "y-failure") throw new Error("expected dependency failure");
      return task.id;
    },
    graph: {
      tasks: [
        { id: "holder", mutex: ["shared"] },
        { id: "gate" },
        { dependsOn: ["gate"], id: "a-mutex", mutex: ["shared"] },
        { dependsOn: ["gate"], id: "b-capacity", scopeId: "narrow" },
        { dependsOn: ["gate"], id: "c-admissible" },
        { dependsOn: ["gate"], id: "z-admissible" },
        { dependsOn: ["gate"], id: "y-failure" },
        { id: "observer", observes: ["holder"] },
        { dependsOn: ["y-failure"], id: "failed-dependent" }
      ],
      scopes: [
        {
          activationTaskIds: ["b-capacity"],
          id: "narrow",
          maxParallel: 1,
          terminalTaskId: "b-capacity"
        }
      ]
    },
    maxParallel: 2,
    performanceDiagnostics: enabledDiagnostics(clock, observations)
  });
  await waitFor(() => hasSchedulerDecision(observations, "await-running", "wait"));
  releaseHolder.resolve();
  await running;
  return schedulerSummary(observations);
}

async function postMutationProjectionSummary(): Promise<Readonly<Record<string, unknown>>> {
  const clock = scriptedClock();
  const observations: DiagnosticObservation[] = [];
  await runTaskGraph({
    diagnosticLogger: recordingLogger(observations),
    execute: (task) => (task.id === "source" ? "unsatisfied" : task.id),
    graph: {
      tasks: [
        { id: "source" },
        { dependsOn: ["source"], id: "blocked" },
        { id: "observer", observes: ["blocked"] }
      ]
    },
    isPrerequisiteSatisfied: (value) => value !== "unsatisfied",
    maxParallel: 1,
    onTaskBlocked: () => clock.advance("blocked settlement projection install", 6),
    performanceDiagnostics: enabledDiagnostics(clock, observations)
  });
  return schedulerSummary(observations);
}

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
    assert.equal(Object.isFrozen(context), true);
    assert.equal(Object.isFrozen(context.graph), true);
    assert.equal(Object.isFrozen(context.graph.tasks), true);
    assert.equal(Object.isFrozen(context.graph.tasks[0]), true);
    assert.equal(Object.isFrozen(context.graph.tasks[0]?.dependsOn), true);
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
