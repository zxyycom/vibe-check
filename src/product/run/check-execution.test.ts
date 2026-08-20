import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CheckExecution, CheckProjectContext } from "../definition/custom-check.ts";
import type { NormalizedCheck } from "../definition/project.ts";
import {
  executeResolvedChecks,
  type CheckExecutionClock,
  type CheckExecutionLifecycle,
  type CheckSettledFact,
  type CheckStartedFact
} from "./check-execution.ts";

const FINDING = Object.freeze({
  recordTypeId: "finding",
  level: "warning",
  semanticSubject: "src/a.ts",
  message: "Direct reference finding",
  fields: Object.freeze({ metric: "score" }),
  location: Object.freeze({ path: "src/a.ts", line: 1, column: 1 })
});

const PROJECT = Object.freeze({
  cache: Object.freeze({ directory: ".cache", enabled: false, reportActivity: () => undefined }),
  changedFiles: Object.freeze([]),
  comparison: Object.freeze({ referenceName: "baseline", revision: "HEAD", root: "/reference" }),
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
  const checkId = overrides.checkId ?? "reference-check";
  return {
    definition: {
      checkId,
      displayName: overrides.displayName ?? checkId,
      recordTypes: [
        {
          recordTypeId: "finding",
          fields: [{ fieldId: "metric", valueType: "string", required: true }],
          identityFields: ["metric"],
          policy: { operands: [], relations: ["changed"] }
        }
      ]
    },
    dependsOn: overrides.dependsOn ?? [],
    execution,
    maxParallel: overrides.maxParallel ?? 1,
    mutex: [],
    options: {}
  };
}

async function execute(
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
      if (resolvePromise === undefined) throw new Error("Deferred promise is not initialized");
      resolvePromise(value);
    }
  });
}

