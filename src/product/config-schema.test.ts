import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { Ajv2020 } from "ajv/dist/2020.js";
import type { AnySchema } from "ajv";

import {
  SEMANTIC_PROJECT_CONFIG_V1_EDITOR_SCHEMA,
  SEMANTIC_PROJECT_CONFIG_V1_SCHEMA_ID,
  SEMANTIC_PROJECT_CONFIG_V1_SCHEMA_PATH,
  serializeSemanticProjectConfigV1EditorSchema,
  SemanticProjectConfigV1Schema,
  type SemanticProjectConfigV1EditorSchema
} from "./config-schema.ts";
import { parseSemanticProjectConfigV1 } from "./config-validation.ts";

const CANONICAL_CONFIG_EXAMPLE_PATH =
  "docs/examples/json/vibe-check-config.json";

describe("semantic project config v1 schema", () => {
  it("exposes only closed product-semantic fields", () => {
    assert.deepEqual(
      Object.keys(SemanticProjectConfigV1Schema.properties).sort(),
      [
        "acceptedWarnings",
        "artifactDir",
        "cacheDir",
        "checks",
        "codeAreas",
        "excludeDirs",
        "generatedFiles",
        "include",
        "report",
        "version"
      ]
    );

    const propertyNames = schemaPropertyNames(SemanticProjectConfigV1Schema);
    for (const field of [
      "$schema",
      "args",
      "command",
      "formatByCodeArea",
      "jscpd",
      "lizard",
      "maxParallelTasks",
      "ruleId",
      "scc",
      "sourceTool",
      "tools"
    ]) {
      assert.ok(!propertyNames.has(field), `unexpected public schema field ${field}`);
    }
    assertClosedObjectSchemas(SemanticProjectConfigV1Schema);
    assert.deepEqual(
      SemanticProjectConfigV1Schema.properties.acceptedWarnings.items.properties
        .checkId.enum,
      [
        "file-code-lines",
        "function-cyclomatic-complexity",
        "function-code-lines",
        "function-parameter-count",
        "duplicate-code"
      ]
    );
  });

  it("publishes the editor schema and canonical config from the runtime source", () => {
    const typedProjection: SemanticProjectConfigV1EditorSchema =
      SEMANTIC_PROJECT_CONFIG_V1_EDITOR_SCHEMA;
    const publishedSchemaBytes = readFileSync(
      SEMANTIC_PROJECT_CONFIG_V1_SCHEMA_PATH,
      "utf8"
    );
    const publishedSchema = JSON.parse(publishedSchemaBytes) as AnySchema;
    const canonicalInput = JSON.parse(
      readFileSync(CANONICAL_CONFIG_EXAMPLE_PATH, "utf8")
    ) as unknown;

    assert.strictEqual(typedProjection, SEMANTIC_PROJECT_CONFIG_V1_EDITOR_SCHEMA);
    assert.equal(
      publishedSchemaBytes,
      serializeSemanticProjectConfigV1EditorSchema()
    );
    assert.deepEqual(publishedSchema, SEMANTIC_PROJECT_CONFIG_V1_EDITOR_SCHEMA);
    assert.equal(
      SEMANTIC_PROJECT_CONFIG_V1_EDITOR_SCHEMA.$schema,
      "https://json-schema.org/draft/2020-12/schema"
    );
    assert.equal(
      SEMANTIC_PROJECT_CONFIG_V1_EDITOR_SCHEMA.$id,
      SEMANTIC_PROJECT_CONFIG_V1_SCHEMA_ID
    );
    assert.equal(Object.hasOwn(SemanticProjectConfigV1Schema, "$schema"), false);

    const validate = new Ajv2020({ allErrors: true, strict: true }).compile(
      publishedSchema
    );
    assert.equal(validate(canonicalInput), true, JSON.stringify(validate.errors));
    assert.deepEqual(parseSemanticProjectConfigV1(canonicalInput), canonicalInput);
  });
});

function schemaPropertyNames(schema: unknown): Set<string> {
  const names = new Set<string>();
  visitSchema(schema, (value) => {
    if (!isRecord(value.properties)) return;
    for (const name of Object.keys(value.properties)) names.add(name);
  });
  return names;
}

function assertClosedObjectSchemas(schema: unknown): void {
  visitSchema(schema, (value) => {
    if (!isRecord(value.properties)) return;
    assert.equal(
      value.additionalProperties,
      false,
      `schema object with properties ${Object.keys(value.properties).join(", ")} is open`
    );
  });
}

function visitSchema(
  schema: unknown,
  visit: (schema: Record<string, unknown>) => void
): void {
  if (!isRecord(schema)) return;
  visit(schema);
  for (const keyword of ["items", "properties", "patternProperties"]) {
    const nested = schema[keyword];
    if (Array.isArray(nested)) {
      for (const value of nested) visitSchema(value, visit);
    } else if (isRecord(nested)) {
      if (keyword === "properties" || keyword === "patternProperties") {
        for (const value of Object.values(nested)) visitSchema(value, visit);
      } else {
        visitSchema(nested, visit);
      }
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
