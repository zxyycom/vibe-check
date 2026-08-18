import Value from "typebox/value";

import type { MachinePublicationV3 } from "./mapper.ts";
import { freezePublicationValue } from "./freeze-publication-value.ts";
import { validatePublicationInvariants } from "./publication-invariants.ts";
import {
  MACHINE_RECORD_V3_SCHEMA,
  MACHINE_RUN_V3_SCHEMA,
  type MachineRecordV3,
  type MachineRunV3
} from "./schema.ts";
import {
  validationFailure,
  validationSuccess,
  type MachinePublicationValidationDiagnostic,
  type MachinePublicationValidationResult
} from "./validation-result.ts";

export type {
  MachinePublicationSetRelationship,
  MachinePublicationValidationCategory,
  MachinePublicationValidationDiagnostic,
  MachinePublicationValidationResult
} from "./validation-result.ts";

type Parsed<Value> = Readonly<
  { ok: false; diagnostic: MachinePublicationValidationDiagnostic } | { ok: true; value: Value }
>;

export function validateMachinePublicationSetV3(
  input: Readonly<{
    recordsNdjson: Uint8Array;
    runJson: Uint8Array;
  }>
): MachinePublicationValidationResult {
  const runResult = parseRun(input.runJson);
  if (!runResult.ok) return runResult;
  const recordsResult = parseRecords(input.recordsNdjson);
  if (!recordsResult.ok) return recordsResult;
  const invariant = validatePublicationInvariants(runResult.value, recordsResult.value);
  return (
    invariant ??
    validationSuccess(
      Object.freeze({
        run: freezePublicationValue(runResult.value),
        records: freezePublicationValue(recordsResult.value)
      }) satisfies MachinePublicationV3
    )
  );
}

function parseRun(bytes: Uint8Array): Parsed<MachineRunV3> {
  const decoded = decode(bytes, "run.json");
  if (!decoded.ok) return decoded;
  const parsed = parseJson(decoded.value, {
    logicalArtifact: "run.json",
    message: "Run artifact must contain exactly one JSON value."
  });
  if (!parsed.ok) return parsed;
  if (!Value.Check(MACHINE_RUN_V3_SCHEMA, parsed.value)) {
    const error = Value.Errors(MACHINE_RUN_V3_SCHEMA, parsed.value)[0];
    return validationFailure({
      category: "schema",
      logicalArtifact: "run.json",
      message: "Run artifact does not match the machine run v3 schema.",
      pointer: error?.instancePath ?? ""
    });
  }
  return validationSuccess(parsed.value);
}

function parseRecords(bytes: Uint8Array): Parsed<MachineRecordV3[]> {
  if (bytes.byteLength === 0) return validationSuccess([]);
  if (bytes[bytes.byteLength - 1] !== 0x0a) {
    return validationFailure({
      category: "framing",
      line: countLf(bytes) + 1,
      logicalArtifact: "records.ndjson",
      message: "Non-empty record stream must end with exactly one LF."
    });
  }
  const decoded = decode(bytes, "records.ndjson");
  if (!decoded.ok) return decoded;
  return parseRecordSegments(decoded.value.slice(0, -1).split("\n"));
}

function parseRecordSegments(segments: readonly string[]): Parsed<MachineRecordV3[]> {
  const records: MachineRecordV3[] = [];
  for (const [index, segment] of segments.entries()) {
    const framingFailure = validateRecordSegment(segment, index);
    if (framingFailure !== null) return framingFailure;
    const parsed = parseJson(segment, {
      index,
      line: index + 1,
      logicalArtifact: "records.ndjson",
      message: "Record segment must contain exactly one JSON value."
    });
    if (!parsed.ok) return parsed;
    if (!Value.Check(MACHINE_RECORD_V3_SCHEMA, parsed.value)) {
      const error = Value.Errors(MACHINE_RECORD_V3_SCHEMA, parsed.value)[0];
      return validationFailure({
        category: "schema",
        index,
        line: index + 1,
        logicalArtifact: "records.ndjson",
        message: "Record does not match the machine record v3 schema.",
        pointer: error?.instancePath ?? ""
      });
    }
    records.push(parsed.value);
  }
  return validationSuccess(records);
}

function validateRecordSegment(
  segment: string,
  index: number
): Extract<Parsed<never>, { ok: false }> | null {
  if (segment.length > 0 && !/^[\t\r ]+$/.test(segment)) return null;
  return validationFailure({
    category: "framing",
    index,
    line: index + 1,
    logicalArtifact: "records.ndjson",
    message: "Record segment must not be empty or whitespace-only."
  });
}

function parseJson(
  text: string,
  diagnostic: Omit<MachinePublicationValidationDiagnostic, "category">
): Parsed<unknown> {
  try {
    return validationSuccess(JSON.parse(text) as unknown);
  } catch {
    return validationFailure({ category: "syntax", ...diagnostic });
  }
}

function decode(
  bytes: Uint8Array,
  logicalArtifact: MachinePublicationValidationDiagnostic["logicalArtifact"]
): Parsed<string> {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return validationFailure({
      category: "decoding",
      logicalArtifact,
      message: "Leading UTF-8 BOM is not allowed."
    });
  }
  try {
    return validationSuccess(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return validationFailure({
      category: "decoding",
      logicalArtifact,
      message: "Input is not valid UTF-8."
    });
  }
}

function countLf(bytes: Uint8Array): number {
  let count = 0;
  for (const byte of bytes) if (byte === 0x0a) count += 1;
  return count;
}
