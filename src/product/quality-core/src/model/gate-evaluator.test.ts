import { describe, expect, test } from "bun:test";

import { evaluateGate } from "./gate-evaluator.ts";
import type { ScanCompleteness } from "./scan-completeness.ts";
import type {
  ComparisonStatus,
  GatePolicy,
  WarningChannels,
  WarningRecord
} from "./schema.ts";

describe("gate evaluator prerequisites", () => {
  test("applies the fixed disabled, completeness, and comparison priority", () => {
    const channels = createWarningChannels({
      regressions: [createWarning("regression")]
    });

    expect(
      evaluateGate(null, "failed", "baseline-unavailable", channels)
    ).toEqual({
      policy: null,
      status: "disabled"
    });

    const prerequisiteCases: ReadonlyArray<{
      comparisonStatus: ComparisonStatus;
      completeness: ScanCompleteness;
      reasonCode:
        | "scan-incomplete"
        | "no-eligible-input"
        | "comparison-unavailable";
    }> = [
      {
        comparisonStatus: "baseline-unavailable",
        completeness: "failed",
        reasonCode: "scan-incomplete"
      },
      {
        comparisonStatus: "baseline-unavailable",
        completeness: "empty",
        reasonCode: "no-eligible-input"
      },
      {
        comparisonStatus: "baseline-unavailable",
        completeness: "complete",
        reasonCode: "comparison-unavailable"
      }
    ];

    for (const testCase of prerequisiteCases) {
      expect(
        evaluateGate(
          "regressions",
          testCase.completeness,
          testCase.comparisonStatus,
          channels
        )
      ).toEqual({
        policy: "regressions",
        reasonCode: testCase.reasonCode,
        status: "not-evaluated"
      });
    }
  });

  test("does not make comparison evidence a prerequisite for the all policy", () => {
    const warning = createWarning("all-warning");
    const channels = createWarningChannels({ all: [warning] });

    const result = evaluateGate(
      "all",
      "complete",
      "baseline-unavailable",
      channels
    );

    expect(result).toEqual({
      blockingWarningCount: 1,
      blockingWarnings: [warning],
      evaluatedChannel: "all",
      evaluatedWarningCount: 1,
      policy: "all",
      status: "failed"
    });
    expect(result.status === "failed" && result.blockingWarnings[0]).toBe(
      warning
    );
  });
});

