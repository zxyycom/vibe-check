import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { resolveCheckCatalog, type ResolvedCheckCatalog } from "./catalog.ts";
import { evaluateDecisionPolicy } from "./policy-evaluator.ts";
import { resolveCurrentObservation, resolveCurrentPolicy } from "./current-adapter.ts";
import { validatePolicyResolution } from "./policy-validation.ts";

const baseline = {
  referenceId: "reference/v1/sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  referenceName: "baseline"
} as const;

const semanticCheckIds = [
  "file-code-lines",
  "function-cyclomatic-complexity",
  "function-code-lines",
  "function-parameter-count",
  "duplicate-code"
] as const;

describe("check-record current policy adapter", () => {
  it("maps all five legacy acceptance IDs to their owning Check and same record type through registered predicates", () => {
    const catalog = createCatalog({ selected: ["file-metrics", "function-metrics", "duplicate-detection"] });
    const resolution = resolveCurrentPolicy({
      acceptedWarnings: semanticCheckIds.map((checkId) => ({
        checkId,
        codeArea: "source",
        messageIncludes: ["large"],
        metric: "code-lines",
        path: "src/a.ts",
        reason: `${checkId} accepted`,
        suggestionIncludes: ["extract"],
        value: 400
      })),
      baseline,
      catalog,
      gate: "all"
    });

    assert.equal(resolution.ok, true);
    if (!resolution.ok) throw new Error("Expected current policy to resolve");
    assert.equal(resolution.value.policy?.policyId, "all");
    assert.deepEqual(
      resolution.value.policy?.acceptance.map(({ selector }) => selector),
      [
        { checkId: "file-metrics", recordTypeId: "file-code-lines" },
        { checkId: "function-metrics", recordTypeId: "function-cyclomatic-complexity" },
        { checkId: "function-metrics", recordTypeId: "function-code-lines" },
        { checkId: "function-metrics", recordTypeId: "function-parameter-count" },
        { checkId: "duplicate-detection", recordTypeId: "duplicate-code" }
      ]
    );
    assert.equal(
      resolution.value.policy?.acceptance[0]?.reason,
      "file-code-lines accepted"
    );
    assert.deepEqual(
      resolution.value.policy?.acceptance[0]?.predicates,
      [
        { kind: "operand-equals", operandId: "codeArea", value: "source" },
        { kind: "operand-includes", operandId: "message", value: "large" },
        { kind: "operand-equals", operandId: "metric", value: "code-lines" },
        { kind: "operand-equals", operandId: "path", value: "src/a.ts" },
        { kind: "operand-includes", operandId: "suggestion", value: "extract" },
        { kind: "operand-equals", operandId: "value", value: 400 }
      ]
    );
    assert.equal(validatePolicyResolution({
      policy: resolution.value.policy,
      references: resolution.value.references
    }, catalog).ok, true);
  });

  it("rejects a legacy filter that the owning catalog surface does not expose instead of walking record data", () => {
    const catalog = createCatalog({
      selected: ["file-metrics"],
      withoutOperand: "suggestion"
    });
    const resolution = resolveCurrentPolicy({
      acceptedWarnings: [{
        checkId: "file-code-lines",
        reason: "Old suggestion matcher",
        suggestionIncludes: ["extract"]
      }],
      baseline: null,
      catalog,
      gate: "all"
    });

    assert.deepEqual(resolution, {
      ok: false,
      error: {
        kind: "current-policy-adapter-failed",
        reason: "catalog-surface-mismatch"
      }
    });
  });

  it("turns omitted gate into disabled and the three spellings into ordinary policies with current and comparison readiness", () => {
    const catalog = createCatalog({ selected: ["file-metrics", "function-metrics", "duplicate-detection"] });
    const disabled = resolveCurrentPolicy({ acceptedWarnings: [], baseline: null, catalog, gate: null });
    assert.equal(disabled.ok, true);
    if (!disabled.ok) throw new Error("Expected disabled policy");
    assert.deepEqual(disabled.value, {
      catalogFingerprint: catalog.catalogFingerprint,
      policy: null,
      references: []
    });
    const observation = resolveCurrentObservation({
      acceptedWarnings: [{
        checkId: "file-code-lines",
        reason: "Current file observation accepted"
      }],
      catalog
    });
    assert.equal(observation.ok, true);
    if (!observation.ok) throw new Error("Expected current record observation");
    assert.equal(observation.value.acceptance[0]?.reason, "Current file observation accepted");
    assert.deepEqual(observation.value.views.map((view) => view.viewId), ["all-current"]);

    const policies = ["all", "changed", "regressions"] as const;
    for (const gate of policies) {
      const result = resolveCurrentPolicy({ acceptedWarnings: [], baseline, catalog, gate });
      assert.equal(result.ok, true);
      if (!result.ok) throw new Error(`Expected ${gate} policy`);
      const policy = result.value.policy!;
      assert.equal(policy.policyId, gate);
      assert.equal(policy.blockWhen.kind, "view-not-empty");
      assert.equal(policy.views.find((view) => view.viewId === "all-current")?.acceptance, "all");
      assert.equal(policy.views.find((view) => view.viewId === `${gate}-unaccepted`)?.acceptance, "unaccepted");
      assert.deepEqual(
        policy.views.find((view) => view.viewId === `${gate}-unaccepted`)?.predicates,
        gate === "changed"
          ? [{ kind: "relation-kind-in", referenceName: "baseline", values: ["changed", "regression"] }]
          : gate === "regressions"
            ? [{ kind: "relation-is", referenceName: "baseline", relationId: "regression" }]
            : []
      );
      assert.deepEqual(policy.readiness
        .filter((clause) => clause.predicate.kind === "run-status")
        .map((clause) => clause.predicate), [
        { kind: "run-status", checkId: "duplicate-detection", status: "completed" },
        { kind: "run-status", checkId: "file-metrics", status: "completed" },
        { kind: "run-status", checkId: "function-metrics", status: "completed" }
      ]);
      if (gate === "all") {
        assert.deepEqual(result.value.references, []);
        assert.equal(policy.references.length, 0);
      } else {
        assert.deepEqual(result.value.references, [baseline]);
        assert.deepEqual(policy.references, [{
          referenceName: "baseline",
          checkIds: ["duplicate-detection", "file-metrics", "function-metrics"]
        }]);
        assert.deepEqual(policy.readiness
          .filter((clause) => clause.predicate.kind === "reference-status")
          .map((clause) => clause.predicate), [
          { kind: "reference-status", checkId: "duplicate-detection", referenceName: "baseline", status: "complete" },
          { kind: "reference-status", checkId: "file-metrics", referenceName: "baseline", status: "complete" },
          { kind: "reference-status", checkId: "function-metrics", referenceName: "baseline", status: "complete" }
        ]);
      }
    }
  });

  it("uses its own readiness to preserve no-eligible current gate semantics without a Core gate-name switch", () => {
    const catalog = createCatalog({ selected: [] });
    const resolution = resolveCurrentPolicy({ acceptedWarnings: [], baseline: null, catalog, gate: "all" });
    assert.equal(resolution.ok, true);
    if (!resolution.ok) throw new Error("Expected no-input policy");
    const snapshot = {
      catalogFingerprint: catalog.catalogFingerprint,
      completeness: {
        acknowledgedWorkCount: 0,
        completedRunCount: 0,
        failedRunCount: 0,
        plannedWorkCount: 0,
        selectedRunCount: 0,
        status: "complete"
      },
      definitions: catalog.definitions,
      integrity: { conflicts: [], invalidRecords: [], status: "valid" },
      records: [],
      runs: [{
        applicability: null,
        checkId: "duplicate-detection",
        checkRunId: catalog.checks.find((check) => check.definition.checkId === "duplicate-detection")!.checkRunId,
        coverage: null,
        diagnostic: null,
        result: null,
        selection: "unselected",
        status: "skipped"
      }, {
        applicability: null,
        checkId: "file-metrics",
        checkRunId: catalog.checks.find((check) => check.definition.checkId === "file-metrics")!.checkRunId,
        coverage: null,
        diagnostic: null,
        result: null,
        selection: "unselected",
        status: "skipped"
      }, {
        applicability: null,
        checkId: "function-metrics",
        checkRunId: catalog.checks.find((check) => check.definition.checkId === "function-metrics")!.checkRunId,
        coverage: null,
        diagnostic: null,
        result: null,
        selection: "unselected",
        status: "skipped"
      }]
    } as const;
    const decision = evaluateDecisionPolicy(resolution.value, snapshot, { evidence: [], relations: [] });

    assert.deepEqual(decision.gate, {
      status: "not-evaluated",
      policyId: "all",
      reason: "no-eligible-input",
      evidenceRefs: [
        { kind: "run", checkRunId: snapshot.runs[0].checkRunId },
        { kind: "readiness", readinessId: "current-eligible" }
      ]
    });
  });

  it("requires reference evidence only for current-applicable Checks", () => {
    const catalog = createCatalog({
      notApplicable: ["duplicate-detection"],
      selected: ["file-metrics", "function-metrics", "duplicate-detection"]
    });
    const resolution = resolveCurrentPolicy({
      acceptedWarnings: [],
      baseline,
      catalog,
      gate: "regressions"
    });

    assert.equal(resolution.ok, true);
    if (!resolution.ok) throw new Error("Expected comparison policy");
    assert.deepEqual(resolution.value.policy?.references, [{
      referenceName: "baseline",
      checkIds: ["file-metrics", "function-metrics"]
    }]);
    assert.deepEqual(
      resolution.value.policy?.readiness
        .filter((clause) => clause.predicate.kind === "reference-status")
        .map((clause) => clause.predicate),
      [
        { kind: "reference-status", checkId: "file-metrics", referenceName: "baseline", status: "complete" },
        { kind: "reference-status", checkId: "function-metrics", referenceName: "baseline", status: "complete" }
      ]
    );
  });
});

