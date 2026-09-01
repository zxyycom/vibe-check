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

function enabledDiagnostics(
  clock: ReturnType<typeof scriptedClock>,
  observations: DiagnosticObservation[]
) {
  return Object.freeze({ clock, logger: recordingLogger(observations) });
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

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function summaryDiscreteValue(
  summary: Readonly<Record<string, unknown>>,
  key: "acceptedWaitCount"
): unknown {
  const discrete = summary.discrete;
  if (discrete === null || typeof discrete !== "object" || Array.isArray(discrete)) {
    assert.fail("scheduler summary must retain discrete facts");
  }
  return Reflect.get(discrete, key);
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
      performanceDiagnostics: Object.freeze({ clock, logger })
    });

    const summary = schedulerSummary(observations);
    assert.equal(summary.schedulerControlPathMs, 5);
    assert.equal(summary.schedulerDecisionObservationMs, 6);
    assert.equal(summary.taskSlotMs, 12);
    assert.equal(summary.rootCapacitySlotMs, 21);
    assert.equal(summary.effectiveCapacitySlotMs, 21);
    assert.equal(summary.rootSlotUtilization, 12 / 21);
    assert.equal(summary.effectiveSlotUtilization, 12 / 21);
    assert.deepEqual(summary.topAdmissionDelays, [
      { admissionDelayMs: 7, taskActiveMs: 12, taskId: "only" }
    ]);
  });

  it("bounds top admission delays and breaks equal delays by Task ID", async () => {
    const clock = scriptedClock();
    const observations: DiagnosticObservation[] = [];
    await runTaskGraph({
      diagnosticLogger: recordingLogger(observations),
      execute: (task) => task.id,
      graph: { tasks: [{ id: "zeta" }, { id: "beta" }, { id: "alpha" }, { id: "delta" }] },
      maxParallel: 4,
      performanceDiagnostics: enabledDiagnostics(clock, observations)
    });

    const summary = schedulerSummary(observations);
    assert.deepEqual(summary.topAdmissionDelays, [
      { admissionDelayMs: 0, taskActiveMs: 0, taskId: "alpha" },
      { admissionDelayMs: 0, taskActiveMs: 0, taskId: "beta" },
      { admissionDelayMs: 0, taskActiveMs: 0, taskId: "delta" }
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
    const clock = Object.freeze({ now: () => (timingFaulted ? Number.NaN : 0) });
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
      performanceDiagnostics: Object.freeze({ clock, logger: recordingLogger(observations) })
    });

    await waitFor(() => hasSchedulerDecision(observations, "await-running", "wait"));
    release.resolve();
    await running;

    const summary = schedulerSummary(observations);
    assert.deepEqual(summary.timing, { availability: "unavailable", reason: "clock-non-finite" });
    assert.equal(summaryDiscreteValue(summary, "acceptedWaitCount"), 1);
  });

  it("distinguishes a valid zero-span summary from unavailable timing and retains discrete facts", async () => {
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

    const faultObservations: DiagnosticObservation[] = [];
    await runTaskGraph({
      diagnosticLogger: recordingLogger(faultObservations),
      execute: () => "fault",
      graph: { tasks: [{ id: "fault" }] },
      maxParallel: 1,
      performanceDiagnostics: Object.freeze({
        clock: Object.freeze({ now: () => Number.NaN }),
        logger: recordingLogger(faultObservations)
      })
    });
    const faultSummary = schedulerSummary(faultObservations);
    assert.deepEqual(faultSummary.timing, {
      availability: "unavailable",
      reason: "clock-non-finite"
    });
    assert.equal("taskSlotMs" in faultSummary, false);
    assert.deepEqual(faultSummary.discrete, {
      acceptedWaitCount: 0,
      admittedCount: 1,
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
      performanceDiagnostics: Object.freeze({ clock: scriptedClock(), logger: failedWriter })
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
      performanceDiagnostics: Object.freeze({ clock, logger })
    });

    assert.equal(policyDiagnosticAttempts, 1);
    assert.equal(run.admissionPolicyFault, "callback-threw");
    assert.deepEqual(
      run.settlements.map(({ settlement }) => settlement.kind),
      ["completed", "cancelled-before-start"]
    );
    const summary = schedulerSummary(observations);
    assert.equal(summary.schedulerControlPathMs, 0);
  });

  it("emits exactly one summary after caller cancellation drains admitted work", async () => {
    const clock = scriptedClock();
    const observations: DiagnosticObservation[] = [];
    const controller = new AbortController();
    const release = createDeferred<void>();
    const running = runTaskGraph({
      diagnosticLogger: recordingLogger(observations),
      execute: async () => release.promise,
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
    schedulerSummary(observations);
  });
});
