import assert from "node:assert/strict";

import type { Check, CheckExecution } from "../check/check.ts";
import type { CheckAggregate, CheckAggregation, RunControls } from "./controls/contract.ts";
import { check, definition, PASSED } from "./check-facts-integration.test-support.ts";
import { run } from "./run.ts";

type AggregationStatus = "passed" | "failed" | "not-applicable" | "unavailable";

type AggregationCase = Readonly<{
  readonly aggregation: CheckAggregation;
  readonly expected: CheckAggregate;
  readonly statuses: readonly AggregationStatus[];
}>;

export async function assertRawAndSelectedAggregate(): Promise<void> {
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
    checkAggregation: aggregation(["passed", "na"], "all", "propagate", "pass", "failed")
  });
  assert.equal(aggregate.kind, "completed");
  if (aggregate.kind === "completed") assert.equal(aggregate.aggregate, "passed");
}

export async function assertAggregationPolicyMatrix(): Promise<void> {
  for (const testCase of aggregationCases) {
    const result = await run(definition(aggregateSource(testCase.statuses)), {
      checkAggregation: testCase.aggregation
    });
    assert.equal(result.kind, "completed");
    if (result.kind === "completed") assert.equal(result.aggregate, testCase.expected);
  }
}

export async function assertInvalidAggregationSelections(): Promise<void> {
  let calls = 0;
  const expected = await invalidSelection(() => {
    calls += 1;
    return PASSED;
  }, ["missing"]);
  assert.equal(calls, 0);
  await assertDuplicateSelection(expected, () => {
    calls += 1;
    return PASSED;
  });
  assert.equal(calls, 0);
  await assertMalformedSelections(expected, () => {
    calls += 1;
    return PASSED;
  });
  assert.equal(calls, 0);
}

export async function assertEffectiveFlagSelectionAggregation(): Promise<void> {
  const calls: string[] = [];
  const source = definition([
    {
      checkId: "always",
      displayName: "Always",
      execution: () => {
        calls.push("always");
        return PASSED;
      }
    },
    {
      checkId: "deferred",
      displayName: "Deferred",
      enabledByFlags: { flags: ["deferred"], mode: "all" },
      execution: () => {
        calls.push("deferred");
        return PASSED;
      }
    },
    {
      checkId: "provider",
      displayName: "Provider",
      enabledByFlags: { flags: ["provider"], mode: "all" },
      execution: () => {
        calls.push("provider");
        return PASSED;
      }
    },
    {
      checkId: "root",
      displayName: "Root",
      dependsOn: ["provider"],
      enabledByFlags: { flags: ["root"], mode: "all", propagateDependsOn: true },
      execution: () => {
        calls.push("root");
        return PASSED;
      }
    }
  ]);

  const effective = await run(source, {
    flags: ["root"],
    checkAggregation: effectiveAggregation("effective", "not-applicable")
  });
  assert.equal(effective.kind, "completed");
  if (effective.kind !== "completed") return;
  assert.equal(effective.aggregate, "passed");
  assert.equal("effectiveCheckIds" in effective, false);
  assert.deepEqual([...calls].sort(), ["always", "provider", "root"]);

  const all = await run(source, {
    flags: ["root"],
    checkAggregation: effectiveAggregation("all", "not-applicable")
  });
  assert.equal(all.kind, "completed");
  if (all.kind === "completed") assert.equal(all.aggregate, "failed");

  const explicit = await run(source, {
    flags: ["root"],
    checkAggregation: effectiveAggregation(["root"], "failed")
  });
  assert.equal(explicit.kind, "completed");
  if (explicit.kind === "completed") assert.equal(explicit.aggregate, "passed");

  const empty = await run(
    definition([
      {
        checkId: "deferred",
        displayName: "Deferred",
        enabledByFlags: { flags: ["deferred"], mode: "all" },
        execution: () => PASSED
      }
    ]),
    { checkAggregation: effectiveAggregation("effective", "not-applicable") }
  );
  assert.equal(empty.kind, "completed");
  if (empty.kind === "completed") assert.equal(empty.aggregate, "not-applicable");
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

function effectiveAggregation(
  checks: CheckAggregation["checks"],
  empty: CheckAggregation["empty"]
): CheckAggregation {
  return aggregation(checks, "all", "propagate", "fail", empty);
}

function aggregateSource(statuses: readonly AggregationStatus[]): Check[] {
  return statuses.map((status, index) =>
    check({ checkId: `${status}-${index}`, execution: executionFor(status) })
  );
}

function executionFor(status: AggregationStatus): CheckExecution {
  if (status === "passed") return () => ({ status: "passed", data: {} });
  if (status === "failed") return () => ({ status: "failed", data: {} });
  if (status === "not-applicable") return () => ({ status: "not-applicable" });
  return () => ({ status: "unavailable", reason: { code: "declared-unavailable" } });
}

async function invalidSelection(execution: CheckExecution, checks: CheckAggregation["checks"]) {
  return run(definition([check({ execution })]), {
    checkAggregation: aggregation(checks, "any", "fail", "exclude", "not-applicable")
  });
}

async function assertDuplicateSelection(
  expected: unknown,
  execution: CheckExecution
): Promise<void> {
  assert.deepEqual(await invalidSelection(execution, ["custom", "custom"]), expected);
}

async function assertMalformedSelections(
  expected: unknown,
  execution: CheckExecution
): Promise<void> {
  for (const checks of malformedChecks()) {
    const controls = malformedControls(checks);
    assert.deepEqual(await run(definition([check({ execution })]), controls), expected);
  }
}

function malformedChecks(): readonly unknown[] {
  const sparse: unknown[] = [];
  sparse.length = 2;
  sparse[1] = "custom";
  const named = ["custom"];
  Object.defineProperty(named, "named", { enumerable: true, value: true });
  return [sparse, named];
}

function malformedControls(checks: unknown): RunControls {
  const controls: RunControls = {
    checkAggregation: {
      checks: ["custom"],
      mode: "all",
      unavailable: "propagate",
      notApplicable: "exclude",
      empty: "not-applicable"
    }
  };
  Object.defineProperty(controls.checkAggregation, "checks", {
    configurable: true,
    enumerable: true,
    value: checks,
    writable: true
  });
  return controls;
}
const aggregationCases: readonly AggregationCase[] = [
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
