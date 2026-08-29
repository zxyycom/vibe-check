import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  CheckDependencies,
  CheckExecution,
  CheckProjectContext,
  CheckResult,
  DependencyReadResult
} from "../../check/check.ts";
import type { NormalizedCheck } from "../../project-definition/project-definition.ts";
import { CoreInvariantFailure, createCoreCheckSession } from "../../check-settlement/session.ts";
import type { DiagnosticLogger, DiagnosticObservation } from "../diagnostic-logging/logger.ts";
import { executeCheckCallback } from "./callback.ts";
import {
  executeResolvedChecks,
  type CheckExecutionClock,
  type CheckExecutionLifecycle,
  type CheckSettledFact,
  type CheckStartedFact
} from "./resolved-checks.ts";

const PROJECT = Object.freeze({
  flags: Object.freeze([]),
  root: "/project"
}) satisfies CheckProjectContext;

function normalized(
  execution: CheckExecution,
  overrides: Readonly<{
    readonly checkId?: string;
    readonly dependsOn?: readonly string[];
    readonly displayName?: string;
    readonly maxParallel?: number;
    readonly preflight?: NormalizedCheck["preflight"];
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
    ...(overrides.preflight === undefined ? {} : { preflight: overrides.preflight }),
    visibility: "always"
  };
}

function execute(
  execution: CheckExecution,
  options: Readonly<{
    readonly clock?: CheckExecutionClock;
    readonly diagnosticLogger?: DiagnosticLogger;
    readonly lifecycle?: CheckExecutionLifecycle;
  }> = {}
) {
  return executeResolvedChecks({
    checks: [normalized(execution)],
    clock: options.clock,
    diagnosticLogger: options.diagnosticLogger,
    lifecycle: options.lifecycle,
    maxParallel: 1,
    project: PROJECT,
    signal: undefined
  });
}

