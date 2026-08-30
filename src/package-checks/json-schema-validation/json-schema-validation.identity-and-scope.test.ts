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
  it("applies all three Check-level root identity modes without exposing document IDs", async () => {
    const root = temporaryRoot();
    try {
      const configurationId = "https://schemas.example.test/configured";
      writeJson(root, "configuration.json", {
        $id: "https://private.example.test/raw?credential=redacted",
        type: "object"
      });
      writeJson(
        root,
        "mismatch.json",
        strictSchema("https://private.example.test/different", { type: "object" })
      );
      writeJson(
        root,
        "document.json",
        strictSchema("https://document.example.test/root", { type: "object" })
      );
      writeJson(root, "boolean.json", true);
      writeJson(root, "instance.json", {});

      const configurationAuthoritative = await runJsonSchemaValidation({
        options: offlineOptions({
          bindings: [
            { id: "configuration", instancePath: "instance.json", schemaId: configurationId }
          ],
          schemaIdentity: { mode: "configuration-authoritative" },
          schemas: [{ id: configurationId, path: "configuration.json" }]
        }),
        root
      });
      assert.equal(configurationAuthoritative.result.status, "passed");

      const booleanConfigurationAuthoritative = await runJsonSchemaValidation({
        options: offlineOptions({
          bindings: [
            {
              id: "boolean",
              instancePath: "instance.json",
              schemaId: "urn:vibe-check:boolean-label"
            }
          ],
          schemaIdentity: { mode: "configuration-authoritative" },
          schemas: [{ id: "urn:vibe-check:boolean-label", path: "boolean.json" }]
        }),
        root
      });
      assert.equal(booleanConfigurationAuthoritative.result.status, "passed");

      const documentAuthoritative = await runJsonSchemaValidation({
        options: offlineOptions({
          bindings: [
            {
              id: "document",
              instancePath: "instance.json",
              schemaId: "urn:vibe-check:document-label"
            }
          ],
          schemaIdentity: { mode: "document-authoritative" },
          schemas: [{ id: "urn:vibe-check:document-label", path: "document.json" }]
        }),
        root
      });
      assert.equal(documentAuthoritative.result.status, "passed");

      const mismatch = await runJsonSchemaValidation({
        options: offlineOptions({
          bindings: [{ id: "mismatch", instancePath: "instance.json", schemaId: configurationId }],
          schemas: [{ id: configurationId, path: "mismatch.json" }]
        }),
        root
      });
      assert.deepEqual(
        mismatch.records.map((record) => record.data),
        [
          {
            kind: "schema-compile",
            path: "mismatch.json",
            reason: "schema-id-mismatch",
            schemaId: configurationId
          }
        ]
      );
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("reports scope/document failures, blocks dependent bindings, and leaves zero bindings not applicable", async () => {
    const root = temporaryRoot();
    try {
      const schemaId = "https://schemas.example.test/schema";
      writeJson(root, "instance.json", {});
      const options = offlineOptions({
        bindings: [{ id: "instance", instancePath: "instance.json", schemaId }],
        schemas: [{ id: schemaId, path: "missing-schema.json" }]
      });
      const scopeFailure = await runJsonSchemaValidation({ options, root });
      assert.deepEqual(scopeFailure.result, {
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
        scopeFailure.records.map((record) => record.data),
        [
          {
            kind: "schema-document",
            path: "missing-schema.json",
            reason: "out-of-scope",
            schemaId
          }
        ]
      );
      assert.deepEqual(
        await runJsonSchemaValidation({
          options: offlineOptions({
            bindings: [],
            schemas: [{ id: schemaId, path: "missing-schema.json" }]
          }),
          root
        }),
        { records: [], result: { status: "not-applicable", reason: { code: "no-bindings" } } }
      );
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});
