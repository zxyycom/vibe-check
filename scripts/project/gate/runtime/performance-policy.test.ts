import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createScopedProjectGateSelection } from "./controls.ts";

import {
  preflightPerformancePolicy,
  PROJECT_GATE_PERFORMANCE_POLICY
} from "./performance-policy.ts";

describe("Project Gate performance policy", () => {
  it("preflights complete standard policies and rejects malformed budgets before use", () => {
    const policy = PROJECT_GATE_PERFORMANCE_POLICY;
    const invalidPolicies: unknown[] = [
      null,
      {},
      { ...policy, changed: undefined },
      { ...policy, runtime: { platform: "linux" } },
      { ...policy, fast: { ...policy.fast, declarativeFingerprint: "a".repeat(64) } },
      { ...policy, all: { maxElapsedMs: 135, maxMeanCheckMs: 2000 } }
    ];
    for (const profile of ["fast", "changed", "all"] as const) {
      for (const field of ["maxElapsedMs", "maxMeanCheckMs", "maxP95CheckMs"] as const) {
        for (const limit of [
          0,
          -1,
          0.1,
          "135",
          Number.NaN,
          Number.POSITIVE_INFINITY,
          Number.MAX_SAFE_INTEGER + 1
        ]) {
          invalidPolicies.push({
            ...policy,
            [profile]: { ...policy[profile], [field]: limit }
          });
        }
      }
    }

    const errors: string[] = [];
    const originalError = console.error;
    console.error = (message: unknown) => errors.push(String(message));
    try {
      for (const profile of ["fast", "changed", "all"] as const) {
        assert.equal(
          preflightPerformancePolicy({ kind: profile }, () => policy),
          policy
        );
        assert.equal(errors.length, 0);
        for (const invalidPolicy of invalidPolicies) {
          assert.equal(
            preflightPerformancePolicy({ kind: profile }, () => invalidPolicy),
            undefined
          );
          assert.deepEqual(errors.splice(0), [
            "project gate performance policy is invalid: repair runtime/performance-policy.ts"
          ]);
        }
        assert.equal(
          preflightPerformancePolicy({ kind: profile }, () => {
            throw new Error("fixture policy unavailable");
          }),
          undefined
        );
        assert.deepEqual(errors.splice(0), ["project gate performance policy could not be loaded"]);
      }
      assert.equal(
        preflightPerformancePolicy({ kind: "focused", presets: ["typecheck"] }, () => {
          throw new Error("focused must not load policy");
        }),
        policy
      );
      assert.equal(errors.length, 0);
      assert.equal(
        preflightPerformancePolicy(createScopedProjectGateSelection(["project-tests"]), () => {
          throw new Error("scoped must not load a standard-profile budget");
        }),
        policy
      );
    } finally {
      console.error = originalError;
    }
  });
});
