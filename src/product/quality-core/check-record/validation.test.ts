import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import type { CheckDefinition } from "./model.ts";
import { createRecordId } from "./identity.ts";
import {
  validateCheckDefinition,
  validateCoreSnapshot,
  validateQualityRecord
} from "./validation.ts";

const definition: CheckDefinition = {
  checkId: "file-metrics",
  displayName: "File metrics",
  recordTypes: [{
    recordTypeId: "line-budget",
    fields: [
      { fieldId: "codeArea", valueType: "string", required: true },
      { fieldId: "limit", valueType: "integer", required: false }
    ],
    identityFields: ["codeArea"],
    policy: {
      operands: [{
        operandId: "codeArea",
        valueType: "string",
        source: { kind: "field", fieldId: "codeArea" }
      }],
      relations: ["regression"]
    }
  }]
};

const candidate = {
  checkId: "file-metrics",
  recordTypeId: "line-budget",
  level: "warning" as const,
  semanticSubject: "src/a.ts",
  message: "Too many lines",
  fields: { codeArea: "source", limit: 200 },
  location: { path: "src/a.ts", line: 10, column: 2 }
};
const record = {
  ...candidate,
  recordId: createRecordId(candidate, definition.recordTypes[0]!).recordId
};

function snapshot(outcome: unknown = { kind: "completed", verdict: "passed" }): {
  readonly checks: readonly unknown[];
  readonly records: readonly unknown[];
} {
  return {
    checks: [{ ...definition, outcome }],
    records: [record]
  };
}

