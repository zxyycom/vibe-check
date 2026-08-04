import type { ErrorObject, ValidateFunction } from "ajv";

import { CURRENT_SCHEMAS } from "../config.ts";
import { failure } from "./machine-artifact-diagnostics.ts";
import {
  METRICS_ARTIFACT,
  type JsonRecord,
  type MachineMetricsShape,
  type ParsedArtifactResult
} from "./machine-artifact-types.ts";
import {
  compileRegisteredSchema,
  createCurrentSchemaAjv
} from "./registry.ts";

const UTF8_BOM = [0xef, 0xbb, 0xbf] as const;

interface CurrentSchemaValidators {
  metrics: ValidateFunction;
  warning: ValidateFunction;
}

let currentSchemas: CurrentSchemaValidators | undefined;

export function validateMetrics(
  bytes: Uint8Array,
  artifactRoot: string
): ParsedArtifactResult<MachineMetricsShape> {
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

  const parsed = parseMetricsJson(decoded, artifactRoot);
  if (!parsed.ok) return parsed;

  const validate = getCurrentSchemas().metrics;
  if (!validate(parsed.value)) {
    const pointer = schemaErrorPointer(validate.errors);
    return failure(artifactRoot, METRICS_ARTIFACT, {
      category: "schema",
      message: `Metrics artifact does not match the checked-in current schema at ${pointer || "/"}.`,
      pointer
    });
  }
  return { ok: true, value: parsed.value as MachineMetricsShape };
}

export function validateWarningStream(
  bytes: Uint8Array,
  artifactRoot: string,
  logicalArtifact: string
): ParsedArtifactResult<JsonRecord[]> {
  if (bytes.byteLength === 0) return { ok: true, value: [] };
  if (hasLeadingUtf8Bom(bytes)) {
    return failure(artifactRoot, logicalArtifact, {
      category: "decoding",
      index: 0,
      line: 1,
      message: "Leading UTF-8 BOM is not allowed."
    });
  }

  const segmentsResult = decodeWarningSegments(
    splitAtLf(bytes),
    artifactRoot,
    logicalArtifact
  );
  if (!segmentsResult.ok) return segmentsResult;

  if (bytes[bytes.byteLength - 1] !== 0x0a) {
    const index = countLf(bytes);
    return failure(artifactRoot, logicalArtifact, {
      category: "framing",
      index,
      line: index + 1,
      message: "Non-empty warning stream must end with exactly one LF."
    });
  }
  return parseWarningSegments(
    segmentsResult.value,
    artifactRoot,
    logicalArtifact
  );
}

function parseMetricsJson(
  decoded: string,
  artifactRoot: string
): ParsedArtifactResult<JsonRecord> {
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
  return { ok: true, value: parsed };
}

function decodeWarningSegments(
  recordBytes: readonly Uint8Array[],
  artifactRoot: string,
  logicalArtifact: string
): ParsedArtifactResult<string[]> {
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
  return { ok: true, value: segments };
}

function parseWarningSegments(
  segments: readonly string[],
  artifactRoot: string,
  logicalArtifact: string
): ParsedArtifactResult<JsonRecord[]> {
  const parsedRecords: JsonRecord[] = [];
  for (const [index, segment] of segments.entries()) {
    const parsedResult = parseWarningRecord(
      segment,
      index,
      artifactRoot,
      logicalArtifact
    );
    if (!parsedResult.ok) return parsedResult;
    parsedRecords.push(parsedResult.value);
  }
  return { ok: true, value: parsedRecords };
}

function parseWarningRecord(
  segment: string,
  index: number,
  artifactRoot: string,
  logicalArtifact: string
): ParsedArtifactResult<JsonRecord> {
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
  return validateWarningSchema(parsed, index, artifactRoot, logicalArtifact);
}

function validateWarningSchema(
  parsed: JsonRecord,
  index: number,
  artifactRoot: string,
  logicalArtifact: string
): ParsedArtifactResult<JsonRecord> {
  const validate = getCurrentSchemas().warning;
  if (validate(parsed)) return { ok: true, value: parsed };

  const pointer = schemaErrorPointer(validate.errors);
  return failure(artifactRoot, logicalArtifact, {
    category: "schema",
    index,
    line: index + 1,
    message: `Warning record does not match the checked-in current schema at ${pointer || "/"}.`,
    pointer
  });
}

function getCurrentSchemas(): CurrentSchemaValidators {
  currentSchemas ??= compileCurrentSchemas();
  return currentSchemas;
}

function compileCurrentSchemas(): CurrentSchemaValidators {
  const ajv = createCurrentSchemaAjv();
  return {
    metrics: compileRegisteredSchema(ajv, CURRENT_SCHEMAS.metrics),
    warning: compileRegisteredSchema(ajv, CURRENT_SCHEMAS.warning)
  };
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
  if (recordStart < bytes.byteLength) segments.push(bytes.subarray(recordStart));
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
