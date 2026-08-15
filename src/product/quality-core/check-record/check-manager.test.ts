import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { resolveCheckCatalog, type ResolvedCheckCatalog } from "./catalog.ts";
import { CheckManager } from "./check-manager.ts";
import type { RunDiagnostic } from "./model.ts";

function definition(checkId: string) {
  return {
    checkId,
    displayName: checkId,
    recordTypes: [{
      recordTypeId: "finding",
      fields: [{ fieldId: "kind", valueType: "string", required: true }],
      identityFields: ["kind"]
    }]
  } as const;
}

function catalog(input: Readonly<{
  selected: readonly string[];
  applicability: Readonly<Record<string, "not-applicable" | readonly string[]>>;
}>): ResolvedCheckCatalog {
  const definitions = Object.keys(input.applicability)
    .concat("skipped-check")
    .filter((checkId, index, values) => values.indexOf(checkId) === index)
    .map(definition);
  const resolved = resolveCheckCatalog({
    invocationKey: "check-manager-fixture",
    definitions,
    bindings: definitions.map(({ checkId }) => ({
      checkId,
      execute: () => ({ verdict: "passed" })
    })),
    schedules: definitions.map(({ checkId }) => ({ checkId, requiresChecks: [] })),
    selectedCheckIds: input.selected,
    resolveApplicability: ({ checkId }) => input.applicability[checkId] === "not-applicable"
      ? { status: "not-applicable" }
      : { status: "applicable", workHandles: input.applicability[checkId] }
  });
  if (!resolved.ok) throw new Error(`Unexpected ${resolved.error.stage} fixture failure`);
  return resolved.value;
}

function applicableRun(catalogValue: ResolvedCheckCatalog, checkId: string) {
  return catalogValue.checks.find((check) => check.definition.checkId === checkId)!;
}

