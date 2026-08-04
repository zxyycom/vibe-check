import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  serializeMachineArtifactCandidatesV1,
  validateMachineArtifactSetV1,
  validateMachineWarningStreamV1,
  type MachineMetricsV1,
  type MachineWarningV1
} from "../../../../machine-output.ts";
import {
  artifactBytes,
  bytes,
  evaluatedMetrics,
  expectFailure,
  expectSuccess,
  machineMetrics,
  machineWarning
} from "./validation.fixtures.ts";
import {
  invalidMetricsCases,
  invalidWarningCases
} from "./validation-byte-failure.fixtures.ts";
import {
  artifactSetFailureCases
} from "./validation-invariant-cases.fixtures.ts";
import {
  assertMetricsByteFailures,
  assertWarningByteFailures
} from "./validation.test-support.ts";

describe("machine output v1 validation", () => {
  it("accepts the positive byte grammar matrix", () => {
    const unicodeWarning = machineWarning({
      message: "复杂度过高",
      ruleId: "unicode-warning"
    });
    const metrics = machineMetrics({
      all: [unicodeWarning],
      changed: [unicodeWarning],
      regressions: []
    });
    const serialized = serializeMachineArtifactCandidatesV1(metrics);
    const reorderedMetrics = Object.fromEntries(
      Object.entries(metrics).reverse()
    );

    const metricsCases = [
      serialized.metricsJson,
      `\t\r\n ${JSON.stringify(reorderedMetrics)} \r\n`
    ];
    for (const metricsJson of metricsCases) {
      const result = validateMachineArtifactSetV1({
        ...artifactBytes(metrics),
        metricsJson: bytes(metricsJson)
      });
      assert.deepEqual(expectSuccess(result).metrics, metrics);
    }

    const reorderedWarning = Object.fromEntries(
      Object.entries(unicodeWarning).reverse()
    );
    const streamCases: Array<{
      expected: MachineWarningV1[];
      source: string;
    }> = [
      { expected: [], source: "" },
      {
        expected: [unicodeWarning],
        source: `${JSON.stringify(unicodeWarning)}\n`
      },
      {
        expected: [unicodeWarning, unicodeWarning],
        source:
          `${JSON.stringify(unicodeWarning)}\n` +
          `${JSON.stringify(unicodeWarning)}\n`
      },
      {
        expected: [unicodeWarning],
        source: `\t ${JSON.stringify(reorderedWarning)}\r\n`
      }
    ];
    for (const { expected, source } of streamCases) {
      const result = validateMachineWarningStreamV1(
        bytes(source),
        "warnings.ndjson"
      );
      assert.deepEqual(expectSuccess(result), expected);
    }
  });

  it("rejects the byte grammar and schema failure matrix without partial values", () => {
    const warning = machineWarning();
    const metrics = machineMetrics({
      all: [warning],
      changed: [warning],
      regressions: []
    });
    assertMetricsByteFailures({
      metrics,
      testCases: invalidMetricsCases({ metrics, warning })
    });
    assertWarningByteFailures(invalidWarningCases({ warning }));
  });

  it("accepts and rejects the complete artifact-set invariant matrices", () => {
    const blocking = machineWarning({ ruleId: "blocking" });
    const whitespaceAccepted = machineWarning({
      acceptedReason: "   ",
      ruleId: "whitespace-accepted"
    });
    const emptyReasonBlocking = machineWarning({
      acceptedReason: "",
      ruleId: "empty-reason-blocking"
    });
    const richMetrics = evaluatedMetrics(
      blocking,
      whitespaceAccepted,
      emptyReasonBlocking
    );

    const completenessCases: Array<MachineMetricsV1["scanCompleteness"]> = [
      richMetrics.scanCompleteness,
      {
        capabilities: richMetrics.scanCompleteness.capabilities.map((result) => ({
          capabilityId: result.capabilityId,
          status: "skipped" as const
        })),
        overall: "empty"
      },
      {
        capabilities: richMetrics.scanCompleteness.capabilities.map(
          (result, index) => index === 0
            ? {
              capabilityId: result.capabilityId,
              diagnostic: {
                action: "Restore the scanner.",
                kind: "execution" as const,
                message: "Scanner failed."
              },
              status: "failed" as const
            }
            : { capabilityId: result.capabilityId, status: "skipped" as const }
        ),
        overall: "failed"
      }
    ];
    for (const scanCompleteness of completenessCases) {
      const metrics = structuredClone(richMetrics);
      metrics.scanCompleteness = scanCompleteness;
      const value = expectSuccess(
        validateMachineArtifactSetV1(artifactBytes(metrics))
      );
      assert.deepEqual(value.metrics, metrics);
      assert.deepEqual(value.warnings, metrics.warnings.changed);
      assert.deepEqual(value.warningsAll, metrics.warnings.all);
    }

    const failureCases = artifactSetFailureCases({
      blocking,
      emptyReasonBlocking,
      whitespaceAccepted
    });

    for (const testCase of failureCases) {
      const metrics = structuredClone(richMetrics);
      const artifacts = artifactBytes(metrics);
      testCase.mutate(metrics, artifacts);
      const diagnostic = expectFailure(
        validateMachineArtifactSetV1(artifacts)
      );
      assert.equal(diagnostic.logicalArtifact, testCase.logicalArtifact);
      assert.equal(diagnostic.category, "set-invariant");
      assert.equal(diagnostic.relationship, testCase.relationship);
      assert.equal(diagnostic.pointer, testCase.pointer);
      assert.equal(diagnostic.index, testCase.index);
      assert.ok(diagnostic.message.length > 0);
    }
  });
});
