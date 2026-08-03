import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  projectMachineMetricsV1,
  serializeMachineArtifactCandidatesV1,
  serializeMachineMetricsV1,
  serializeMachineWarningStreamV1,
  validateMachineArtifactSetV1,
  validateMachineWarningStreamV1,
  type MachineArtifactBytesV1,
  type MachineMetricsV1,
  type MachineValidationDiagnostic,
  type MachineValidationResult,
  type MachineWarningV1
} from "../../../../machine-output.ts";
import { createEmptyMetrics } from "../../model/schema.ts";

const encoder = new TextEncoder();

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
    const validMetrics = serializeMachineMetricsV1(metrics);
    const invalidSchemaMetrics = structuredClone(metrics);
    invalidSchemaMetrics.metadata.schemaVersion = "invalid" as never;
    const missingEvaluatedChannelMetrics = structuredClone(metrics);
    missingEvaluatedChannelMetrics.gate = {
      blockingWarningCount: 1,
      blockingWarnings: [warning],
      evaluatedChannel: "all",
      evaluatedWarningCount: 1,
      policy: "all",
      status: "failed"
    };
    const unknownGateStatusMetrics = structuredClone(
      missingEvaluatedChannelMetrics
    );
    unknownGateStatusMetrics.gate.status = "unknown" as never;
    Reflect.deleteProperty(
      missingEvaluatedChannelMetrics.gate,
      "evaluatedChannel"
    );
    const missingFailedDiagnosticMetrics = structuredClone(metrics);
    missingFailedDiagnosticMetrics.scanCompleteness.capabilities[0] = {
      capabilityId: "file-metrics",
      diagnostic: {
        action: "Restore the scanner.",
        kind: "execution",
        message: "Scanner failed."
      },
      status: "failed"
    };
    const unknownCapabilityStatusMetrics = structuredClone(
      missingFailedDiagnosticMetrics
    );
    unknownCapabilityStatusMetrics.scanCompleteness.capabilities[0]!.status =
      "unknown" as never;
    Reflect.deleteProperty(
      missingFailedDiagnosticMetrics.scanCompleteness.capabilities[0],
      "diagnostic"
    );
    missingFailedDiagnosticMetrics.scanCompleteness.overall = "failed";

    const metricsCases: Array<{
      bytes: Uint8Array;
      category: MachineValidationDiagnostic["category"];
      pointer?: string;
    }> = [
      { bytes: new Uint8Array([0xc3, 0x28]), category: "decoding" },
      {
        bytes: concatBytes(new Uint8Array([0xef, 0xbb, 0xbf]), bytes(validMetrics)),
        category: "decoding"
      },
      { bytes: bytes(`${validMetrics} {}`), category: "syntax" },
      { bytes: bytes("null"), category: "schema", pointer: "" },
      { bytes: bytes("[]"), category: "schema", pointer: "" },
      {
        bytes: bytes(JSON.stringify(invalidSchemaMetrics)),
        category: "schema",
        pointer: "/metadata/schemaVersion"
      },
      {
        bytes: bytes(JSON.stringify(unknownGateStatusMetrics)),
        category: "schema",
        pointer: "/gate/status"
      },
      {
        bytes: bytes(JSON.stringify(unknownCapabilityStatusMetrics)),
        category: "schema",
        pointer: "/scanCompleteness/capabilities/0/status"
      },
      {
        bytes: bytes(JSON.stringify(missingEvaluatedChannelMetrics)),
        category: "schema",
        pointer: "/gate/evaluatedChannel"
      },
      {
        bytes: bytes(JSON.stringify(missingFailedDiagnosticMetrics)),
        category: "schema",
        pointer: "/scanCompleteness/capabilities/0/diagnostic"
      }
    ];
    for (const testCase of metricsCases) {
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

    const record = JSON.stringify(warning);
    const invalidSchemaWarning = { ...warning, schemaVersion: "invalid" };
    const warningCases: Array<{
      bytes: Uint8Array;
      category: MachineValidationDiagnostic["category"];
      index?: number;
      line?: number;
      pointer?: string;
    }> = [
      {
        bytes: new Uint8Array([0xc3, 0x28]),
        category: "decoding",
        index: 0,
        line: 1
      },
      {
        bytes: concatBytes(
          new Uint8Array([0xef, 0xbb, 0xbf]),
          bytes(`${record}\n`)
        ),
        category: "decoding",
        index: 0,
        line: 1
      },
      { bytes: bytes(record), category: "framing", index: 0, line: 1 },
      {
        bytes: bytes(`${record}\n\n`),
        category: "framing",
        index: 1,
        line: 2
      },
      {
        bytes: bytes(`${record}\n\n${record}\n`),
        category: "framing",
        index: 1,
        line: 2
      },
      {
        bytes: bytes(`${record}\n \t\r\n${record}\n`),
        category: "framing",
        index: 1,
        line: 2
      },
      { bytes: bytes("{]\n"), category: "syntax", index: 0, line: 1 },
      {
        bytes: bytes("[]\n"),
        category: "schema",
        index: 0,
        line: 1,
        pointer: ""
      },
      {
        bytes: bytes(`${JSON.stringify(invalidSchemaWarning)}\n`),
        category: "schema",
        index: 0,
        line: 1,
        pointer: "/schemaVersion"
      },
      {
        bytes: bytes(`${record}\n{]\n`),
        category: "syntax",
        index: 1,
        line: 2
      },
      {
        bytes: concatBytes(
          bytes(`${record}\n`),
          new Uint8Array([0xc3, 0x28, 0x0a])
        ),
        category: "decoding",
        index: 1,
        line: 2
      }
    ];
    for (const testCase of warningCases) {
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

    type FailureCase = {
      index?: number;
      logicalArtifact: string;
      mutate: (
        metrics: MachineMetricsV1,
        artifacts: MachineArtifactBytesV1
      ) => void;
      pointer?: string;
      relationship: NonNullable<MachineValidationDiagnostic["relationship"]>;
    };
    const failureCases: FailureCase[] = [
      {
        index: 0,
        logicalArtifact: "warnings.ndjson",
        mutate: (_metrics, artifacts) => {
          artifacts.warningsNdjson = bytes(serializeMachineWarningStreamV1([
            machineWarning({ ruleId: "stream-drift" })
          ]));
        },
        relationship: "warnings-stream-equals-changed"
      },
      {
        index: 0,
        logicalArtifact: "warnings-all.ndjson",
        mutate: (_metrics, artifacts) => {
          artifacts.warningsAllNdjson = bytes(serializeMachineWarningStreamV1([
            machineWarning({ ruleId: "all-stream-drift" })
          ]));
        },
        relationship: "warnings-all-stream-equals-all"
      },
      {
        index: 1,
        logicalArtifact: "metrics.json",
        mutate: (metrics, artifacts) => {
          metrics.warnings.all = [
            whitespaceAccepted,
            blocking,
            emptyReasonBlocking
          ];
          refreshArtifacts(metrics, artifacts);
        },
        pointer: "/warnings/changed/1",
        relationship: "changed-subsequence-of-all"
      },
      {
        index: 0,
        logicalArtifact: "metrics.json",
        mutate: (metrics, artifacts) => {
          metrics.warnings.regressions = [
            machineWarning({ ruleId: "not-changed" })
          ];
          refreshArtifacts(metrics, artifacts);
        },
        pointer: "/warnings/regressions/0",
        relationship: "regressions-subsequence-of-changed"
      },
      {
        index: 2,
        logicalArtifact: "metrics.json",
        mutate: (metrics, artifacts) => {
          metrics.scanCompleteness.capabilities[2] = structuredClone(
            metrics.scanCompleteness.capabilities[1]!
          );
          refreshArtifacts(metrics, artifacts);
        },
        pointer: "/scanCompleteness/capabilities/2/capabilityId",
        relationship: "capability-membership"
      },
      {
        logicalArtifact: "metrics.json",
        mutate: (metrics, artifacts) => {
          metrics.scanCompleteness.overall = "empty";
          refreshArtifacts(metrics, artifacts);
        },
        pointer: "/scanCompleteness/overall",
        relationship: "completeness-reduction"
      },
      {
        logicalArtifact: "metrics.json",
        mutate: (metrics, artifacts) => {
          if (metrics.gate.status === "failed") {
            metrics.gate.evaluatedChannel = "all";
          }
          refreshArtifacts(metrics, artifacts);
        },
        pointer: "/gate/evaluatedChannel",
        relationship: "gate-policy-channel"
      },
      {
        logicalArtifact: "metrics.json",
        mutate: (metrics, artifacts) => {
          if (metrics.gate.status === "failed") {
            metrics.gate.evaluatedWarningCount += 1;
          }
          refreshArtifacts(metrics, artifacts);
        },
        pointer: "/gate/evaluatedWarningCount",
        relationship: "gate-evaluated-count"
      },
      ...([
        [[blocking], 1],
        [[blocking, whitespaceAccepted, emptyReasonBlocking], 1],
        [[emptyReasonBlocking, blocking], 0]
      ] as const).map(([blockingWarnings, index]): FailureCase => ({
        index,
        logicalArtifact: "metrics.json",
        mutate: (metrics, artifacts) => {
          if (metrics.gate.status === "failed") {
            metrics.gate.blockingWarnings = [...blockingWarnings];
            metrics.gate.blockingWarningCount = blockingWarnings.length;
          }
          refreshArtifacts(metrics, artifacts);
        },
        pointer: "/gate/blockingWarnings",
        relationship: "gate-blocking-warnings"
      })),
      {
        logicalArtifact: "metrics.json",
        mutate: (metrics, artifacts) => {
          if (metrics.gate.status === "failed") {
            metrics.gate.blockingWarningCount += 1;
          }
          refreshArtifacts(metrics, artifacts);
        },
        pointer: "/gate/blockingWarningCount",
        relationship: "gate-blocking-count"
      },
      {
        logicalArtifact: "metrics.json",
        mutate: (metrics, artifacts) => {
          metrics.gate.status = "passed";
          refreshArtifacts(metrics, artifacts);
        },
        pointer: "/gate/status",
        relationship: "gate-status"
      }
    ];

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

function machineMetrics(
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

function evaluatedMetrics(
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

function machineWarning(
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

function artifactBytes(metrics: MachineMetricsV1): MachineArtifactBytesV1 {
  const candidates = serializeMachineArtifactCandidatesV1(metrics);
  return {
    metricsJson: bytes(candidates.metricsJson),
    warningsAllNdjson: bytes(candidates.warningsAllNdjson),
    warningsNdjson: bytes(candidates.warningsNdjson)
  };
}

function refreshArtifacts(
  metrics: MachineMetricsV1,
  artifacts: MachineArtifactBytesV1
): void {
  Object.assign(artifacts, artifactBytes(metrics));
}

function bytes(source: string): Uint8Array {
  return encoder.encode(source);
}

function concatBytes(left: Uint8Array, right: Uint8Array): Uint8Array {
  const result = new Uint8Array(left.byteLength + right.byteLength);
  result.set(left);
  result.set(right, left.byteLength);
  return result;
}

function expectSuccess<T>(result: MachineValidationResult<T>): T {
  if (!result.ok) assert.fail(result.diagnostic.message);
  return result.value;
}

function expectFailure<T>(
  result: MachineValidationResult<T>
): MachineValidationDiagnostic {
  if (result.ok) assert.fail("expected validation failure");
  return result.diagnostic;
}
