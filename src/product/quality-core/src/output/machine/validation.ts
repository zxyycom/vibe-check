import { isDeepStrictEqual } from "node:util";

import type { TLocalizedValidationError } from "typebox/error";
import Value from "typebox/value";

import {
  GATE_POLICY_DESCRIPTORS
} from "../../model/gate-policy.ts";
import {
  SCAN_CAPABILITY_IDS,
  reduceScanCompleteness
} from "../../model/scan-completeness.ts";
import {
  MACHINE_METRICS_V1_SCHEMA,
  MACHINE_WARNING_V1_SCHEMA,
  MACHINE_WARNING_V1_SCHEMA_ID,
  type MachineMetricsV1,
  type MachineWarningV1
} from "./schema.ts";

const METRICS_ARTIFACT = "metrics.json";
const WARNINGS_ARTIFACT = "warnings.ndjson";
const WARNINGS_ALL_ARTIFACT = "warnings-all.ndjson";
const UTF8_BOM = [0xef, 0xbb, 0xbf] as const;

const MACHINE_SCHEMA_CONTEXT = {
  [MACHINE_WARNING_V1_SCHEMA_ID]: MACHINE_WARNING_V1_SCHEMA
};
const CAPABILITY_SCHEMA_BRANCH_BY_STATUS: Readonly<Record<string, number>> = {
  failed: 3,
  "no-input": 1,
  skipped: 0,
  succeeded: 2
};
const GATE_SCHEMA_BRANCH_BY_STATUS: Readonly<Record<string, number>> = {
  disabled: 0,
  failed: 2,
  "not-evaluated": 3,
  passed: 1
};

export type MachineValidationCategory =
  | "decoding"
  | "framing"
  | "schema"
  | "set-invariant"
  | "syntax";

export type MachineSetRelationship =
  | "capability-membership"
  | "changed-subsequence-of-all"
  | "completeness-reduction"
  | "gate-blocking-count"
  | "gate-blocking-warnings"
  | "gate-evaluated-count"
  | "gate-policy-channel"
  | "gate-status"
  | "regressions-subsequence-of-changed"
  | "warnings-all-stream-equals-all"
  | "warnings-stream-equals-changed";

export interface MachineValidationDiagnostic {
  readonly category: MachineValidationCategory;
  readonly index?: number;
  readonly line?: number;
  readonly logicalArtifact: string;
  readonly message: string;
  readonly pointer?: string;
  readonly relationship?: MachineSetRelationship;
}

export type MachineValidationResult<Value> =
  | {
    readonly ok: false;
    readonly diagnostic: MachineValidationDiagnostic;
  }
  | {
    readonly ok: true;
    readonly value: Value;
  };

export interface MachineArtifactBytesV1 {
  metricsJson: Uint8Array;
  warningsAllNdjson: Uint8Array;
  warningsNdjson: Uint8Array;
}

export interface ValidatedMachineArtifactSetV1 {
  readonly metrics: MachineMetricsV1;
  readonly warnings: MachineWarningV1[];
  readonly warningsAll: MachineWarningV1[];
}

