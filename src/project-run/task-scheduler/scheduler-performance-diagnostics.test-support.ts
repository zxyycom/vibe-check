import assert from "node:assert/strict";

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

export const DECLARATIVE_FINGERPRINT = "scheduler-performance-fixture";

export function enabledDiagnostics(
  clock: ReturnType<typeof scriptedClock>,
  observations: DiagnosticObservation[]
) {
  return Object.freeze({
    clock,
    declarativeFingerprint: DECLARATIVE_FINGERPRINT,
    logger: recordingLogger(observations)
  });
}

export function hasSchedulerDecision(
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

export function hasSchedulerAdmission(
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

export function hasSchedulerSettlementTrigger(
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

export function summaryDiscreteValue(
  summary: Readonly<Record<string, unknown>>,
  key: "acceptedWaitCount" | "admittedCount" | "completionTailActiveTaskCount"
): unknown {
  const discrete = summary.discrete;
  if (discrete === null || typeof discrete !== "object" || Array.isArray(discrete)) {
    assert.fail("scheduler summary must retain discrete facts");
  }
  return Reflect.get(discrete, key);
}

export async function mixedQueuePressureSummary(): Promise<Readonly<Record<string, unknown>>> {
  const clock = scriptedClock();
  const observations: DiagnosticObservation[] = [];
  const releaseHolder = createDeferred<void>();
  let acceptedMixedPressureWait = false;
  const policy = admissionSelectionPolicyFor((context) => {
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
  });
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

export async function postMutationProjectionSummary(): Promise<Readonly<Record<string, unknown>>> {
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
