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
  it("rejects credential-bearing, dynamic, recursive, and async schemas before any fetch or native diagnostic can escape", async () => {
    const root = temporaryRoot();
    let calls = 0;
    try {
      const schemaId = "https://schemas.example.test/root";
      const credentialSchemaId = "https://schemas.example.test/second";
      const asyncSchemaId = "https://schemas.example.test/third";
      const recursiveSchemaId = "https://schemas.example.test/fourth";
      writeJson(root, "schema.json", strictSchema(schemaId, { $dynamicRef: "#node" }));
      writeJson(
        root,
        "untrusted.json",
        strictSchema(credentialSchemaId, {
          $ref: "https://user:credential@schemas.example.test/catalog/common.json"
        })
      );
      writeJson(root, "async.json", strictSchema(asyncSchemaId, { $async: true, type: "string" }));
      writeJson(root, "recursive.json", strictSchema(recursiveSchemaId, { $recursiveRef: "#" }));
      writeJson(root, "instance.json", {});
      await withFetch(
        async () => {
          calls += 1;
          throw new Error("unexpected fetch");
        },
        async () => {
          const dynamicObserved = await runJsonSchemaValidation({
            options: offlineOptions({
              bindings: [{ id: "instance", instancePath: "instance.json", schemaId }],
              schemas: [{ id: schemaId, path: "schema.json" }]
            }),
            root
          });
          assert.deepEqual(
            dynamicObserved.records.map((record) => record.data),
            [
              {
                kind: "schema-compile",
                path: "schema.json",
                reason: "unsupported-reference",
                schemaId
              }
            ]
          );
          const credentialObserved = await runJsonSchemaValidation({
            options: offlineOptions({
              bindings: [
                { id: "instance", instancePath: "instance.json", schemaId: credentialSchemaId }
              ],
              schemas: [{ id: credentialSchemaId, path: "untrusted.json" }]
            }),
            root
          });
          assert.deepEqual(
            credentialObserved.records.map((record) => record.data),
            [
              {
                kind: "schema-compile",
                path: "untrusted.json",
                reason: "unsupported-reference",
                schemaId: credentialSchemaId
              }
            ]
          );
          assert.equal(JSON.stringify(credentialObserved).includes("credential"), false);
          const recursiveObserved = await runJsonSchemaValidation({
            options: offlineOptions({
              bindings: [
                { id: "instance", instancePath: "instance.json", schemaId: recursiveSchemaId }
              ],
              schemas: [{ id: recursiveSchemaId, path: "recursive.json" }]
            }),
            root
          });
          assert.deepEqual(
            recursiveObserved.records.map((record) => record.data),
            [
              {
                kind: "schema-compile",
                path: "recursive.json",
                reason: "unsupported-reference",
                schemaId: recursiveSchemaId
              }
            ]
          );
          const asyncObserved = await runJsonSchemaValidation({
            options: offlineOptions({
              bindings: [
                { id: "instance", instancePath: "instance.json", schemaId: asyncSchemaId }
              ],
              schemas: [{ id: asyncSchemaId, path: "async.json" }]
            }),
            root
          });
          assert.deepEqual(
            asyncObserved.records.map((record) => record.data),
            [
              {
                kind: "schema-compile",
                path: "async.json",
                reason: "invalid-schema",
                schemaId: asyncSchemaId
              }
            ]
          );
        }
      );
      assert.equal(calls, 0);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});
