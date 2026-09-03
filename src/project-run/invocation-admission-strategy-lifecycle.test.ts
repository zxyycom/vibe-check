import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Check } from "../check/check.ts";
import { defineConfig } from "../project-definition/project-definition.ts";
import type {
  AdmissionPolicyInput,
  AdmissionSelectionPolicy
} from "./task-scheduler/admission-selection-policy.ts";
import { staticAdmissionSelectionPolicy } from "./task-scheduler/admission-selection-policy.ts";
import { AdmissionPolicyFault } from "./task-scheduler/scheduler-admission-decision.ts";
import { executeValidatedRun } from "./invocation.ts";
import {
  assertOrdered,
  assertMeasurementOutputParticipants,
  assertPublicCompletionFailurePreservesPrimaryResult,
  assertPublicPreparationFailure,
  assertPublicPreparedClosuresStayIsolated,
  assertPublicPreparedStrategyRunsOnce,
  deferred
} from "./invocation-custom-admission-strategy-lifecycle.test-support.ts";

const PASSED = Object.freeze({ data: Object.freeze({}), status: "passed" as const });

describe("Package Run admission strategy lifecycle", () => {
  it("prepares once, decides synchronously, and completes after terminal Hooks on normal execution", async () => {
    const events: string[] = [];
    const result = await runWithPreparedStrategy(
      lifecycleDefinition([check("check", () => PASSED)], events),
      {},
      events,
      recordingPolicy(events)
    );

    assert.equal(result.kind, "completed");
    assertOrdered({ events, required: ["prepare", "decide", "terminal-hook", "complete"] });
    assert.equal(events.filter((event) => event === "prepare").length, 1);
    assert.equal(events.filter((event) => event === "complete").length, 1);
  });

  it("completes after terminal Hooks when cancellation drains started work", async () => {
    const controller = new AbortController();
    const events: string[] = [];
    const result = await runWithPreparedStrategy(
      lifecycleDefinition(
        [
          check("started", () => {
            controller.abort();
            return PASSED;
          }),
          check("cancelled-before-start", () => PASSED)
        ],
        events
      ),
      { signal: controller.signal },
      events,
      recordingPolicy(events)
    );

    assert.equal(result.kind, "cancelled");
    assertOrdered({ events, required: ["prepare", "decide", "terminal-hook", "complete"] });
    assert.equal(events.filter((event) => event === "complete").length, 1);
  });

  it("completes after terminal Hooks when an admission policy fault drains", async () => {
    const events: string[] = [];
    const faultingPolicy: AdmissionSelectionPolicy = Object.freeze({
      decide: () => {
        events.push("decide");
        throw new AdmissionPolicyFault("callback-threw");
      }
    });
    const result = await runWithPreparedStrategy(
      lifecycleDefinition([check("check", () => PASSED)], events),
      {},
      events,
      faultingPolicy
    );

    assert.equal(result.kind, "execution");
    assert.equal(
      result.kind === "execution" ? result.diagnostic.code : undefined,
      "admission-policy-failed"
    );
    assertOrdered({ events, required: ["prepare", "decide", "terminal-hook", "complete"] });
    assert.equal(events.filter((event) => event === "complete").length, 1);
  });

  it("does not complete when pre-terminal task-engine setup fails", async () => {
    const events: string[] = [];
    const malformedPolicy: AdmissionSelectionPolicy = Object.freeze({
      get decide(): AdmissionSelectionPolicy["decide"] {
        throw new Error("policy setup failed");
      }
    });
    const result = await runWithPreparedStrategy(
      lifecycleDefinition([check("check", () => PASSED)], events),
      {},
      events,
      malformedPolicy
    );

    assert.equal(result.kind, "execution");
    assert.equal(
      result.kind === "execution" ? result.diagnostic.code : undefined,
      "task-engine-failed"
    );
    assert.deepEqual(events, ["prepare"]);
  });

  it("keeps a prepared completion output enabled but not-run without a sealed context", async () => {
    const events: string[] = [];
    const malformedPolicy: AdmissionSelectionPolicy = Object.freeze({
      get decide(): AdmissionSelectionPolicy["decide"] {
        throw new Error("policy setup failed");
      }
    });
    const result = await executeValidatedRun(
      defineConfig({
        checks: [check("check", () => PASSED)],
        outputs: {
          machinePublication: { enabled: false },
          progressRendering: { enabled: false }
        }
      }),
      {},
      [],
      {
        admissionStrategyProviderFactory: () =>
          Object.freeze({
            prepare: async () =>
              Object.freeze({
                admissionPolicy: malformedPolicy,
                completion: Object.freeze({
                  kind: "measurement-hook" as const,
                  complete: () => {
                    events.push("complete");
                  }
                }),
                observeAdmittedTask: undefined,
                requiresTerminalMeasurement: true
              })
          })
      }
    );

    assert.equal(result.kind, "execution");
    assert.equal(
      result.kind === "execution" ? result.diagnostic.code : undefined,
      "task-engine-failed"
    );
    assert.deepEqual(events, []);
    assert.deepEqual(result.outputs.measurementHooks, { enabled: true, status: "not-run" });
  });

  it("keeps prepared policy closures independent across overlapping Runs", async () => {
    const release = deferred<void>();
    const bothStarted = deferred<void>();
    let started = 0;
    const events: string[] = [];
    let preparedCount = 0;
    const definition = lifecycleDefinition(
      [
        check("check", async () => {
          started += 1;
          if (started === 2) bothStarted.resolve();
          await release.promise;
          return PASSED;
        })
      ],
      events
    );
    const dependencies = {
      admissionStrategyProviderFactory: () => {
        preparedCount += 1;
        const preparedId = preparedCount;
        events.push(`prepare-${preparedId}`);
        return Object.freeze({
          prepare: async () =>
            Object.freeze({
              admissionPolicy: Object.freeze({
                decide: (input: AdmissionPolicyInput) => {
                  events.push(`decide-${preparedId}`);
                  return staticAdmissionSelectionPolicy.decide(input);
                }
              }),
              completion: Object.freeze({
                kind: "internal" as const,
                complete: async () => {
                  events.push(`complete-${preparedId}`);
                }
              }),
              observeAdmittedTask: undefined,
              requiresTerminalMeasurement: true
            })
        });
      }
    };
    const first = executeValidatedRun(definition, {}, [], dependencies);
    const second = executeValidatedRun(definition, {}, [], dependencies);

    await bothStarted.promise;
    release.resolve();
    const [firstResult, secondResult] = await Promise.all([first, second]);

    assert.equal(firstResult.kind, "completed");
    assert.equal(secondResult.kind, "completed");
    assert.equal(preparedCount, 2);
    assert.deepEqual(events.filter((event) => event.startsWith("complete-")).sort(), [
      "complete-1",
      "complete-2"
    ]);
    assert.deepEqual(events.filter((event) => event.startsWith("decide-")).sort(), [
      "decide-1",
      "decide-2"
    ]);
  });

  it("runs a public prepared strategy once and completes after generic terminal Hooks", async () =>
    assertPublicPreparedStrategyRunsOnce());
  it("keeps public prepared closures isolated across overlapping Runs", async () =>
    assertPublicPreparedClosuresStayIsolated());
  it("fails public preparation before Scheduler start and preserves its output boundary", async () =>
    assertPublicPreparationFailure());
  it("aggregates public completion failures without rewriting a sealed primary result", async () =>
    assertPublicCompletionFailurePreservesPrimaryResult());
  it("enables measurement output only for generic Hooks or an actual prepared completion", async () =>
    assertMeasurementOutputParticipants());
});

