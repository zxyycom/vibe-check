import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AdmissionPolicyContext } from "../../project-definition/project-definition.ts";
import { admissionSelectionPolicyFor } from "./custom-admission-policy.ts";
import { runTaskGraph } from "./scheduler.ts";
import { createDeferred } from "./task-engine.test-support.ts";
import {
  assertSharedMeasurementContexts,
  measurementRecordingProposal
} from "./task-engine.admission-policy.test-support.ts";

describe("task engine admission policy", () => {
  it("shares one frozen graph while exposing only decision-boundary measurement scalars", async () => {
    const contexts: AdmissionPolicyContext[] = [];
    let terminalTiming: unknown;
    const policy = admissionSelectionPolicyFor(measurementRecordingProposal(contexts));

    await runTaskGraph({
      admissionPolicy: policy,
      execute: () => undefined,
      graph: { tasks: Array.from({ length: 40 }, (_, index) => ({ id: `task-${index}` })) },
      maxParallel: 40,
      performanceDiagnostics: Object.freeze({
        clock: Object.freeze({ now: () => 0 }),
        declarativeFingerprint: "measurement-sharing"
      }),
      measurementHooks: [
        (context) => {
          terminalTiming = context.rawMeasurement.timing;
        }
      ]
    });

    assertSharedMeasurementContexts(contexts, terminalTiming);
  });

  it("commits a settled running-cohort interval before the next custom policy callback", async () => {
    let now = 0;
    const started = createDeferred<void>();
    const release = createDeferred<void>();
    const contexts: AdmissionPolicyContext[] = [];
    const policy = recordingAdmissionPolicy(contexts);

    const settled = runTaskGraph({
      admissionPolicy: policy,
      execute: async (task) => {
        if (task.id === "first") {
          started.resolve();
          await release.promise;
        }
      },
      graph: { tasks: [{ id: "first" }, { id: "second" }] },
      maxParallel: 1,
      performanceDiagnostics: Object.freeze({
        clock: Object.freeze({ now: () => now }),
        declarativeFingerprint: "wait-settlement"
      })
    });
    await started.promise;
    now = 9;
    release.resolve();
    await settled;

    const afterSettlement = contexts.at(-1);
    assert.equal(afterSettlement?.measurement.measurementCount, 2);
    assert.equal(afterSettlement?.measurement.measurementAt(2), undefined);
    assert.deepEqual(
      afterSettlement?.measurement.measurementAt(
        (afterSettlement?.measurement.measurementCount ?? 1) - 1
      ),
      {
        interval: {
          availability: "available",
          contribution: {
            admissiblePendingTaskMs: 0,
            acceptedWaitMs: 9,
            capacityBlockedTaskMs: 9,
            effectiveCapacitySlotMs: 9,
            mutexBlockedTaskMs: 0,
            rootCapacitySlotMs: 9,
            taskSlotMs: 9
          }
        },
        effects: [{ kind: "settled", settlementKind: "completed", taskId: "first" }],
        kind: "wait",
        sequence: 2,
        taskId: null
      }
    );
  });

  it("retains custom action effects while unavailable clocks omit interval contributions", async () => {
    const clockFailures = [
      {
        reason: "clock-threw" as const,
        sample: () => {
          throw new Error("clock failure");
        }
      },
      { reason: "clock-non-finite" as const, sample: () => Number.NaN },
      { reason: "clock-backward" as const, sample: () => -1 }
    ];

    for (const failure of clockFailures) {
      let samples = 0;
      const contexts: AdmissionPolicyContext[] = [];
      const policy = recordingAdmissionPolicy(contexts);

      await runTaskGraph({
        admissionPolicy: policy,
        execute: () => undefined,
        graph: { tasks: [{ id: "first" }, { id: "second" }] },
        maxParallel: 2,
        performanceDiagnostics: Object.freeze({
          clock: Object.freeze({
            now: () => {
              samples += 1;
              return samples === 8 ? failure.sample() : 0;
            }
          }),
          declarativeFingerprint: `unavailable-${failure.reason}`
        })
      });

      const observation = contexts[1]?.measurement.measurementAt(0);
      assert.deepEqual(observation, {
        effects: [{ kind: "admitted", taskId: "first" }],
        interval: { availability: "unavailable", reason: failure.reason },
        kind: "select",
        sequence: 1,
        taskId: "first"
      });
      assert.equal(observation?.interval.availability, "unavailable");
      if (observation?.interval.availability === "unavailable") {
        assert.equal("contribution" in observation.interval, false);
      }
    }
  });
});

function recordingAdmissionPolicy(contexts: AdmissionPolicyContext[]) {
  return admissionSelectionPolicyFor((context) => {
    contexts.push(context);
    const candidate = context.candidates.find((item) => item.canAdmit);
    return candidate === undefined
      ? { kind: "wait" }
      : { kind: "select", taskId: candidate.taskId };
  });
}
