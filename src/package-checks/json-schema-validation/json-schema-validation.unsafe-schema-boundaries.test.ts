import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { describe, it } from "node:test";

import {
  offlineOptions,
  runJsonSchemaValidation,
  SINGLE_BLOCKED_SCHEMA_ASSESSMENT,
  strictSchema,
  temporaryRoot,
  withFetch,
  writeJson
} from "./json-schema-validation.test-support.ts";

describe("JSON Schema validation default Check", () => {
  it("rejects credential-bearing, dynamic, recursive, and async schemas before any fetch or native diagnostic can escape", async () => {
    const root = temporaryRoot();
    let calls = 0;
    try {
      writeJson(root, "instance.json", {});
      await withFetch(
        async () => {
          calls += 1;
          throw new Error("unexpected fetch");
        },
        async () => {
          for (const scenario of [
            { id: "dynamic", schema: { $dynamicRef: "#node" }, reason: "unsupported-reference" },
            {
              id: "credential",
              schema: { $ref: "https://user:credential@schemas.example.test/catalog/common.json" },
              reason: "unsupported-reference"
            },
            { id: "recursive", schema: { $recursiveRef: "#" }, reason: "unsupported-reference" },
            { id: "async", schema: { $async: true, type: "string" }, reason: "invalid-schema" }
          ]) {
            const schemaId = "https://schemas.example.test/root";
            writeJson(root, "schema.json", strictSchema(schemaId, scenario.schema));
            const observed = await runJsonSchemaValidation({
              options: offlineOptions({
                bindings: [{ id: "instance", instancePath: "instance.json", schemaId }],
                schemas: [{ id: schemaId, path: "schema.json" }]
              }),
              root
            });
            assert.deepEqual(observed.result, SINGLE_BLOCKED_SCHEMA_ASSESSMENT, scenario.id);
            assert.deepEqual(
              observed.records.map((record) => record.data),
              [{ kind: "schema-compile", path: "schema.json", reason: scenario.reason, schemaId }],
              scenario.id
            );
            assert.equal(JSON.stringify(observed).includes("credential"), false, scenario.id);
          }
        }
      );
      assert.equal(calls, 0);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});
