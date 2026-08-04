import {
  serializeMachineMetricsV1,
  type MachineMetricsV1,
  type MachineValidationDiagnostic,
  type MachineWarningV1
} from "../../../../machine-output.ts";
import {
  bytes,
  concatBytes
} from "./validation.fixtures.ts";

export interface MetricsByteFailureCase {
  readonly bytes: Uint8Array;
  readonly category: MachineValidationDiagnostic["category"];
  readonly pointer?: string;
}

export interface WarningByteFailureCase extends MetricsByteFailureCase {
  readonly index?: number;
  readonly line?: number;
}

interface InvalidMetricsCasesOptions {
  readonly metrics: MachineMetricsV1;
  readonly warning: MachineWarningV1;
}

interface InvalidWarningCasesOptions {
  readonly warning: MachineWarningV1;
}

export function invalidMetricsCases(
  options: InvalidMetricsCasesOptions
): MetricsByteFailureCase[] {
  const { metrics, warning } = options;
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

  return [
    { bytes: new Uint8Array([0xc3, 0x28]), category: "decoding" },
    {
      bytes: concatBytes(
        new Uint8Array([0xef, 0xbb, 0xbf]),
        bytes(validMetrics)
      ),
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
}

export function invalidWarningCases(
  options: InvalidWarningCasesOptions
): WarningByteFailureCase[] {
  const { warning } = options;
  const record = JSON.stringify(warning);
  const invalidSchemaWarning = { ...warning, schemaVersion: "invalid" };
  return [
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
}
