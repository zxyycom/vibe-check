import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import type { CheckDefinition, QualityRecordCandidate } from "./model.ts";
import {
  canonicalJsonBytes,
  createCatalogFingerprint,
  createRecordId,
  normalizeSemanticSubject
} from "./identity.ts";

const definition: CheckDefinition = {
  checkId: "file-metrics",
  displayName: "File metrics",
  recordTypes: [
    {
      recordTypeId: "line-budget",
      fields: [
        { fieldId: "codeArea", valueType: "string", required: true },
        { fieldId: "limit", valueType: "integer", required: false }
      ],
      identityFields: ["codeArea"],
      policy: {
        operands: [
          {
            operandId: "codeArea",
            valueType: "string",
            source: { kind: "field", fieldId: "codeArea" }
          }
        ],
        relations: ["regression"]
      }
    }
  ]
};

const candidate: QualityRecordCandidate = {
  recordTypeId: "line-budget",
  level: "warning",
  semanticSubject: "cafe\u0301",
  message: "Too many lines",
  fields: { codeArea: "source", limit: 200 },
  location: { path: "src/a.ts", line: 10, column: 2 }
};

const ownedCandidate = { ...candidate, checkId: definition.checkId };

describe("check-record foundation identity", () => {
  it("emits exact versioned canonical UTF-8 JSON bytes and rejects non-JSON values", () => {
    const bytes = canonicalJsonBytes({
      nested: { b: 2, a: 1 },
      array: [3, { z: true, a: null }],
      text: "é"
    });

    assert.equal(
      new TextDecoder().decode(bytes),
      '{"array":[3,{"a":null,"z":true}],"nested":{"a":1,"b":2},"text":"é"}'
    );
    assert.throws(() => canonicalJsonBytes({ value: Number.POSITIVE_INFINITY }));
    assert.throws(() => canonicalJsonBytes({ value: undefined }));
  });

  it("rejects accessors before changing getters can corrupt canonical bytes", () => {
    let getterCalls = 0;
    const changing = {
      get credential(): string | undefined {
        getterCalls += 1;
        return getterCalls === 1 ? "https://user:token@example.test" : undefined;
      }
    };

    assert.throws(() => canonicalJsonBytes(changing));
    assert.equal(getterCalls, 0);
  });

  it("redacts credential TypeErrors thrown by Proxy reflection traps", () => {
    const secret = "credential-token-from-type-error";
    const trapped = new Proxy(
      {},
      {
        ownKeys(): never {
          throw new TypeError(secret);
        }
      }
    );
    let caught: unknown;

    try {
      canonicalJsonBytes(trapped);
    } catch (error: unknown) {
      caught = error;
    }

    assert.ok(caught instanceof TypeError);
    assert.equal(caught.message, "Canonical JSON could not safely materialize the input");
    assert.equal(Object.hasOwn(caught, "cause"), false);
    assert.equal(caught.stack?.includes(secret), false);
  });

  it("redacts ordinary errors thrown by Proxy reflection traps", () => {
    const secret = "credential-token-from-error";
    const trapped = new Proxy(
      {},
      {
        ownKeys(): never {
          throw new Error(secret);
        }
      }
    );
    let caught: unknown;

    try {
      canonicalJsonBytes(trapped);
    } catch (error: unknown) {
      caught = error;
    }

    assert.ok(caught instanceof TypeError);
    assert.equal(caught.message, "Canonical JSON could not safely materialize the input");
    assert.equal(Object.hasOwn(caught, "cause"), false);
    assert.equal(caught.stack?.includes(secret), false);
  });

  it("normalizes semantic subjects explicitly without case or whitespace folding", () => {
    assert.equal(normalizeSemanticSubject("cafe\u0301\r\nName "), "café\nName ");
    assert.equal(normalizeSemanticSubject(" Name "), " Name ");
  });

  it("matches exact golden record identity bytes and ID", () => {
    const first = createRecordId(ownedCandidate, definition.recordTypes[0]);

    assert.equal(
      new TextDecoder().decode(first.bytes),
      '{"checkId":"file-metrics","identityFields":{"codeArea":"source"},"recordTypeId":"line-budget","semanticSubject":"café"}'
    );
    assert.equal(
      first.recordId,
      "check-record/v1/record/sha256:2d1940fa4fec29b179334852476af675861001ac9373c70e00f984f22c33bafd"
    );
  });

  it("excludes location and message while identity fields change recordId", () => {
    const first = createRecordId(ownedCandidate, definition.recordTypes[0]).recordId;
    const relocated = createRecordId(
      {
        ...ownedCandidate,
        message: "A revised message",
        location: { path: "src/a.ts", line: 99, column: 1 }
      },
      definition.recordTypes[0]
    ).recordId;
    const changedIdentity = createRecordId(
      {
        ...ownedCandidate,
        fields: { ...ownedCandidate.fields, codeArea: "tests" }
      },
      definition.recordTypes[0]
    ).recordId;

    assert.equal(relocated, first);
    assert.notEqual(changedIdentity, first);
  });

  it("canonicalizes catalog order and fixes the exact fingerprint", () => {
    const other: CheckDefinition = {
      ...definition,
      checkId: "duplicate-detection",
      displayName: "Duplicate detection"
    };
    const first = createCatalogFingerprint([definition, other]);
    const second = createCatalogFingerprint([other, definition]);
    const descriptorPolicy = definition.recordTypes[0].policy!;
    const rebound = createCatalogFingerprint([
      {
        ...definition,
        recordTypes: [
          {
            ...definition.recordTypes[0],
            policy: {
              ...descriptorPolicy,
              operands: [
                {
                  ...descriptorPolicy.operands[0],
                  source: { kind: "message" }
                }
              ]
            }
          }
        ]
      }
    ]);

    assert.equal(
      new TextDecoder().decode(first.bytes),
      '[{"checkId":"duplicate-detection","displayName":"Duplicate detection","recordTypes":[{"fields":[{"fieldId":"codeArea","required":true,"valueType":"string"},{"fieldId":"limit","required":false,"valueType":"integer"}],"identityFields":["codeArea"],"policy":{"operands":[{"operandId":"codeArea","source":{"fieldId":"codeArea","kind":"field"},"valueType":"string"}],"relations":["regression"]},"recordTypeId":"line-budget"}]},{"checkId":"file-metrics","displayName":"File metrics","recordTypes":[{"fields":[{"fieldId":"codeArea","required":true,"valueType":"string"},{"fieldId":"limit","required":false,"valueType":"integer"}],"identityFields":["codeArea"],"policy":{"operands":[{"operandId":"codeArea","source":{"fieldId":"codeArea","kind":"field"},"valueType":"string"}],"relations":["regression"]},"recordTypeId":"line-budget"}]}]'
    );
    assert.equal(
      first.catalogFingerprint,
      "check-record/v1/catalog/sha256:c949e2f5ca18137d5d93b502b363d71b33b35b29a97e8b6ef4afdf61aacdfab7"
    );
    assert.deepEqual(second, first);
    assert.notEqual(rebound.catalogFingerprint, first.catalogFingerprint);
  });
});
