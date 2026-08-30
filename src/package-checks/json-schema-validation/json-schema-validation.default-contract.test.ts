import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { describe, it } from "node:test";

import { jsonSchemaValidation } from "./default-check.ts";
import { parseJsonSchemaValidationData } from "./final-data.ts";
import {
  offlineOptions,
  runJsonSchemaValidation,
  strictSchema,
  temporaryRoot,
  writeJson
} from "./json-schema-validation.test-support.ts";

function assertDefaultCheckContract() {
  const defaultCheck = jsonSchemaValidation();
  assert.deepEqual(defaultCheck.options.schemas, []);
  assert.deepEqual(defaultCheck.options.bindings, []);
  assert.deepEqual(defaultCheck.options.schemaIdentity, { mode: "require-match" });
  assert.deepEqual(defaultCheck.options.referenceResolution, { mode: "offline" });
  assert.throws(
    () => Reflect.apply(jsonSchemaValidation, undefined, [{ unknown: true }]),
    /documented closed policy/
  );
  assert.equal(defaultCheck.parseData, parseJsonSchemaValidationData);
  assert.deepEqual(
    defaultCheck.parseData({
      bindingCount: 1,
      blockedBindingCount: 0,
      invalidBindingCount: 1,
      issueCount: 1,
      issuesTruncated: false,
      reportedIssueCount: 1,
      schemaCount: 1,
      validBindingCount: 0
    }),
    {
      bindingCount: 1,
      blockedBindingCount: 0,
      invalidBindingCount: 1,
      issueCount: 1,
      issuesTruncated: false,
      reportedIssueCount: 1,
      schemaCount: 1,
      validBindingCount: 0
    }
  );
  assert.throws(
    () =>
      defaultCheck.parseData({
        bindingCount: 1,
        blockedBindingCount: 0,
        invalidBindingCount: 0,
        issueCount: 2,
        issuesTruncated: false,
        reportedIssueCount: 1,
        schemaCount: 1,
        validBindingCount: 1
      }),
    /jsonSchemaValidation final data/
  );
  return defaultCheck;
}

describe("JSON Schema validation default Check", () => {
  it("validates registered schema bindings and publishes only safe normalized keyword facts", async () => {
    const root = temporaryRoot();
    try {
      const schemaId = "https://schemas.example.test/person";
      writeJson(
        root,
        "schema.json",
        strictSchema(schemaId, {
          additionalProperties: false,
          properties: {
            $async: { type: "string" },
            $dynamicRef: { type: "string" },
            $ref: { type: "string" },
            name: { format: "email", type: "string" }
          },
          required: ["name"],
          type: "object"
        })
      );
      writeJson(root, "good.json", {
        $async: "literal data key",
        $dynamicRef: "literal data key",
        $ref: "literal data key",
        name: "Ada"
      });
      writeJson(root, "bad.json", { extra: true, name: 3 });

      const defaultCheck = assertDefaultCheckContract();
      const invalidOptions = offlineOptions({
        bindings: [{ id: "bad", instancePath: "bad.json", schemaId }],
        schemas: [{ id: schemaId, path: "schema.json" }]
      });
      const invalidPreflight = await defaultCheck.preflight!(
        {
          ...invalidOptions,
          maximumBytes: 0
        },
        new AbortController().signal
      );
      assert.equal(invalidPreflight.status, "failure");
      assert.deepEqual(
        (
          await runJsonSchemaValidation({
            root,
            options: { ...invalidOptions, maximumBytes: 0 }
          })
        ).result,
        {
          status: "unavailable",
          reason: { code: "invalid-options" },
          messages: [
            {
              code: "invalid-options",
              level: "error",
              message:
                "jsonSchemaValidation options are invalid; recreate the Check with jsonSchemaValidation(options) or restore its complete resolved options."
            }
          ]
        }
      );

      const observed = await runJsonSchemaValidation({
        options: offlineOptions({
          bindings: [
            { id: "bad", instancePath: "bad.json", schemaId },
            { id: "good", instancePath: "good.json", schemaId }
          ],
          schemas: [{ id: schemaId, path: "schema.json" }]
        }),
        root
      });

      assert.deepEqual(observed.result, {
        status: "failed",
        data: {
          bindingCount: 2,
          blockedBindingCount: 0,
          invalidBindingCount: 1,
          issueCount: 2,
          issuesTruncated: false,
          reportedIssueCount: 2,
          schemaCount: 1,
          validBindingCount: 1
        },
        messages: [
          {
            code: "schema-validation-issues",
            level: "error",
            message: "2 schema validation issue(s) were found; inspect this Check's Records."
          }
        ]
      });
      assert.deepEqual(
        observed.records.map((record) => record.data),
        [
          {
            bindingId: "bad",
            keyword: "additionalProperties",
            kind: "keyword-violation",
            path: "bad.json",
            pointer: "",
            schemaId
          },
          {
            bindingId: "bad",
            keyword: "type",
            kind: "keyword-violation",
            path: "bad.json",
            pointer: "/name",
            schemaId
          }
        ]
      );
      assert.equal(
        observed.records.every((record) =>
          /^json-schema:keyword-violation:[a-f0-9]{64}$/u.test(record.identity.id)
        ),
        true
      );
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});
