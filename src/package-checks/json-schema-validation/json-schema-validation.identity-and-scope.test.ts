import assert from "node:assert/strict";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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
  it("applies all three Check-level root identity modes without exposing document IDs", async () => {
    const root = temporaryRoot();
    try {
      const configurationId = "https://schemas.example.test/configured";
      const documentId = "https://private.example.test/document";
      const referenceDocumentId = "https://private.example.test/reference";
      const referenceLabel = "urn:vibe-check:reference-label";
      writeJson(root, "configuration.json", {
        $id: "https://private.example.test/raw?credential=redacted",
        type: "object"
      });
      writeJson(
        root,
        "mismatch.json",
        strictSchema("https://private.example.test/different", { type: "object" })
      );
      writeJson(root, "document.json", strictSchema(documentId, { type: "string" }));
      writeJson(root, "reference.json", strictSchema(referenceDocumentId, { $ref: documentId }));
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

      const referenceRegistry = {
        bindings: [{ id: "document", instancePath: "instance.json", schemaId: referenceLabel }],
        schemas: [
          { id: "urn:vibe-check:document-label", path: "document.json" },
          { id: referenceLabel, path: "reference.json" }
        ]
      };
      let fetchCalls = 0;
      const identityComparison = await withFetch(
        async () => {
          fetchCalls += 1;
          return new Response("{}");
        },
        async () => ({
          document: await runJsonSchemaValidation({
            options: offlineOptions({
              ...referenceRegistry,
              schemaIdentity: { mode: "document-authoritative" }
            }),
            root
          }),
          configuration: await runJsonSchemaValidation({
            options: offlineOptions({
              ...referenceRegistry,
              schemaIdentity: { mode: "configuration-authoritative" }
            }),
            root
          })
        })
      );
      assert.equal(fetchCalls, 0);
      assert.equal(identityComparison.document.result.status, "failed");
      assert.deepEqual(identityComparison.document.result.data, {
        bindingCount: 1,
        blockedBindingCount: 0,
        invalidBindingCount: 1,
        issueCount: 1,
        issuesTruncated: false,
        reportedIssueCount: 1,
        schemaCount: 2,
        validBindingCount: 0
      });
      assert.deepEqual(
        identityComparison.document.records.map(({ data }) => data),
        [
          {
            bindingId: "document",
            kind: "keyword-violation",
            keyword: "type",
            path: "instance.json",
            pointer: "",
            schemaId: referenceLabel
          }
        ]
      );
      assert.equal(identityComparison.configuration.result.status, "failed");
      assert.deepEqual(identityComparison.configuration.result.data, {
        bindingCount: 1,
        blockedBindingCount: 1,
        invalidBindingCount: 0,
        issueCount: 1,
        issuesTruncated: false,
        reportedIssueCount: 1,
        schemaCount: 2,
        validBindingCount: 0
      });
      assert.deepEqual(
        identityComparison.configuration.records.map(({ data }) => data),
        [
          {
            kind: "schema-compile",
            path: "reference.json",
            reason: "unapproved-reference",
            schemaId: referenceLabel
          }
        ]
      );

      const mismatch = await runJsonSchemaValidation({
        options: offlineOptions({
          bindings: [{ id: "mismatch", instancePath: "instance.json", schemaId: configurationId }],
          schemas: [{ id: configurationId, path: "mismatch.json" }]
        }),
        root
      });
      assert.equal(mismatch.result.status, "failed");
      assert.deepEqual(mismatch.result.data, {
        bindingCount: 1,
        blockedBindingCount: 1,
        invalidBindingCount: 0,
        issueCount: 1,
        issuesTruncated: false,
        reportedIssueCount: 1,
        schemaCount: 1,
        validBindingCount: 0
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
      const surface = JSON.stringify({
        configurationAuthoritative,
        booleanConfigurationAuthoritative,
        identityComparison,
        mismatch
      });
      assert.equal(surface.includes("private.example.test"), false);
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

  it("rejects duplicate local schema and instance members before keyword validation", async () => {
    const root = temporaryRoot();
    const schemaId = "https://schemas.example.test/schema";
    try {
      for (const scenario of [
        {
          blockedBindingCount: 1,
          kind: "schema-document",
          path: "schema.json",
          reason: "duplicate-key",
          source: `{"$id":"${schemaId}","type":"object","type":"object"}`
        },
        {
          blockedBindingCount: 0,
          kind: "instance-document",
          path: "instance.json",
          reason: "duplicate-key",
          source: '{"a":0,"\\u0061":0}'
        },
        {
          blockedBindingCount: 0,
          kind: "instance-document",
          path: "instance.json",
          reason: "invalid-json",
          source: '{"a":0,"a":0,}'
        }
      ] as const) {
        writeJson(root, "schema.json", strictSchema(schemaId, { type: "object" }));
        writeJson(root, "instance.json", {});
        writeFileSync(join(root, scenario.path), scenario.source);
        const observed = await runJsonSchemaValidation({
          options: offlineOptions({
            bindings: [{ id: "instance", instancePath: "instance.json", schemaId }],
            schemas: [{ id: schemaId, path: "schema.json" }]
          }),
          root
        });
        assert.equal(observed.result.status, "failed");
        assert.deepEqual(observed.result.data, {
          bindingCount: 1,
          blockedBindingCount: scenario.blockedBindingCount,
          invalidBindingCount: 1 - scenario.blockedBindingCount,
          issueCount: 1,
          issuesTruncated: false,
          reportedIssueCount: 1,
          schemaCount: 1,
          validBindingCount: 0
        });
        assert.deepEqual(
          observed.records.map((record) => record.data),
          [
            {
              ...(scenario.kind === "instance-document" ? { bindingId: "instance" } : {}),
              kind: scenario.kind,
              path: scenario.path,
              reason: scenario.reason,
              schemaId
            }
          ]
        );
      }
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});
