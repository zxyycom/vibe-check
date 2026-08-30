import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { describe, it } from "node:test";

import {
  offlineOptions,
  runJsonSchemaValidation,
  strictSchema,
  temporaryRoot,
  writeJson
} from "./json-schema-validation.test-support.ts";

describe("JSON Schema validation default Check", () => {
  it("accepts standard conditional keywords and format annotations without extra plugins", async () => {
    const root = temporaryRoot();
    try {
      const schemaId = "https://schemas.example.test/annotation";
      writeJson(
        root,
        "schema.json",
        strictSchema(schemaId, { properties: { email: { format: "email", type: "string" } } })
      );
      writeJson(root, "instance.json", { email: "not-an-email" });
      const observed = await runJsonSchemaValidation({
        options: offlineOptions({
          bindings: [{ id: "instance", instancePath: "instance.json", schemaId }],
          schemas: [{ id: schemaId, path: "schema.json" }]
        }),
        root
      });
      assert.deepEqual(observed, {
        records: [],
        result: {
          status: "passed",
          data: {
            bindingCount: 1,
            blockedBindingCount: 0,
            invalidBindingCount: 0,
            issueCount: 0,
            issuesTruncated: false,
            reportedIssueCount: 0,
            schemaCount: 1,
            validBindingCount: 1
          }
        }
      });
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
  it("caps only displayed issues while retaining the full failed assessment", async () => {
    const root = temporaryRoot();
    try {
      const schemaId = "https://schemas.example.test/many";
      const properties = Object.fromEntries(
        Array.from({ length: 101 }, (_, index) => [`field${index}`, { type: "string" }])
      );
      writeJson(
        root,
        "schema.json",
        strictSchema(schemaId, {
          properties,
          required: Object.keys(properties),
          type: "object"
        })
      );
      writeJson(root, "instance.json", {});
      const observed = await runJsonSchemaValidation({
        options: offlineOptions({
          bindings: [{ id: "instance", instancePath: "instance.json", schemaId }],
          schemas: [{ id: schemaId, path: "schema.json" }]
        }),
        root
      });
      assert.deepEqual(observed.result, {
        status: "failed",
        data: {
          bindingCount: 1,
          blockedBindingCount: 0,
          invalidBindingCount: 1,
          issueCount: 101,
          issuesTruncated: true,
          reportedIssueCount: 100,
          schemaCount: 1,
          validBindingCount: 0
        },
        messages: [
          {
            code: "schema-validation-issues",
            level: "error",
            message:
              "101 schema validation issue(s) were found; inspect this Check's Records (the published Record list is truncated)."
          }
        ]
      });
      assert.equal(observed.records.length, 100);
      assert.equal(
        observed.records.every(
          (record) =>
            record.data && "kind" in record.data && record.data.kind === "keyword-violation"
        ),
        true
      );
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});
