import { describe, expect, test } from "bun:test";

import {
  classifyFiles,
  createEmptyMetrics,
  generateWarningChannels,
  qualityCheckStatus,
  qualityVerificationStatus,
  type QualityMetrics,
  type ScanCompleteness,
  type WarningRecord,
  validateMetrics
} from "../src/index.ts";
import { TEST_QUALITY_CONFIG as config } from "./config.ts";

describe("script quality core", () => {
  test("classifies files using caller-provided code areas", () => {
    const fileMap = classifyFiles(["scripts/a.ts", "scripts/a.test.ts"], config.codeAreas, config.generatedFiles);

    expect(fileMap.get("typescript-production-scripts")).toEqual(["scripts/a.ts"]);
  });

  test("rejects a metrics envelope without metadata", () => {
    const validation = validateMetrics({});

    expect(validation.valid).toBe(false);
    expect(validation.errors.includes("metrics.metadata is required")).toBe(true);
  });

  test("rejects missing and malformed scan completeness", () => {
    const missing = createValidMetrics();
    delete (missing as Partial<typeof missing>).scanCompleteness;

    const malformed = createValidMetrics();
    (malformed.scanCompleteness.capabilities[0] as { status: string }).status = "unknown";

    expect(validateMetrics(missing).errors.includes("scanCompleteness is required")).toBe(true);
    expect(
      validateMetrics(malformed).errors.some((error) =>
        error.includes("scanCompleteness.capabilities[0].status")
      )
    ).toBe(true);
  });

  test("rejects unknown, duplicate, and missing capability IDs", () => {
    const metrics = createValidMetrics();
    metrics.scanCompleteness.capabilities = [
      { capabilityId: "file-metrics", status: "skipped" },
      { capabilityId: "file-metrics", status: "skipped" },
      {
        capabilityId: "unknown-capability",
        status: "skipped"
      }
    ] as typeof metrics.scanCompleteness.capabilities;

    const validation = validateMetrics(metrics);

    expect(validation.errors.some((error) => error.includes("duplicate capability ID"))).toBe(true);
    expect(validation.errors.some((error) => error.includes("unknown capability ID"))).toBe(true);
    expect(validation.errors.some((error) => error.includes("missing capability ID"))).toBe(true);
  });

  test("rejects failed capability results without actionable diagnostics", () => {
    const metrics = createValidMetrics();
    metrics.scanCompleteness.capabilities[0] = {
      capabilityId: "file-metrics",
      diagnostic: {
        kind: "unknown-failure",
        message: "",
        action: ""
      },
      status: "failed"
    } as unknown as typeof metrics.scanCompleteness.capabilities[number];
    metrics.scanCompleteness.overall = "failed";

    const validation = validateMetrics(metrics);

    expect(
      validation.errors.some((error) =>
        error.includes("scanCompleteness.capabilities[0].diagnostic.kind")
      )
    ).toBe(true);
    expect(
      validation.errors.some((error) =>
        error.includes("scanCompleteness.capabilities[0].diagnostic.message")
      )
    ).toBe(true);
    expect(
      validation.errors.some((error) =>
        error.includes("scanCompleteness.capabilities[0].diagnostic.action")
      )
    ).toBe(true);
  });

  test("accepts capability results in any order with additional diagnostic metadata", () => {
    const metrics = createValidMetrics();
    metrics.scanCompleteness = {
      capabilities: [
        { capabilityId: "function-metrics", status: "succeeded" },
        { capabilityId: "duplicate-detection", status: "skipped" },
        {
          capabilityId: "file-metrics",
          diagnostic: {
            action: "Configure tools.scc",
            component: "scc",
            kind: "unavailable",
            message: "scc was not found"
          },
          status: "failed"
        }
      ],
      overall: "failed"
    } as unknown as typeof metrics.scanCompleteness;

    expect(validateMetrics(metrics)).toEqual({ valid: true, errors: [] });
  });

  test("rejects an overall completeness inconsistent with capability results", () => {
    const metrics = createValidMetrics();
    metrics.scanCompleteness.overall = "complete";

    expect(
      validateMetrics(metrics).errors.includes(
        'scanCompleteness.overall: expected "empty" from capability results, got "complete"'
      )
    ).toBe(true);
  });

  const statusCases = [
    ["failed", false, "failed"],
    ["empty", false, "warning"],
    ["complete", true, "warning"],
    ["complete", false, "passed"]
  ] as const;
  test("maps completeness and warning combinations to quality check status", () => {
    for (const [overall, hasWarnings, expected] of statusCases) {
      const metrics = createMetricsForOutcome(overall);
      metrics.warnings.all = hasWarnings ? [TEST_WARNING] : [];

      expect({
        hasWarnings,
        overall,
        status: qualityCheckStatus(metrics)
      }).toEqual({ hasWarnings, overall, status: expected });
    }
  });

  test("maps completeness and warning combinations to verification status", () => {
    for (const [overall, hasWarnings, expected] of statusCases) {
      const metrics = createMetricsForOutcome(overall);
      metrics.warnings.all = hasWarnings ? [TEST_WARNING] : [];

      expect({
        hasWarnings,
        overall,
        status: qualityVerificationStatus(metrics)
      }).toEqual({ hasWarnings, overall, status: expected });
    }
  });

  test("accepted warnings pass verification while the quality check remains a warning", () => {
    const metrics = createMetricsForOutcome("complete");
    metrics.warnings.all = [{ ...TEST_WARNING, acceptedReason: "Reviewed for this change" }];

    expect(qualityVerificationStatus(metrics)).toBe("passed");
    expect(qualityCheckStatus(metrics)).toBe("warning");
  });

  test("generates warning channels from caller-provided thresholds", () => {
    const warnings = generateWarningChannels({
      files: [
        {
          codeArea: "typescript-production-scripts",
          codeLines: 301,
          decisionTokens: { source: "scc", value: 11 },
          isChanged: true,
          language: "TypeScript",
          lines: 320,
          path: "scripts/a.ts"
        }
      ],
      functions: [],
      duplicates: [],
      config,
      scope: { changed: true, changedFiles: ["scripts/a.ts"] },
      baseline: null,
      comparisonStatus: "baseline-unavailable",
      validateAcceptedWarnings: false
    });

    expect(warnings.all.map((warning) => [
      warning.ruleId,
      warning.codeArea,
      warning.path,
      warning.value
    ])).toEqual([[
      "scc-file-code-lines",
      "typescript-production-scripts",
      "scripts/a.ts",
      301
    ]]);
    expect(warnings.changed).toHaveLength(0);
  });
});

function createValidMetrics() {
  return createEmptyMetrics({
    repository: "/repo",
    commitSha: "test",
    configVersion: "quality-observability-v1",
    tools: [],
    scope: {
      include: [],
      excludeDirs: [],
      generatedFiles: []
    }
  });
}

function createMetricsForOutcome(overall: ScanCompleteness): QualityMetrics {
  const metrics = createValidMetrics();
  if (overall === "complete") {
    metrics.scanCompleteness.capabilities[0] = {
      capabilityId: "file-metrics",
      status: "succeeded"
    };
  } else if (overall === "failed") {
    metrics.scanCompleteness.capabilities[0] = {
      capabilityId: "file-metrics",
      diagnostic: {
        action: "Configure tools.scc",
        kind: "unavailable",
        message: "scc was not found"
      },
      status: "failed"
    };
  }
  metrics.scanCompleteness.overall = overall;
  return metrics;
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
  value: 1
};