export function validateMachineWarningStreamV1(
  bytes: Uint8Array,
  logicalArtifact: string
): MachineValidationResult<MachineWarningV1[]> {
  if (bytes.byteLength === 0) return success([]);

  if (hasLeadingUtf8Bom(bytes)) {
    return failure({
      category: "decoding",
      index: 0,
      line: 1,
      logicalArtifact,
      message: "Leading UTF-8 BOM is not allowed."
    });
  }

  const segmentBytes: Uint8Array[] = [];
  let recordStart = 0;
  for (let byteIndex = 0; byteIndex < bytes.byteLength; byteIndex += 1) {
    if (bytes[byteIndex] !== 0x0a) continue;
    segmentBytes.push(bytes.subarray(recordStart, byteIndex));
    recordStart = byteIndex + 1;
  }
  if (recordStart < bytes.byteLength) {
    segmentBytes.push(bytes.subarray(recordStart));
  }

  const decoder = new TextDecoder("utf-8", { fatal: true });
  const segments: string[] = [];
  for (const [index, recordBytes] of segmentBytes.entries()) {
    const location = { index, line: index + 1, logicalArtifact };
    try {
      segments.push(decoder.decode(recordBytes));
    } catch {
      return failure({
        ...location,
        category: "decoding",
        message: "Input is not valid UTF-8."
      });
    }
  }

  if (bytes[bytes.byteLength - 1] !== 0x0a) {
    const index = countLf(bytes);
    return failure({
      category: "framing",
      index,
      line: index + 1,
      logicalArtifact,
      message: "Non-empty warning stream must end with exactly one LF."
    });
  }

  const warnings: MachineWarningV1[] = [];
  for (const [index, segment] of segments.entries()) {
    const location = { index, line: index + 1, logicalArtifact };
    if (segment.length === 0 || /^[\t\r ]+$/.test(segment)) {
      return failure({
        ...location,
        category: "framing",
        message: "Warning record must not be empty or whitespace-only."
      });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(segment) as unknown;
    } catch {
      return failure({
        ...location,
        category: "syntax",
        message: "Warning record must contain exactly one JSON value."
      });
    }

    if (!isJsonObject(parsed)) {
      return failure({
        ...location,
        category: "schema",
        message: "Warning record must be a non-null JSON object.",
        pointer: ""
      });
    }

    if (!Value.Check(MACHINE_WARNING_V1_SCHEMA, parsed)) {
      const pointer = schemaErrorPointer(
        Value.Errors(MACHINE_WARNING_V1_SCHEMA, parsed)[0]
      );
      return failure({
        ...location,
        category: "schema",
        message: schemaMessage("warning", pointer),
        pointer
      });
    }
    warnings.push(parsed);
  }

  return success(warnings);
}

export function validateMachineArtifactSetV1(
  artifacts: MachineArtifactBytesV1
): MachineValidationResult<ValidatedMachineArtifactSetV1> {
  const metricsResult = validateMachineMetricsV1(artifacts.metricsJson);
  if (!metricsResult.ok) return metricsResult;

  const warningsResult = validateMachineWarningStreamV1(
    artifacts.warningsNdjson,
    WARNINGS_ARTIFACT
  );
  if (!warningsResult.ok) return warningsResult;

  const warningsAllResult = validateMachineWarningStreamV1(
    artifacts.warningsAllNdjson,
    WARNINGS_ALL_ARTIFACT
  );
  if (!warningsAllResult.ok) return warningsAllResult;

  const metrics = metricsResult.value;
  const changedMismatch = firstDeepMismatchIndex(
    warningsResult.value,
    metrics.warnings.changed
  );
  if (changedMismatch !== null) {
    return setFailure({
      index: changedMismatch,
      logicalArtifact: WARNINGS_ARTIFACT,
      message:
        "Parsed warning stream must deep-equal metrics.warnings.changed in order and multiplicity.",
      relationship: "warnings-stream-equals-changed"
    });
  }

  const allMismatch = firstDeepMismatchIndex(
    warningsAllResult.value,
    metrics.warnings.all
  );
  if (allMismatch !== null) {
    return setFailure({
      index: allMismatch,
      logicalArtifact: WARNINGS_ALL_ARTIFACT,
      message:
        "Parsed all-warning stream must deep-equal metrics.warnings.all in order and multiplicity.",
      relationship: "warnings-all-stream-equals-all"
    });
  }

  const changedSubsequenceFailure = firstSubsequenceFailureIndex(
    metrics.warnings.changed,
    metrics.warnings.all
  );
  if (changedSubsequenceFailure !== null) {
    return setFailure({
      index: changedSubsequenceFailure,
      logicalArtifact: METRICS_ARTIFACT,
      message:
        "metrics.warnings.changed must be an order-preserving subsequence of metrics.warnings.all.",
      pointer: `/warnings/changed/${changedSubsequenceFailure}`,
      relationship: "changed-subsequence-of-all"
    });
  }

  const regressionsSubsequenceFailure = firstSubsequenceFailureIndex(
    metrics.warnings.regressions,
    metrics.warnings.changed
  );
  if (regressionsSubsequenceFailure !== null) {
    return setFailure({
      index: regressionsSubsequenceFailure,
      logicalArtifact: METRICS_ARTIFACT,
      message:
        "metrics.warnings.regressions must be an order-preserving subsequence of metrics.warnings.changed.",
      pointer: `/warnings/regressions/${regressionsSubsequenceFailure}`,
      relationship: "regressions-subsequence-of-changed"
    });
  }

  const completenessFailure = validateCompleteness(metrics);
  if (completenessFailure) return completenessFailure;

  const gateFailure = validateEvaluatedGate(metrics);
  if (gateFailure) return gateFailure;

  return success({
    metrics,
    warnings: warningsResult.value,
    warningsAll: warningsAllResult.value
  });
}

