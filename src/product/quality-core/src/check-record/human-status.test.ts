import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { projectHumanStatus } from "./human-status.ts";
import type { DecisionEvidence } from "./policy-model.ts";
import type { FinalCoreSnapshot } from "./model.ts";

describe("check-record human status projection", () => {
  it("projects incomplete, no-eligible, completed quality failure, and passed current snapshots without changing them", () => {
    const cases: readonly [string, FinalCoreSnapshot, "failed" | "warning" | "passed"][] = [
      ["incomplete", snapshot({ completeness: "incomplete", runs: [failedRun()] }), "failed"],
      ["no eligible", snapshot({ runs: [notApplicableRun()] }), "warning"],
      ["quality failure", snapshot({ runs: [completedRun("failed")] }), "warning"],
      ["passed", snapshot({ runs: [completedRun("passed")] }), "passed"]
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
    const current = snapshot({
      records: [record("record-a"), record("record-b")],
      runs: [completedRun("failed")]
    });
    const decision = evidence({ acceptance: ["record-a", "record-b"], allRecordIds: ["record-a", "record-b"] });
    const before = structuredClone({ current, decision });

    const normal = projectHumanStatus({ decision, snapshot: current, verificationOutput: false });
    const verification = projectHumanStatus({ decision, snapshot: current, verificationOutput: true });

    assert.deepEqual(normal, { normal: "warning", selected: "warning", verification: "passed" });
    assert.deepEqual(verification, { normal: "warning", selected: "passed", verification: "passed" });
    assert.deepEqual({ current, decision }, before);
  });

  it("does not let verification output turn incomplete or no-eligible current work into passed", () => {
    assert.equal(projectHumanStatus({
      decision: evidence({ acceptance: ["record-a"], allRecordIds: ["record-a"] }),
      snapshot: snapshot({ completeness: "incomplete", records: [record("record-a")], runs: [failedRun()] }),
      verificationOutput: true
    }).selected, "failed");
    assert.equal(projectHumanStatus({
      decision: evidence({ acceptance: [], allRecordIds: [] }),
      snapshot: snapshot({ runs: [notApplicableRun()] }),
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

function snapshot(input: Readonly<{
  completeness?: "complete" | "incomplete";
  records?: FinalCoreSnapshot["records"];
  runs: FinalCoreSnapshot["runs"];
}>): FinalCoreSnapshot {
  const runs = input.runs;
  return {
    catalogFingerprint: "check-record/v1/catalog/sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    completeness: {
      acknowledgedWorkCount: runs.reduce((sum, run) => sum + (run.coverage?.acknowledgedWorkCount ?? 0), 0),
      completedRunCount: runs.filter((run) => run.status === "completed").length,
      failedRunCount: runs.filter((run) => run.status === "failed").length,
      plannedWorkCount: runs.reduce((sum, run) => sum + (run.coverage?.plannedWorkCount ?? 0), 0),
      selectedRunCount: runs.filter((run) => run.selection === "selected").length,
      status: input.completeness ?? "complete"
    },
    definitions: [],
    integrity: { conflicts: [], invalidRecords: [], status: "valid" },
    records: input.records ?? [],
    runs
  };
}

function completedRun(verdict: "passed" | "failed"): FinalCoreSnapshot["runs"][number] {
  return {
    applicability: "applicable",
    checkId: "file-metrics",
    checkRunId: "check-run/v1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    coverage: { acknowledgedWorkCount: 0, plannedWorkCount: 0 },
    diagnostic: null,
    result: { verdict },
    selection: "selected",
    status: "completed"
  };
}

function failedRun(): FinalCoreSnapshot["runs"][number] {
  return {
    applicability: "applicable",
    checkId: "file-metrics",
    checkRunId: "check-run/v1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    coverage: { acknowledgedWorkCount: 0, plannedWorkCount: 0 },
    diagnostic: { category: "execution-failed", tieBreakKey: "execution/v1:file-metrics" },
    result: null,
    selection: "selected",
    status: "failed"
  };
}

function notApplicableRun(): FinalCoreSnapshot["runs"][number] {
  return {
    applicability: "not-applicable",
    checkId: "file-metrics",
    checkRunId: "check-run/v1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    coverage: { acknowledgedWorkCount: 0, plannedWorkCount: 0 },
    diagnostic: null,
    result: { verdict: "not-applicable" },
    selection: "selected",
    status: "completed"
  };
}

function record(recordId: string): FinalCoreSnapshot["records"][number] {
  return {
    checkId: "file-metrics",
    checkRunId: "check-run/v1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    fields: { metric: "code-lines" },
    level: "warning",
    location: { column: 1, line: 1, path: "src/a.ts" },
    message: "Long file",
    recordId,
    recordTypeId: "file-code-lines",
    semanticSubject: recordId
  };
}
