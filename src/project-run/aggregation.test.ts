import { assertJsonValueEqual } from "../data-boundary/json-value-equality.test-support.ts";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CheckResult } from "../check/check.ts";
import type { CoreSnapshot } from "../check-settlement/facts.ts";
import { createCoreCheckSession } from "../check-settlement/session.ts";
import { aggregateEffectiveChecks } from "./aggregation.ts";
import type { CheckAggregate } from "./controls/contract.ts";

describe("effective Check aggregation", () => {
  it("passes only nonempty all-passed effective facts by default", () => {
    const cases: readonly {
      readonly outcomes: readonly CheckResult[];
      readonly expected: CheckAggregate;
    }[] = [
      { outcomes: [{ status: "passed", data: {} }], expected: "passed" },
      { outcomes: [], expected: "failed" },
      { outcomes: [{ status: "failed", data: {} }], expected: "failed" },
      { outcomes: [{ status: "not-applicable" }], expected: "failed" },
      {
        outcomes: [{ status: "unavailable", reason: { code: "declared-unavailable" } }],
        expected: "failed"
      },
      {
        outcomes: [
          { status: "passed", data: {} },
          { status: "failed", data: {} }
        ],
        expected: "failed"
      }
    ];
    for (const { outcomes, expected } of cases) {
      const snapshot = settledSnapshot(outcomes);
      const effectiveCheckIds = snapshot.checks.map((check) => check.checkId);
      assert.equal(aggregateEffectiveChecks(snapshot, effectiveCheckIds, undefined), expected);
    }
  });

  it("accepts every custom aggregate over frozen canonical effective facts", () => {
    const snapshot = settledSnapshot([
      { status: "passed", data: { count: 1 } },
      { status: "failed", data: { count: 0 } },
      { status: "not-applicable" },
      { status: "unavailable", reason: { code: "declared-unavailable" } }
    ]);
    const effectiveCheckIds = ["passed-0", "not-applicable-2", "failed-1"];
    let callbackCalls = 0;
    for (const expected of ["passed", "failed", "not-applicable", "unavailable"] as const) {
      const aggregate = aggregateEffectiveChecks(snapshot, effectiveCheckIds, (checks) => {
        callbackCalls += 1;
        assert.equal(Object.isFrozen(checks), true);
        assert.deepEqual(
          checks.map((check) => check.checkId),
          ["failed-1", "not-applicable-2", "passed-0"]
        );
        assert.strictEqual(checks[0], snapshot.checks[0]);
        assert.strictEqual(checks[1], snapshot.checks[1]);
        assert.strictEqual(checks[2], snapshot.checks[2]);
        assertJsonValueEqual(
          checks.map((check) => check.outcome),
          [
            { status: "failed", data: { count: 0 } },
            { status: "not-applicable" },
            { status: "passed", data: { count: 1 } }
          ]
        );
        return expected;
      });
      assert.equal(aggregate, expected);
    }
    assert.equal(callbackCalls, 4);
  });
});

function settledSnapshot(outcomes: readonly CheckResult[]): CoreSnapshot {
  const checks = outcomes.map((outcome, index) => ({
    checkId: `${outcome.status}-${index}`,
    outcome
  }));
  const session = createCoreCheckSession(
    checks.map(({ checkId }) => ({ definition: { checkId, displayName: checkId } }))
  );
  for (const { checkId, outcome } of checks) {
    const scope = session.openCheckScope(checkId);
    assert.equal(scope.settle(outcome).authorResultAccepted, true);
  }
  return session.freeze();
}
