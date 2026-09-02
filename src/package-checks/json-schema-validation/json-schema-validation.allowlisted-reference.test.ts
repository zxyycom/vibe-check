import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { describe, it } from "node:test";

import {
  allowlistedOptions,
  requestUrl,
  runJsonSchemaValidation,
  strictSchema,
  temporaryRoot,
  withFetch,
  writeJson
} from "./json-schema-validation.test-support.ts";

describe("JSON Schema validation default Check", () => {
  it("uses an explicit HTTPS allowlist with omitted credentials and no redirect", async () => {
    const root = temporaryRoot();
    try {
      const schemaId = "https://schemas.example.test/root";
      const remoteId = "https://schemas.example.test/catalog/common.json";
      writeJson(root, "schema.json", strictSchema(schemaId, { $ref: remoteId }));
      writeJson(root, "instance.json", { value: 1 });
      let observedRequest:
        | Readonly<{ readonly init: RequestInit | undefined; readonly url: string }>
        | undefined;
      await withFetch(
        async (input, init) => {
          observedRequest = Object.freeze({ init, url: requestUrl(input) });
          return new Response(
            JSON.stringify(
              strictSchema(remoteId, { properties: { value: { type: "string" } }, type: "object" })
            ),
            { status: 200 }
          );
        },
        async () => {
          const options = allowlistedOptions(schemaId);
          const observed = await runJsonSchemaValidation({ options, root });
          assert.deepEqual(observed.result, {
            status: "failed",
            data: {
              bindingCount: 1,
              blockedBindingCount: 0,
              invalidBindingCount: 1,
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
          assert.deepEqual(observed.records[0]?.data, {
            bindingId: "instance",
            keyword: "type",
            kind: "keyword-violation",
            path: "instance.json",
            pointer: "/value",
            schemaId
          });
        }
      );
      assert.deepEqual(observedRequest, {
        init: {
          credentials: "omit",
          method: "GET",
          redirect: "manual",
          signal: observedRequest?.init?.signal
        },
        url: remoteId
      });
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});