describe("gate evaluator warning selection", () => {
  test("selects the descriptor-owned all, changed, and regressions channels", () => {
    const allWarning = createWarning("all-warning");
    const changedWarning = createWarning("changed-warning");
    const regressionWarning = createWarning("regression-warning");
    const channels = createWarningChannels({
      all: [allWarning],
      changed: [changedWarning],
      regressions: [regressionWarning]
    });
    const policyCases: ReadonlyArray<{
      comparisonStatus: ComparisonStatus;
      expectedChannel: keyof WarningChannels;
      expectedWarning: WarningRecord;
      policy: GatePolicy;
    }> = [
      {
        comparisonStatus: "baseline-unavailable",
        expectedChannel: "all",
        expectedWarning: allWarning,
        policy: "all"
      },
      {
        comparisonStatus: "compared",
        expectedChannel: "changed",
        expectedWarning: changedWarning,
        policy: "changed"
      },
      {
        comparisonStatus: "compared",
        expectedChannel: "regressions",
        expectedWarning: regressionWarning,
        policy: "regressions"
      }
    ];

    for (const testCase of policyCases) {
      const result = evaluateGate(
        testCase.policy,
        "complete",
        testCase.comparisonStatus,
        channels
      );

      expect(result.status).toBe("failed");
      if (result.status !== "failed") {
        throw new Error(`Expected ${testCase.policy} gate to fail.`);
      }
      expect(result.evaluatedChannel).toBe(testCase.expectedChannel);
      expect(result.evaluatedWarningCount).toBe(1);
      expect(result.blockingWarningCount).toBe(1);
      expect(result.blockingWarnings).toHaveLength(1);
      expect(result.blockingWarnings[0]).toBe(testCase.expectedWarning);
    }
  });

  test("treats input-unchanged as valid evidence for comparison policies", () => {
    const channels = createWarningChannels({
      all: [createWarning("unselected-warning")]
    });

    for (const policy of ["changed", "regressions"] as const) {
      expect(
        evaluateGate(policy, "complete", "input-unchanged", channels)
      ).toEqual({
        blockingWarningCount: 0,
        blockingWarnings: [],
        evaluatedChannel: policy,
        evaluatedWarningCount: 0,
        policy,
        status: "passed"
      });
    }
  });

  test("counts accepted-only warnings as evaluated but not blocking", () => {
    const firstAccepted = createWarning(
      "first-accepted",
      "Accepted during migration."
    );
    const secondAccepted = createWarning(
      "second-accepted",
      "Accepted by the owning team."
    );
    const channels = createWarningChannels({
      all: [firstAccepted, secondAccepted]
    });

    const result = evaluateGate("all", "complete", "compared", channels);

    expect(result).toEqual({
      blockingWarningCount: 0,
      blockingWarnings: [],
      evaluatedChannel: "all",
      evaluatedWarningCount: 2,
      policy: "all",
      status: "passed"
    });
    expect(channels.all).toEqual([firstAccepted, secondAccepted]);
    expect(channels.all[0]).toBe(firstAccepted);
    expect(channels.all[1]).toBe(secondAccepted);
  });

  test("preserves mixed warning identity, order, channels, and input data", () => {
    const firstBlocking = createWarning("first-blocking");
    const accepted = createWarning("accepted", "Accepted with evidence.");
    const secondBlocking = createWarning("second-blocking");
    const channels = createWarningChannels({
      all: [createWarning("unselected-all")],
      changed: [firstBlocking, accepted, secondBlocking],
      regressions: [createWarning("unselected-regression")]
    });
    const channelReferences = {
      all: channels.all,
      changed: channels.changed,
      regressions: channels.regressions
    };
    const inputSnapshot = structuredClone(channels);
    freezeWarningChannels(channels);

    const result = evaluateGate("changed", "complete", "compared", channels);

    expect(result.status).toBe("failed");
    if (result.status !== "failed") {
      throw new Error("Expected the mixed changed gate to fail.");
    }
    expect(result.evaluatedWarningCount).toBe(3);
    expect(result.blockingWarningCount).toBe(2);
    expect(result.blockingWarnings).toEqual([
      firstBlocking,
      secondBlocking
    ]);
    expect(result.blockingWarnings[0]).toBe(firstBlocking);
    expect(result.blockingWarnings[1]).toBe(secondBlocking);
    expect(channels).toEqual(inputSnapshot);
    expect(channels.all).toBe(channelReferences.all);
    expect(channels.changed).toBe(channelReferences.changed);
    expect(channels.regressions).toBe(channelReferences.regressions);
    expect(channels.changed[0]).toBe(firstBlocking);
    expect(channels.changed[1]).toBe(accepted);
    expect(channels.changed[2]).toBe(secondBlocking);
  });
});

function createWarningChannels(
  channels: Partial<WarningChannels> = {}
): WarningChannels {
  return {
    all: channels.all ?? [],
    changed: channels.changed ?? [],
    regressions: channels.regressions ?? []
  };
}

function createWarning(
  ruleId: string,
  acceptedReason?: string
): WarningRecord {
  return {
    ...(acceptedReason === undefined ? {} : { acceptedReason }),
    baselineValue: null,
    codeArea: "test",
    comparisonBasis: "absolute",
    deltaValue: null,
    isChanged: true,
    level: "warning",
    line: null,
    message: `${ruleId} message`,
    metric: "test",
    path: `${ruleId}.ts`,
    ruleId,
    sourceTool: "test",
    value: 1
  };
}

function freezeWarningChannels(channels: WarningChannels): void {
  for (const warning of [
    ...channels.all,
    ...channels.changed,
    ...channels.regressions
  ]) {
    Object.freeze(warning);
  }
  Object.freeze(channels.all);
  Object.freeze(channels.changed);
  Object.freeze(channels.regressions);
  Object.freeze(channels);
}