describe("check-record foundation runtime validation", () => {
  it("rejects CheckDefinition accessors without executing them", () => {
    let getterHits = 0;
    const definitionWithAccessor = {
      get checkId(): string {
        getterHits += 1;
        return "file-metrics";
      },
      displayName: "File metrics",
      recordTypes: []
    };

    const validated = validateCheckDefinition(definitionWithAccessor);

    assert.equal(validated.ok, false);
    assert.equal(getterHits, 0);
  });

  it("redacts credential Proxy traps before foundation validation reads fields", () => {
    const secret = "credential-token-from-validation-proxy";
    const trapped = new Proxy({}, {
      ownKeys(): never {
        throw new TypeError(secret);
      }
    });

    const validated = validateCheckDefinition(trapped);
    const rendered = JSON.stringify(validated);

    assert.equal(validated.ok, false);
    assert.equal(rendered.includes(secret), false);
    assert.equal(rendered.includes("Proxy"), false);
  });

  it("validates unknown into a closed detached deeply readonly quality record", () => {
    const input = {
      ...structuredClone(record),
      message: String(record.message),
      fields: { codeArea: String(record.fields.codeArea), limit: Number(record.fields.limit) }
    };
    const validated = validateQualityRecord(input, definition);

    assert.equal(validated.ok, true);
    if (!validated.ok) throw new Error("Expected a valid record");

    input.message = "mutated";
    input.fields.codeArea = "mutated";
    assert.equal(validated.value.message, "Too many lines");
    assert.equal(validated.value.fields.codeArea, "source");
    assert.equal(Object.isFrozen(validated.value), true);
    assert.equal(Object.isFrozen(validated.value.fields), true);
  });

  it("rejects unknown fields private material functions and invalid finite primitives", () => {
    assert.equal(validateQualityRecord({ ...record, backend: "scc" }, definition).ok, false);
    assert.equal(validateQualityRecord({ ...record, task: { id: "private" } }, definition).ok, false);
    assert.equal(validateQualityRecord({ ...record, fields: { ...record.fields, callback: () => undefined } }, definition).ok, false);
    assert.equal(validateQualityRecord({ ...record, fields: { ...record.fields, limit: Number.NaN } }, definition).ok, false);

    const credentialField = "https://user:secret-token@example.test/private";
    const credentialResult = validateQualityRecord({
      ...record,
      [credentialField]: "credential-value"
    }, definition);
    assert.equal(credentialResult.ok, false);
    assert.equal(JSON.stringify(credentialResult).includes("secret-token"), false);
    assert.equal(JSON.stringify(credentialResult).includes("credential-value"), false);
  });

  it("requires a known non-not-applicable owner and canonical entity order", () => {
    assert.equal(validateCoreSnapshot(snapshot()).ok, true);
    assert.equal(validateCoreSnapshot({
      checks: [{ ...definition, outcome: { kind: "not-applicable" } }],
      records: [record]
    }).ok, false);
    assert.equal(validateCoreSnapshot({
      checks: [],
      records: [record]
    }).ok, false);

    const laterDefinition = { ...definition, checkId: "z-check" };
    assert.equal(validateCoreSnapshot({
      checks: [
        { ...laterDefinition, outcome: { kind: "completed", verdict: "passed" } },
        { ...definition, outcome: { kind: "completed", verdict: "passed" } }
      ],
      records: []
    }).ok, false);
    assert.equal(validateCoreSnapshot({
      checks: [{ ...definition, outcome: { kind: "completed", verdict: "passed" } }],
      records: [record, record]
    }).ok, false);

    const canonicalDefinition = {
      checkId: "canonical-check",
      displayName: "Canonical Check",
      recordTypes: [{
        recordTypeId: "alpha-record",
        fields: [
          { fieldId: "alpha", valueType: "string", required: true },
          { fieldId: "beta", valueType: "integer", required: true }
        ],
        identityFields: ["alpha", "beta"],
        policy: {
          operands: [{
            operandId: "alpha",
            valueType: "string",
            source: { kind: "field", fieldId: "alpha" }
          }, {
            operandId: "beta",
            valueType: "number",
            source: { kind: "field", fieldId: "beta" }
          }],
          relations: ["alpha", "beta"]
        }
      }, {
        recordTypeId: "beta-record",
        fields: [],
        identityFields: []
      }]
    };
    const primaryRecordType = canonicalDefinition.recordTypes[0]!;
    const primaryPolicy = primaryRecordType.policy;
    if (primaryPolicy === undefined) throw new Error("Canonical definition requires a policy surface");
    const nonCanonicalDefinitions = [
      { ...canonicalDefinition, recordTypes: [...canonicalDefinition.recordTypes].reverse() },
      {
        ...canonicalDefinition,
        recordTypes: [{
          ...primaryRecordType,
          fields: [...primaryRecordType.fields].reverse()
        }, canonicalDefinition.recordTypes[1]!]
      },
      {
        ...canonicalDefinition,
        recordTypes: [{
          ...primaryRecordType,
          identityFields: [...primaryRecordType.identityFields].reverse()
        }, canonicalDefinition.recordTypes[1]!]
      },
      {
        ...canonicalDefinition,
        recordTypes: [{
          ...primaryRecordType,
          policy: {
            ...primaryPolicy,
            operands: [...primaryPolicy.operands].reverse()
          }
        }, canonicalDefinition.recordTypes[1]!]
      },
      {
        ...canonicalDefinition,
        recordTypes: [{
          ...primaryRecordType,
          policy: {
            ...primaryPolicy,
            relations: [...primaryPolicy.relations].reverse()
          }
        }, canonicalDefinition.recordTypes[1]!]
      }
    ];
    for (const nonCanonicalDefinition of nonCanonicalDefinitions) {
      assert.equal(validateCheckDefinition(nonCanonicalDefinition).ok, false);
    }
  });

  it("accepts only the target unavailable taxonomy and exact snapshot fields", () => {
    assert.equal(validateCoreSnapshot(snapshot({
      kind: "unavailable",
      diagnostic: { category: "dependency-unavailable" }
    })).ok, true);
    assert.equal(validateCoreSnapshot(snapshot({
      kind: "unavailable",
      diagnostic: { category: "ack-protocol" }
    })).ok, false);
    assert.equal(validateCoreSnapshot({ ...snapshot(), definitions: [definition] }).ok, false);
    assert.equal(validateCoreSnapshot({ ...snapshot(), runs: [] }).ok, false);
  });
});