function runWithPreparedStrategy(
  definition: ReturnType<typeof defineConfig>,
  controls: Readonly<{ readonly signal?: AbortSignal }>,
  events: string[],
  admissionPolicy: AdmissionSelectionPolicy
) {
  return executeValidatedRun(definition, controls, [], {
    admissionStrategyProviderFactory: () => {
      events.push("prepare");
      return Object.freeze({
        prepare: async () =>
          Object.freeze({
            admissionPolicy,
            completion: Object.freeze({
              kind: "internal" as const,
              complete: async () => {
                assert.ok(events.includes("terminal-hook"));
                events.push("complete");
              }
            }),
            observeAdmittedTask: undefined,
            requiresTerminalMeasurement: true
          })
      });
    }
  });
}

function lifecycleDefinition(checks: readonly Check[], events: string[]) {
  return defineConfig({
    checks,
    outputs: {
      machinePublication: { enabled: false },
      progressRendering: { enabled: false }
    },
    scheduler: {
      measurementHooks: [async () => events.push("terminal-hook")],
      maxParallel: 1
    }
  });
}

function check(checkId: string, execution: Check["execution"]): Check {
  return { checkId, displayName: checkId, execution };
}

function recordingPolicy(events: string[]): AdmissionSelectionPolicy {
  return Object.freeze({
    decide: (input: AdmissionPolicyInput) => {
      events.push("decide");
      return staticAdmissionSelectionPolicy.decide(input);
    }
  });
}
