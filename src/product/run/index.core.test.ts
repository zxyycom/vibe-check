import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  defineConfig,
  type Check,
  type CheckAggregate,
  type CheckAggregation,
  type CheckExecution,
  type RunControls
} from "../definition/project.ts";
import { run } from "./index.ts";

const PASSED = Object.freeze({ status: "passed" as const, data: Object.freeze({ result: true }) });

type AggregationStatus = "passed" | "failed" | "not-applicable" | "unavailable";

function check(
  overrides: Readonly<{
    readonly checkId?: string;
    readonly execution?: CheckExecution;
  }> = {}
): Check {
  return {
    checkId: overrides.checkId ?? "custom",
    displayName: overrides.checkId ?? "Custom",
    execution: overrides.execution ?? (() => PASSED)
  };
}

function definition(checks: readonly Check[]) {
  return defineConfig({
    checks,
    effects: {
      cache: { enabled: false },
      logs: { enabled: false },
      output: { enabled: false },
      progress: { enabled: false }
    }
  });
}

function executionFor(status: AggregationStatus): CheckExecution {
  switch (status) {
    case "passed":
      return () => ({ status: "passed", data: {} });
    case "failed":
      return () => ({ status: "failed", data: {} });
    case "not-applicable":
      return () => ({ status: "not-applicable" });
    case "unavailable":
      return () => ({ status: "unavailable", reason: { code: "declared-unavailable" } });
  }
}

function aggregateSource(statuses: readonly AggregationStatus[]): Check[] {
  return statuses.map((status, index) =>
    check({ checkId: `${status}-${index}`, execution: executionFor(status) })
  );
}

function aggregation(
  checks: CheckAggregation["checks"],
  mode: CheckAggregation["mode"],
  unavailable: CheckAggregation["unavailable"],
  notApplicable: CheckAggregation["notApplicable"],
  empty: CheckAggregation["empty"]
): CheckAggregation {
  return Object.freeze({ checks, mode, unavailable, notApplicable, empty });
}

