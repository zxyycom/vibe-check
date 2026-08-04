import { strict as assert } from "node:assert";

import { Ajv2020 } from "ajv/dist/2020.js";

import {
  MACHINE_METRICS_V1_SCHEMA,
  MACHINE_METRICS_V1_SCHEMA_ID,
  MACHINE_METRICS_V1_SCHEMA_PATH,
  MACHINE_WARNING_V1_SCHEMA,
  MACHINE_WARNING_V1_SCHEMA_ID,
  MACHINE_WARNING_V1_SCHEMA_PATH
} from "../../../../machine-output.ts";
import {
  collectPropertySchemas,
  collectSchemaRefs,
  collectTypedSchemaNodes,
  isRecord,
  schemaRecord
} from "./machine-output.fixtures.ts";

export function assertMachineSchemaIdentityAndCompilation(): void {
  const metricsSchema = schemaRecord(MACHINE_METRICS_V1_SCHEMA);
  const warningSchema = schemaRecord(MACHINE_WARNING_V1_SCHEMA);
  assert.equal(
    metricsSchema.$schema,
    "https://json-schema.org/draft/2020-12/schema"
  );
  assert.equal(metricsSchema.$id, MACHINE_METRICS_V1_SCHEMA_ID);
  assert.equal(
    MACHINE_METRICS_V1_SCHEMA_PATH,
    "docs/schemas/vibe-check-metrics.schema.json"
  );
  assert.equal(
    warningSchema.$schema,
    "https://json-schema.org/draft/2020-12/schema"
  );
  assert.equal(warningSchema.$id, MACHINE_WARNING_V1_SCHEMA_ID);
  assert.equal(
    MACHINE_WARNING_V1_SCHEMA_PATH,
    "docs/schemas/vibe-check-warning.schema.json"
  );

  const ajv = new Ajv2020({ allErrors: true, strict: true });
  ajv.addSchema(MACHINE_WARNING_V1_SCHEMA);
  assert.doesNotThrow(() => ajv.compile(MACHINE_METRICS_V1_SCHEMA));
}

export function assertMachineSchemaFieldConstraints(): void {
  const metricsSchema = schemaRecord(MACHINE_METRICS_V1_SCHEMA);
  const warningSchema = schemaRecord(MACHINE_WARNING_V1_SCHEMA);
  assert.equal(metricsSchema.additionalProperties, false);
  assert.equal(warningSchema.additionalProperties, false);
  assert.deepEqual(
    [...MACHINE_METRICS_V1_SCHEMA.required].sort(),
    [
      "aggregates", "baseline", "comparisonStatus", "currentFingerprints",
      "duplicateCode", "fileMetrics", "functionMetrics", "gate", "metadata",
      "scanCompleteness", "trends", "warnings"
    ].sort()
  );
  assert.deepEqual(
    [...MACHINE_WARNING_V1_SCHEMA.required].sort(),
    [
      "baselineValue", "codeArea", "comparisonBasis", "deltaValue",
      "isChanged", "level", "line", "message", "metric", "path", "ruleId",
      "schemaVersion", "sourceTool", "value"
    ].sort()
  );
  assert.equal(
    MACHINE_WARNING_V1_SCHEMA.properties.schemaVersion.const,
    "vibe-check.warning.v1"
  );
  assert.deepEqual(MACHINE_WARNING_V1_SCHEMA.properties.level.enum, [
    "info", "warning", "error"
  ]);
  assert.deepEqual(
    MACHINE_WARNING_V1_SCHEMA.properties.line.anyOf.map(({ type }) => type),
    ["integer", "null"]
  );
  assert.equal(
    schemaRecord(MACHINE_WARNING_V1_SCHEMA.properties.line.anyOf[0]).minimum,
    1
  );
  assert.deepEqual(
    MACHINE_WARNING_V1_SCHEMA.properties.baselineValue.anyOf.map(
      ({ type }) => type
    ),
    ["number", "null"]
  );
  assert.equal(MACHINE_WARNING_V1_SCHEMA.properties.value.type, "number");
  assert.equal(
    Object.hasOwn(MACHINE_WARNING_V1_SCHEMA.properties, "acceptedReason"),
    true
  );
  assert.equal(
    (MACHINE_WARNING_V1_SCHEMA.required as readonly string[]).includes(
      "acceptedReason"
    ),
    false
  );
}

export function assertMachineFingerprintSchemaAndWarningRefs(): void {
  const fingerprintMap = schemaRecord(
    MACHINE_METRICS_V1_SCHEMA.properties.currentFingerprints
  );
  const fingerprintValue = schemaRecord(fingerprintMap.additionalProperties);
  assert.match(String(fingerprintMap.description), /dynamic map/i);
  assert.equal(fingerprintValue.type, "object");
  assert.equal(fingerprintValue.additionalProperties, false);
  assert.ok(
    collectSchemaRefs(MACHINE_METRICS_V1_SCHEMA).filter(
      (reference) => reference === MACHINE_WARNING_V1_SCHEMA_ID
    ).length >= 4
  );
}

export function assertMachineSchemaDescriptions(schema: unknown): void {
  for (const objectSchema of collectTypedSchemaNodes(schema, "object")) {
    if (objectSchema.additionalProperties !== false) {
      assert.match(String(objectSchema.description), /dynamic map/i);
      assert.equal(isRecord(objectSchema.additionalProperties), true);
      continue;
    }
    assert.equal(objectSchema.additionalProperties, false);
  }
  for (const arraySchema of collectTypedSchemaNodes(schema, "array")) {
    assert.match(String(arraySchema.description), /order/i);
  }
  for (const propertySchema of collectPropertySchemas(schema)) {
    assert.equal(typeof propertySchema.description, "string");
    assert.ok(String(propertySchema.description).length > 0);
  }
}
