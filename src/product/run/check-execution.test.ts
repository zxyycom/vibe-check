import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  CheckExecution,
  CheckProjectContext,
  CheckResult
} from "../definition/custom-check.ts";
import type { NormalizedCheck } from "../definition/project.ts";
import {
  executeResolvedChecks,
  type CheckExecutionClock,
  type CheckExecutionLifecycle,
  type CheckSettledFact,
  type CheckStartedFact
} from "./check-execution.ts";

const PROJECT = Object.freeze({
  cache: Object.freeze({ directory: ".cache", enabled: false, reportActivity: () => undefined }),
  changedFiles: Object.freeze([]),
  flags: Object.freeze([]),
  files: Object.freeze({ codeAreas: {}, excludeDirs: [], generatedFiles: [], include: ["**/*"] }),
  root: "/project"
}) satisfies CheckProjectContext;

function normalized(
  execution: CheckExecution,
  overrides: Readonly<{
    readonly checkId?: string;
    readonly dependsOn?: readonly string[];
    readonly displayName?: string;
    readonly maxParallel?: number;
  }> = {}
): NormalizedCheck {
  const checkId = overrides.checkId ?? "direct-check";
  return {
    definition: { checkId, displayName: overrides.displayName ?? checkId },
    dependsOn: overrides.dependsOn ?? [],
    execution,
    maxParallel: overrides.maxParallel ?? 1,
    mutex: [],
    options: {},
    visibility: "always"
  };
}

function execute(
  execution: CheckExecution,
  options: Readonly<{
    readonly clock?: CheckExecutionClock;
    readonly lifecycle?: CheckExecutionLifecycle;
  }> = {}
) {
  return executeResolvedChecks({
    checks: [normalized(execution)],
    clock: options.clock,
    lifecycle: options.lifecycle,
    maxParallel: 1,
    project: PROJECT,
    signal: undefined
  });
}

function scriptedClock(values: readonly number[]): CheckExecutionClock {
  const remaining = [...values];
  return Object.freeze({
    now: (): number => {
      const value = remaining.shift();
      if (value === undefined) throw new Error("Test clock received too many reads");
      return value;
    }
  });
}

function deferred<T>(): Readonly<{
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
}> {
  let resolvePromise: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return Object.freeze({
    promise,
    resolve: (value: T): void => {
      if (resolvePromise === undefined) throw new Error("Deferred promise is unavailable");
      resolvePromise(value);
    }
  });
}

