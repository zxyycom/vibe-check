import { strict as assert } from "node:assert";
import { isAbsolute, resolve } from "node:path";

import type { MachineMetricsV1 } from "./machine-output.ts";

export function assertCurrentProjectionBaseline(
  metrics: MachineMetricsV1,
  projectRoot: string
): void {
  assertMetricsEnvelope(metrics, projectRoot);
  assertBaselineProjection(metrics);
  assertCurrentFingerprints(metrics);
  assertScanCompleteness(metrics);
  assertAggregates(metrics);
  assertMeasurements(metrics);
  assertWarnings(metrics);
  assertSerializedFields(metrics.gate, ["policy", "status"]);
}

function assertMetricsEnvelope(
  metrics: MachineMetricsV1,
  projectRoot: string
): void {
  assertSerializedFields(
    metrics,
    [
      "aggregates", "baseline", "comparisonStatus", "currentFingerprints",
      "duplicateCode", "fileMetrics", "functionMetrics", "gate", "metadata",
      "scanCompleteness", "trends", "warnings"
    ],
    ["baselineFingerprints"]
  );
  assertSerializedFields(
    metrics.metadata,
    [
      "commitSha", "commitTitle", "configVersion", "repository",
      "schemaVersion", "scope", "timestamp", "tools"
    ],
    ["commitDate"]
  );
  assert.equal(metrics.metadata.schemaVersion, "vibe-check.metrics.v1");
  assert.match(
    metrics.metadata.timestamp,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
  );
  assert.equal(metrics.metadata.repository, resolve(projectRoot));
  assert.equal(isAbsolute(metrics.metadata.repository), true);
  assert.equal(resolve(metrics.metadata.repository), metrics.metadata.repository);
  assertSerializedFields(
    metrics.metadata.scope,
    ["excludeDirs", "generatedFiles", "include"]
  );
  for (const tool of metrics.metadata.tools) {
    assertSerializedFields(tool, ["name", "source", "version"]);
  }
}

function assertBaselineProjection(metrics: MachineMetricsV1): void {
  assertSerializedFields(
    metrics.baseline,
    ["commitDate", "commitSha", "metadata", "status"]
  );
  assert.deepEqual(metrics.baseline, {
    commitDate: null,
    commitSha: null,
    metadata: null,
    status: "baseline-skipped"
  });
  assert.equal(Object.hasOwn(metrics, "baselineFingerprints"), false);
  assert.equal(metrics.comparisonStatus, "baseline-unavailable");
}

function assertCurrentFingerprints(metrics: MachineMetricsV1): void {
  for (const fingerprint of Object.values(metrics.currentFingerprints)) {
    assertSerializedFields(fingerprint, ["fileCount", "fileList", "fingerprint"]);
    for (const path of fingerprint.fileList) assertProjectRelativePath(path);
  }
}

function assertScanCompleteness(metrics: MachineMetricsV1): void {
  assertSerializedFields(metrics.scanCompleteness, ["capabilities", "overall"]);
  assert.ok(
    ["complete", "empty", "failed"].includes(metrics.scanCompleteness.overall)
  );
  assert.deepEqual(
    metrics.scanCompleteness.capabilities
      .map(({ capabilityId }) => capabilityId)
      .sort(),
    ["duplicate-detection", "file-metrics", "function-metrics"]
  );
  for (const capability of metrics.scanCompleteness.capabilities) {
    assertSerializedFields(
      capability,
      ["capabilityId", "status"],
      capability.status === "failed" ? ["diagnostic"] : []
    );
    assert.ok(
      ["skipped", "no-input", "succeeded", "failed"].includes(capability.status)
    );
    if (capability.status === "failed") {
      assertSerializedFields(capability.diagnostic, ["action", "kind", "message"]);
    }
  }
}

function assertAggregates(metrics: MachineMetricsV1): void {
  assertSerializedFields(
    metrics.aggregates,
    ["byCodeArea", "byLanguage", "overall"]
  );
  for (const aggregate of metrics.aggregates.byLanguage) {
    assertSerializedFields(
      aggregate,
      ["blankLines", "codeLines", "commentLines", "files", "language", "lines"],
      ["comments"]
    );
  }
  for (const aggregate of metrics.aggregates.byCodeArea) {
    assertSerializedFields(
      aggregate,
      ["codeArea", "files", "functions", "lines", "warningPolicy"],
      [
        "codeLines", "cyclomaticComplexity", "duplicateFragments",
        "fileDecisionTokens", "functionLines", "parameterCount"
      ]
    );
  }
  assertSerializedFields(
    metrics.aggregates.overall,
    ["totalCodeLines", "totalFiles", "totalFunctions", "totalLines"],
    [
      "totalDuplicateFragments", "totalFileDecisionTokens",
      "totalFunctionCyclomaticComplexity", "totalFunctionLines",
      "totalFunctionParameters"
    ]
  );
}

function assertMeasurements(metrics: MachineMetricsV1): void {
  for (const metric of metrics.fileMetrics) {
    assertSerializedFields(
      metric,
      ["codeArea", "decisionTokens", "isChanged", "language", "lines", "path"],
      ["blankLines", "codeLines", "commentLines"]
    );
    assertSerializedFields(metric.decisionTokens, ["source", "value"]);
    assertProjectRelativePath(metric.path);
  }
  for (const metric of metrics.functionMetrics) {
    assertSerializedFields(
      metric,
      [
        "codeArea", "cyclomaticComplexity", "endLine", "file", "isChanged",
        "lines", "name", "parameterCount", "startLine"
      ]
    );
    assertSerializedFields(metric.cyclomaticComplexity, ["source", "value"]);
    assertProjectRelativePath(metric.file);
  }
}

function assertWarnings(metrics: MachineMetricsV1): void {
  assertSerializedFields(metrics.warnings, ["all", "changed", "regressions"]);
  for (const warning of metrics.warnings.all) {
    assertSerializedFields(
      warning,
      [
        "baselineValue", "codeArea", "comparisonBasis", "deltaValue",
        "isChanged", "level", "line", "message", "metric", "path", "ruleId",
        "schemaVersion", "sourceTool", "value"
      ],
      ["acceptedReason", "suggestion"]
    );
    assert.ok(["info", "warning", "error"].includes(warning.level));
    assert.equal(warning.schemaVersion, "vibe-check.warning.v1");
    assertProjectRelativePath(warning.path);
  }
}

function assertSerializedFields(
  value: object,
  required: readonly string[],
  optional: readonly string[] = []
): void {
  assert.deepEqual(
    Object.keys(value).filter((field) => !optional.includes(field)).sort(),
    [...required].sort()
  );
}

function assertProjectRelativePath(path: string): void {
  assert.equal(isAbsolute(path), false);
  assert.doesNotMatch(path, /(?:^|\/)\.\.(?:\/|$)/);
  assert.doesNotMatch(path, /\\/);
}

export function assertWarningStreamBytes(
  input: string,
  expected: readonly unknown[]
): void {
  assert.equal(
    input,
    expected.length === 0
      ? ""
      : `${expected.map((warning) => JSON.stringify(warning)).join("\n")}\n`
  );
}
