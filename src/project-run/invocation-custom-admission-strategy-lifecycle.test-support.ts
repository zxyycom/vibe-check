import assert from "node:assert/strict";

import { assertEventsInOrder } from "./invocation-event-order.test-support.ts";

import type { Check } from "../check/check.ts";
import {
  defineConfig,
  type AdmissionPolicyContext,
  type CustomAdmissionStrategy
} from "../project-definition/project-definition.ts";
import { executeValidatedRun } from "./invocation.ts";
import type { RunResult } from "./result.ts";

const PASSED = Object.freeze({ data: Object.freeze({}), status: "passed" as const });

/** Proves the public prepared lifecycle runs after generic terminal Hooks with frozen public contexts. */
export async function assertPublicPreparedStrategyRunsOnce(): Promise<void> {
  const events: string[] = [];
  const result = await executeValidatedRun(
    defineConfig({
      checks: [check("check", () => PASSED)],
      outputs: {
        machinePublication: { enabled: false },
        progressRendering: { enabled: false }
      },
      scheduler: {
        admissionPolicy: {
          kind: "custom",
          strategy: {
            kind: "prepared",
            async prepare(context) {
              events.push("prepare");
              assert.equal(Object.isFrozen(context), true);
              assert.equal(Object.isFrozen(context.graph), true);
              await Promise.resolve();
              return {
                decide(decision) {
                  events.push("decide");
                  return selectFirstCandidate(decision);
                },
                complete(terminal) {
                  assert.equal(Object.isFrozen(terminal), true);
                  assert.equal("terminalMeasurement" in terminal, false);
                  events.push("complete");
                }
              };
            }
          }
        },
        measurementHooks: [() => events.push("generic")]
      }
    }),
    {},
    []
  );

  assert.equal(result.kind, "completed");
  assertEventsInOrder({ events, required: ["prepare", "decide", "generic", "complete"] });
  assert.equal(events.filter((event) => event === "prepare").length, 1);
  assert.equal(events.filter((event) => event === "complete").length, 1);
  assert.deepEqual(result.outputs.measurementHooks, { enabled: true, status: "succeeded" });
}

/** Proves each overlapping invocation owns only the closure its prepared strategy returned. */
export async function assertPublicPreparedClosuresStayIsolated(): Promise<void> {
  const release = deferred<void>();
  const bothStarted = deferred<void>();
  const events: string[] = [];
  let checkStarts = 0;
  let preparation = 0;
  const definition = defineConfig({
    checks: [
      check("check", async () => {
        checkStarts += 1;
        if (checkStarts === 2) bothStarted.resolve();
        await release.promise;
        return PASSED;
      })
    ],
    outputs: {
      machinePublication: { enabled: false },
      progressRendering: { enabled: false }
    },
    scheduler: {
      admissionPolicy: {
        kind: "custom",
        strategy: {
          kind: "prepared",
          prepare() {
            preparation += 1;
            const runId = preparation;
            return {
              decide(context) {
                events.push(`decide-${runId}`);
                return selectFirstCandidate(context);
              },
              complete() {
                events.push(`complete-${runId}`);
              }
            };
          }
        }
      },
      maxParallel: 1
    }
  });

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
        prepare: () => ({ decide: selectFirstCandidate })
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
    assert.deepEqual(result.outputs.measurementHooks, expectedOutput, name);
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
          complete: () => {
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
  assert.deepEqual(result.outputs.measurementHooks, { enabled: true, status: "failed" });
}

/** Proves only concrete generic Hooks or a returned completion can enable terminal measurement output. */
export async function assertMeasurementOutputParticipants(): Promise<void> {
  const simple = await executeValidatedRun(
    customDefinition({ kind: "simple", decide: selectFirstCandidate }),
    {},
    []
  );
  const preparedWithoutComplete = await executeValidatedRun(
    customDefinition({
      kind: "prepared",
      prepare: () => ({ decide: selectFirstCandidate })
    }),
    {},
    []
  );
  const genericFailureWithSuccessfulComplete = await executeValidatedRun(
    customDefinition(
      {
        kind: "prepared",
        prepare: () => ({ decide: selectFirstCandidate, complete: () => undefined })
      },
      [() => Promise.reject(new Error("generic failure"))]
    ),
    {},
    []
  );

  assert.deepEqual(resultWithOutputs(simple).outputs.measurementHooks, {
    enabled: false,
    status: "disabled"
  });
  assert.deepEqual(resultWithOutputs(preparedWithoutComplete).outputs.measurementHooks, {
    enabled: false,
    status: "disabled"
  });
  assert.equal(genericFailureWithSuccessfulComplete.kind, "output");
  assert.deepEqual(
    resultWithOutputs(genericFailureWithSuccessfulComplete).outputs.measurementHooks,
    {
      enabled: true,
      status: "failed"
    }
  );
}

function customDefinition(
  strategy: CustomAdmissionStrategy,
  measurementHooks: readonly (() => void | Promise<void>)[] = [],
  execution: Check["execution"] = () => PASSED
) {
  return defineConfig({
    checks: [check("check", execution)],
    outputs: {
      machinePublication: { enabled: false },
      progressRendering: { enabled: false }
    },
    scheduler: {
      admissionPolicy: { kind: "custom", strategy },
      measurementHooks
    }
  });
}

function selectFirstCandidate(
  context: AdmissionPolicyContext
): { readonly kind: "select"; readonly taskId: string } | Readonly<{ readonly kind: "wait" }> {
  const candidate = context.candidates.find(({ canAdmit }) => canAdmit);
  return candidate === undefined
    ? ({ kind: "wait" } as const)
    : ({ kind: "select", taskId: candidate.taskId } as const);
}

function resultWithOutputs(
  result: RunResult
): Exclude<RunResult, Readonly<{ readonly kind: "configuration" }>> {
  if (result.kind === "configuration") assert.fail("expected validated Run result");
  return result;
}

function check(checkId: string, execution: Check["execution"]): Check {
  return { checkId, displayName: checkId, execution };
}

export { assertEventsInOrder as assertOrdered } from "./invocation-event-order.test-support.ts";

export function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return Object.freeze({ promise, resolve });
}
