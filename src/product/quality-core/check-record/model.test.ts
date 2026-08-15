import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import type { QualityRecordCandidate } from "./model.ts";
import { createRecordId } from "./identity.ts";
import {
  validateCheckDefinition,
  validateCoreSnapshot
} from "./validation.ts";

const definition = {
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
        operands: [{
          operandId: "codeArea",
          valueType: "string",
          source: { kind: "field", fieldId: "codeArea" }
        }],
        relations: ["regression"]
      }
    }
  ]
} as const;

describe("check-record foundation model", () => {
  it("keeps producer candidates free of Core ownership and lifecycle provenance", () => {
    const producerCandidate: QualityRecordCandidate = {
      recordTypeId: "line-budget",
      level: "warning",
      semanticSubject: "src/a.ts",
      message: "Too many lines",
      fields: { codeArea: "source", limit: 200 },
      location: null
    };
    const invalidFieldCandidate: QualityRecordCandidate = {
      ...producerCandidate,
      // @ts-expect-error validated record fields exclude arrays, objects, and null
      fields: { codeArea: ["source"] }
    };

    assert.equal("checkId" in producerCandidate, false);
    assert.equal("checkRunId" in producerCandidate, false);
    assert.deepEqual(invalidFieldCandidate.fields, { codeArea: ["source"] });
  });

  it("accepts only closed foundation descriptors with check-qualified record type identities", () => {
    const first = validateCheckDefinition(definition);
    const second = validateCheckDefinition({
      ...definition,
      checkId: "function-metrics"
    });

    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    if (first.ok) {
      assert.deepEqual(first.value.recordTypes[0]?.policy, definition.recordTypes[0].policy);
      assert.equal(Object.isFrozen(first.value.recordTypes[0]?.policy?.operands), true);
    }
    assert.deepEqual(validateCheckDefinition({
      ...definition,
      runner: () => undefined
    }), {
      ok: false,
      issues: [{ path: "$", code: "unknown-field", message: "Object contains an unsupported field" }]
    });
    assert.equal(validateCheckDefinition({
      ...definition,
      recordTypes: [{ ...definition.recordTypes[0], identityFields: ["missing"] }]
    }).ok, false);
    assert.equal(validateCheckDefinition({
      ...definition,
      recordTypes: [{
        ...definition.recordTypes[0],
        fields: [{ fieldId: "codeArea", valueType: "string", required: false }]
      }]
    }).ok, false);
    assert.equal(validateCheckDefinition({
      ...definition,
      recordTypes: [definition.recordTypes[0], definition.recordTypes[0]]
    }).ok, false);
  });

  it("accepts exactly one closed terminal outcome for each Core Check", () => {
    const outcomes = [
      { kind: "not-applicable" },
      { kind: "completed", verdict: "passed" },
      { kind: "completed", verdict: "failed" },
      ...[
        "record-conflict",
        "invalid-record",
        "capability-protocol",
        "invalid-result",
        "dependency-unavailable",
        "execution-failed",
        "cancelled"
      ].map((category) => ({ kind: "unavailable", diagnostic: { category } }))
    ] as const;

    for (const outcome of outcomes) {
      assert.equal(validateCoreSnapshot({
        checks: [{ ...definition, outcome }],
        records: []
      }).ok, true);
    }

    const valid = { checks: [{ ...definition, outcome: outcomes[1] }], records: [] };
    for (const invalid of [
      { kind: "completed", verdict: "not-applicable" },
      { kind: "unavailable", diagnostic: { category: "ack-protocol" } },
      { kind: "not-applicable", diagnostic: null },
      { kind: "unknown" }
    ]) {
      assert.equal(validateCoreSnapshot({
        ...valid,
        checks: [{ ...definition, outcome: invalid }]
      }).ok, false);
    }
  });

  it("validates an exact canonical two-entity snapshot without lifecycle projections", () => {
    const candidate = {
      checkId: definition.checkId,
      recordTypeId: "line-budget",
      level: "warning" as const,
      semanticSubject: "src/a.ts",
      message: "Too many lines",
      fields: { codeArea: "source", limit: 200 },
      location: null
    };
    const snapshot = {
      checks: [{ ...definition, outcome: { kind: "completed", verdict: "failed" } }],
      records: [{ ...candidate, recordId: createRecordId(candidate, definition.recordTypes[0]).recordId }]
    };

    assert.equal(validateCoreSnapshot(snapshot).ok, true);
    assert.equal(validateCoreSnapshot({ ...snapshot, runs: [] }).ok, false);
    assert.equal(validateCoreSnapshot({ ...snapshot, integrity: { status: "valid" } }).ok, false);
    assert.equal("definitions" in snapshot, false);
    assert.equal("completeness" in snapshot, false);
  });
});