describe("Package Run core integration", () => {
  it("contains invalid callback outcomes and Record misuse in the owning Check", async () => {
    const invalidCheck = check();
    Object.defineProperty(invalidCheck, "execution", {
      configurable: true,
      enumerable: true,
      value: () => Object.freeze({ status: "unexpected" }),
      writable: true
    });
    const invalidOutcome = await run(definition([invalidCheck]));
    assert.equal(invalidOutcome.kind, "completed");
    if (invalidOutcome.kind !== "completed") return;
    assert.deepEqual(invalidOutcome.snapshot.checks[0]?.outcome, {
      status: "unavailable",
      reason: { code: "invalid-execution-result" }
    });

    const forgedProductReason = check();
    Object.defineProperty(forgedProductReason, "execution", {
      configurable: true,
      enumerable: true,
      value: () => ({
        status: "unavailable",
        reason: { code: "forged", checkIds: ["custom"] }
      }),
      writable: true
    });
    const forgedResult = await run(definition([forgedProductReason]));
    assert.equal(forgedResult.kind, "completed");
    if (forgedResult.kind !== "completed") return;
    assert.deepEqual(forgedResult.snapshot.checks[0]?.outcome, {
      status: "unavailable",
      reason: { code: "invalid-execution-result" }
    });

    let retainedReporter:
      | Readonly<{ report(identity: { id: string }, data: object): void }>
      | undefined;
    const invalidRecord = await run(
      definition([
        check({
          execution: (context) => {
            retainedReporter = context.records;
            context.records.report({ id: "retained" }, { value: true });
            context.records.report({ id: "retained" }, { value: false });
            return PASSED;
          }
        })
      ])
    );
    assert.equal(invalidRecord.kind, "completed");
    if (invalidRecord.kind !== "completed") return;
    assert.deepEqual(invalidRecord.snapshot.checks[0]?.outcome, {
      status: "unavailable",
      reason: { code: "record-conflict" }
    });
    assert.deepEqual(invalidRecord.snapshot.records, [
      { checkId: "custom", id: "retained", data: { value: true } }
    ]);
    assert.throws(() => retainedReporter?.report({ id: "late" }, {}), /reporter is closed/);
  });

  it("publishes raw facts and derives an aggregate only from explicit selected statuses", async () => {
    const source = definition([
      check({ checkId: "passed", execution: () => ({ status: "passed", data: { count: 1 } }) }),
      check({ checkId: "failed", execution: () => ({ status: "failed", data: { count: 0 } }) }),
      check({ checkId: "na", execution: () => ({ status: "not-applicable" }) })
    ]);
    const raw = await run(source);
    assert.equal(raw.kind, "completed");
    if (raw.kind !== "completed") return;
    assert.equal(raw.aggregate, null);
    assert.deepEqual(
      raw.snapshot.checks.map((coreCheck) => coreCheck.outcome.status),
      ["failed", "not-applicable", "passed"]
    );

    const aggregate = await run(source, {
      checkAggregation: {
        checks: ["passed", "na"],
        mode: "all",
        unavailable: "propagate",
        notApplicable: "pass",
        empty: "failed"
      }
    });
    assert.equal(aggregate.kind, "completed");
    if (aggregate.kind !== "completed") return;
    assert.equal(aggregate.aggregate, "passed");

    const aggregationTable: readonly Readonly<{
      readonly aggregation: CheckAggregation;
      readonly expected: CheckAggregate;
      readonly statuses: readonly AggregationStatus[];
    }>[] = [
      {
        statuses: ["passed"],
        aggregation: aggregation("all", "all", "propagate", "exclude", "failed"),
        expected: "passed"
      },
      {
        statuses: ["failed"],
        aggregation: aggregation("all", "any", "propagate", "exclude", "passed"),
        expected: "failed"
      },
      {
        statuses: ["passed", "failed"],
        aggregation: aggregation("all", "all", "propagate", "exclude", "failed"),
        expected: "failed"
      },
      {
        statuses: ["passed", "failed"],
        aggregation: aggregation("all", "any", "propagate", "exclude", "failed"),
        expected: "passed"
      },
      {
        statuses: ["passed", "failed"],
        aggregation: aggregation(["passed-0"], "all", "propagate", "exclude", "failed"),
        expected: "passed"
      },
      {
        statuses: [],
        aggregation: aggregation("all", "all", "propagate", "exclude", "passed"),
        expected: "passed"
      },
      {
        statuses: ["passed"],
        aggregation: aggregation([], "any", "propagate", "exclude", "failed"),
        expected: "failed"
      },
      {
        statuses: ["passed"],
        aggregation: aggregation([], "all", "propagate", "exclude", "not-applicable"),
        expected: "not-applicable"
      },
      {
        statuses: ["passed", "unavailable"],
        aggregation: aggregation("all", "all", "propagate", "exclude", "failed"),
        expected: "unavailable"
      },
      {
        statuses: ["passed", "unavailable"],
        aggregation: aggregation("all", "all", "fail", "exclude", "failed"),
        expected: "failed"
      },
      {
        statuses: ["passed", "unavailable"],
        aggregation: aggregation("all", "any", "fail", "exclude", "failed"),
        expected: "passed"
      },
      {
        statuses: ["passed", "unavailable"],
        aggregation: aggregation("all", "all", "exclude", "exclude", "failed"),
        expected: "passed"
      },
      {
        statuses: ["failed", "unavailable"],
        aggregation: aggregation("all", "any", "exclude", "exclude", "passed"),
        expected: "failed"
      },
      {
        statuses: ["not-applicable"],
        aggregation: aggregation("all", "all", "propagate", "exclude", "failed"),
        expected: "failed"
      },
      {
        statuses: ["failed", "not-applicable"],
        aggregation: aggregation("all", "all", "propagate", "pass", "failed"),
        expected: "failed"
      },
      {
        statuses: ["failed", "not-applicable"],
        aggregation: aggregation("all", "any", "propagate", "pass", "failed"),
        expected: "passed"
      },
      {
        statuses: ["passed", "not-applicable"],
        aggregation: aggregation("all", "all", "propagate", "fail", "failed"),
        expected: "failed"
      },
      {
        statuses: ["passed", "not-applicable"],
        aggregation: aggregation("all", "any", "propagate", "fail", "failed"),
        expected: "passed"
      },
      {
        statuses: ["passed", "not-applicable"],
        aggregation: aggregation("all", "all", "propagate", "exclude", "failed"),
        expected: "passed"
      }
    ];
    for (const testCase of aggregationTable) {
      const result = await run(definition(aggregateSource(testCase.statuses)), {
        checkAggregation: testCase.aggregation
      });
      assert.equal(result.kind, "completed");
      if (result.kind === "completed") assert.equal(result.aggregate, testCase.expected);
    }

    let calls = 0;
    const invalidSelection = await run(
      definition([
        check({
          execution: () => {
            calls += 1;
            return PASSED;
          }
        })
      ]),
      {
        checkAggregation: {
          checks: ["missing"],
          mode: "any",
          unavailable: "fail",
          notApplicable: "exclude",
          empty: "not-applicable"
        }
      }
    );
    assert.deepEqual(invalidSelection, {
      kind: "configuration",
      definitionWarnings: [],
      diagnostic: {
        kind: "invalid-run-controls",
        path: "controls.checkAggregation.checks",
        reason: "invalid-value"
      }
    });
    assert.equal(calls, 0);

    const duplicateSelection = await run(
      definition([
        check({
          execution: () => {
            calls += 1;
            return PASSED;
          }
        })
      ]),
      {
        checkAggregation: {
          checks: ["custom", "custom"],
          mode: "all",
          unavailable: "propagate",
          notApplicable: "exclude",
          empty: "not-applicable"
        }
      }
    );
    assert.deepEqual(duplicateSelection, invalidSelection);
    assert.equal(calls, 0);

    const sparse: unknown[] = [];
    sparse.length = 2;
    sparse[1] = "custom";
    const named = ["custom"];
    Object.defineProperty(named, "named", { enumerable: true, value: true });
    for (const malformedChecks of [sparse, named]) {
      const malformedControls: RunControls = {
        checkAggregation: {
          checks: ["custom"],
          mode: "all",
          unavailable: "propagate",
          notApplicable: "exclude",
          empty: "not-applicable"
        }
      };
      Object.defineProperty(malformedControls.checkAggregation, "checks", {
        configurable: true,
        enumerable: true,
        value: malformedChecks,
        writable: true
      });
      const malformedSelection = await run(
        definition([
          check({
            execution: () => {
              calls += 1;
              return PASSED;
            }
          })
        ]),
        malformedControls
      );
      assert.deepEqual(malformedSelection, invalidSelection);
      assert.equal(calls, 0);
    }
  });
});