function validateMachineMetricsV1(
  bytes: Uint8Array
): MachineValidationResult<MachineMetricsV1> {
  if (hasLeadingUtf8Bom(bytes)) {
    return failure({
      category: "decoding",
      logicalArtifact: METRICS_ARTIFACT,
      message: "Leading UTF-8 BOM is not allowed."
    });
  }

  const decoded = decodeUtf8(bytes, METRICS_ARTIFACT);
  if (!decoded.ok) return decoded;

  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded.value) as unknown;
  } catch {
    return failure({
      category: "syntax",
      logicalArtifact: METRICS_ARTIFACT,
      message: "Metrics artifact must contain exactly one JSON value."
    });
  }

  if (!isJsonObject(parsed)) {
    return failure({
      category: "schema",
      logicalArtifact: METRICS_ARTIFACT,
      message: "Metrics artifact must be a non-null JSON object.",
      pointer: ""
    });
  }

  if (!Value.Check(
    MACHINE_SCHEMA_CONTEXT,
    MACHINE_METRICS_V1_SCHEMA,
    parsed
  )) {
    const errors = Value.Errors(
      MACHINE_SCHEMA_CONTEXT,
      MACHINE_METRICS_V1_SCHEMA,
      parsed
    );
    const pointer = schemaErrorPointer(
      selectMachineMetricsSchemaError(errors, parsed)
    );
    return failure({
      category: "schema",
      logicalArtifact: METRICS_ARTIFACT,
      message: schemaMessage("metrics", pointer),
      pointer
    });
  }

  return success(parsed as MachineMetricsV1);
}

function validateCompleteness(
  metrics: MachineMetricsV1
): MachineValidationResult<never> | null {
  const capabilities = metrics.scanCompleteness.capabilities;
  const seen = new Set<string>();
  for (const [index, result] of capabilities.entries()) {
    if (
      !SCAN_CAPABILITY_IDS.includes(result.capabilityId) ||
      seen.has(result.capabilityId)
    ) {
      return setFailure({
        index,
        logicalArtifact: METRICS_ARTIFACT,
        message:
          "scanCompleteness.capabilities must contain every stable capability ID exactly once.",
        pointer: `/scanCompleteness/capabilities/${index}/capabilityId`,
        relationship: "capability-membership"
      });
    }
    seen.add(result.capabilityId);
  }
  if (
    capabilities.length !== SCAN_CAPABILITY_IDS.length ||
    SCAN_CAPABILITY_IDS.some((capabilityId) => !seen.has(capabilityId))
  ) {
    return setFailure({
      logicalArtifact: METRICS_ARTIFACT,
      message:
        "scanCompleteness.capabilities must contain every stable capability ID exactly once.",
      pointer: "/scanCompleteness/capabilities",
      relationship: "capability-membership"
    });
  }

  const expectedOverall = reduceScanCompleteness(capabilities);
  if (metrics.scanCompleteness.overall !== expectedOverall) {
    return setFailure({
      logicalArtifact: METRICS_ARTIFACT,
      message:
        `scanCompleteness.overall must equal shared reduction "${expectedOverall}".`,
      pointer: "/scanCompleteness/overall",
      relationship: "completeness-reduction"
    });
  }
  return null;
}