describe("check-record CheckManager", () => {
  it("creates one run per definition and keeps skipped not-applicable and applicable zero-work states distinct", () => {
    const catalogValue = catalog({
      selected: ["applicable-check", "not-applicable-check"],
      applicability: {
        "applicable-check": [],
        "not-applicable-check": "not-applicable"
      }
    });
    const applicable = applicableRun(catalogValue, "applicable-check");
    const manager = new CheckManager(catalogValue);
    assert.deepEqual(manager.settleRun({
      checkId: applicable.definition.checkId,
      checkRunId: applicable.checkRunId,
      report: { status: "returned", result: { verdict: "failed" } },
      hasRecordFailure: false
    }), { availability: "available" });
    const runs = manager.finalize();

    assert.deepEqual(runs.map((run) => ({
      checkId: run.checkId,
      selection: run.selection,
      applicability: run.applicability,
      status: run.status,
      result: run.result,
      coverage: run.coverage
    })), [{
      checkId: "applicable-check", selection: "selected", applicability: "applicable",
      status: "completed", result: { verdict: "failed" },
      coverage: { plannedWorkCount: 0, acknowledgedWorkCount: 0 }
    }, {
      checkId: "not-applicable-check", selection: "selected", applicability: "not-applicable",
      status: "completed", result: { verdict: "not-applicable" },
      coverage: { plannedWorkCount: 0, acknowledgedWorkCount: 0 }
    }, {
      checkId: "skipped-check", selection: "unselected", applicability: null,
      status: "skipped", result: null, coverage: null
    }]);
    assert.throws(() => manager.finalize(), /already finalized/);
  });

  it("freezes acknowledgement facts at settlement and rejects retained ports without changing them", () => {
    const catalogValue = catalog({
      selected: ["alpha-check", "beta-check"],
      applicability: {
        "alpha-check": ["work-handle/v1:alpha"],
        "beta-check": ["work-handle/v1:beta"]
      }
    });
    const alpha = applicableRun(catalogValue, "alpha-check");
    const beta = applicableRun(catalogValue, "beta-check");
    const manager = new CheckManager(catalogValue);
    const acknowledgeAlpha = manager.createAcknowledgementPort(alpha.definition.checkId, alpha.checkRunId);
    const acknowledgeBeta = manager.createAcknowledgementPort(beta.definition.checkId, beta.checkRunId);
    assert.equal(acknowledgeAlpha("work-handle/v1:alpha"), "accepted");
    assert.equal(acknowledgeAlpha("work-handle/v1:alpha"), "duplicate");
    assert.deepEqual(manager.settleRun({
      checkId: alpha.definition.checkId,
      checkRunId: alpha.checkRunId,
      report: { status: "returned", result: { verdict: "passed" } },
      hasRecordFailure: false
    }), { availability: "available" });
    assert.equal(acknowledgeAlpha("work-handle/v1:alpha"), "rejected");
    assert.equal(acknowledgeBeta("work-handle/v1:beta"), "accepted");
    manager.settleRun({
      checkId: beta.definition.checkId,
      checkRunId: beta.checkRunId,
      report: { status: "returned", result: { verdict: "passed" } },
      hasRecordFailure: false
    });
    assert.deepEqual(manager.finalize().map((run) => run.status), ["completed", "completed", "skipped"]);
  });

  it("makes availability exactly match final completed status under result ack and record failures", () => {
    const recordConflict: RunDiagnostic = {
      category: "record-conflict",
      tieBreakKey: "check-record/v1/record/sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    };
    const fixtures = [{
      report: { status: "returned", result: { verdict: "not-applicable" } },
      hasRecordFailure: false,
      diagnostics: [] as RunDiagnostic[],
      category: "invalid-result"
    }, {
      report: { status: "unavailable", dependencyId: "scanner" },
      hasRecordFailure: false,
      diagnostics: [] as RunDiagnostic[],
      category: "unavailable"
    }, {
      report: { status: "execution-failed", executionId: "execution/v1:runner-check" },
      hasRecordFailure: false,
      diagnostics: [] as RunDiagnostic[],
      category: "execution-failed"
    }, {
      report: { status: "returned", result: { verdict: "passed" } },
      hasRecordFailure: true,
      diagnostics: [recordConflict],
      category: "record-conflict"
    }] as const;

    for (const fixture of fixtures) {
      const catalogValue = catalog({ selected: ["runner-check"], applicability: { "runner-check": [] } });
      const check = applicableRun(catalogValue, "runner-check");
      const manager = new CheckManager(catalogValue);
      assert.deepEqual(manager.settleRun({
        checkId: check.definition.checkId,
        checkRunId: check.checkRunId,
        report: fixture.report,
        hasRecordFailure: fixture.hasRecordFailure
      }), { availability: "unavailable" });
      const run = manager.finalize(new Map([["runner-check", fixture.diagnostics]]))[0]!;
      assert.equal(run.status, "failed");
      assert.equal(run.diagnostic?.category, fixture.category);
    }
  });

  it("treats duplicate unknown and missing settlement as trusted invariant failures", () => {
    const catalogValue = catalog({ selected: ["runner-check"], applicability: { "runner-check": [] } });
    const check = applicableRun(catalogValue, "runner-check");
    const manager = new CheckManager(catalogValue);
    assert.throws(() => manager.settleRun({
      checkId: "unknown-check",
      checkRunId: check.checkRunId,
      report: { status: "returned", result: { verdict: "passed" } },
      hasRecordFailure: false
    }), /one unsettled applicable owned run/);
    assert.throws(() => manager.finalize(), /before every applicable run settles/);

    const duplicateManager = new CheckManager(catalogValue);
    duplicateManager.settleRun({
      checkId: check.definition.checkId,
      checkRunId: check.checkRunId,
      report: { status: "returned", result: { verdict: "passed" } },
      hasRecordFailure: false
    });
    assert.throws(() => duplicateManager.settleRun({
      checkId: check.definition.checkId,
      checkRunId: check.checkRunId,
      report: { status: "returned", result: { verdict: "passed" } },
      hasRecordFailure: false
    }), /one unsettled applicable owned run/);
  });
});
