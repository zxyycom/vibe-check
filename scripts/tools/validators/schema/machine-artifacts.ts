import fs from "node:fs";
import { isDeepStrictEqual } from "node:util";

import type { ErrorObject, ValidateFunction } from "ajv";

import { CURRENT_SCHEMAS } from "../config.ts";
import { toAbs } from "../repo/paths.ts";
import {
  compileRegisteredSchema,
  createCurrentSchemaAjv
} from "./registry.ts";

const CURRENT_EXAMPLES_ROOT = "docs/examples/artifacts";
const CURRENT_OUTCOMES = [
  "complete-passed",
  "complete-warning",
  "legitimate-empty",
  "gate-failed",
  "scan-incomplete"
] as const;
const METRICS_ARTIFACT = "metrics.json";
const WARNINGS_ARTIFACT = "warnings.ndjson";
const WARNINGS_ALL_ARTIFACT = "warnings-all.ndjson";
const UTF8_BOM = [0xef, 0xbb, 0xbf] as const;
const STABLE_CAPABILITY_IDS = [
  "file-metrics",
  "function-metrics",
  "duplicate-detection"
] as const;
const EVALUATED_CHANNEL_BY_POLICY = {
  all: "all",
  changed: "changed",
  regressions: "regressions"
} as const;

type JsonRecord = Record<string, unknown>;
type WarningChannel = keyof MachineMetricsShape["warnings"];

interface MachineMetricsShape extends JsonRecord {
  gate: JsonRecord;
  scanCompleteness: {
    capabilities: Array<{
      capabilityId: string;
      status: string;
    }>;
    overall: string;
  };
  warnings: {
    all: JsonRecord[];
    changed: JsonRecord[];
    regressions: JsonRecord[];
  };
}

interface CurrentSchemaValidators {
  metrics: ValidateFunction;
  warning: ValidateFunction;
}

export interface DocsMachineArtifactBytes {
  readonly metricsJson: Uint8Array;
  readonly warningsAllNdjson: Uint8Array;
  readonly warningsNdjson: Uint8Array;
}

export type DocsMachineValidationCategory =
  | "decoding"
  | "framing"
  | "schema"
  | "set-invariant"
  | "syntax";

export type DocsMachineSetRelationship =
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

export interface DocsMachineValidationDiagnostic {
  readonly category: DocsMachineValidationCategory;
  readonly index?: number;
  readonly line?: number;
  readonly logicalArtifact: string;
  readonly message: string;
  readonly path: string;
  readonly pointer?: string;
  readonly relationship?: DocsMachineSetRelationship;
}

export type DocsMachineValidationResult =
  | {
    readonly diagnostic: DocsMachineValidationDiagnostic;
    readonly ok: false;
  }
  | {
    readonly ok: true;
    readonly value: {
      readonly metrics: JsonRecord;
      readonly warnings: JsonRecord[];
      readonly warningsAll: JsonRecord[];
    };
  };

type DocsMachineValidationFailure = Extract<
  DocsMachineValidationResult,
  { readonly ok: false }
>;

let currentSchemas: CurrentSchemaValidators | undefined;

export function validatePublishedMachineArtifactExamples(): number {
  assertExactOutcomeInventory();
  for (const outcome of CURRENT_OUTCOMES) {
    const artifactRoot = `${CURRENT_EXAMPLES_ROOT}/${outcome}`;
    const result = validateDocsMachineArtifactSet({
      metricsJson: readArtifactBytes(artifactRoot, METRICS_ARTIFACT),
      warningsAllNdjson: readArtifactBytes(
        artifactRoot,
        WARNINGS_ALL_ARTIFACT
      ),
      warningsNdjson: readArtifactBytes(artifactRoot, WARNINGS_ARTIFACT)
    }, artifactRoot);
    if (!result.ok) throw new Error(formatDiagnostic(result.diagnostic));
  }
  console.log(
    `current machine artifact examples ok: ${CURRENT_OUTCOMES.length} set(s)`
  );
  return CURRENT_OUTCOMES.length;
}