function validateEvaluatedGate(
  metrics: MachineMetricsV1
): MachineValidationResult<never> | null {
  const gate = metrics.gate;
  if (gate.status !== "passed" && gate.status !== "failed") return null;

  const descriptor = GATE_POLICY_DESCRIPTORS.find(
    ({ value }) => value === gate.policy
  )!;
  if (gate.evaluatedChannel !== descriptor.evaluatedChannel) {
    return setFailure({
      logicalArtifact: METRICS_ARTIFACT,
      message:
        `gate.evaluatedChannel must be "${descriptor.evaluatedChannel}" for policy "${descriptor.value}".`,
      pointer: "/gate/evaluatedChannel",
      relationship: "gate-policy-channel"
    });
  }

  const evaluatedWarnings = metrics.warnings[descriptor.evaluatedChannel];
  if (gate.evaluatedWarningCount !== evaluatedWarnings.length) {
    return setFailure({
      logicalArtifact: METRICS_ARTIFACT,
      message:
        "gate.evaluatedWarningCount must equal the selected warning channel length.",
      pointer: "/gate/evaluatedWarningCount",
      relationship: "gate-evaluated-count"
    });
  }

  const expectedBlocking = evaluatedWarnings.filter((warning) => (
    warning.acceptedReason === undefined || warning.acceptedReason.length === 0
  ));
  const blockingMismatch = firstDeepMismatchIndex(
    gate.blockingWarnings,
    expectedBlocking
  );
  if (blockingMismatch !== null) {
    return setFailure({
      index: blockingMismatch,
      logicalArtifact: METRICS_ARTIFACT,
      message:
        "gate.blockingWarnings must equal the ordered unaccepted warnings from the evaluated channel.",
      pointer: "/gate/blockingWarnings",
      relationship: "gate-blocking-warnings"
    });
  }

  if (gate.blockingWarningCount !== gate.blockingWarnings.length) {
    return setFailure({
      logicalArtifact: METRICS_ARTIFACT,
      message:
        "gate.blockingWarningCount must equal gate.blockingWarnings length.",
      pointer: "/gate/blockingWarningCount",
      relationship: "gate-blocking-count"
    });
  }

  const expectedStatus = expectedBlocking.length === 0 ? "passed" : "failed";
  if (gate.status !== expectedStatus) {
    return setFailure({
      logicalArtifact: METRICS_ARTIFACT,
      message:
        `gate.status must be "${expectedStatus}" for the validated blocking warnings.`,
      pointer: "/gate/status",
      relationship: "gate-status"
    });
  }
  return null;
}

