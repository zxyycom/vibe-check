import { defineContextCallback } from "../../package-tools/context-callback/define-context-callback.ts";
import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import { assertEventsInOrder } from "./invocation-event-order.test-support.ts";
import type { Check } from "../../check/check.ts";
import {
  defineConfig,
  type CustomAdmissionStrategy
} from "../../project-definition/project-definition.ts";
import { executeValidatedRun } from "./run.ts";
const PASSED = Object.freeze({ data: Object.freeze({}), status: "passed" as const });

const firstCandidateDecision = defineContextCallback("scheduler.decide", {
  contextNeeds: ["candidates"],
  callback({ candidates }) {
    const candidate = candidates.find(({ canAdmit }) => canAdmit);
    return candidate === undefined
      ? { kind: "wait" }
      : { kind: "select", taskId: candidate.taskId };
  }
});
/** Proves Invocation awaits public prepared completion after generic Hooks with frozen public contexts. */
export async function assertPublicPreparedStrategyRunsOnce(): Promise<void> {
  const events: string[] = [];
  const entered = deferred<void>();
  const release = deferred<void>();
  const invocation = executeValidatedRun(
    customDefinition(
      {
        kind: "prepared",
        prepare: defineContextCallback("scheduler.prepare", {
          contextNeeds: ["graph"],
          callback: async function (context) {
            events.push("prepare");
            assert.equal(Object.isFrozen(context), true);
            assert.equal(Object.isFrozen(context.graph), true);
            await Promise.resolve();
            return {
              decide: defineContextCallback("scheduler.decide", {
                contextNeeds: ["candidates"],
                callback: function (decision) {
                  events.push("decide");
                  return firstCandidateDecision.callback(decision);
                }
              }),
              terminalEffect: defineContextCallback("scheduler.terminal", {
                contextNeeds: ["execution", "graph", "runMeasurement", "taskTimings"],
                callback: async function (terminal) {
                  assert.equal(Object.isFrozen(terminal), true);
                  assert.equal("terminalMeasurement" in terminal, false);
                  entered.resolve();
                  await release.promise;
                  events.push("complete");
                }
              })
            };
          }
        })
      },
      [
        () => {
          events.push("generic");
        }
      ]
    ),
    {},
    []
  );
  let hasSettled = false;
  const observedInvocation = invocation.finally(() => {
    hasSettled = true;
  });
  try {
    await Promise.race([
      entered.promise,
      observedInvocation.then(() => {
        throw new Error("Run settled before entering the prepared terminal effect");
      })
    ]);
    // A separate event-loop turn drains completion microtasks if an await is omitted.
    await setImmediate();
    assert.equal(hasSettled, false, "Run must await the pending prepared terminal effect");
    assert.equal(events.includes("complete"), false);
    release.resolve();
    const result = await observedInvocation;
    assert.equal(result.kind, "completed");
    assertEventsInOrder({ events, required: ["prepare", "decide", "generic", "complete"] });
    assert.equal(events.filter((event) => event === "prepare").length, 1);
    assert.equal(events.filter((event) => event === "complete").length, 1);
    assert.deepEqual(result.outputs.terminalEffects, { enabled: true, status: "succeeded" });
  } finally {
    release.resolve();
    await observedInvocation;
  }
}
/** Proves each overlapping invocation owns only the closure its prepared strategy returned. */
export async function assertPublicPreparedClosuresStayIsolated(): Promise<void> {
  const release = deferred<void>();
  const bothStarted = deferred<void>();
  const events: string[] = [];
  let checkStarts = 0;
  let preparation = 0;
  const definition = customDefinition(
    {
      kind: "prepared",
      prepare: defineContextCallback("scheduler.prepare", {
        callback: function () {
          preparation += 1;
          const runId = preparation;
          return {
            decide: defineContextCallback("scheduler.decide", {
              contextNeeds: ["candidates"],
              callback: function (context) {
                events.push(`decide-${runId}`);
                return firstCandidateDecision.callback(context);
              }
            }),
            terminalEffect: () => {
              events.push(`complete-${runId}`);
            }
          };
        }
      })
    },
    [],
    async () => {
      checkStarts += 1;
      if (checkStarts === 2) bothStarted.resolve();
      await release.promise;
      return PASSED;
    }
  );
  const first = executeValidatedRun(definition, {}, []);
  const second = executeValidatedRun(definition, {}, []);
  await bothStarted.promise;
  release.resolve();
  const results = await Promise.all([first, second]);
  assert.deepEqual(
    results.map((result) => result.kind),
    ["completed", "completed"]
  );
  assert.equal(preparation, 2);
  assert.deepEqual(events.filter((event) => event.startsWith("complete-")).sort(), [
    "complete-1",
    "complete-2"
  ]);
}
/** Proves preparation failure remains pre-Scheduler while preserving the pre-enabled output state. */
export async function assertPublicPreparationFailure(): Promise<void> {
  for (const [name, prepare, genericHooks, expectedOutput] of [
    [
      "throw",
      () => {
        throw new Error("host preparation failure");
      },
      [],
      { enabled: false, status: "disabled" }
    ],
    [
      "invalid result",
      () => ({ decide: 1 }),
      [() => undefined],
      { enabled: true, status: "not-run" }
    ]
  ] as const) {
    let executions = 0;
    const definition = customDefinition(
      {
        kind: "prepared",
        prepare: () => ({
          decide: firstCandidateDecision
        })
      },
      genericHooks,
      () => {
        executions += 1;
        return PASSED;
      }
    );
    const policy = definition.scheduler.admissionPolicy;
    if (policy.kind !== "custom" || policy.strategy.kind !== "prepared") {
      assert.fail("expected prepared custom strategy");
    }
    Reflect.set(policy.strategy, "prepare", prepare);
    const result = await executeValidatedRun(definition, {}, []);
    assert.equal(executions, 0, name);
    assert.equal(result.kind, "execution", name);
    assert.equal(
      result.kind === "execution" ? result.diagnostic.code : undefined,
      "admission-strategy-preparation-failed",
      name
    );
    assert.deepEqual(result.outputs.terminalEffects, expectedOutput, name);
  }
}
/** Proves public completion failure joins the aggregate without replacing Scheduler's primary failure. */
export async function assertPublicCompletionFailurePreservesPrimaryResult(): Promise<void> {
  const events: string[] = [];
  const result = await executeValidatedRun(
    customDefinition(
      {
        kind: "prepared",
        prepare: () => ({
          decide: () => {
            events.push("decide");
            throw new Error("policy failure");
          },
          terminalEffect: () => {
            events.push("complete");
            throw new Error("completion failure");
          }
        })
      },
      [
        () => {
          events.push("generic");
        }
      ]
    ),
    {},
    []
  );
  assert.equal(result.kind, "execution");
  assert.equal(
    result.kind === "execution" ? result.diagnostic.code : undefined,
    "admission-policy-failed"
  );
  assertEventsInOrder({ events, required: ["decide", "generic", "complete"] });
  assert.deepEqual(result.outputs.terminalEffects, { enabled: true, status: "failed" });
}
/** Proves only concrete generic Hooks or a returned completion can enable terminal measurement output. */
export async function assertMeasurementOutputParticipants(): Promise<void> {
  for (const strategy of [
    {
      kind: "simple",
      decide: firstCandidateDecision
    },
    {
      kind: "prepared",
      prepare: () => ({
        decide: firstCandidateDecision
      })
    }
  ] satisfies readonly CustomAdmissionStrategy[]) {
    const result = await executeValidatedRun(customDefinition(strategy), {}, []);
    assert.equal(result.kind, "completed", strategy.kind);
    assert.deepEqual(result.outputs.terminalEffects, {
      enabled: false,
      status: "disabled"
    });
  }
  const genericFailureWithSuccessfulComplete = await executeValidatedRun(
    customDefinition(
      {
        kind: "prepared",
        prepare: () => ({
          decide: firstCandidateDecision,
          terminalEffect: () => undefined
        })
      },
      [() => Promise.reject(new Error("generic failure"))]
    ),
    {},
    []
  );
  assert.equal(genericFailureWithSuccessfulComplete.kind, "output");
  assert.deepEqual(genericFailureWithSuccessfulComplete.outputs.terminalEffects, {
    enabled: true,
    status: "failed"
  });
}
function customDefinition(
  strategy: CustomAdmissionStrategy,
  terminalEffects: readonly (() => void | Promise<void>)[] = [],
  execute: Check["execute"] = () => PASSED
) {
  return defineConfig({
    checks: [{ checkId: "check", displayName: "check", execute }],
    outputs: {
      machinePublication: { enabled: false },
      progressRendering: { enabled: false }
    },
    scheduler: {
      admissionPolicy: { kind: "custom", strategy },
      maxParallel: 1,
      terminalEffects
    }
  });
}
export { assertEventsInOrder as assertOrdered } from "./invocation-event-order.test-support.ts";
export function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return Object.freeze({ promise, resolve });
}