describe("Package Run direct Check execution", () => {
  it("retains a valid optional comparison candidate when no selected policy requires it", async () => {
    const result = await execute((context) => {
      context.records.reportReference({
        referenceName: "baseline",
        relations: [],
        status: "complete"
      });
      return { status: "completed", verdict: "passed" };
    });

    assert.equal(result.kind, "completed");
    assert.deepEqual(result.snapshot.checks[0]?.outcome, {
      status: "completed",
      verdict: "passed"
    });
    assert.deepEqual(result.references, [
      {
        checkId: "reference-check",
        referenceName: "baseline",
        relations: [],
        status: "complete"
      }
    ]);
  });

  it("retains one complete reference candidate by resolving the already committed Record identity", async () => {
    const result = await execute((context) => {
      context.records.report(FINDING);
      context.records.reportReference({
        referenceName: "baseline",
        relations: [
          {
            record: {
              recordTypeId: FINDING.recordTypeId,
              semanticSubject: FINDING.semanticSubject,
              fields: FINDING.fields
            },
            relationId: "changed"
          }
        ],
        status: "complete"
      });
      return { status: "completed", verdict: "passed" };
    });

    assert.equal(result.kind, "completed");
    const recordId = result.snapshot.records[0]?.recordId;
    assert.ok(recordId);
    assert.deepEqual(result.references, [
      {
        checkId: "reference-check",
        referenceName: "baseline",
        relations: [{ recordId, referenceName: "baseline", relationId: "changed" }],
        status: "complete"
      }
    ]);
  });

  it("turns malformed or uncommitted reference relations into the contained reference-invalid outcome", async () => {
    const result = await execute((context) => {
      context.records.reportReference({
        referenceName: "baseline",
        relations: [
          {
            record: {
              recordTypeId: FINDING.recordTypeId,
              semanticSubject: FINDING.semanticSubject,
              fields: FINDING.fields
            },
            relationId: "changed"
          }
        ],
        status: "complete"
      });
      return { status: "completed", verdict: "passed" };
    });

    assert.equal(result.kind, "completed");
    assert.deepEqual(result.snapshot.checks[0]?.outcome, {
      status: "unavailable",
      reason: { code: "reference-invalid" }
    });
    assert.deepEqual(result.references, []);
  });

  it("does not retain a reference candidate from a contradictory not-applicable callback", async () => {
    const result = await execute((context) => {
      context.records.reportReference({
        referenceName: "baseline",
        relations: [],
        status: "unavailable"
      });
      return { status: "not-applicable" };
    });

    assert.equal(result.kind, "completed");
    assert.deepEqual(result.snapshot.checks[0]?.outcome, {
      status: "unavailable",
      reason: { code: "record-invalid" }
    });
    assert.deepEqual(result.references, []);
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

    const result = await execute(
      (context) => {
        context.records.report(FINDING);
        return { status: "not-applicable" };
      },
      { clock: scriptedClock([12, 27]), lifecycle }
    );

    assert.equal(result.kind, "completed");
    assert.deepEqual(started, [{ checkId: "reference-check", displayName: "reference-check" }]);
    assert.deepEqual(settled, [
      {
        checkId: "reference-check",
        displayName: "reference-check",
        outcome: { status: "unavailable", reason: { code: "record-invalid" } },
        durationMs: 15
      }
    ]);
    assert.deepEqual(result.checkDurations, [{ checkId: "reference-check", durationMs: 15 }]);
    assert.ok(Object.isFrozen(result.checkDurations));
    assert.ok(Object.isFrozen(result.checkDurations[0]));

    const nonFinite = await execute(() => ({ status: "completed", verdict: "passed" }), {
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
            return { status: "completed", verdict: "passed" };
          },
          { checkId: "a-slow", displayName: "Slow", maxParallel: 2 }
        ),
        normalized(() => ({ status: "completed", verdict: "passed" }), {
          checkId: "z-fast",
          displayName: "Fast",
          maxParallel: 2
        })
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
    assert.deepEqual(events, ["started:a-slow", "started:z-fast", "settled:z-fast"]);
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
  });

  it("settles blocked Checks without starting them and records not-run duration", async () => {
    const events: string[] = [];
    const result = await executeResolvedChecks({
      checks: [
        normalized(() => ({ status: "unavailable", reason: { code: "execution-threw" } }), {
          checkId: "source",
          displayName: "Source"
        }),
        normalized(() => ({ status: "completed", verdict: "passed" }), {
          checkId: "dependent",
          dependsOn: ["source"],
          displayName: "Dependent"
        })
      ],
      clock: scriptedClock([1, 7]),
      lifecycle: Object.freeze({
        started: (fact: CheckStartedFact): void => {
          events.push(`started:${fact.checkId}`);
        },
        settled: (fact: CheckSettledFact): void => {
          events.push(`settled:${fact.checkId}:${String(fact.durationMs)}`);
        }
      }),
      maxParallel: 1,
      project: PROJECT,
      signal: undefined
    });

    assert.equal(result.kind, "completed");
    assert.deepEqual(events, ["started:source", "settled:source:6", "settled:dependent:null"]);
    assert.deepEqual(
      result.snapshot.checks.map((check) => check.checkId),
      ["dependent", "source"]
    );
    assert.deepEqual(result.checkDurations, [
      { checkId: "dependent", durationMs: null },
      { checkId: "source", durationMs: 6 }
    ]);
  });

  it("closes cancelled-before-start Checks as execution-cancelled without starting them", async () => {
    const controller = new AbortController();
    const events: string[] = [];
    const result = await executeResolvedChecks({
      checks: [
        normalized(
          () => {
            controller.abort();
            return { status: "completed", verdict: "passed" };
          },
          { checkId: "started", displayName: "Started" }
        ),
        normalized(() => ({ status: "completed", verdict: "passed" }), {
          checkId: "pending",
          displayName: "Pending"
        })
      ],
      clock: scriptedClock([50, 70]),
      lifecycle: Object.freeze({
        started: (fact: CheckStartedFact): void => {
          events.push(`started:${fact.checkId}`);
        },
        settled: (fact: CheckSettledFact): void => {
          events.push(`settled:${fact.checkId}:${String(fact.durationMs)}`);
        }
      }),
      maxParallel: 1,
      project: PROJECT,
      signal: controller.signal
    });

    assert.equal(result.kind, "cancelled");
    assert.deepEqual(events, ["started:started", "settled:started:20", "settled:pending:null"]);
    assert.deepEqual(result.snapshot.checks[0]?.outcome, {
      status: "unavailable",
      reason: { code: "execution-cancelled" }
    });
    assert.deepEqual(result.checkDurations, [
      { checkId: "pending", durationMs: null },
      { checkId: "started", durationMs: 20 }
    ]);
  });
});
