import { strict as assert } from "node:assert";

import {
  validateMachineArtifactSetV1,
  validateMachineWarningStreamV1,
  type MachineMetricsV1
} from "../../../../machine-output.ts";
import type {
  MetricsByteFailureCase,
  WarningByteFailureCase
} from "./validation-byte-failure.fixtures.ts";
import {
  artifactBytes,
  expectFailure
} from "./validation.fixtures.ts";

interface MetricsFailureAssertionsOptions {
  readonly metrics: MachineMetricsV1;
  readonly testCases: readonly MetricsByteFailureCase[];
}

export function assertMetricsByteFailures(
  options: MetricsFailureAssertionsOptions
): void {
  const { metrics, testCases } = options;
  for (const testCase of testCases) {
    const result = validateMachineArtifactSetV1({
      ...artifactBytes(metrics),
      metricsJson: testCase.bytes
    });
    const diagnostic = expectFailure(result);
    assert.equal(diagnostic.logicalArtifact, "metrics.json");
    assert.equal(diagnostic.category, testCase.category);
    assert.equal(diagnostic.pointer, testCase.pointer);
    assert.ok(diagnostic.message.length > 0);
  }
}

export function assertWarningByteFailures(
  testCases: readonly WarningByteFailureCase[]
): void {
  for (const testCase of testCases) {
    const result = validateMachineWarningStreamV1(
      testCase.bytes,
      "consumer-warnings.ndjson"
    );
    const diagnostic = expectFailure(result);
    assert.equal(Object.hasOwn(result, "value"), false);
    assert.equal(diagnostic.logicalArtifact, "consumer-warnings.ndjson");
    assert.equal(diagnostic.category, testCase.category);
    assert.equal(diagnostic.index, testCase.index);
    assert.equal(diagnostic.line, testCase.line);
    assert.equal(diagnostic.pointer, testCase.pointer);
    assert.ok(diagnostic.message.length > 0);
  }
}
