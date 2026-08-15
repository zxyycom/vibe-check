import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { projectHumanStatus } from "./human-status.ts";
import type { CoreSnapshot } from "./model.ts";
import type { DecisionEvidence } from "./policy-model.ts";

describe("check-record human status projection", () => {
  it("projects unavailable, no-completed, quality failure, and passed Core snapshots without changing them", () => {
    const cases: readonly [string, CoreSnapshot, "failed" | "warning" | "passed"][] = [
      ["unavailable", snapshot([unavailableCheck()]), "failed"],
      ["no completed", snapshot([notApplicableCheck()]), "warning"],
      ["quality failure", snapshot([completedCheck("failed")]), "warning"],
      ["passed", snapshot([completedCheck("passed")]), "passed"]
    ];
    for (const [name, current, expected] of cases) {
      const before = structuredClone(current);
      const projected = projectHumanStatus({
        decision: evidence({ acceptance: [], allRecordIds: [] }),
        snapshot: current,
        verificationOutput: false
      });
      assert.equal(projected.normal, expected, name);
      assert.equal(projected.selected, expected, name);
      assert.deepEqual(current, before, `${name} must remain a pure projection input`);
    }
  });

  it("uses the acceptance-applied all view only for verification projection and keeps decision evidence unchanged", () => {
    const current = snapshot([completedCheck("failed")], [record("record-a"), record("record-b")]);
    const decision = evidence({ acceptance: ["record-a", "record-b"], allRecordIds: ["record-a", "record-b"] });
    const before = structuredClone({ current, decision });

    const normal = projectHumanStatus({ decision, snapshot: current, verificationOutput: false });
    const verification = projectHumanStatus({ decision, snapshot: current, verificationOutput: true });

    assert.deepEqual(normal, { normal: "warning", selected: "warning", verification: "passed" });
    assert.deepEqual(verification, { normal: "warning", selected: "passed", verification: "passed" });
    assert.deepEqual({ current, decision }, before);
  });

  it("does not let verification output turn unavailable or no-completed current work into passed", () => {
    assert.equal(projectHumanStatus({
      decision: evidence({ acceptance: ["record-a"], allRecordIds: ["record-a"] }),
      snapshot: snapshot([unavailableCheck()], [record("record-a")]),
      verificationOutput: true
    }).selected, "failed");
    assert.equal(projectHumanStatus({
      decision: evidence({ acceptance: [], allRecordIds: [] }),
      snapshot: snapshot([notApplicableCheck()]),
      verificationOutput: true
    }).selected, "warning");
  });
});

function evidence(input: Readonly<{ acceptance: readonly string[]; allRecordIds: readonly string[] }>): DecisionEvidence {
  return {
    acceptance: input.acceptance.map((recordId, index) => ({
      acceptanceId: `acceptance-${index + 1}`,
      reason: "Fixture acceptance is reviewed.",
      recordId
    })),
    blockWhen: { status: "not-matched", evidenceRefs: [], blockingRecordRefs: [] },
    gate: { policyId: "all", status: "passed", evidenceRefs: [], blockingRecordRefs: [] },
    policyId: "all",
    readiness: [],
    views: [{ viewId: "all-current", recordRefs: input.allRecordIds.map((recordId) => ({ kind: "record", recordId })) }]
  };
}

function snapshot(
  checks: CoreSnapshot["checks"],
  records: CoreSnapshot["records"] = []
): CoreSnapshot {
  return { checks, records };
}

function checkDefinition() {
  return {
    checkId: "file-metrics",
    displayName: "Files",
    recordTypes: [{
      recordTypeId: "file-code-lines",
      fields: [{ fieldId: "metric", valueType: "string", required: true }],
      identityFields: ["metric"]
    }]
  } as const;
}

function completedCheck(verdict: "passed" | "failed"): CoreSnapshot["checks"][number] {
  return { ...checkDefinition(), outcome: { kind: "completed", verdict } };
}

function unavailableCheck(): CoreSnapshot["checks"][number] {
  return {
    ...checkDefinition(),
    outcome: { kind: "unavailable", diagnostic: { category: "execution-failed" } }
  };
}

function notApplicableCheck(): CoreSnapshot["checks"][number] {
  return { ...checkDefinition(), outcome: { kind: "not-applicable" } };
}

function record(recordId: string): CoreSnapshot["records"][number] {
  return {
    checkId: "file-metrics",
    fields: { metric: "code-lines" },
    level: "warning",
    location: { column: 1, line: 1, path: "src/a.ts" },
    message: "Long file",
    recordId,
    recordTypeId: "file-code-lines",
    semanticSubject: recordId
  };
}
