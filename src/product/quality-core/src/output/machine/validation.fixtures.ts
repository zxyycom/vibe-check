import { strict as assert } from "node:assert";

import {
  projectMachineMetricsV1,
  serializeMachineArtifactCandidatesV1,
  type MachineArtifactBytesV1,
  type MachineMetricsV1,
  type MachineValidationDiagnostic,
  type MachineValidationResult,
  type MachineWarningV1
} from "../../../../machine-output.ts";
import { createEmptyMetrics } from "../../model/schema.ts";

const encoder = new TextEncoder();

export function machineMetrics(
  warnings: MachineMetricsV1["warnings"]
): MachineMetricsV1 {
  const metrics = projectMachineMetricsV1(createEmptyMetrics({
    commitSha: "test-sha",
    configVersion: "test-config-v1",
    repository: "/workspace/example",
    scope: { excludeDirs: [], generatedFiles: [], include: ["src/**"] },
    tools: []
  }));
  metrics.metadata.timestamp = "2026-08-03T00:00:00.000Z";
  metrics.warnings = warnings;
  return metrics;
}

export function evaluatedMetrics(
  blocking: MachineWarningV1,
  whitespaceAccepted: MachineWarningV1,
  emptyReasonBlocking: MachineWarningV1
): MachineMetricsV1 {
  const changed = [blocking, whitespaceAccepted, emptyReasonBlocking];
  const metrics = machineMetrics({
    all: changed,
    changed,
    regressions: [emptyReasonBlocking]
  });
  metrics.scanCompleteness = {
    capabilities: [
      { capabilityId: "duplicate-detection", status: "skipped" },
      { capabilityId: "file-metrics", status: "succeeded" },
      { capabilityId: "function-metrics", status: "no-input" }
    ],
    overall: "complete"
  };
  metrics.gate = {
    blockingWarningCount: 2,
    blockingWarnings: [blocking, emptyReasonBlocking],
    evaluatedChannel: "changed",
    evaluatedWarningCount: changed.length,
    policy: "changed",
    status: "failed"
  };
  return metrics;
}

export function machineWarning(
  overrides: Partial<MachineWarningV1> = {}
): MachineWarningV1 {
  return {
    baselineValue: null,
    codeArea: "src",
    comparisonBasis: "value > 10",
    deltaValue: null,
    isChanged: true,
    level: "warning",
    line: 7,
    message: "Function exceeds the configured threshold.",
    metric: "function-lines",
    path: "src/example.ts",
    ruleId: "function-lines",
    schemaVersion: "vibe-check.warning.v1",
    sourceTool: "lizard",
    value: 12,
    ...overrides
  };
}

export function artifactBytes(metrics: MachineMetricsV1): MachineArtifactBytesV1 {
  const candidates = serializeMachineArtifactCandidatesV1(metrics);
  return {
    metricsJson: bytes(candidates.metricsJson),
    warningsAllNdjson: bytes(candidates.warningsAllNdjson),
    warningsNdjson: bytes(candidates.warningsNdjson)
  };
}

export function refreshArtifacts(
  metrics: MachineMetricsV1,
  artifacts: MachineArtifactBytesV1
): void {
  Object.assign(artifacts, artifactBytes(metrics));
}

export function bytes(source: string): Uint8Array {
  return encoder.encode(source);
}

export function concatBytes(left: Uint8Array, right: Uint8Array): Uint8Array {
  const result = new Uint8Array(left.byteLength + right.byteLength);
  result.set(left);
  result.set(right, left.byteLength);
  return result;
}

export function expectSuccess<T>(result: MachineValidationResult<T>): T {
  if (!result.ok) assert.fail(result.diagnostic.message);
  return result.value;
}

export function expectFailure<T>(
  result: MachineValidationResult<T>
): MachineValidationDiagnostic {
  if (result.ok) assert.fail("expected validation failure");
  return result.diagnostic;
}
