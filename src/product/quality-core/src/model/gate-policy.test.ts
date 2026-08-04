import { describe, expect, test } from "bun:test";

import {
  GATE_NOT_EVALUATED_REASON_CODES,
  GATE_POLICY_DESCRIPTORS,
  GATE_POLICY_HELP,
  GATE_POLICY_VALUES,
  GATE_RESULT_STATUSES,
  createEmptyMetrics,
  type GateNotEvaluatedReasonCode,
  type GateResult,
  type QualityMetrics,
  type WarningRecord,
  validateMetrics,
} from "../index.ts";

describe("gate policy descriptor", () => {
  test("derives closed policy values, help, channels, and prerequisites from one descriptor", () => {
    expect(GATE_POLICY_DESCRIPTORS).toEqual([
      {
        evaluatedChannel: "all",
        help: "Evaluate all warnings produced by the resolved scan profile.",
        requiresComparison: false,
        value: "all",
      },
      {
        evaluatedChannel: "changed",
        help: "Evaluate warnings associated with changed code.",
        requiresComparison: true,
        value: "changed",
      },
      {
        evaluatedChannel: "regressions",
        help: "Evaluate changed warnings that regress from the baseline.",
        requiresComparison: true,
        value: "regressions",
      },
    ]);
    expect(GATE_POLICY_VALUES).toEqual(["all", "changed", "regressions"]);
    expect(GATE_POLICY_HELP).toEqual([
      "all: Evaluate all warnings produced by the resolved scan profile.",
      "changed: Evaluate warnings associated with changed code.",
      "regressions: Evaluate changed warnings that regress from the baseline.",
    ]);
  });
});

describe("GateResult model", () => {
  test("exposes the closed not-evaluated reasons", () => {
    expect(GATE_NOT_EVALUATED_REASON_CODES).toEqual([
      "scan-incomplete",
      "no-eligible-input",
      "comparison-unavailable",
    ]);
  });

  test("exposes closed reason and status types", () => {
    const reasonCode: GateNotEvaluatedReasonCode = "scan-incomplete";
    const status: (typeof GATE_RESULT_STATUSES)[number] = "not-evaluated";

    // @ts-expect-error Not-evaluated reason codes are a closed domain.
    const invalidReasonCode: GateNotEvaluatedReasonCode = "unknown";
    // @ts-expect-error Gate result statuses are a closed domain.
    const invalidStatus: (typeof GATE_RESULT_STATUSES)[number] = "unknown";

    expect({ reasonCode, status }).toEqual({
      reasonCode: "scan-incomplete",
      status: "not-evaluated",
    });
    expect({ invalidReasonCode, invalidStatus }).toEqual({
      invalidReasonCode: "unknown",
      invalidStatus: "unknown",
    });
  });
});

describe("GateResult validation", () => {
  test("accepts the disabled shape produced by empty metrics", () => {
    const metrics = createValidMetrics();

    expect(metrics.gate).toEqual({ policy: null, status: "disabled" });
    expect(validateMetrics(metrics)).toEqual({ errors: [], valid: true });
  });

  test("accepts evaluated and not-evaluated shapes", () => {
    const passed = createValidMetrics();
    passed.warnings.all = [TEST_WARNING];
    passed.gate = {
      blockingWarningCount: 0,
      blockingWarnings: [],
      evaluatedChannel: "all",
      evaluatedWarningCount: 1,
      policy: "all",
      status: "passed",
    };

    const failed = createValidMetrics();
    failed.comparisonStatus = "compared";
    failed.warnings.changed = [TEST_WARNING];
    failed.gate = {
      blockingWarningCount: 1,
      blockingWarnings: [TEST_WARNING],
      evaluatedChannel: "changed",
      evaluatedWarningCount: 1,
      policy: "changed",
      status: "failed",
    };

    const notEvaluatedResults = GATE_NOT_EVALUATED_REASON_CODES.map(
      (reasonCode): GateResult => ({
        policy: reasonCode === "comparison-unavailable" ? "regressions" : "all",
        reasonCode,
        status: "not-evaluated",
      }),
    );

    expect(validateMetrics(passed)).toEqual({ errors: [], valid: true });
    expect(validateMetrics(failed)).toEqual({ errors: [], valid: true });
    for (const gate of notEvaluatedResults) {
      const metrics = createValidMetrics();
      metrics.gate = gate;
      expect(validateMetrics(metrics)).toEqual({ errors: [], valid: true });
    }
  });

  test("rejects invalid GateResult shapes with path-aware errors", () => {
    for (const invalidCase of invalidCases) {
      const metrics = createValidMetrics();
      invalidCase.prepare?.(metrics);
      metrics.gate = invalidCase.gate as GateResult;

      const validation = validateMetrics(metrics);

      expect({
        case: invalidCase.name,
        valid: validation.valid,
      }).toEqual({
        case: invalidCase.name,
        valid: false,
      });
      expect({
        case: invalidCase.name,
        hasExpectedPath: validation.errors.some((error) =>
          error.includes(invalidCase.expectedPath),
        ),
      }).toEqual({
        case: invalidCase.name,
        hasExpectedPath: true,
      });
    }
  });
});

