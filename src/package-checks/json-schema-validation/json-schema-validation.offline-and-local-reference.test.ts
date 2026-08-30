import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { describe, it } from "node:test";

import {
  offlineOptions,
  runJsonSchemaValidation,
  strictSchema,
  temporaryRoot,
  withFetch,
  writeJson
} from "./json-schema-validation.test-support.ts";

describe("JSON Schema validation default Check", () => {
  it("keeps the default offline and fails an unapproved reference without calling fetch", async () => {
    const root = temporaryRoot();
    let fetchCalls = 0;
    try {
      const schemaId = "https://schemas.example.test/root";
      writeJson(
        root,
        "schema.json",
        strictSchema(schemaId, { $ref: "https://remote.example.test/common.json" })
      );
      writeJson(root, "instance.json", {});
      await withFetch(
        async () => {
          fetchCalls += 1;
          throw new Error("fetch must not be called");
        },
        async () => {
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
              blockedBindingCount: 1,
              invalidBindingCount: 0,
              issueCount: 1,
              issuesTruncated: false,
              reportedIssueCount: 1,
              schemaCount: 1,
              validBindingCount: 0
            },
            messages: [
              {
                code: "schema-validation-issues",
                level: "error",
                message: "1 schema validation issue(s) were found; inspect this Check's Records."
              }
            ]
          });
          assert.deepEqual(
            observed.records.map((record) => record.data),
            [
              {
                kind: "schema-compile",
                path: "schema.json",
                reason: "unapproved-reference",
                schemaId
              }
            ]
          );
        }
      );
      assert.equal(fetchCalls, 0);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("resolves a registered local schema before requiring an external source", async () => {
    const root = temporaryRoot();
    let fetchCalls = 0;
    try {
      const rootSchemaId = "https://schemas.example.test/root";
      const commonSchemaId = "https://schemas.example.test/common";
      writeJson(root, "root.json", strictSchema(rootSchemaId, { $ref: commonSchemaId }));
      writeJson(
        root,
        "common.json",
        strictSchema(commonSchemaId, { properties: { value: { type: "string" } }, type: "object" })
      );
      writeJson(root, "instance.json", { value: 1 });
      await withFetch(
        async () => {
          fetchCalls += 1;
          throw new Error("fetch must not be called");
        },
        async () => {
          const observed = await runJsonSchemaValidation({
            options: offlineOptions({
              bindings: [{ id: "instance", instancePath: "instance.json", schemaId: rootSchemaId }],
              schemas: [
                { id: rootSchemaId, path: "root.json" },
                { id: commonSchemaId, path: "common.json" }
              ]
            }),
            root
          });
          assert.deepEqual(observed.result, {
            status: "failed",
            data: {
              bindingCount: 1,
              blockedBindingCount: 0,
              invalidBindingCount: 1,
              issueCount: 1,
              issuesTruncated: false,
              reportedIssueCount: 1,
              schemaCount: 2,
              validBindingCount: 0
            },
            messages: [
              {
                code: "schema-validation-issues",
                level: "error",
                message: "1 schema validation issue(s) were found; inspect this Check's Records."
              }
            ]
          });
          assert.deepEqual(
            observed.records.map((record) => record.data),
            [
              {
                bindingId: "instance",
                keyword: "type",
                kind: "keyword-violation",
                path: "instance.json",
                pointer: "/value",
                schemaId: rootSchemaId
              }
            ]
          );
        }
      );
      assert.equal(fetchCalls, 0);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});
