import assert from "node:assert/strict";

import type {
  AdmissionPolicyContext,
  AdmissionProposal
} from "../../project-definition/project-definition.ts";
import { admissionSelectionPolicyFor } from "./custom-admission-policy.ts";
import { runTaskGraph } from "./scheduler.ts";

export function runWithCustomProposal(
  proposeAdmission: () => AdmissionProposal,
  graph: { readonly tasks: readonly { readonly id: string }[] },
  signal?: AbortSignal
) {
  const policy = admissionSelectionPolicyFor({
    kind: "custom",
    proposeAdmission
  });
  if (policy === undefined) assert.fail("expected custom policy adapter");
  return runTaskGraph({
    admissionPolicy: policy,
    execute: () => undefined,
    graph,
    maxParallel: 1,
    signal
  });
}

export function malformedWaitProposal(): AdmissionProposal {
  const proposal: AdmissionProposal = { kind: "wait" };
  Reflect.set(proposal, "extra", true);
  return proposal;
}

export function thenableWaitProposal(): AdmissionProposal {
  const proposal: AdmissionProposal = { kind: "wait" };
  Reflect.set(proposal, "then", () => undefined);
  return proposal;
}

export function measurementRecordingProposal(
  contexts: AdmissionPolicyContext[]
): (
  context: AdmissionPolicyContext
) =>
  | Readonly<{ readonly kind: "wait" }>
  | Readonly<{ readonly kind: "select"; readonly taskId: string }> {
  return (context) => {
    contexts.push(context);
    if (contexts.length === 1) {
      assert.equal(
        Reflect.set(context.measurement.cumulative.timing as object, "availability", "unavailable"),
        false
      );
    }
    const candidate = context.candidates.find((item) => item.canAdmit);
    return candidate === undefined
      ? { kind: "wait" }
      : { kind: "select", taskId: candidate.taskId };
  };
}

export function assertSharedMeasurementContexts(
  contexts: readonly AdmissionPolicyContext[],
  terminalTiming: unknown
): void {
  assertMeasurementPrefix(contexts);
  assertMeasurementImmutability(contexts, terminalTiming);
}

function assertMeasurementPrefix(contexts: readonly AdmissionPolicyContext[]): void {
  const first = requiredAdmissionPolicyContext(contexts, 0);
  const second = requiredAdmissionPolicyContext(contexts, 1);
  const last = requiredAdmissionPolicyContext(contexts, 39);
  assert.equal(contexts.length, 40);
  assert.equal(new Set(contexts.map((context) => context.graph)).size, 1);
  assert.equal(first.measurement.measurementCount, 0);
  assert.equal(first.measurement.measurementAt(0), undefined);
  assert.deepEqual(second.measurement.measurementAt(0), {
    interval: {
      availability: "available",
      contribution: {
        admissiblePendingTaskMs: 0,
        acceptedWaitMs: 0,
        capacityBlockedTaskMs: 0,
        effectiveCapacitySlotMs: 0,
        mutexBlockedTaskMs: 0,
        rootCapacitySlotMs: 0,
        taskSlotMs: 0
      }
    },
    effects: [{ kind: "admitted", taskId: "task-0" }],
    kind: "select",
    sequence: 1,
    taskId: "task-0"
  });
  assert.equal(second.measurement.measurementCount, 1);
  assert.equal(second.measurement.measurementAt(1), undefined);
  assert.equal(first.measurement.measurementAt(39), undefined);
  assert.equal(first.measurement.cumulative.discrete.admittedCount, 0);
  const terminalTimingFacts = last.measurement.cumulative.timingFacts;
  if (terminalTimingFacts === undefined) assert.fail("expected available cumulative timing facts");
  assert.equal("admissions" in terminalTimingFacts, false);
}

function assertMeasurementImmutability(
  contexts: readonly AdmissionPolicyContext[],
  terminalTiming: unknown
): void {
  const first = requiredAdmissionPolicyContext(contexts, 0);
  const second = requiredAdmissionPolicyContext(contexts, 1);
  assert.equal(Object.isFrozen(second.measurement), true);
  assert.equal(Object.isFrozen(second.measurement.measurementAt), true);
  assert.equal(Object.isFrozen(second.measurement.measurementAt(0)), true);
  const firstTiming = first.measurement.cumulative.timing;
  assert.equal(Object.isFrozen(firstTiming), true);
  assert.equal(Reflect.set(firstTiming as object, "availability", "unavailable"), false);
  assert.deepEqual(firstTiming, { availability: "available" });
  assert.deepEqual(terminalTiming, { availability: "available" });
}

function requiredAdmissionPolicyContext(
  contexts: readonly AdmissionPolicyContext[],
  index: number
): AdmissionPolicyContext {
  const context = contexts[index];
  if (context === undefined) assert.fail(`expected admission policy context ${index}`);
  return context;
}