function createCatalog(input: Readonly<{
  notApplicable?: readonly string[];
  selected: readonly string[];
  withoutOperand?: "suggestion";
}>): ResolvedCheckCatalog {
  const policy = {
    operands: [
      { operandId: "codeArea", source: { kind: "field", fieldId: "codeArea" }, valueType: "string" },
      { operandId: "message", source: { kind: "message" }, valueType: "string" },
      { operandId: "metric", source: { kind: "field", fieldId: "metric" }, valueType: "string" },
      { operandId: "path", source: { kind: "location-path" }, valueType: "string" },
      { operandId: "suggestion", source: { kind: "field", fieldId: "suggestion" }, valueType: "string" },
      { operandId: "value", source: { kind: "field", fieldId: "value" }, valueType: "number" }
    ].filter((operand) => operand.operandId !== input.withoutOperand),
    relations: ["changed", "regression"]
  } as const;
  const definition = (checkId: string, recordTypeIds: readonly string[]) => ({
    checkId,
    displayName: checkId,
    recordTypes: recordTypeIds.map((recordTypeId) => ({
      recordTypeId,
      fields: [
        { fieldId: "codeArea", required: true, valueType: "string" },
        { fieldId: "metric", required: true, valueType: "string" },
        { fieldId: "suggestion", required: true, valueType: "string" },
        { fieldId: "value", required: true, valueType: "number" }
      ],
      identityFields: ["metric"],
      policy
    }))
  });
  const definitions = [
    definition("file-metrics", ["file-code-lines"]),
    definition("function-metrics", [
      "function-cyclomatic-complexity",
      "function-code-lines",
      "function-parameter-count"
    ]),
    definition("duplicate-detection", ["duplicate-code"])
  ];
  const resolved = resolveCheckCatalog({
    invocationKey: "current-policy-adapter",
    definitions,
    bindings: definitions.map(({ checkId }) => ({ checkId, execute: () => ({ verdict: "passed" }) })),
    selectedCheckIds: input.selected,
    resolveApplicability: ({ checkId }) => input.notApplicable?.includes(checkId)
      ? ({ status: "not-applicable" })
      : ({ status: "applicable", workHandles: [] })
  });
  if (!resolved.ok) throw new Error("Expected fixture catalog");
  return resolved.value;
}