function decodeUtf8(
  bytes: Uint8Array,
  logicalArtifact: string
): MachineValidationResult<string> {
  try {
    return success(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return failure({
      category: "decoding",
      logicalArtifact,
      message: "Input is not valid UTF-8."
    });
  }
}

function firstDeepMismatchIndex(
  left: readonly unknown[],
  right: readonly unknown[]
): number | null {
  const sharedLength = Math.min(left.length, right.length);
  for (let index = 0; index < sharedLength; index += 1) {
    if (!isDeepStrictEqual(left[index], right[index])) return index;
  }
  return left.length === right.length ? null : sharedLength;
}

function firstSubsequenceFailureIndex(
  subsequence: readonly unknown[],
  sequence: readonly unknown[]
): number | null {
  let subsequenceIndex = 0;
  for (const value of sequence) {
    if (isDeepStrictEqual(subsequence[subsequenceIndex], value)) {
      subsequenceIndex += 1;
      if (subsequenceIndex === subsequence.length) return null;
    }
  }
  return subsequenceIndex === subsequence.length ? null : subsequenceIndex;
}

function schemaErrorPointer(
  error: TLocalizedValidationError | undefined
): string {
  if (!error) return "";
  const required = "requiredProperties" in error.params
    ? error.params.requiredProperties[0]
    : undefined;
  if (typeof required === "string") {
    return appendJsonPointer(error.instancePath, required);
  }
  const additional = "additionalProperties" in error.params
    ? error.params.additionalProperties[0]
    : undefined;
  return typeof additional === "string"
    ? appendJsonPointer(error.instancePath, additional)
    : error.instancePath;
}

function selectMachineMetricsSchemaError(
  errors: readonly TLocalizedValidationError[],
  value: Record<string, unknown>
): TLocalizedValidationError | undefined {
  const first = errors[0];
  if (!first) return undefined;

  // TypeBox flattens every anyOf branch in schema order. These two unions are
  // status-discriminated, so a known instance status identifies the actionable
  // branch; an unknown status points to the discriminator itself.
  const gate = value.gate;
  if (
    first.schemaPath.startsWith("#/properties/gate/anyOf/") &&
    isJsonObject(gate) &&
    typeof gate.status === "string"
  ) {
    const branch = GATE_SCHEMA_BRANCH_BY_STATUS[gate.status];
    if (branch !== undefined) {
      const prefix = `#/properties/gate/anyOf/${branch}`;
      return errors.find((error) => (
        error.schemaPath === prefix || error.schemaPath.startsWith(`${prefix}/`)
      )) ?? first;
    }
    return errors.find((error) => error.instancePath === "/gate/status") ?? first;
  }

  const capabilityMatch = /^\/scanCompleteness\/capabilities\/(\d+)(?:\/|$)/
    .exec(first.instancePath);
  const scanCompleteness = value.scanCompleteness;
  if (
    first.schemaPath.startsWith(
      "#/properties/scanCompleteness/properties/capabilities/items/anyOf/"
    ) &&
    capabilityMatch &&
    isJsonObject(scanCompleteness) &&
    Array.isArray(scanCompleteness.capabilities)
  ) {
    const capability: unknown = scanCompleteness.capabilities[
      Number(capabilityMatch[1])
    ];
    if (isJsonObject(capability) && typeof capability.status === "string") {
      const branch = CAPABILITY_SCHEMA_BRANCH_BY_STATUS[capability.status];
      if (branch !== undefined) {
        const prefix =
          "#/properties/scanCompleteness/properties/capabilities/items/anyOf/" +
          branch;
        return errors.find((error) => (
          error.schemaPath === prefix ||
          error.schemaPath.startsWith(`${prefix}/`)
        )) ?? first;
      }
      const statusPath =
        `/scanCompleteness/capabilities/${capabilityMatch[1]}/status`;
      return errors.find((error) => error.instancePath === statusPath) ?? first;
    }
  }

  return first;
}

function appendJsonPointer(pointer: string, segment: string): string {
  const escaped = segment.replaceAll("~", "~0").replaceAll("/", "~1");
  return `${pointer}/${escaped}`;
}

function schemaMessage(kind: "metrics" | "warning", pointer: string): string {
  return `${kind === "metrics" ? "Metrics artifact" : "Warning record"} does not match the current ${kind} schema at ${pointer || "/"}.`;
}

function hasLeadingUtf8Bom(bytes: Uint8Array): boolean {
  return UTF8_BOM.every((byte, index) => bytes[index] === byte);
}

function countLf(bytes: Uint8Array): number {
  let count = 0;
  for (const byte of bytes) {
    if (byte === 0x0a) count += 1;
  }
  return count;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function success<Value>(value: Value): MachineValidationResult<Value> {
  return { ok: true, value };
}

function failure(
  diagnostic: MachineValidationDiagnostic
): MachineValidationResult<never> {
  return { diagnostic, ok: false };
}

function setFailure(
  diagnostic: Omit<MachineValidationDiagnostic, "category">
): MachineValidationResult<never> {
  return failure({ ...diagnostic, category: "set-invariant" });
}
