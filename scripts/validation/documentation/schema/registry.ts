import { Ajv2020 } from "ajv/dist/2020.js";
import type { AnySchema, ValidateFunction } from "ajv";

import { isRecord } from "../../../value-guards.ts";
import { ExpectedDocsValidationFailure, expectedDocsValidationFailure } from "../diagnostics.ts";
import { CURRENT_SCHEMAS, HISTORICAL_SCHEMAS } from "../task-contract.ts";
import { readJson } from "../json/files.ts";
import { JsonSyntaxError } from "../json/value.ts";

export function formatAjvErrors(validate: Pick<ValidateFunction, "errors">): string {
  return (validate.errors ?? [])
    .map((error) => `${error.instancePath || "/"} ${error.message}`)
    .join("; ");
}

export function createCurrentSchemaAjv(): Ajv2020 {
  const ajv = createStrictAjv();
  for (const schemaRelPath of Object.values(CURRENT_SCHEMAS)) {
    const schema = readSchema(schemaRelPath);
    try {
      ajv.addSchema(schema);
    } catch {
      throw schemaFailure("schema-registration-invalid", schemaRelPath);
    }
  }
  return ajv;
}

export function createHistoricalSchemaAjv(): Ajv2020 {
  const ajv = createStrictAjv();
  for (const schemaRelPath of Object.values(HISTORICAL_SCHEMAS)) {
    const schema = readSchema(schemaRelPath);
    try {
      ajv.addSchema(schema);
    } catch {
      throw schemaFailure("schema-registration-invalid", schemaRelPath);
    }
  }
  return ajv;
}

export function compileRegisteredSchema<Value>(
  ajv: Ajv2020,
  schemaRelPath: string
): ValidateFunction<Value> {
  const schema = readSchema(schemaRelPath);
  const schemaId = isRecord(schema) && typeof schema.$id === "string" ? schema.$id : null;
  try {
    if (!schemaId) return ajv.compile<Value>(schema);
    const validate = ajv.getSchema<Value>(schemaId);
    if (validate === undefined) throw schemaFailure("schema-not-registered", schemaRelPath);
    return validate;
  } catch (error: unknown) {
    if (error instanceof ExpectedDocsValidationFailure) throw error;
    throw schemaFailure("schema-compile-invalid", schemaRelPath);
  }
}

function readSchema(schemaRelPath: string): AnySchema {
  let schema: ReturnType<typeof readJson>;
  try {
    schema = readJson(schemaRelPath);
  } catch (error: unknown) {
    if (error instanceof JsonSyntaxError) throw schemaFailure("schema-json-invalid", schemaRelPath);
    throw error;
  }
  if (!isRecord(schema)) throw schemaFailure("schema-root-invalid", schemaRelPath);
  return schema;
}

function schemaFailure(kind: string, path: string): Error {
  return expectedDocsValidationFailure([
    Object.freeze({
      data: Object.freeze({ kind, path }),
      id: `schema:${kind}:${encodeURIComponent(path)}`,
      presentation: `${path}: schema validation ${kind.replaceAll("-", " ")}.`
    })
  ]);
}

function createStrictAjv(): Ajv2020 {
  return new Ajv2020({ allErrors: true, strict: true });
}
