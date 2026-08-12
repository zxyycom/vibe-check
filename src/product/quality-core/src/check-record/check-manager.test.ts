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
    selectedCheckIds: input.selected,
    resolveApplicability: ({ checkId }) => {
      const applicability = input.applicability[checkId];
      return applicability === "not-applicable"
        ? { status: "not-applicable" }
        : { status: "applicable", workHandles: applicability };
    }
  });
  if (!resolved.ok) {
    throw new Error(`Unexpected ${resolved.error.stage} fixture failure`);
  }
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
    const runs = manager.finalize([{
      checkId: applicable.definition.checkId,
      checkRunId: applicable.checkRunId,
      status: "returned",
      result: { verdict: "failed" }
    }]);

    assert.deepEqual(runs.map((run) => ({
      checkId: run.checkId,
      selection: run.selection,
      applicability: run.applicability,
      status: run.status,
      result: run.result,
      coverage: run.coverage
    })), [{
      checkId: "applicable-check",
      selection: "selected",
      applicability: "applicable",
      status: "completed",
      result: { verdict: "failed" },
      coverage: { plannedWorkCount: 0, acknowledgedWorkCount: 0 }
    }, {
      checkId: "not-applicable-check",
      selection: "selected",
      applicability: "not-applicable",
      status: "completed",
      result: { verdict: "not-applicable" },
      coverage: { plannedWorkCount: 0, acknowledgedWorkCount: 0 }
    }, {
      checkId: "skipped-check",
      selection: "unselected",
      applicability: null,
      status: "skipped",
      result: null,
      coverage: null
    }]);
    assert.throws(() => manager.finalize([]), /already finalized/);
  });

  it("derives coverage only from owned handles and treats duplicate acknowledgements idempotently", () => {
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
    assert.equal(acknowledgeAlpha("work-handle/v1:beta"), "rejected");
    assert.equal(acknowledgeAlpha("https://user:secret@example.test/private"), "rejected");
    manager.closeRun(alpha.definition.checkId, alpha.checkRunId);
    assert.equal(acknowledgeAlpha("work-handle/v1:alpha"), "rejected");
    assert.equal(acknowledgeBeta("work-handle/v1:beta"), "accepted");

    const runs = manager.finalize([alpha, beta].map((check) => ({
      checkId: check.definition.checkId,
      checkRunId: check.checkRunId,
      status: "returned",
      result: { verdict: "passed" }
    })));
    assert.deepEqual(runs.map((run) => ({
      checkId: run.checkId,
      status: run.status,
      coverage: run.coverage,
      diagnostic: run.diagnostic
    })), [{
      checkId: "alpha-check",
      status: "failed",
      coverage: { plannedWorkCount: 1, acknowledgedWorkCount: 1 },
      diagnostic: { category: "ack-protocol", tieBreakKey: "work-handle/v1:alpha" }
    }, {
      checkId: "beta-check",
      status: "completed",
      coverage: { plannedWorkCount: 1, acknowledgedWorkCount: 1 },
      diagnostic: null
    }, {
      checkId: "skipped-check",
      status: "skipped",
      coverage: null,
      diagnostic: null
    }]);
    assert.equal(JSON.stringify(runs).includes("secret"), false);
  });

  it("fails closed on terminal report and result violations with canonical diagnostic precedence", () => {
    const recordConflict: RunDiagnostic = {
      category: "record-conflict",
      tieBreakKey: "check-record/v1/record/sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    };
    const fixtures: readonly Readonly<{
      reports: (check: ReturnType<typeof applicableRun>) => readonly unknown[];
      diagnostics?: readonly RunDiagnostic[];
      expectedCategory: string;
    }>[] = [
      { reports: () => [], expectedCategory: "terminal-report-set" },
      {
        reports: (check) => [{
          checkId: check.definition.checkId,
          checkRunId: check.checkRunId,
          status: "returned",
          result: { verdict: "passed" }
        }, {
          checkId: check.definition.checkId,
          checkRunId: check.checkRunId,
          status: "returned",
          result: { verdict: "passed" }
        }],
        expectedCategory: "terminal-report-set"
      },
      {
        reports: (check) => [{
          checkId: check.definition.checkId,
          checkRunId: check.checkRunId,
          status: "returned",
          result: { verdict: "not-applicable" }
        }],
        expectedCategory: "invalid-result"
      },
      {
        reports: (check) => [{
          checkId: check.definition.checkId,
          checkRunId: check.checkRunId,
          status: "unavailable",
          dependencyId: "scanner"
        }],
        expectedCategory: "unavailable"
      },
      {
        reports: (check) => [{
          checkId: check.definition.checkId,
          checkRunId: check.checkRunId,
          status: "execution-failed",
          executionId: "execution/v1:runner-check"
        }],
        expectedCategory: "execution-failed"
      },
      {
        reports: (check) => [{
          checkId: check.definition.checkId,
          checkRunId: check.checkRunId,
          status: "returned",
          result: { verdict: "not-applicable" }
        }],
        diagnostics: [recordConflict],
        expectedCategory: "record-conflict"
      }
    ];

    for (const fixture of fixtures) {
      const catalogValue = catalog({
        selected: ["runner-check"],
        applicability: { "runner-check": [] }
      });
      const check = applicableRun(catalogValue, "runner-check");
      const manager = new CheckManager(catalogValue);
      const runs = manager.finalize(fixture.reports(check), new Map([
        ["runner-check", fixture.diagnostics ?? []]
      ]));
      const run = runs.find((candidate) => candidate.checkId === "runner-check")!;
      assert.equal(run.status, "failed");
      assert.equal(run.result, null);
      assert.equal(run.diagnostic?.category, fixture.expectedCategory);
    }
  });
});