function createValidMetrics(): QualityMetrics {
  return createEmptyMetrics({
    commitSha: "test",
    configVersion: "quality-observability-v1",
    repository: "/repo",
    scope: {
      excludeDirs: [],
      generatedFiles: [],
      include: [],
    },
    tools: [],
  });
}

const TEST_WARNING: WarningRecord = {
  baselineValue: null,
  codeArea: "test",
  comparisonBasis: "absolute",
  deltaValue: null,
  isChanged: false,
  level: "warning",
  line: null,
  message: "test warning",
  metric: "test",
  path: "test.ts",
  ruleId: "test-warning",
  sourceTool: "test",
  value: 1,
};
const invalidCases: ReadonlyArray<{
  expectedPath: string;
  gate: unknown;
  name: string;
  prepare?: (metrics: QualityMetrics) => void;
}> = [
  {
    expectedPath: "gate",
    gate: undefined,
    name: "missing gate result",
  },
  {
    expectedPath: "gate.status",
    gate: { policy: null, status: "unknown" },
    name: "unknown status",
  },
  {
    expectedPath: "gate.policy",
    gate: {
      policy: "unknown",
      reasonCode: "scan-incomplete",
      status: "not-evaluated",
    },
    name: "unknown policy",
  },
  {
    expectedPath: "gate.policy",
    gate: { policy: "all", status: "disabled" },
    name: "non-null disabled policy",
  },
  {
    expectedPath: "gate.reasonCode",
    gate: { policy: "all", reasonCode: "unknown", status: "not-evaluated" },
    name: "unknown not-evaluated reason",
  },
  {
    expectedPath: "gate.reasonCode",
    gate: { policy: "all", status: "not-evaluated" },
    name: "missing not-evaluated reason",
  },
  {
    expectedPath: "gate.evaluatedChannel",
    gate: {
      blockingWarningCount: 0,
      blockingWarnings: [],
      evaluatedChannel: "unknown",
      evaluatedWarningCount: 0,
      policy: "all",
      status: "passed",
    },
    name: "unknown evaluated channel",
  },
  {
    expectedPath: "gate.evaluatedChannel",
    gate: {
      blockingWarningCount: 0,
      blockingWarnings: [],
      evaluatedChannel: "changed",
      evaluatedWarningCount: 0,
      policy: "all",
      status: "passed",
    },
    name: "policy and channel mismatch",
  },
  {
    expectedPath: "gate.evaluatedWarningCount",
    gate: {
      blockingWarningCount: 0,
      blockingWarnings: [],
      evaluatedChannel: "all",
      evaluatedWarningCount: -1,
      policy: "all",
      status: "passed",
    },
    name: "negative evaluated count",
  },
  {
    expectedPath: "gate.blockingWarningCount",
    gate: {
      blockingWarningCount: 0.5,
      blockingWarnings: [],
      evaluatedChannel: "all",
      evaluatedWarningCount: 0,
      policy: "all",
      status: "failed",
    },
    name: "non-integer blocking count",
  },
  {
    expectedPath: "gate.evaluatedWarningCount",
    gate: {
      blockingWarningCount: 0,
      blockingWarnings: [],
      evaluatedChannel: "all",
      evaluatedWarningCount: 0,
      policy: "all",
      status: "passed",
    },
    name: "evaluated count and selected channel length mismatch",
    prepare(metrics) {
      metrics.warnings.all = [TEST_WARNING];
    },
  },
  {
    expectedPath: "gate.blockingWarningCount",
    gate: {
      blockingWarningCount: 1,
      blockingWarnings: [],
      evaluatedChannel: "all",
      evaluatedWarningCount: 0,
      policy: "all",
      status: "failed",
    },
    name: "blocking count and list length mismatch",
  },
  {
    expectedPath: "gate.blockingWarningCount",
    gate: {
      blockingWarningCount: 1,
      blockingWarnings: [TEST_WARNING],
      evaluatedChannel: "all",
      evaluatedWarningCount: 1,
      policy: "all",
      status: "passed",
    },
    name: "passed status with blocking warnings",
    prepare(metrics) {
      metrics.warnings.all = [TEST_WARNING];
    },
  },
  {
    expectedPath: "gate.blockingWarningCount",
    gate: {
      blockingWarningCount: 0,
      blockingWarnings: [],
      evaluatedChannel: "all",
      evaluatedWarningCount: 0,
      policy: "all",
      status: "failed",
    },
    name: "failed status without blocking warnings",
  },
  {
    expectedPath: "gate.reasonCode",
    gate: { policy: null, reasonCode: "scan-incomplete", status: "disabled" },
    name: "field owned by another status",
  },
  {
    expectedPath: "gate.blockingWarnings",
    gate: {
      blockingWarningCount: 0,
      evaluatedChannel: "all",
      evaluatedWarningCount: 0,
      policy: "all",
      status: "passed",
    },
    name: "missing evaluated field",
  },
];