function recordingLogger(observations: DiagnosticObservation[]): DiagnosticLogger {
  return Object.freeze({
    close: () => "disabled" as const,
    observe: (observation: DiagnosticObservation): void => {
      observations.push(observation);
    }
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

function outcomeFor(
  execution: Awaited<ReturnType<typeof executeResolvedChecks>>,
  checkId: string
): NonNullable<(typeof execution.snapshot.checks)[number]>["outcome"] {
  const outcome = execution.snapshot.checks.find((check) => check.checkId === checkId)?.outcome;
  if (outcome === undefined) throw new Error(`Missing outcome for ${checkId}`);
  return outcome;
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
    const observations: DiagnosticObservation[] = [];
    const result = await execute(
      (context) => {
        context.records.report({ id: "retained" }, { value: true });
        context.records.report({ id: "retained" }, { value: false });
        return { status: "passed", data: {} };
      },
      { diagnosticLogger: recordingLogger(observations) }
    );

    assert.equal(result.kind, "completed");
    assert.deepEqual(result.snapshot.checks[0]?.outcome, {
      status: "unavailable",
      reason: { code: "record-conflict" }
    });
    assert.deepEqual(result.snapshot.records, [
      { checkId: "direct-check", id: "retained", data: { value: true } }
    ]);
    assert.deepEqual(
      observations
        .filter((observation) => observation.event === "record.reported")
        .map((observation) => observation.details),
      [
        { identity: { id: "retained" }, data: { value: true }, result: "committed" },
        { identity: { id: "retained" }, data: { value: false }, result: "rejected" }
      ]
    );
    assert.deepEqual(
      observations.find((observation) => observation.event === "check.contained")?.details,
      {
        outcome: { reason: { code: "record-conflict" }, status: "unavailable" },
        raw: { status: "passed", data: {} }
      }
    );

    const invalidMessageItems: readonly unknown[] = [
      { level: "verbose", code: "invalid-level", message: "Invalid level" },
      { level: "info", code: "", message: "Empty code" },
      { level: "info", code: "empty-message", message: "" },
      { level: "info", code: "non-string-message", message: 42 },
      { level: "info", code: "extra-key", message: "Unknown field", extra: true }
    ];
    for (const invalidItem of invalidMessageItems) {
      const malformedObservations: DiagnosticObservation[] = [];
      const invalidMessageResult = await execute(
        () => {
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
        },
        { diagnosticLogger: recordingLogger(malformedObservations) }
      );
      assert.ok(
        ["passed", "unavailable"].includes(
          invalidMessageResult.snapshot.checks[0]?.outcome.status ?? ""
        )
      );
      assert.deepEqual(invalidMessageResult.checkMessages, []);
      assert.equal(
        malformedObservations.some((observation) => observation.event === "callback.malformed"),
        true
      );
    }

    const nonKebabMessageResult = await execute(() => ({
      status: "passed" as const,
      data: {},
      messages: [{ level: "info" as const, code: "Camel_Case.v1", message: "Retained exactly" }]
    }));
    assert.deepEqual(nonKebabMessageResult.checkMessages, [
      { checkId: "direct-check", level: "info", code: "Camel_Case.v1", message: "Retained exactly" }
    ]);

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

    const trustedFailure = new CoreInvariantFailure("Dependency read invariant");
    const throwingDependencies: CheckDependencies = Object.freeze({
      get: () => {
        throw trustedFailure;
      }
    });
    await assert.rejects(
      () =>
        executeCheckCallback({
          check: normalized((context) => {
            context.dependencies.get("source");
            return { status: "passed", data: {} };
          }),
          dependencies: throwingDependencies,
          project: PROJECT,
          scope: createCoreCheckSession([
            { definition: { checkId: "direct-check", displayName: "direct-check" } }
          ]).openCheckScope("direct-check"),
          signal: new AbortController().signal
        }),
      (error) => error === trustedFailure
    );
  });

  it("hands final Check-facts outcomes and one finite duration to the private lifecycle", async () => {
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

  it("admits all settled dependency outcomes and limits reads to direct dependencies", async () => {
    const upstreamCases: readonly Readonly<{
      readonly expectedRead: DependencyReadResult;
      readonly terminalResult: CheckResult;
    }>[] = [
      {
        terminalResult: { status: "passed", data: { source: "passed" } },
        expectedRead: {
          ok: true,
          checkId: "source",
          status: "passed",
          data: { source: "passed" }
        }
      },
      {
        terminalResult: { status: "failed", data: { source: "failed" } },
        expectedRead: {
          ok: true,
          checkId: "source",
          status: "failed",
          data: { source: "failed" }
        }
      },
      {
        terminalResult: { status: "not-applicable" },
        expectedRead: {
          ok: false,
          error: {
            code: "upstream-data-unavailable",
            checkId: "source",
            status: "not-applicable"
          }
        }
      },
      {
        terminalResult: { status: "unavailable", reason: { code: "source-unavailable" } },
        expectedRead: {
          ok: false,
          error: {
            code: "upstream-data-unavailable",
            checkId: "source",
            status: "unavailable"
          }
        }
      }
    ];

    for (const upstreamCase of upstreamCases) {
      let dependentCalls = 0;
      let observedRead: DependencyReadResult | undefined;
      const execution = await executeResolvedChecks({
        checks: [
          normalized(() => upstreamCase.terminalResult, {
            checkId: "source",
            displayName: "Source"
          }),
          normalized(
            (context) => {
              dependentCalls += 1;
              assert.equal(Object.isFrozen(context), true);
              const { dependencies } = context;
              assert.equal(Object.isFrozen(dependencies), true);
              observedRead = dependencies.get("source");
              assert.equal(Object.isFrozen(observedRead), true);
              if (!observedRead.ok) {
                assert.equal(Object.isFrozen(observedRead.error), true);
              }
              return { status: "passed", data: { dependent: true } };
            },
            {
              checkId: "dependent",
              dependsOn: ["source"],
              displayName: "Dependent"
            }
          )
        ],
        maxParallel: 1,
        project: PROJECT,
        signal: undefined
      });

      assert.equal(execution.kind, "completed");
      assert.equal(dependentCalls, 1);
      assert.deepEqual(observedRead, upstreamCase.expectedRead);
      const sourceOutcome = outcomeFor(execution, "source");
      if (
        observedRead?.ok &&
        (sourceOutcome.status === "passed" || sourceOutcome.status === "failed")
      ) {
        assert.equal(observedRead.data, sourceOutcome.data);
      }
      assert.deepEqual(outcomeFor(execution, "dependent"), {
        status: "passed",
        data: { dependent: true }
      });
    }

    let directRead: DependencyReadResult | undefined;
    let transitiveRead: DependencyReadResult | undefined;
    let malformedRead: unknown;
    const observations: DiagnosticObservation[] = [];
    const directOnly = await executeResolvedChecks({
      checks: [
        normalized(() => ({ status: "passed", data: { source: true } }), {
          checkId: "source",
          displayName: "Source"
        }),
        normalized(() => ({ status: "passed", data: { middle: true } }), {
          checkId: "middle",
          dependsOn: ["source"],
          displayName: "Middle"
        }),
        normalized(
          (context) => {
            const { dependencies } = context;
            directRead = dependencies.get("middle");
            transitiveRead = dependencies.get("source");
            malformedRead = Reflect.apply(
              (checkId: string) => dependencies.get(checkId),
              undefined,
              [42]
            );
            return { status: "passed", data: { dependent: true } };
          },
          {
            checkId: "dependent",
            dependsOn: ["middle"],
            displayName: "Dependent"
          }
        )
      ],
      diagnosticLogger: recordingLogger(observations),
      maxParallel: 1,
      project: PROJECT,
      signal: undefined
    });

    assert.equal(directOnly.kind, "completed");
    assert.deepEqual(directRead, {
      ok: true,
      checkId: "middle",
      status: "passed",
      data: { middle: true }
    });
    const middleOutcome = outcomeFor(directOnly, "middle");
    if (directRead?.ok && middleOutcome.status === "passed") {
      assert.equal(directRead.data, middleOutcome.data);
    }
    assert.deepEqual(transitiveRead, {
      ok: false,
      error: { code: "dependency-not-declared", checkId: "source" }
    });
    assert.deepEqual(malformedRead, {
      ok: false,
      error: { code: "dependency-not-declared", checkId: "" }
    });
    assert.deepEqual(
      observations
        .filter(
          (observation) =>
            observation.scope === "CHECK dependent / execution" &&
            observation.event === "dependency.read"
        )
        .map((observation) => observation.details),
      [
        {
          hasData: true,
          ok: true,
          producer: "middle",
          status: "passed"
        },
        {
          error: { code: "dependency-not-declared", checkId: "source" },
          ok: false,
          requestedCheckId: "source"
        },
        {
          error: { code: "dependency-not-declared", checkId: "" },
          ok: false,
          requestedCheckId: 42
        }
      ]
    );
  });

  it("finishes every sequential preflight before any author execution", async () => {
    const firstPreflight = deferred<{
      readonly status: "success";
      readonly preparedOptions: object;
    }>();
    const events: string[] = [];
    const execution = executeResolvedChecks({
      checks: [
        normalized(
          () => {
            events.push("first-execution");
            return { status: "passed", data: {} };
          },
          {
            checkId: "first",
            preflight: async (_options) => {
              events.push("first-preflight");
              return firstPreflight.promise;
            }
          }
        ),
        normalized(
          () => {
            events.push("second-execution");
            return { status: "passed", data: {} };
          },
          {
            checkId: "second",
            preflight: (options) => {
              events.push("second-preflight");
              return { status: "success", preparedOptions: options };
            }
          }
        )
      ],
      maxParallel: 2,
      project: PROJECT,
      signal: undefined
    });
    await Promise.resolve();
    assert.deepEqual(events, ["first-preflight"]);
    firstPreflight.resolve({ status: "success", preparedOptions: {} });
    const result = await execution;
    assert.equal(result.kind, "completed");
    assert.deepEqual(events, [
      "first-preflight",
      "second-preflight",
      "first-execution",
      "second-execution"
    ]);
  });

  it("settles blocked preflights before graph admission without a started fact or duration", async () => {
    const started: CheckStartedFact[] = [];
    const settled: CheckSettledFact[] = [];
    const observations: DiagnosticObservation[] = [];
    const result = await executeResolvedChecks({
      checks: [
        normalized(
          () => {
            throw new Error("blocked callback must not execute");
          },
          {
            checkId: "blocked",
            preflight: () => ({
              status: "failure",
              action: "block",
              reason: { code: "invalid-options" },
              messages: [
                { level: "warning", code: "invalid-options", message: "Use valid options" }
              ]
            })
          }
        ),
        normalized(
          (context) => {
            assert.deepEqual(context.dependencies.get("blocked"), {
              ok: false,
              error: {
                code: "upstream-data-unavailable",
                checkId: "blocked",
                status: "unavailable"
              }
            });
            return { status: "passed", data: {} };
          },
          { checkId: "dependent", dependsOn: ["blocked"] }
        )
      ],
      diagnosticLogger: recordingLogger(observations),
      lifecycle: { started: (fact) => started.push(fact), settled: (fact) => settled.push(fact) },
      maxParallel: 1,
      project: PROJECT,
      signal: undefined
    });
    assert.equal(result.kind, "completed");
    assert.deepEqual(
      started.map((fact) => fact.checkId),
      ["dependent"]
    );
    assert.deepEqual(result.checkDurations, [
      { checkId: "blocked", durationMs: null },
      { checkId: "dependent", durationMs: result.checkDurations[1]?.durationMs }
    ]);
    assert.deepEqual(outcomeFor(result, "blocked"), {
      status: "unavailable",
      reason: { code: "invalid-options" }
    });
    assert.deepEqual(result.checkMessages, [
      {
        checkId: "blocked",
        level: "warning",
        code: "invalid-options",
        message: "Use valid options"
      }
    ]);
    assert.equal(settled.find((fact) => fact.checkId === "blocked")?.durationMs, null);
    assert.deepEqual(
      observations.find(
        (observation) =>
          observation.scope === "CHECK blocked / preflight" &&
          observation.event === "preflight.finished"
      )?.details,
      {
        messages: [{ level: "warning", code: "invalid-options", message: "Use valid options" }],
        outcome: { status: "unavailable", reason: { code: "invalid-options" } },
        reason: { code: "invalid-options" },
        result: "blocked"
      }
    );
    assert.deepEqual(
      observations.find(
        (observation) =>
          observation.scope === "CHECK blocked / preflight" &&
          observation.event === "check.finished"
      )?.details,
      {
        durationMs: null,
        messages: [{ level: "warning", code: "invalid-options", message: "Use valid options" }],
        outcome: { reason: { code: "invalid-options" }, status: "unavailable" },
        phase: "preflight"
      }
    );
  });

  it("passes the invocation signal to cooperative preflights and closes a cancelled barrier", async () => {
    const allBlockedController = new AbortController();
    const cooperativePreflightEntered = deferred<void>();
    let observedAllBlockedSignal: AbortSignal | undefined;
    let allBlockedExecutions = 0;
    const allBlocked = executeResolvedChecks({
      checks: [
        normalized(
          () => {
            allBlockedExecutions += 1;
            return { status: "passed", data: {} };
          },
          {
            checkId: "declared-block",
            preflight: () => ({
              status: "failure",
              action: "block",
              reason: { code: "invalid-options" }
            })
          }
        ),
        normalized(
          () => {
            allBlockedExecutions += 1;
            return { status: "passed", data: {} };
          },
          {
            checkId: "cooperative-block",
            preflight: async (_options, signal) => {
              observedAllBlockedSignal = signal;
              cooperativePreflightEntered.resolve();
              await new Promise<void>((resolve) =>
                signal.addEventListener("abort", () => resolve(), { once: true })
              );
              return { status: "success", preparedOptions: {} };
            }
          }
        )
      ],
      maxParallel: 2,
      project: PROJECT,
      signal: allBlockedController.signal
    });
    await cooperativePreflightEntered.promise;
    assert.equal(observedAllBlockedSignal, allBlockedController.signal);
    allBlockedController.abort();
    const allBlockedResult = await allBlocked;
    assert.equal(allBlockedResult.kind, "cancelled");
    assert.equal(allBlockedExecutions, 0);
    assert.deepEqual(
      allBlockedResult.snapshot.checks.map((check) => check.outcome),
      [
        { status: "unavailable", reason: { code: "execution-cancelled" } },
        { status: "unavailable", reason: { code: "invalid-options" } }
      ]
    );

    const partialReadyController = new AbortController();
    const deferredPreflight = deferred<{
      readonly status: "success";
      readonly preparedOptions: object;
    }>();
    const deferredPreflightEntered = deferred<void>();
    let partialExecutions = 0;
    const partialReady = executeResolvedChecks({
      checks: [
        normalized(
          () => {
            partialExecutions += 1;
            return { status: "passed", data: {} };
          },
          {
            checkId: "ready",
            preflight: () => ({
              status: "success",
              preparedOptions: {},
              messages: [
                { level: "info", code: "prepared", message: "Prepared before cancellation" }
              ]
            })
          }
        ),
        normalized(
          () => {
            partialExecutions += 1;
            return { status: "passed", data: {} };
          },
          {
            checkId: "deferred",
            preflight: (_options, signal) => {
              assert.equal(signal, partialReadyController.signal);
              deferredPreflightEntered.resolve();
              return deferredPreflight.promise;
            }
          }
        )
      ],
      maxParallel: 2,
      project: PROJECT,
      signal: partialReadyController.signal
    });
    await deferredPreflightEntered.promise;
    partialReadyController.abort();
    deferredPreflight.resolve({ status: "success", preparedOptions: {} });
    const partialReadyResult = await partialReady;
    assert.equal(partialReadyResult.kind, "cancelled");
    assert.equal(partialExecutions, 0);
    assert.deepEqual(
      partialReadyResult.snapshot.checks.map((check) => check.outcome.status),
      ["unavailable", "unavailable"]
    );
    assert.deepEqual(partialReadyResult.checkMessages, [
      {
        checkId: "ready",
        level: "info",
        code: "prepared",
        message: "Prepared before cancellation"
      }
    ]);
  });

  it("canonicalizes continue fallbacks and retains preflight messages through execution settlement", async () => {
    let frozenFallback = false;
    const observations: DiagnosticObservation[] = [];
    const result = await executeResolvedChecks({
      checks: [
        normalized(
          (context) => {
            frozenFallback = Object.isFrozen(context.options);
            assert.deepEqual(context.options, { value: 2 });
            return {
              status: "passed",
              data: {},
              messages: [{ level: "info", code: "execution", message: "Execution message" }]
            };
          },
          {
            checkId: "continued",
            preflight: () => ({
              status: "failure",
              action: "continue",
              reason: { code: "fallback" },
              fallback: { value: 2 },
              messages: [{ level: "warning", code: "preflight", message: "Preflight message" }]
            })
          }
        ),
        normalized(
          () => {
            throw new Error("contained");
          },
          {
            checkId: "throws",
            preflight: () => ({
              status: "success",
              preparedOptions: {},
              messages: [{ level: "warning", code: "preflight", message: "Retained on throw" }]
            })
          }
        )
      ],
      diagnosticLogger: recordingLogger(observations),
      maxParallel: 2,
      project: PROJECT,
      signal: undefined
    });
    assert.equal(result.kind, "completed");
    assert.equal(frozenFallback, true);
    assert.deepEqual(result.checkMessages, [
      { checkId: "continued", level: "warning", code: "preflight", message: "Preflight message" },
      { checkId: "continued", level: "info", code: "execution", message: "Execution message" },
      { checkId: "throws", level: "warning", code: "preflight", message: "Retained on throw" }
    ]);
    assert.deepEqual(outcomeFor(result, "throws"), {
      status: "unavailable",
      reason: { code: "execution-threw" }
    });
    assert.deepEqual(
      observations.find(
        (observation) =>
          observation.scope === "CHECK continued / preflight" &&
          observation.event === "preflight.finished"
      )?.details,
      {
        messages: [{ level: "warning", code: "preflight", message: "Preflight message" }],
        options: { availability: "available", bytes: 11, keys: 1, shape: "object" },
        reason: { code: "fallback" },
        result: "continued"
      }
    );
    assert.equal(
      observations.some((observation) => observation.event === "preflight.finished"),
      true
    );
    assert.equal(
      observations.some((observation) => observation.event === "callback.threw"),
      true
    );
  });

  it("fails closed for thrown, malformed, and noncanonical preflight results", async () => {
    const cyclicPreparedOptions: { self?: unknown } = {};
    cyclicPreparedOptions.self = cyclicPreparedOptions;
    const executions: string[] = [];
    const observations: DiagnosticObservation[] = [];
    const result = await executeResolvedChecks({
      checks: [
        normalized(
          () => {
            executions.push("throwing");
            return { status: "passed", data: {} };
          },
          {
            checkId: "throwing",
            preflight: () => {
              throw new Error("contained preflight failure");
            }
          }
        ),
        normalized(
          () => {
            executions.push("block-with-fallback");
            return { status: "passed", data: {} };
          },
          {
            checkId: "block-with-fallback",
            preflight: () => {
              const blocked = {
                status: "failure" as const,
                action: "block" as const,
                reason: { code: "invalid-options" }
              };
              Object.defineProperty(blocked, "fallback", { enumerable: true, value: undefined });
              return blocked;
            }
          }
        ),
        normalized(
          () => {
            executions.push("noncanonical-options");
            return { status: "passed", data: {} };
          },
          {
            checkId: "noncanonical-options",
            preflight: () => ({ status: "success", preparedOptions: cyclicPreparedOptions })
          }
        ),
        normalized(
          () => {
            executions.push("malformed-message");
            return { status: "passed", data: {} };
          },
          {
            checkId: "malformed-message",
            preflight: () => {
              const continued = {
                status: "failure" as const,
                action: "continue" as const,
                reason: { code: "fallback" },
                fallback: {},
                messages: [
                  { level: "warning" as const, code: "preflight", message: "Invalid level" }
                ]
              };
              Object.defineProperty(continued.messages[0], "level", { value: "notice" });
              return continued;
            }
          }
        )
      ],
      diagnosticLogger: recordingLogger(observations),
      maxParallel: 2,
      project: PROJECT,
      signal: undefined
    });
    assert.equal(result.kind, "completed");
    assert.deepEqual(executions, []);
    assert.deepEqual(outcomeFor(result, "throwing"), {
      status: "unavailable",
      reason: { code: "preflight-threw" }
    });
    for (const checkId of ["block-with-fallback", "malformed-message", "noncanonical-options"]) {
      assert.deepEqual(outcomeFor(result, checkId), {
        status: "unavailable",
        reason: { code: "invalid-preflight-result" }
      });
    }
    assert.equal(
      observations.some(
        (observation) =>
          observation.event === "preflight.finished" &&
          observation.details !== null &&
          typeof observation.details === "object" &&
          "result" in observation.details &&
          observation.details.result === "threw"
      ),
      true
    );
    assert.equal(
      observations.filter(
        (observation) =>
          observation.event === "preflight.finished" &&
          observation.details !== null &&
          typeof observation.details === "object" &&
          "result" in observation.details &&
          observation.details.result === "malformed"
      ).length,
      3
    );
  });

  it("settles cancellation-before-start Checks without starting them", async () => {
    const controller = new AbortController();
    const observations: DiagnosticObservation[] = [];
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
      diagnosticLogger: recordingLogger(observations),
      maxParallel: 1,
      project: PROJECT,
      signal: controller.signal
    });
    assert.equal(cancelled.kind, "cancelled");
    assert.deepEqual(
      cancelled.snapshot.checks.map((check) => check.outcome.status),
      ["unavailable", "unavailable"]
    );
    assert.deepEqual(
      observations
        .filter(
          (observation) =>
            observation.scope === "CHECK pending / execution" &&
            observation.event === "check.finished"
        )
        .map((observation) => ({ scope: observation.scope, details: observation.details })),
      [
        {
          scope: "CHECK pending / execution",
          details: {
            durationMs: null,
            messages: [],
            outcome: { reason: { code: "execution-cancelled" }, status: "unavailable" },
            phase: "execution"
          }
        }
      ]
    );
  });
});
