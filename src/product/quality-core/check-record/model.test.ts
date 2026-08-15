import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  RUN_FAILURE_RANK,
  compareRunDiagnostics,
  type CheckRun,
  type FinalCoreSnapshot,
  type QualityRecordCandidate
} from "./model.ts";
import { createCatalogFingerprint } from "./identity.ts";
import {
  validateCheckDefinition,
  validateCheckRun,
  validateFinalCoreSnapshot
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
  it("keeps producer candidates free of manager provenance and complex field values", () => {
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

  it("enforces the closed selected applicability run and result matrix", () => {
    const legalRuns: readonly unknown[] = [
      {
        checkId: "file-metrics",
        checkRunId: "check-run/v1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        selection: "unselected",
        applicability: null,
        status: "skipped",
        result: null,
        coverage: null,
        diagnostic: null
      },
      {
        checkId: "file-metrics",
        checkRunId: "check-run/v1:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        selection: "selected",
        applicability: "not-applicable",
        status: "completed",
        result: { verdict: "not-applicable" },
        coverage: { plannedWorkCount: 0, acknowledgedWorkCount: 0 },
        diagnostic: null
      },
      {
        checkId: "file-metrics",
        checkRunId: "check-run/v1:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        selection: "selected",
        applicability: "applicable",
        status: "completed",
        result: { verdict: "failed" },
        coverage: { plannedWorkCount: 2, acknowledgedWorkCount: 2 },
        diagnostic: null
      },
      {
        checkId: "file-metrics",
        checkRunId: "check-run/v1:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        selection: "selected",
        applicability: "applicable",
        status: "failed",
        result: null,
        coverage: { plannedWorkCount: 2, acknowledgedWorkCount: 1 },
        diagnostic: { category: "execution-failed", tieBreakKey: "execution/v1:worker-02" }
      }
    ];

    for (const run of legalRuns) {
      assert.equal(validateCheckRun(run).ok, true);
    }

    const invalidRuns = [
      { ...legalRuns[0] as object, applicability: "applicable" },
      { ...legalRuns[1] as object, result: null },
      { ...legalRuns[2] as object, result: { verdict: "not-applicable" } },
      { ...legalRuns[2] as object, coverage: { plannedWorkCount: 2, acknowledgedWorkCount: 1 } },
      { ...legalRuns[3] as object, result: { verdict: "passed" } },
      { ...legalRuns[3] as object, diagnostic: null }
    ];

    for (const run of invalidRuns) {
      assert.equal(validateCheckRun(run).ok, false);
    }
  });

  it("fixes diagnostic precedence and canonical same-category tie breaking", () => {
    assert.deepEqual(RUN_FAILURE_RANK, {
      "record-conflict": 0,
      "invalid-record": 1,
      "ack-protocol": 2,
      "terminal-report-set": 3,
      "invalid-result": 4,
      unavailable: 5,
      "execution-failed": 6
    });

    assert.ok(compareRunDiagnostics(
      { category: "invalid-result", tieBreakKey: "result/v1:result-z" },
      { category: "ack-protocol", tieBreakKey: "work-handle/v1:handle-z" }
    ) > 0);
    assert.ok(compareRunDiagnostics(
      { category: "ack-protocol", tieBreakKey: "work-handle/v1:handle-02" },
      { category: "ack-protocol", tieBreakKey: "work-handle/v1:handle-10" }
    ) < 0);
    assert.equal(validateCheckRun({
      checkId: "file-metrics",
      checkRunId: "check-run/v1:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      selection: "selected",
      applicability: "applicable",
      status: "failed",
      result: null,
      coverage: { plannedWorkCount: 1, acknowledgedWorkCount: 0 },
      diagnostic: {
        category: "execution-failed",
        tieBreakKey: "https://user:secret-token@example.test/private"
      }
    }).ok, false);
  });

  it("validates mechanical snapshot integrity and coverage without reducing quality", () => {
    const runs: readonly CheckRun[] = [
      {
        checkId: "file-metrics",
        checkRunId: "check-run/v1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        selection: "unselected",
        applicability: null,
        status: "skipped",
        result: null,
        coverage: null,
        diagnostic: null
      }
    ];
    const snapshot: FinalCoreSnapshot = {
      catalogFingerprint: createCatalogFingerprint([definition]).catalogFingerprint,
      definitions: [definition],
      runs,
      records: [],
      integrity: { status: "valid", invalidRecords: [], conflicts: [] },
      completeness: {
        status: "complete",
        selectedRunCount: 0,
        completedRunCount: 0,
        failedRunCount: 0,
        plannedWorkCount: 0,
        acknowledgedWorkCount: 0
      }
    };

    assert.equal(validateFinalCoreSnapshot(snapshot).ok, true);
    assert.equal(validateFinalCoreSnapshot({
      ...snapshot,
      completeness: { ...snapshot.completeness, failedRunCount: 1 }
    }).ok, false);
    assert.equal("qualityVerdict" in snapshot.completeness, false);
  });
});
