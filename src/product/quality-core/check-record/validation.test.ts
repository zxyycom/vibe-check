import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import type { CheckDefinition } from "./model.ts";
import { createCatalogFingerprint, createRecordId } from "./identity.ts";
import {
  validateCheckDefinition,
  validateFinalCoreSnapshot,
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
  checkRunId: "check-run/v1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  recordTypeId: "line-budget",
  level: "warning",
  semanticSubject: "src/a.ts",
  message: "Too many lines",
  fields: { codeArea: "source", limit: 200 },
  location: { path: "src/a.ts", line: 10, column: 2 }
} as const;
const identity = createRecordId(candidate, definition.recordTypes[0]);
const record = { ...candidate, recordId: identity.recordId };

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
    if (!validated.ok) {
      throw new Error("Expected a valid record");
    }

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

  it("rejects records and integrity evidence inconsistent with the owning run", () => {
    const catalogFingerprint = createCatalogFingerprint([definition]).catalogFingerprint;
    const baseSnapshot = {
      catalogFingerprint,
      definitions: [definition],
      runs: [{
        checkId: "file-metrics",
        checkRunId: candidate.checkRunId,
        selection: "selected",
        applicability: "not-applicable",
        status: "completed",
        result: { verdict: "not-applicable" },
        coverage: { plannedWorkCount: 0, acknowledgedWorkCount: 0 },
        diagnostic: null
      }],
      records: [record],
      integrity: { status: "valid", invalidRecords: [], conflicts: [] },
      completeness: {
        status: "complete",
        selectedRunCount: 1,
        completedRunCount: 1,
        failedRunCount: 0,
        plannedWorkCount: 0,
        acknowledgedWorkCount: 0
      }
    };
    assert.equal(validateFinalCoreSnapshot(baseSnapshot).ok, false);

    const passedWithInvalidEvidence = {
      ...baseSnapshot,
      runs: [{
        ...baseSnapshot.runs[0],
        applicability: "applicable",
        result: { verdict: "passed" },
        coverage: { plannedWorkCount: 1, acknowledgedWorkCount: 1 }
      }],
      records: [],
      integrity: {
        status: "invalid",
        invalidRecords: [{
          kind: "invalid-record",
          checkId: "file-metrics",
          checkRunId: candidate.checkRunId,
          recordTypeId: "line-budget",
          evidenceId: "invalid-record/v1:000001"
        }],
        conflicts: []
      },
      completeness: {
        ...baseSnapshot.completeness,
        plannedWorkCount: 1,
        acknowledgedWorkCount: 1
      }
    };
    assert.equal(validateFinalCoreSnapshot(passedWithInvalidEvidence).ok, false);
  });

  it("requires unique integrity evidence that closes the primary record diagnostic", () => {
    const catalogFingerprint = createCatalogFingerprint([definition]).catalogFingerprint;
    const failedRun = {
      checkId: "file-metrics",
      checkRunId: candidate.checkRunId,
      selection: "selected",
      applicability: "applicable",
      status: "failed",
      result: null,
      coverage: { plannedWorkCount: 1, acknowledgedWorkCount: 1 },
      diagnostic: { category: "record-conflict", tieBreakKey: identity.recordId }
    };
    const baseSnapshot = {
      catalogFingerprint,
      definitions: [definition],
      runs: [failedRun],
      records: [],
      integrity: { status: "valid", invalidRecords: [], conflicts: [] },
      completeness: {
        status: "incomplete",
        selectedRunCount: 1,
        completedRunCount: 0,
        failedRunCount: 1,
        plannedWorkCount: 1,
        acknowledgedWorkCount: 1
      }
    };
    assert.equal(validateFinalCoreSnapshot(baseSnapshot).ok, false);

    const conflict = {
      kind: "record-conflict",
      checkId: "file-metrics",
      checkRunId: candidate.checkRunId,
      recordId: identity.recordId,
      recordTypeId: "line-budget",
      bodyFingerprints: [
        "check-record/v1/body/sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        "check-record/v1/body/sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
      ]
    };
    assert.equal(validateFinalCoreSnapshot({
      ...baseSnapshot,
      integrity: { status: "conflicted", invalidRecords: [], conflicts: [conflict, conflict] }
    }).ok, false);

    const legacyDigestEvidence = {
      kind: "invalid-record",
      checkId: "file-metrics",
      checkRunId: candidate.checkRunId,
      candidateFingerprint: "check-record/v1/body/sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    };
    assert.equal(validateFinalCoreSnapshot({
      ...baseSnapshot,
      runs: [{
        ...failedRun,
        diagnostic: { category: "invalid-record", tieBreakKey: legacyDigestEvidence.candidateFingerprint }
      }],
      integrity: { status: "invalid", invalidRecords: [legacyDigestEvidence], conflicts: [] }
    }).ok, false);
  });

  it("keeps conflict IDs out of trusted records while retaining independent integrity evidence", () => {
    const catalog = createCatalogFingerprint([definition]);
    const snapshot = {
      catalogFingerprint: catalog.catalogFingerprint,
      definitions: [definition],
      runs: [{
        checkId: "file-metrics",
        checkRunId: candidate.checkRunId,
        selection: "selected",
        applicability: "applicable",
        status: "failed",
        result: null,
        coverage: { plannedWorkCount: 1, acknowledgedWorkCount: 1 },
        diagnostic: { category: "record-conflict", tieBreakKey: identity.recordId }
      }],
      records: [record],
      integrity: {
        status: "conflicted",
        invalidRecords: [{
          kind: "invalid-record",
          checkId: "file-metrics",
          checkRunId: candidate.checkRunId,
          recordTypeId: "line-budget",
          evidenceId: "invalid-record/v1:000001"
        }],
        conflicts: [{
          kind: "record-conflict",
          checkId: "file-metrics",
          checkRunId: candidate.checkRunId,
          recordTypeId: "line-budget",
          recordId: identity.recordId,
          bodyFingerprints: [
            "check-record/v1/body/sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            "check-record/v1/body/sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
          ]
        }]
      },
      completeness: {
        status: "incomplete",
        selectedRunCount: 1,
        completedRunCount: 0,
        failedRunCount: 1,
        plannedWorkCount: 1,
        acknowledgedWorkCount: 1
      }
    };

    assert.equal(validateFinalCoreSnapshot(snapshot).ok, false);
    assert.equal(validateFinalCoreSnapshot({ ...snapshot, records: [] }).ok, true);
  });
});
