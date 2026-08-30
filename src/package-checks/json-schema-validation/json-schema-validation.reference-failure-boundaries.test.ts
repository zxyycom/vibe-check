import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { describe, it } from "node:test";

import {
  DEFAULT_FILES,
  runJsonSchemaValidation,
  strictSchema,
  temporaryRoot,
  withFetch,
  writeJson
} from "./json-schema-validation.test-support.ts";

describe("JSON Schema validation default Check", () => {
  it("maps an allowlisted transport failure to unavailable without remote detail", async () => {
    const root = temporaryRoot();
    try {
      const schemaId = "https://schemas.example.test/root";
      const remoteId = "https://schemas.example.test/catalog/common.json";
      writeJson(root, "schema.json", strictSchema(schemaId, { $ref: remoteId }));
      writeJson(root, "instance.json", {});
      await withFetch(
        async () => new Response("not available", { status: 503 }),
        async () => {
          const observed = await runJsonSchemaValidation({
            options: Object.freeze({
              bindings: [{ id: "instance", instancePath: "instance.json", schemaId }],
              files: DEFAULT_FILES,
              maximumBytes: 1_048_576,
              referenceResolution: {
                mode: "allowlisted",
                sources: [
                  {
                    id: "urn:vibe-check:source:schemas-example",
                    kind: "https",
                    origin: "https://schemas.example.test",
                    pathPrefix: "/catalog/"
                  }
                ]
              },
              schemaIdentity: { mode: "require-match" },
              schemas: [{ id: schemaId, path: "schema.json" }]
            } as const),
            root
          });
          assert.deepEqual(observed, {
            records: [],
            result: {
              status: "unavailable",
              reason: { code: "reference-transport-unavailable" },
              messages: [
                {
                  code: "reference-transport-unavailable",
                  level: "error",
                  message:
                    "An allowlisted HTTPS schema reference could not be loaded; check the allowlist, network, and remote availability."
                }
              ]
            }
          });
        }
      );
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("treats an allowlisted redirect as a safe schema failure without following it", async () => {
    const root = temporaryRoot();
    try {
      const schemaId = "https://schemas.example.test/root";
      const remoteId = "https://schemas.example.test/catalog/common.json";
      writeJson(root, "schema.json", strictSchema(schemaId, { $ref: remoteId }));
      writeJson(root, "instance.json", {});
      await withFetch(
        async () =>
          new Response(null, {
            headers: { location: "https://private.example.test/secret" },
            status: 302
          }),
        async () => {
          const observed = await runJsonSchemaValidation({
            options: Object.freeze({
              bindings: [{ id: "instance", instancePath: "instance.json", schemaId }],
              files: DEFAULT_FILES,
              maximumBytes: 1_048_576,
              referenceResolution: {
                mode: "allowlisted",
                sources: [
                  {
                    id: "urn:vibe-check:source:schemas-example",
                    kind: "https",
                    origin: "https://schemas.example.test",
                    pathPrefix: "/catalog/"
                  }
                ]
              },
              schemaIdentity: { mode: "require-match" },
              schemas: [{ id: schemaId, path: "schema.json" }]
            } as const),
            root
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
          assert.equal(JSON.stringify(observed).includes("private.example.test"), false);
        }
      );
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});