export function validateDocsMachineArtifactSet(
  artifacts: DocsMachineArtifactBytes,
  artifactRoot: string
): DocsMachineValidationResult {
  const metricsResult = validateMetrics(artifacts.metricsJson, artifactRoot);
  if (!metricsResult.ok) return metricsResult;

  const warningsResult = validateWarningStream(
    artifacts.warningsNdjson,
    artifactRoot,
    WARNINGS_ARTIFACT
  );
  if (!warningsResult.ok) return warningsResult;

  const warningsAllResult = validateWarningStream(
    artifacts.warningsAllNdjson,
    artifactRoot,
    WARNINGS_ALL_ARTIFACT
  );
  if (!warningsAllResult.ok) return warningsAllResult;

  const metrics = metricsResult.value;
  const changedMismatch = firstDeepMismatchIndex(
    warningsResult.value,
    metrics.warnings.changed
  );
  if (changedMismatch !== null) {
    return setFailure(artifactRoot, WARNINGS_ARTIFACT, {
      index: changedMismatch,
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
    return setFailure(artifactRoot, WARNINGS_ALL_ARTIFACT, {
      index: allMismatch,
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
    return setFailure(artifactRoot, METRICS_ARTIFACT, {
      index: changedSubsequenceFailure,
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
    return setFailure(artifactRoot, METRICS_ARTIFACT, {
      index: regressionsSubsequenceFailure,
      message:
        "metrics.warnings.regressions must be an order-preserving subsequence of metrics.warnings.changed.",
      pointer: `/warnings/regressions/${regressionsSubsequenceFailure}`,
      relationship: "regressions-subsequence-of-changed"
    });
  }

  const completenessFailure = validateCompleteness(metrics, artifactRoot);
  if (completenessFailure) return completenessFailure;

  const gateFailure = validateEvaluatedGate(metrics, artifactRoot);
  if (gateFailure) return gateFailure;

  return {
    ok: true,
    value: {
      metrics,
      warnings: warningsResult.value,
      warningsAll: warningsAllResult.value
    }
  };
}

function compileCurrentSchemas(): CurrentSchemaValidators {
  const ajv = createCurrentSchemaAjv();
  return {
    metrics: compileRegisteredSchema(ajv, CURRENT_SCHEMAS.metrics),
    warning: compileRegisteredSchema(ajv, CURRENT_SCHEMAS.warning)
  };
}

function validateMetrics(
  bytes: Uint8Array,
  artifactRoot: string
):
  | { readonly ok: true; readonly value: MachineMetricsShape }
  | { readonly diagnostic: DocsMachineValidationDiagnostic; readonly ok: false } {
  if (hasLeadingUtf8Bom(bytes)) {
    return failure(artifactRoot, METRICS_ARTIFACT, {
      category: "decoding",
      message: "Leading UTF-8 BOM is not allowed."
    });
  }

  const decoded = decodeUtf8(bytes);
  if (decoded === null) {
    return failure(artifactRoot, METRICS_ARTIFACT, {
      category: "decoding",
      message: "Input is not valid UTF-8."
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded) as unknown;
  } catch {
    return failure(artifactRoot, METRICS_ARTIFACT, {
      category: "syntax",
      message: "Metrics artifact must contain exactly one JSON value."
    });
  }

  if (!isJsonObject(parsed)) {
    return failure(artifactRoot, METRICS_ARTIFACT, {
      category: "schema",
      message: "Metrics artifact must be a non-null JSON object.",
      pointer: ""
    });
  }

  const validate = getCurrentSchemas().metrics;
  if (!validate(parsed)) {
    const pointer = schemaErrorPointer(validate.errors);
    return failure(artifactRoot, METRICS_ARTIFACT, {
      category: "schema",
      message: `Metrics artifact does not match the checked-in current schema at ${pointer || "/"}.`,
      pointer
    });
  }

  return { ok: true, value: parsed as MachineMetricsShape };
}

function validateWarningStream(
  bytes: Uint8Array,
  artifactRoot: string,
  logicalArtifact: string
):
  | { readonly ok: true; readonly value: JsonRecord[] }
  | { readonly diagnostic: DocsMachineValidationDiagnostic; readonly ok: false } {
  if (bytes.byteLength === 0) return { ok: true, value: [] };

  if (hasLeadingUtf8Bom(bytes)) {
    return failure(artifactRoot, logicalArtifact, {
      category: "decoding",
      index: 0,
      line: 1,
      message: "Leading UTF-8 BOM is not allowed."
    });
  }

  const recordBytes = splitAtLf(bytes);
  const segments: string[] = [];
  for (const [index, segmentBytes] of recordBytes.entries()) {
    const segment = decodeUtf8(segmentBytes);
    if (segment === null) {
      return failure(artifactRoot, logicalArtifact, {
        category: "decoding",
        index,
        line: index + 1,
        message: "Input is not valid UTF-8."
      });
    }
    if (segment.length === 0 || /^[\t\r ]+$/.test(segment)) {
      return failure(artifactRoot, logicalArtifact, {
        category: "framing",
        index,
        line: index + 1,
        message: "Warning record must not be empty or whitespace-only."
      });
    }
    segments.push(segment);
  }

  if (bytes[bytes.byteLength - 1] !== 0x0a) {
    const index = countLf(bytes);
    return failure(artifactRoot, logicalArtifact, {
      category: "framing",
      index,
      line: index + 1,
      message: "Non-empty warning stream must end with exactly one LF."
    });
  }

  const parsedRecords: JsonRecord[] = [];
  for (const [index, segment] of segments.entries()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(segment) as unknown;
    } catch {
      return failure(artifactRoot, logicalArtifact, {
        category: "syntax",
        index,
        line: index + 1,
        message: "Warning record must contain exactly one JSON value."
      });
    }
    if (!isJsonObject(parsed)) {
      return failure(artifactRoot, logicalArtifact, {
        category: "schema",
        index,
        line: index + 1,
        message: "Warning record must be a non-null JSON object.",
        pointer: ""
      });
    }
    const validate = getCurrentSchemas().warning;
    if (!validate(parsed)) {
      const pointer = schemaErrorPointer(validate.errors);
      return failure(artifactRoot, logicalArtifact, {
        category: "schema",
        index,
        line: index + 1,
        message: `Warning record does not match the checked-in current schema at ${pointer || "/"}.`,
        pointer
      });
    }
    parsedRecords.push(parsed);
  }

  return { ok: true, value: parsedRecords };
}

function validateCompleteness(
  metrics: MachineMetricsShape,
  artifactRoot: string
): DocsMachineValidationFailure | null {
  const capabilities = metrics.scanCompleteness.capabilities;
  const seen = new Set<string>();
  for (const [index, capability] of capabilities.entries()) {
    if (
      !STABLE_CAPABILITY_IDS.includes(
        capability.capabilityId as typeof STABLE_CAPABILITY_IDS[number]
      ) ||
      seen.has(capability.capabilityId)
    ) {
      return setFailure(artifactRoot, METRICS_ARTIFACT, {
        index,
        message:
          "scanCompleteness.capabilities must contain every stable capability ID exactly once.",
        pointer: `/scanCompleteness/capabilities/${index}/capabilityId`,
        relationship: "capability-membership"
      });
    }
    seen.add(capability.capabilityId);
  }
  if (
    capabilities.length !== STABLE_CAPABILITY_IDS.length ||
    STABLE_CAPABILITY_IDS.some((capabilityId) => !seen.has(capabilityId))
  ) {
    return setFailure(artifactRoot, METRICS_ARTIFACT, {
      message:
        "scanCompleteness.capabilities must contain every stable capability ID exactly once.",
      pointer: "/scanCompleteness/capabilities",
      relationship: "capability-membership"
    });
  }

  const expectedOverall = reduceCompleteness(capabilities);
  if (metrics.scanCompleteness.overall !== expectedOverall) {
    return setFailure(artifactRoot, METRICS_ARTIFACT, {
      message:
        `scanCompleteness.overall must equal the independent reduction "${expectedOverall}".`,
      pointer: "/scanCompleteness/overall",
      relationship: "completeness-reduction"
    });
  }
  return null;
}

function validateEvaluatedGate(
  metrics: MachineMetricsShape,
  artifactRoot: string
): DocsMachineValidationFailure | null {
  const gate = metrics.gate;
  if (gate.status !== "passed" && gate.status !== "failed") return null;

  const policy = gate.policy as keyof typeof EVALUATED_CHANNEL_BY_POLICY;
  const evaluatedChannel = EVALUATED_CHANNEL_BY_POLICY[policy];
  if (gate.evaluatedChannel !== evaluatedChannel) {
    return setFailure(artifactRoot, METRICS_ARTIFACT, {
      message:
        `gate.evaluatedChannel must be "${evaluatedChannel}" for policy "${policy}".`,
      pointer: "/gate/evaluatedChannel",
      relationship: "gate-policy-channel"
    });
  }

  const evaluatedWarnings = metrics.warnings[
    evaluatedChannel as WarningChannel
  ];
  if (gate.evaluatedWarningCount !== evaluatedWarnings.length) {
    return setFailure(artifactRoot, METRICS_ARTIFACT, {
      message:
        "gate.evaluatedWarningCount must equal the selected warning channel length.",
      pointer: "/gate/evaluatedWarningCount",
      relationship: "gate-evaluated-count"
    });
  }

  const expectedBlocking = evaluatedWarnings.filter((warning) => (
    warning.acceptedReason === undefined || warning.acceptedReason === ""
  ));
  const blockingWarnings = gate.blockingWarnings as JsonRecord[];
  const blockingMismatch = firstDeepMismatchIndex(
    blockingWarnings,
    expectedBlocking
  );
  if (blockingMismatch !== null) {
    return setFailure(artifactRoot, METRICS_ARTIFACT, {
      index: blockingMismatch,
      message:
        "gate.blockingWarnings must equal the ordered unaccepted warnings from the evaluated channel.",
      pointer: "/gate/blockingWarnings",
      relationship: "gate-blocking-warnings"
    });
  }

  if (gate.blockingWarningCount !== blockingWarnings.length) {
    return setFailure(artifactRoot, METRICS_ARTIFACT, {
      message:
        "gate.blockingWarningCount must equal gate.blockingWarnings length.",
      pointer: "/gate/blockingWarningCount",
      relationship: "gate-blocking-count"
    });
  }

  const expectedStatus = expectedBlocking.length === 0 ? "passed" : "failed";
  if (gate.status !== expectedStatus) {
    return setFailure(artifactRoot, METRICS_ARTIFACT, {
      message:
        `gate.status must be "${expectedStatus}" for the validated blocking warnings.`,
      pointer: "/gate/status",
      relationship: "gate-status"
    });
  }
  return null;
}

function reduceCompleteness(
  capabilities: MachineMetricsShape["scanCompleteness"]["capabilities"]
): "complete" | "empty" | "failed" {
  let succeeded = false;
  for (const capability of capabilities) {
    if (capability.status === "failed") return "failed";
    if (capability.status === "succeeded") succeeded = true;
  }
  return succeeded ? "complete" : "empty";
}

function getCurrentSchemas(): CurrentSchemaValidators {
  currentSchemas ??= compileCurrentSchemas();
  return currentSchemas;
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
  let index = 0;
  for (const value of sequence) {
    if (isDeepStrictEqual(subsequence[index], value)) {
      index += 1;
      if (index === subsequence.length) return null;
    }
  }
  return index === subsequence.length ? null : index;
}

function decodeUtf8(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function splitAtLf(bytes: Uint8Array): Uint8Array[] {
  const segments: Uint8Array[] = [];
  let recordStart = 0;
  for (let index = 0; index < bytes.byteLength; index += 1) {
    if (bytes[index] !== 0x0a) continue;
    segments.push(bytes.subarray(recordStart, index));
    recordStart = index + 1;
  }
  if (recordStart < bytes.byteLength) {
    segments.push(bytes.subarray(recordStart));
  }
  return segments;
}

function schemaErrorPointer(
  errors: readonly ErrorObject[] | null | undefined
): string {
  const error = errors?.find(({ keyword }) => keyword !== "anyOf") ?? errors?.[0];
  if (!error) return "";
  if (
    error.keyword === "required" &&
    typeof error.params.missingProperty === "string"
  ) {
    return appendPointer(error.instancePath, error.params.missingProperty);
  }
  if (
    error.keyword === "additionalProperties" &&
    typeof error.params.additionalProperty === "string"
  ) {
    return appendPointer(error.instancePath, error.params.additionalProperty);
  }
  return error.instancePath;
}

function appendPointer(pointer: string, segment: string): string {
  return `${pointer}/${segment.replaceAll("~", "~0").replaceAll("/", "~1")}`;
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

function isJsonObject(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function failure(
  artifactRoot: string,
  logicalArtifact: string,
  diagnostic: Omit<
    DocsMachineValidationDiagnostic,
    "logicalArtifact" | "path"
  >
): DocsMachineValidationFailure {
  return {
    diagnostic: {
      ...diagnostic,
      logicalArtifact,
      path: artifactPath(artifactRoot, logicalArtifact)
    },
    ok: false
  };
}

function setFailure(
  artifactRoot: string,
  logicalArtifact: string,
  diagnostic: Omit<
    DocsMachineValidationDiagnostic,
    "category" | "logicalArtifact" | "path"
  >
): DocsMachineValidationFailure {
  return failure(artifactRoot, logicalArtifact, {
    ...diagnostic,
    category: "set-invariant"
  });
}

function artifactPath(artifactRoot: string, logicalArtifact: string): string {
  return artifactRoot.endsWith("/")
    ? `${artifactRoot}${logicalArtifact}`
    : `${artifactRoot}/${logicalArtifact}`;
}

function assertExactOutcomeInventory(): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(toAbs(CURRENT_EXAMPLES_ROOT), {
      withFileTypes: true
    });
  } catch {
    throw new Error(
      `current machine artifact example root is missing or unreadable: ${CURRENT_EXAMPLES_ROOT}`
    );
  }

  const expected = new Set<string>(CURRENT_OUTCOMES);
  for (const entry of entries) {
    if (!entry.isDirectory() || !expected.has(entry.name)) {
      throw new Error(
        `unexpected current machine artifact example path: ${CURRENT_EXAMPLES_ROOT}/${entry.name}; expected exactly ${CURRENT_OUTCOMES.join(", ")}`
      );
    }
  }
  for (const outcome of CURRENT_OUTCOMES) {
    if (!entries.some((entry) => entry.isDirectory() && entry.name === outcome)) {
      throw new Error(
        `missing current machine artifact example directory: ${CURRENT_EXAMPLES_ROOT}/${outcome}`
      );
    }
  }
}

function readArtifactBytes(artifactRoot: string, logicalArtifact: string): Buffer {
  const relativePath = artifactPath(artifactRoot, logicalArtifact);
  try {
    return fs.readFileSync(toAbs(relativePath));
  } catch {
    throw new Error(`current machine artifact example is unreadable: ${relativePath}`);
  }
}

function formatDiagnostic(diagnostic: DocsMachineValidationDiagnostic): string {
  const locations = [
    diagnostic.pointer === undefined ? null : `pointer ${diagnostic.pointer || "/"}`,
    diagnostic.line === undefined ? null : `line ${diagnostic.line}`,
    diagnostic.index === undefined ? null : `index ${diagnostic.index}`,
    diagnostic.relationship === undefined
      ? null
      : `relationship ${diagnostic.relationship}`
  ].filter((value): value is string => value !== null);
  const suffix = locations.length === 0 ? "" : ` (${locations.join(", ")})`;
  return `${diagnostic.path} [${diagnostic.category}]${suffix}: ${diagnostic.message}`;
}
