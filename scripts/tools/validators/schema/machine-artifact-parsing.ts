import type { ErrorObject, ValidateFunction } from "ajv";

import { CURRENT_SCHEMAS } from "../config.ts";
import { failure } from "./machine-artifact-diagnostics.ts";
import {
  RECORDS_ARTIFACT,
  RUN_ARTIFACT,
  type ParsedArtifactResult,
  type RecordShape,
  type RunShape
} from "./machine-artifact-types.ts";
import {
  compileRegisteredSchema,
  createCurrentSchemaAjv
} from "./registry.ts";

const UTF8_BOM = [0xef, 0xbb, 0xbf] as const;

interface CurrentSchemaValidators {
  readonly record: ValidateFunction;
  readonly run: ValidateFunction;
}

export function validateRun(
  bytes: Uint8Array,
  artifactRoot: string,
  schemas: CurrentSchemaValidators
): ParsedArtifactResult<RunShape> {
  const decoded = decode(bytes, artifactRoot, RUN_ARTIFACT);
  if (!decoded.ok) return decoded;
  let value: unknown;
  try {
    value = JSON.parse(decoded.value) as unknown;
  } catch {
    return failure(artifactRoot, RUN_ARTIFACT, {
      category: "syntax",
      message: "Run artifact must contain exactly one JSON value."
    });
  }
  const validate = schemas.run;
  if (!validate(value)) {
    const pointer = schemaErrorPointer(validate.errors);
    return failure(artifactRoot, RUN_ARTIFACT, {
      category: "schema",
      message: `Run artifact does not match the checked-in current schema at ${pointer || "/"}.`,
      pointer
    });
  }
  return { ok: true, value: value as RunShape };
}

export function validateRecordStream(
  bytes: Uint8Array,
  artifactRoot: string,
  schemas: CurrentSchemaValidators
): ParsedArtifactResult<RecordShape[]> {
  if (bytes.byteLength === 0) return { ok: true, value: [] };
  if (bytes[bytes.byteLength - 1] !== 0x0a) {
    return failure(artifactRoot, RECORDS_ARTIFACT, {
      category: "framing",
      line: countLf(bytes) + 1,
      message: "Non-empty record stream must end with exactly one LF."
    });
  }
  const decoded = decode(bytes, artifactRoot, RECORDS_ARTIFACT);
  if (!decoded.ok) return decoded;
  const records: RecordShape[] = [];
  const segments = decoded.value.slice(0, -1).split("\n");
  for (const [index, segment] of segments.entries()) {
    if (segment.length === 0 || /^[\t\r ]+$/.test(segment)) {
      return failure(artifactRoot, RECORDS_ARTIFACT, {
        category: "framing",
        index,
        line: index + 1,
        message: "Record segment must not be empty or whitespace-only."
      });
    }
    let value: unknown;
    try {
      value = JSON.parse(segment) as unknown;
    } catch {
      return failure(artifactRoot, RECORDS_ARTIFACT, {
        category: "syntax",
        index,
        line: index + 1,
        message: "Record segment must contain exactly one JSON value."
      });
    }
    const validate = schemas.record;
    if (!validate(value)) {
      const pointer = schemaErrorPointer(validate.errors);
      return failure(artifactRoot, RECORDS_ARTIFACT, {
        category: "schema",
        index,
        line: index + 1,
        message: `Record does not match the checked-in current schema at ${pointer || "/"}.`,
        pointer
      });
    }
    records.push(value as RecordShape);
  }
  return { ok: true, value: records };
}

export function createCurrentSchemaValidators(): CurrentSchemaValidators {
  const ajv = createCurrentSchemaAjv();
  return {
    record: compileRegisteredSchema(ajv, CURRENT_SCHEMAS.record),
    run: compileRegisteredSchema(ajv, CURRENT_SCHEMAS.run)
  };
}

function decode(
  bytes: Uint8Array,
  artifactRoot: string,
  logicalArtifact: string
): ParsedArtifactResult<string> {
  if (UTF8_BOM.every((byte, index) => bytes[index] === byte)) {
    return failure(artifactRoot, logicalArtifact, {
      category: "decoding",
      message: "Leading UTF-8 BOM is not allowed."
    });
  }
  try {
    return {
      ok: true,
      value: new TextDecoder("utf-8", { fatal: true }).decode(bytes)
    };
  } catch {
    return failure(artifactRoot, logicalArtifact, {
      category: "decoding",
      message: "Input is not valid UTF-8."
    });
  }
}

function schemaErrorPointer(
  errors: readonly ErrorObject[] | null | undefined
): string {
  const error = errors?.find(({ keyword }) => keyword !== "anyOf") ?? errors?.[0];
  if (!error) return "";
  if (error.keyword === "required" && typeof error.params.missingProperty === "string") {
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

function countLf(bytes: Uint8Array): number {
  let count = 0;
  for (const byte of bytes) if (byte === 0x0a) count += 1;
  return count;
}
