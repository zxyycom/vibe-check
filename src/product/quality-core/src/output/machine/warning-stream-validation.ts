import Value from "typebox/value";

import {
  MACHINE_WARNING_V1_SCHEMA,
  type MachineWarningV1
} from "./schema.ts";
import {
  countLf,
  failure,
  hasLeadingUtf8Bom,
  isJsonObject,
  schemaErrorPointer,
  schemaMessage,
  success
} from "./validation-support.ts";
import type { MachineValidationResult } from "./validation-types.ts";

interface WarningRecordLocation {
  readonly index: number;
  readonly line: number;
  readonly logicalArtifact: string;
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

  const decoded = decodeWarningSegments(bytes, logicalArtifact);
  if (!decoded.ok) return decoded;

  const framingFailure = validateFinalLf(bytes, logicalArtifact);
  if (framingFailure) return framingFailure;

  const warnings: MachineWarningV1[] = [];
  for (const [index, segment] of decoded.value.entries()) {
    const warning = validateWarningSegment(segment, {
      index,
      line: index + 1,
      logicalArtifact
    });
    if (!warning.ok) return warning;
    warnings.push(warning.value);
  }
  return success(warnings);
}

function decodeWarningSegments(
  bytes: Uint8Array,
  logicalArtifact: string
): MachineValidationResult<string[]> {
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const segments: string[] = [];
  for (const [index, recordBytes] of splitWarningRecordBytes(bytes).entries()) {
    try {
      segments.push(decoder.decode(recordBytes));
    } catch {
      return failure({
        index,
        line: index + 1,
        logicalArtifact,
        category: "decoding",
        message: "Input is not valid UTF-8."
      });
    }
  }
  return success(segments);
}

function splitWarningRecordBytes(bytes: Uint8Array): Uint8Array[] {
  const segments: Uint8Array[] = [];
  let recordStart = 0;
  for (let byteIndex = 0; byteIndex < bytes.byteLength; byteIndex += 1) {
    if (bytes[byteIndex] !== 0x0a) continue;
    segments.push(bytes.subarray(recordStart, byteIndex));
    recordStart = byteIndex + 1;
  }
  if (recordStart < bytes.byteLength) {
    segments.push(bytes.subarray(recordStart));
  }
  return segments;
}

function validateFinalLf(
  bytes: Uint8Array,
  logicalArtifact: string
): MachineValidationResult<never> | null {
  if (bytes[bytes.byteLength - 1] === 0x0a) return null;

  const index = countLf(bytes);
  return failure({
    category: "framing",
    index,
    line: index + 1,
    logicalArtifact,
    message: "Non-empty warning stream must end with exactly one LF."
  });
}

function validateWarningSegment(
  segment: string,
  location: WarningRecordLocation
): MachineValidationResult<MachineWarningV1> {
  if (segment.length === 0 || /^[\t\r ]+$/.test(segment)) {
    return failure({
      ...location,
      category: "framing",
      message: "Warning record must not be empty or whitespace-only."
    });
  }

  const parsed = parseWarningJson(segment, location);
  if (!parsed.ok) return parsed;
  if (!isJsonObject(parsed.value)) {
    return failure({
      ...location,
      category: "schema",
      message: "Warning record must be a non-null JSON object.",
      pointer: ""
    });
  }

  if (!Value.Check(MACHINE_WARNING_V1_SCHEMA, parsed.value)) {
    const pointer = schemaErrorPointer(
      Value.Errors(MACHINE_WARNING_V1_SCHEMA, parsed.value)[0]
    );
    return failure({
      ...location,
      category: "schema",
      message: schemaMessage("warning", pointer),
      pointer
    });
  }
  return success(parsed.value);
}

function parseWarningJson(
  segment: string,
  location: WarningRecordLocation
): MachineValidationResult<unknown> {
  try {
    return success(JSON.parse(segment) as unknown);
  } catch {
    return failure({
      ...location,
      category: "syntax",
      message: "Warning record must contain exactly one JSON value."
    });
  }
}
