import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { JsonSchemaValidationOptions } from "./options.ts";
import type {
  CheckDependencies,
  CheckExecutionContext,
  CheckResult,
  DeepReadonly
} from "../../check/check.ts";
import { executeJsonSchemaValidation } from "./json-schema-validation.ts";
import { jsonSchemaValidation } from "./default-check.ts";
import type { ProjectFileSelection } from "../project-files/configuration.ts";

const DEFAULT_FILES = Object.freeze({
  excludeDirs: Object.freeze([]),
  generatedFiles: Object.freeze([]),
  include: Object.freeze(["**/*"])
});

const NO_DEPENDENCIES: CheckDependencies = Object.freeze({
  get: (checkId: string) =>
    Object.freeze({
      ok: false,
      error: Object.freeze({ code: "dependency-not-declared", checkId })
    })
});

interface ObservedRecord {
  readonly data: object;
  readonly identity: Readonly<{ readonly id: string }>;
}

interface RunInput {
  readonly fileConfiguration?: ProjectFileSelection;
  readonly options: DeepReadonly<JsonSchemaValidationOptions>;
  readonly root: string;
  readonly signal?: AbortSignal;
}

async function runJsonSchemaValidation({
  fileConfiguration = DEFAULT_FILES,
  options,
  root,
  signal = new AbortController().signal
}: RunInput): Promise<
  Readonly<{ readonly records: readonly ObservedRecord[]; readonly result: CheckResult }>
> {
  const records: ObservedRecord[] = [];
  const context: CheckExecutionContext<JsonSchemaValidationOptions> = Object.freeze({
    dependencies: NO_DEPENDENCIES,
    options: Object.freeze({ ...options, files: fileConfiguration }),
    project: Object.freeze({
      changedFiles: Object.freeze([]),
      flags: Object.freeze([]),
      root
    }),
    records: Object.freeze({
      report: (identity: Readonly<{ readonly id: string }>, data: object): void => {
        records.push(Object.freeze({ data, identity }));
      }
    }),
    signal
  });
  const result = await executeJsonSchemaValidation(context);
  return Object.freeze({ records: Object.freeze(records), result });
}

function temporaryRoot(): string {
  return mkdtempSync(join(tmpdir(), "vibe-check-json-schema-validation-"));
}

function writeJson(root: string, path: string, value: unknown): void {
  const fullPath = join(root, path);
  mkdirSync(join(fullPath, ".."), { recursive: true });
  writeFileSync(fullPath, JSON.stringify(value), "utf8");
}

function strictSchema(id: string, schema: object): object {
  return { $id: id, $schema: "https://json-schema.org/draft/2020-12/schema", ...schema };
}

function offlineOptions(input: {
  readonly bindings: JsonSchemaValidationOptions["bindings"];
  readonly schemaIdentity?: JsonSchemaValidationOptions["schemaIdentity"];
  readonly schemas: JsonSchemaValidationOptions["schemas"];
}): DeepReadonly<JsonSchemaValidationOptions> {
  return Object.freeze({
    bindings: input.bindings,
    files: DEFAULT_FILES,
    maximumBytes: 1_048_576,
    referenceResolution: Object.freeze({ mode: "offline" as const }),
    schemaIdentity: input.schemaIdentity ?? Object.freeze({ mode: "require-match" as const }),
    schemas: input.schemas
  });
}

async function withFetch<T>(
  replacement: typeof globalThis.fetch,
  callback: () => Promise<T>
): Promise<T> {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "fetch");
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    enumerable: true,
    value: replacement,
    writable: true
  });
  try {
    return await callback();
  } finally {
    if (descriptor === undefined) delete (globalThis as { fetch?: typeof globalThis.fetch }).fetch;
    else Object.defineProperty(globalThis, "fetch", descriptor);
  }
}

function requestUrl(input: Parameters<typeof globalThis.fetch>[0]): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
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

      const invalidOptions = offlineOptions({
        bindings: [{ id: "bad", instancePath: "bad.json", schemaId }],
        schemas: [{ id: schemaId, path: "schema.json" }]
      });
      const invalidPreflight = await jsonSchemaValidation.preflight!(
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
        { status: "unavailable", reason: { code: "invalid-options" } }
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
        }
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
            }
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
            }
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
          const options: DeepReadonly<JsonSchemaValidationOptions> = Object.freeze({
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
          } as const);
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
            }
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
            result: { status: "unavailable", reason: { code: "reference-transport-unavailable" } }
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
        }
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
        }
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