describe("Package Run direct Check execution", () => {
  it("retains supplemental Records independently from a passed final result", async () => {
    const messages = [
      { level: "info" as const, code: "summary", message: "One detail" },
      { level: "warning" as const, code: "watch", message: "Two details" },
      { level: "error" as const, code: "failure", message: "Three details" }
    ];
    const result = await execute((context) => {
      context.records.report({ id: "sample" }, { durationMs: 12 });
      return { status: "passed", data: { summary: "ok" }, messages };
    });

    assert.equal(result.kind, "completed");
    assert.deepEqual(result.snapshot.checks[0]?.outcome, {
      status: "passed",
      data: { summary: "ok" }
    });
    assert.deepEqual(result.snapshot.records, [
      { checkId: "direct-check", id: "sample", data: { durationMs: 12 } }
    ]);
    assert.deepEqual(result.checkMessages, [
      { checkId: "direct-check", level: "info", code: "summary", message: "One detail" },
      { checkId: "direct-check", level: "warning", code: "watch", message: "Two details" },
      { checkId: "direct-check", level: "error", code: "failure", message: "Three details" }
    ]);
    assert.equal(Object.isFrozen(result.checkMessages), true);
    messages[0].message = "Mutated after settlement";
    assert.equal(result.checkMessages[0]?.message, "One detail");

    const whitespaceMessage = " \t ";
    const longMessage = "x".repeat(16_384);
    const manyMessages = Array.from({ length: 257 }, (_, index) => ({
      level: "info" as const,
      code: `detail-${index}`,
      message: `Detail ${index}`
    }));
    const unboundedResult = await execute(() => ({
      status: "passed",
      data: {},
      messages: [
        { level: "warning", code: "whitespace", message: whitespaceMessage },
        { level: "error", code: "long-text", message: longMessage },
        ...manyMessages
      ]
    }));
    assert.equal(unboundedResult.checkMessages.length, 259);
    assert.deepEqual(unboundedResult.checkMessages[0], {
      checkId: "direct-check",
      level: "warning",
      code: "whitespace",
      message: whitespaceMessage
    });
    assert.equal(unboundedResult.checkMessages[1]?.message, longMessage);
    assert.deepEqual(unboundedResult.checkMessages.at(-1), {
      checkId: "direct-check",
      level: "info",
      code: "detail-256",
      message: "Detail 256"
    });
    assert.equal(Object.isFrozen(unboundedResult.checkMessages), true);
    assert.equal(Object.isFrozen(unboundedResult.checkMessages[1]), true);

    const terminalResults: readonly CheckResult[] = [
      { status: "passed", data: {} },
      { status: "failed", data: {}, messages: undefined },
      { status: "not-applicable", messages: [] },
      {
        status: "unavailable",
        reason: { code: "declared-unavailable" },
        messages: [{ level: "warning", code: "not-ready", message: "Scanner is unavailable" }]
      }
    ];
    for (const terminal of terminalResults) {
      const terminalResult = await execute(() => terminal);
      assert.equal(terminalResult.kind, "completed");
      assert.equal(terminalResult.snapshot.checks[0]?.outcome.status, terminal.status);
      assert.deepEqual(
        terminalResult.checkMessages,
        terminal.status === "unavailable"
          ? [
              {
                checkId: "direct-check",
                level: "warning",
                code: "not-ready",
                message: "Scanner is unavailable"
              }
            ]
          : []
      );
    }
  });

  it("contains invalid or duplicate Record writes without revising prior Records", async () => {
    const result = await execute((context) => {
      context.records.report({ id: "retained" }, { value: true });
      context.records.report({ id: "retained" }, { value: false });
      return { status: "passed", data: {} };
    });

    assert.equal(result.kind, "completed");
    assert.deepEqual(result.snapshot.checks[0]?.outcome, {
      status: "unavailable",
      reason: { code: "record-conflict" }
    });
    assert.deepEqual(result.snapshot.records, [
      { checkId: "direct-check", id: "retained", data: { value: true } }
    ]);

    const invalidMessageItems: readonly unknown[] = [
      { level: "verbose", code: "invalid-level", message: "Invalid level" },
      { level: "info", code: "", message: "Empty code" },
      { level: "info", code: "not_kebab", message: "Invalid code grammar" },
      { level: "info", code: "Uppercase", message: "Uppercase code" },
      { level: "info", code: "empty-message", message: "" },
      { level: "info", code: "non-string-message", message: 42 },
      { level: "info", code: "extra-key", message: "Unknown field", extra: true }
    ];
    for (const invalidItem of invalidMessageItems) {
      const invalidMessageResult = await execute(() => {
        const terminal: CheckResult = { status: "passed", data: {}, messages: [] };
        Object.defineProperty(terminal, "messages", {
          configurable: true,
          enumerable: true,
          value: [
            { level: "info", code: "valid-prefix", message: "This must not escape" },
            invalidItem
          ],
          writable: true
        });
        return terminal;
      });
      assert.deepEqual(invalidMessageResult.snapshot.checks[0]?.outcome, {
        status: "unavailable",
        reason: { code: "invalid-execution-result" }
      });
      assert.deepEqual(invalidMessageResult.checkMessages, []);
    }

    const adversarialData: readonly Readonly<{
      readonly create: () => Readonly<{
        readonly assertNotCalled: () => void;
        readonly messageAttachment?: boolean;
        readonly value: object;
      }>;
    }>[] = [
      {
        create: () => {
          const value = new Proxy(
            {},
            {
              ownKeys: () => {
                throw new Error("reflection must be contained");
              }
            }
          );
          return Object.freeze({ assertNotCalled: () => undefined, value });
        }
      },
      {
        create: () => {
          let called = false;
          const value = {};
          Object.defineProperty(value, "accessor", {
            enumerable: true,
            get: () => {
              called = true;
              throw new Error("accessor must not execute");
            }
          });
          return Object.freeze({
            assertNotCalled: () => assert.equal(called, false),
            value
          });
        }
      },
      {
        create: () => {
          let called = false;
          const value = {
            toJSON: () => {
              called = true;
              return {};
            }
          };
          return Object.freeze({
            assertNotCalled: () => assert.equal(called, false),
            value
          });
        }
      },
      {
        create: () => {
          const value: Record<string, unknown> = {};
          value.self = value;
          return Object.freeze({ assertNotCalled: () => undefined, value });
        }
      },
      {
        create: () => {
          const value: unknown[] = [];
          value.length = 2;
          value[1] = { level: "info", code: "sparse", message: "Sparse attachment" };
          return Object.freeze({
            assertNotCalled: () => undefined,
            messageAttachment: true,
            value
          });
        }
      },
      {
        create: () => {
          const value: unknown[] = [{ level: "info", code: "named", message: "Named attachment" }];
          Object.defineProperty(value, "named", { enumerable: true, value: true });
          return Object.freeze({
            assertNotCalled: () => undefined,
            messageAttachment: true,
            value
          });
        }
      },
      {
        create: () => {
          let called = false;
          const value: unknown[] = [];
          Object.defineProperty(value, "0", {
            enumerable: true,
            get: () => {
              called = true;
              throw new Error("array accessor must not execute");
            }
          });
          return Object.freeze({
            assertNotCalled: () => assert.equal(called, false),
            messageAttachment: true,
            value
          });
        }
      },
      {
        create: () => {
          const value: unknown[] = [
            { level: "info", code: "symbol", message: "Symbol attachment" }
          ];
          Object.defineProperty(value, Symbol("message-symbol"), { enumerable: true, value: true });
          return Object.freeze({
            assertNotCalled: () => undefined,
            messageAttachment: true,
            value
          });
        }
      },
      {
        create: () => {
          const value = [{ level: "info", code: "nested", message: "Nested message" }];
          Object.setPrototypeOf(value, { inherited: true });
          return Object.freeze({
            assertNotCalled: () => undefined,
            messageAttachment: true,
            value
          });
        }
      },
      {
        create: () =>
          Object.freeze({
            assertNotCalled: () => undefined,
            value: { nonFinite: Number.POSITIVE_INFINITY }
          })
      },
      {
        create: () => {
          const value = { accepted: true };
          Object.setPrototypeOf(value, { inherited: true });
          return Object.freeze({ assertNotCalled: () => undefined, value });
        }
      }
    ];
    for (const channel of ["final", "messages", "record"] as const) {
      for (const adversary of adversarialData) {
        let reporter:
          | Readonly<{ report(identity: { id: string }, data: object): void }>
          | undefined;
        const hostile = adversary.create();
        const contained = normalized(
          (context) => {
            reporter = context.records;
            context.records.report({ id: "retained" }, { retained: true });
            if (channel === "record") {
              context.records.report({ id: "invalid" }, { hostile: hostile.value });
            }
            if (channel === "final") return { status: "passed", data: { hostile: hostile.value } };
            if (channel === "messages") {
              const malformedAttachment: CheckResult = {
                status: "passed",
                data: { valid: true },
                messages: []
              };
              Object.defineProperty(malformedAttachment, "messages", {
                configurable: true,
                enumerable: true,
                value: hostile.messageAttachment ? hostile.value : [hostile.value],
                writable: true
              });
              return malformedAttachment;
            }
            return { status: "passed", data: { valid: true } };
          },
          { checkId: "contained", maxParallel: 2 }
        );
        const independent = normalized(() => ({ status: "passed", data: { independent: true } }), {
          checkId: "independent",
          maxParallel: 2
        });
        const containedResult = await executeResolvedChecks({
          checks: [contained, independent],
          maxParallel: 2,
          project: PROJECT,
          signal: undefined
        });
        assert.equal(containedResult.kind, "completed");
        assert.deepEqual(containedResult.snapshot.checks, [
          {
            checkId: "contained",
            displayName: "contained",
            outcome: {
              status: "unavailable",
              reason: {
                code: channel === "record" ? "record-invalid" : "invalid-execution-result"
              }
            }
          },
          {
            checkId: "independent",
            displayName: "independent",
            outcome: { status: "passed", data: { independent: true } }
          }
        ]);
        assert.deepEqual(containedResult.snapshot.records, [
          { checkId: "contained", id: "retained", data: { retained: true } }
        ]);
        assert.deepEqual(containedResult.checkMessages, []);
        hostile.assertNotCalled();
        const closedReporter = reporter;
        if (closedReporter === undefined)
          throw new Error("Contained callback did not expose a reporter");
        assert.throws(() => closedReporter.report({ id: "late" }, {}), /reporter is closed/);
        assert.deepEqual(containedResult.snapshot.records, [
          { checkId: "contained", id: "retained", data: { retained: true } }
        ]);
      }
    }
  });

  it("hands final Core outcomes and one finite duration to the private lifecycle", async () => {
    const started: unknown[] = [];
    const settled: unknown[] = [];
    const lifecycle: CheckExecutionLifecycle = Object.freeze({
      started: (fact: CheckStartedFact): void => {
        started.push(fact);
      },
      settled: (fact: CheckSettledFact): void => {
        settled.push(fact);
      }
    });
    const result = await execute(() => ({ status: "failed", data: { failures: 1 } }), {
      clock: scriptedClock([12, 27]),
      lifecycle
    });

    assert.equal(result.kind, "completed");
    assert.deepEqual(started, [{ checkId: "direct-check", displayName: "direct-check" }]);
    assert.deepEqual(settled, [
      {
        checkId: "direct-check",
        displayName: "direct-check",
        outcome: { status: "failed", data: { failures: 1 } },
        durationMs: 15,
        messages: [],
        visibility: "always"
      }
    ]);
    assert.deepEqual(result.checkDurations, [{ checkId: "direct-check", durationMs: 15 }]);

    const nonFinite = await execute(() => ({ status: "passed", data: {} }), {
      clock: scriptedClock([Number.NaN, Number.POSITIVE_INFINITY])
    });
    assert.equal(nonFinite.checkDurations[0]?.durationMs, 0);
  });

  it("keeps completed lifecycle feedback in settlement order but durations in canonical order", async () => {
    const slowStarted = deferred<void>();
    const fastSettled = deferred<void>();
    const releaseSlow = deferred<void>();
    const events: string[] = [];
    const running = executeResolvedChecks({
      checks: [
        normalized(
          async () => {
            slowStarted.resolve(undefined);
            await releaseSlow.promise;
            return {
              status: "passed",
              data: {},
              messages: [{ level: "info", code: "slow-finished", message: "Slow finished" }]
            };
          },
          { checkId: "a-slow", displayName: "Slow", maxParallel: 2 }
        ),
        normalized(
          () => ({
            status: "passed",
            data: {},
            messages: [{ level: "warning", code: "fast-finished", message: "Fast finished" }]
          }),
          { checkId: "z-fast", displayName: "Fast", maxParallel: 2 }
        )
      ],
      clock: scriptedClock([10, 20, 30, 40]),
      lifecycle: Object.freeze({
        started: (fact: CheckStartedFact): void => {
          events.push(`started:${fact.checkId}`);
        },
        settled: (fact: CheckSettledFact): void => {
          events.push(`settled:${fact.checkId}`);
          if (fact.checkId === "z-fast") fastSettled.resolve(undefined);
        }
      }),
      maxParallel: 2,
      project: PROJECT,
      signal: undefined
    });

    await slowStarted.promise;
    await fastSettled.promise;
    releaseSlow.resolve(undefined);
    const result = await running;
    assert.equal(result.kind, "completed");
    assert.deepEqual(events, [
      "started:a-slow",
      "started:z-fast",
      "settled:z-fast",
      "settled:a-slow"
    ]);
    assert.deepEqual(result.checkDurations, [
      { checkId: "a-slow", durationMs: 30 },
      { checkId: "z-fast", durationMs: 10 }
    ]);
    assert.deepEqual(result.checkMessages, [
      { checkId: "a-slow", level: "info", code: "slow-finished", message: "Slow finished" },
      {
        checkId: "z-fast",
        level: "warning",
        code: "fast-finished",
        message: "Fast finished"
      }
    ]);
  });

  it("settles blocked and cancelled-before-start Checks without starting them", async () => {
    const blocked = await executeResolvedChecks({
      checks: [
        normalized(() => ({ status: "unavailable", reason: { code: "execution-threw" } }), {
          checkId: "source",
          displayName: "Source"
        }),
        normalized(() => ({ status: "passed", data: {} }), {
          checkId: "dependent",
          dependsOn: ["source"],
          displayName: "Dependent"
        })
      ],
      clock: scriptedClock([1, 7]),
      maxParallel: 1,
      project: PROJECT,
      signal: undefined
    });
    assert.equal(blocked.kind, "completed");
    assert.deepEqual(
      blocked.snapshot.checks.map((check) => check.outcome.status),
      ["unavailable", "unavailable"]
    );
    assert.deepEqual(blocked.checkDurations, [
      { checkId: "dependent", durationMs: null },
      { checkId: "source", durationMs: 6 }
    ]);

    const controller = new AbortController();
    const cancelled = await executeResolvedChecks({
      checks: [
        normalized(
          () => {
            controller.abort();
            return { status: "passed", data: {} };
          },
          { checkId: "started", displayName: "Started" }
        ),
        normalized(() => ({ status: "passed", data: {} }), {
          checkId: "pending",
          displayName: "Pending"
        })
      ],
      maxParallel: 1,
      project: PROJECT,
      signal: controller.signal
    });
    assert.equal(cancelled.kind, "cancelled");
    assert.deepEqual(
      cancelled.snapshot.checks.map((check) => check.outcome.status),
      ["unavailable", "unavailable"]
    );
  });
});
