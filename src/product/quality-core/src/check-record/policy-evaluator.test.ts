import { describe, expect, test } from "bun:test";

import { resolveCheckCatalog } from "./catalog.ts";
import { createCatalogFingerprint, createDeterministicCheckRunId, createRecordId } from "./identity.ts";
import type {
  CheckDefinition,
  FinalCoreSnapshot,
  ManagerBoundQualityRecordCandidate
} from "./model.ts";
import { evaluateDecisionPolicy } from "./policy-evaluator.ts";
import {
  validatePolicyResolution,
  validateReferenceFacts
} from "./policy-validation.ts";

const referenceId = `reference/v1/sha256:${"b".repeat(64)}`;
const definition = {
  checkId: "file-metrics",
  displayName: "Files",
  recordTypes: [{
    recordTypeId: "file-code-lines",
    fields: [
      { fieldId: "path", valueType: "string", required: true },
      { fieldId: "generated", valueType: "boolean", required: true },
      { fieldId: "approved", valueType: "boolean", required: true }
    ],
    identityFields: ["path"],
    policy: {
      operands: [{
        operandId: "generated",
        valueType: "boolean",
        source: { kind: "field", fieldId: "generated" }
      }],
      relations: ["changed", "regression"]
    }
  }]
} as const satisfies CheckDefinition;

function makeCatalog(source: unknown = [definition]) {
  const resolved = resolveCheckCatalog({
    invocationKey: "policy-evaluation",
    definitions: source,
    bindings: [{ checkId: "file-metrics", execute: () => undefined }],
    selectedCheckIds: ["file-metrics"],
    resolveApplicability: () => ({ status: "applicable", workHandles: [] })
  });
  if (!resolved.ok) throw new Error("Policy catalog fixture must resolve");
  return resolved.value;
}

function record(path: string, generated: boolean, runId: string) {
  const candidate: ManagerBoundQualityRecordCandidate = {
    checkId: "file-metrics",
    checkRunId: runId,
    recordTypeId: "file-code-lines",
    level: "warning",
    semanticSubject: path,
    message: `${path} is long`,
    fields: { path, generated, approved: false },
    location: { path, line: 10, column: 1 }
  };
  return { ...candidate, recordId: createRecordId(candidate, definition.recordTypes[0]).recordId };
}

function snapshot(status: "completed" | "failed"): FinalCoreSnapshot {
  const checkRunId = createDeterministicCheckRunId({ invocationKey: "evaluation", checkId: "file-metrics" });
  const records = [record("src/z.ts", false, checkRunId), record("src/a.ts", true, checkRunId), record("src/m.ts", false, checkRunId)];
  const failed = status === "failed";
  return {
    catalogFingerprint: createCatalogFingerprint([definition]).catalogFingerprint,
    definitions: [definition],
    runs: [{
      checkId: "file-metrics",
      checkRunId,
      selection: "selected",
      applicability: "applicable",
      status,
      result: failed ? null : { verdict: "passed" },
      coverage: { plannedWorkCount: 3, acknowledgedWorkCount: failed ? 2 : 3 },
      diagnostic: failed ? { category: "execution-failed", tieBreakKey: "runner" } : null
    }],
    records,
    integrity: { status: "valid", invalidRecords: [], conflicts: [] },
    completeness: {
      status: failed ? "incomplete" : "complete",
      selectedRunCount: 1,
      completedRunCount: failed ? 0 : 1,
      failedRunCount: failed ? 1 : 0,
      plannedWorkCount: 3,
      acknowledgedWorkCount: failed ? 2 : 3
    }
  } as FinalCoreSnapshot;
}

function currentPolicy() {
  return {
    references: [{ referenceName: "baseline", referenceId }],
    policy: {
      policyId: "current-regressions",
      references: [{ referenceName: "baseline", checkIds: ["file-metrics"] }],
      acceptance: [{
        acceptanceId: "accept-generated",
        reason: "Generated finding is reviewed.",
        selector: { checkId: "file-metrics", recordTypeId: "file-code-lines" },
        predicates: [{ kind: "operand-equals", operandId: "generated", value: true }]
      }],
      views: [{
        viewId: "unaccepted-regressions",
        selectors: [{ checkId: "file-metrics", recordTypeId: "file-code-lines" }],
        acceptance: "unaccepted",
        predicates: [{ kind: "relation-is", referenceName: "baseline", relationId: "regression" }]
      }],
      readiness: [{
        readinessId: "current-complete",
        predicate: { kind: "run-status", checkId: "file-metrics", status: "completed" },
        reason: "scan-incomplete"
      }, {
        readinessId: "comparison-complete",
        predicate: {
          kind: "reference-status",
          checkId: "file-metrics",
          referenceName: "baseline",
          status: "complete"
        },
        reason: "comparison-unavailable"
      }],
      blockWhen: { kind: "view-not-empty", viewId: "unaccepted-regressions" }
    }
  } as const;
}

function validateInputs(core: FinalCoreSnapshot, evidenceStatus: "complete" | "unavailable" = "complete") {
  const resolution = validatePolicyResolution(currentPolicy(), makeCatalog());
  expect(resolution.ok).toBe(true);
  if (!resolution.ok) throw new Error("policy fixture invalid");
  const relations = core.records.map((entry) => ({
    recordId: entry.recordId,
    referenceName: "baseline",
    relationId: "regression"
  }));
  const facts = validateReferenceFacts({
    evidence: [{ checkId: "file-metrics", referenceName: "baseline", status: evidenceStatus }],
    relations: evidenceStatus === "complete" ? relations : []
  }, resolution.value, core);
  expect(facts.ok).toBe(true);
  if (!facts.ok) throw new Error("reference fixture invalid");
  return { resolution: resolution.value, facts: facts.value };
}

describe("check-record policy evaluation", () => {
  test("matches relation-kind-in membership so regressions enter changed views and unchanged records stay out", () => {
    const core = snapshot("completed");
    const input = {
      references: [{ referenceName: "baseline", referenceId }],
      policy: {
        policyId: "current-changed",
        references: [{ referenceName: "baseline", checkIds: ["file-metrics"] }],
        acceptance: [],
        views: [{
          viewId: "changed",
          selectors: [{ checkId: "file-metrics", recordTypeId: "file-code-lines" }],
          acceptance: "all",
          predicates: [{
            kind: "relation-kind-in",
            referenceName: "baseline",
            values: ["changed", "regression"]
          }]
        }],
        readiness: [],
        blockWhen: { kind: "view-not-empty", viewId: "changed" }
      }
    } as const;
    const resolution = validatePolicyResolution(input, makeCatalog());
    expect(resolution.ok).toBe(true);
    if (!resolution.ok) return;
    const facts = validateReferenceFacts({
      evidence: [{ checkId: "file-metrics", referenceName: "baseline", status: "complete" }],
      relations: [{
        recordId: core.records[0]!.recordId,
        referenceName: "baseline",
        relationId: "changed"
      }, {
        recordId: core.records[1]!.recordId,
        referenceName: "baseline",
        relationId: "regression"
      }]
    }, resolution.value, core);
    expect(facts.ok).toBe(true);
    if (!facts.ok) return;

    const changed = evaluateDecisionPolicy(resolution.value, core, facts.value);
    const expectedChanged = core.records.slice(0, 2)
      .map((entry) => ({ kind: "record" as const, recordId: entry.recordId }))
      .sort((left, right) => left.recordId.localeCompare(right.recordId));
    expect(changed.views[0]?.recordRefs).toEqual(expectedChanged);
    expect(changed.gate).toEqual({
      status: "failed",
      policyId: "current-changed",
      evidenceRefs: [
        ...expectedChanged,
        { kind: "view", viewId: "changed" }
      ],
      blockingRecordRefs: expectedChanged
    });

    const regressionsOnlyInput = {
      ...input,
      policy: {
        ...input.policy,
        policyId: "current-regressions",
        views: [{
          ...input.policy.views[0],
          predicates: [{
            kind: "relation-is",
            referenceName: "baseline",
            relationId: "regression"
          }]
        }]
      }
    } as const;
    const regressionsOnly = validatePolicyResolution(regressionsOnlyInput, makeCatalog());
    expect(regressionsOnly.ok).toBe(true);
    if (!regressionsOnly.ok) return;
    const regressionResult = evaluateDecisionPolicy(regressionsOnly.value, core, facts.value);
    expect(regressionResult.views[0]?.recordRefs).toEqual([{
      kind: "record",
      recordId: core.records[1]!.recordId
    }]);
  });

  test("applies acceptance before views and preserves canonical blocking record and evidence order", () => {
    const core = snapshot("completed");
    const { resolution, facts } = validateInputs(core);
    const before = structuredClone({ core, facts });

    const result = evaluateDecisionPolicy(resolution, core, facts);

    const expectedBlocking = core.records
      .filter((entry) => entry.fields.generated === false)
      .map((entry) => ({ kind: "record", recordId: entry.recordId }))
      .sort((left, right) => left.recordId.localeCompare(right.recordId));
    expect(result.gate).toEqual({
      status: "failed",
      policyId: "current-regressions",
      evidenceRefs: [
        { kind: "run", checkRunId: core.runs[0]!.checkRunId },
        ...expectedBlocking,
        { kind: "reference", checkId: "file-metrics", referenceName: "baseline", referenceId },
        { kind: "view", viewId: "unaccepted-regressions" },
        { kind: "readiness", readinessId: "comparison-complete" },
        { kind: "readiness", readinessId: "current-complete" }
      ],
      blockingRecordRefs: expectedBlocking
    });
    expect(result.acceptance).toHaveLength(1);
    expect(result.acceptance).toEqual([{
      acceptanceId: "accept-generated",
      reason: "Generated finding is reviewed.",
      recordId: core.records[1]!.recordId
    }]);
    expect(result.views[0]?.recordRefs).toEqual(expectedBlocking);
    expect(result.readiness).toEqual([{
      readinessId: "current-complete",
      status: "passed",
      evidenceRefs: [
        { kind: "run", checkRunId: core.runs[0]!.checkRunId },
        { kind: "readiness", readinessId: "current-complete" }
      ]
    }, {
      readinessId: "comparison-complete",
      status: "passed",
      evidenceRefs: [
        { kind: "reference", checkId: "file-metrics", referenceName: "baseline", referenceId },
        { kind: "readiness", readinessId: "comparison-complete" }
      ]
    }]);
    expect(result.blockWhen).toEqual({
      status: "matched",
      evidenceRefs: [
        ...expectedBlocking,
        { kind: "view", viewId: "unaccepted-regressions" }
      ],
      blockingRecordRefs: expectedBlocking
    });
    expect(result.blockWhen?.blockingRecordRefs).toEqual(result.gate.status === "failed"
      ? result.gate.blockingRecordRefs
      : []);
    expect({ core, facts }).toEqual(before);
    expect(result.gate.status).toBe("failed");
    if (result.gate.status === "disabled") return;
    expect(Object.isFrozen(result.gate.evidenceRefs)).toBe(true);
    expect(evaluateDecisionPolicy(resolution, core, facts)).toEqual(result);
  });

  test("stops at the first readiness failure while retaining failed-run records as not evaluated", () => {
    const core = snapshot("failed");
    const { resolution, facts } = validateInputs(core);

    const result = evaluateDecisionPolicy(resolution, core, facts);

    expect(result.readiness).toEqual([{
      readinessId: "current-complete",
      status: "failed",
      reason: "scan-incomplete",
      evidenceRefs: [
        { kind: "run", checkRunId: core.runs[0]!.checkRunId },
        { kind: "readiness", readinessId: "current-complete" }
      ]
    }]);
    expect(result.blockWhen).toBe(null);
    expect(result.gate).toEqual({
      status: "not-evaluated",
      policyId: "current-regressions",
      reason: "scan-incomplete",
      evidenceRefs: [
        { kind: "run", checkRunId: core.runs[0]!.checkRunId },
        { kind: "readiness", readinessId: "current-complete" }
      ]
    });
    expect(result.views[0]?.recordRefs.length).toBe(2);
  });

  test("allows another closed policy to treat the same run failure as an ordinary blocking operand", () => {
    const core = snapshot("failed");
    const input = {
      references: [],
      policy: {
        policyId: "block-run-failure",
        references: [],
        acceptance: [],
        views: [],
        readiness: [],
        blockWhen: { kind: "run-status", checkId: "file-metrics", status: "failed" }
      }
    } as const;
    const resolution = validatePolicyResolution(input, makeCatalog());
    expect(resolution.ok).toBe(true);
    if (!resolution.ok) return;
    const facts = validateReferenceFacts({ evidence: [], relations: [] }, resolution.value, core);
    expect(facts.ok).toBe(true);
    if (!facts.ok) return;

    const decision = evaluateDecisionPolicy(resolution.value, core, facts.value);
    expect(decision.gate).toEqual({
      status: "failed",
      policyId: "block-run-failure",
      evidenceRefs: [{ kind: "run", checkRunId: core.runs[0]!.checkRunId }],
      blockingRecordRefs: []
    });
    expect(decision.blockWhen).toEqual({
      status: "matched",
      evidenceRefs: [{ kind: "run", checkRunId: core.runs[0]!.checkRunId }],
      blockingRecordRefs: []
    });
  });

  test("keeps disabled closed and makes unavailable reference evidence policy-local", () => {
    const core = snapshot("completed");
    const catalog = makeCatalog();
    const disabled = validatePolicyResolution({ policy: null, references: [] }, catalog);
    expect(disabled.ok).toBe(true);
    if (!disabled.ok) return;
    const emptyFacts = validateReferenceFacts({ evidence: [], relations: [] }, disabled.value, core);
    expect(emptyFacts.ok).toBe(true);
    if (!emptyFacts.ok) return;
    const disabledDecision = evaluateDecisionPolicy(disabled.value, core, emptyFacts.value);
    expect(disabledDecision.gate).toEqual({
      status: "disabled",
      policyId: null
    });
    expect(disabledDecision.blockWhen).toBe(null);

    const readyResolution = validatePolicyResolution(currentPolicy(), catalog);
    expect(readyResolution.ok).toBe(true);
    if (!readyResolution.ok) return;
    const acceptedRecord = core.records.find((entry) => entry.fields.generated === true)!;
    const passingFacts = validateReferenceFacts({
      evidence: [{ checkId: "file-metrics", referenceName: "baseline", status: "complete" }],
      relations: [{
        recordId: acceptedRecord.recordId,
        referenceName: "baseline",
        relationId: "regression"
      }]
    }, readyResolution.value, core);
    expect(passingFacts.ok).toBe(true);
    if (!passingFacts.ok) return;
    const passedDecision = evaluateDecisionPolicy(readyResolution.value, core, passingFacts.value);
    expect(passedDecision.gate).toEqual({
      status: "passed",
      policyId: "current-regressions",
      evidenceRefs: [
        { kind: "run", checkRunId: core.runs[0]!.checkRunId },
        { kind: "reference", checkId: "file-metrics", referenceName: "baseline", referenceId },
        { kind: "view", viewId: "unaccepted-regressions" },
        { kind: "readiness", readinessId: "comparison-complete" },
        { kind: "readiness", readinessId: "current-complete" }
      ],
      blockingRecordRefs: []
    });
    expect(passedDecision.blockWhen).toEqual({
      status: "not-matched",
      evidenceRefs: [{ kind: "view", viewId: "unaccepted-regressions" }],
      blockingRecordRefs: []
    });

    const { resolution, facts } = validateInputs(core, "unavailable");
    const result = evaluateDecisionPolicy(resolution, core, facts);
    expect(result.blockWhen).toBe(null);
    expect(result.gate).toEqual({
      status: "not-evaluated",
      policyId: "current-regressions",
      reason: "comparison-unavailable",
      evidenceRefs: [
        { kind: "run", checkRunId: core.runs[0]!.checkRunId },
        { kind: "reference", checkId: "file-metrics", referenceName: "baseline", referenceId },
        { kind: "readiness", readinessId: "comparison-complete" },
        { kind: "readiness", readinessId: "current-complete" }
      ]
    });
    expect(core.runs[0]?.status).toBe("completed");
    expect(core.records).toHaveLength(3);
  });

  test("binds policy surfaces to the resolved catalog fingerprint instead of a replaceable registry", () => {
    const core = snapshot("completed");
    const policy = currentPolicy();
    const originalCatalog = makeCatalog();
    const alteredDefinition = {
      ...definition,
      recordTypes: [{
        ...definition.recordTypes[0],
        policy: {
          ...definition.recordTypes[0].policy,
          operands: [{
            ...definition.recordTypes[0].policy.operands[0],
            source: { kind: "field", fieldId: "approved" }
          }]
        }
      }]
    } as const satisfies CheckDefinition;
    const alteredCatalog = makeCatalog([alteredDefinition]);
    expect(alteredCatalog.catalogFingerprint === originalCatalog.catalogFingerprint).toBe(false);

    const original = validatePolicyResolution(policy, originalCatalog);
    const altered = validatePolicyResolution(policy, alteredCatalog);
    expect(original.ok).toBe(true);
    expect(altered.ok).toBe(true);
    if (!original.ok || !altered.ok) return;
    const acceptedRecord = core.records.find((entry) => entry.fields.generated === true)!;
    const facts = {
      evidence: [{ checkId: "file-metrics", referenceName: "baseline", status: "complete" }],
      relations: [{
        recordId: acceptedRecord.recordId,
        referenceName: "baseline",
        relationId: "regression"
      }]
    } as const;
    const originalFacts = validateReferenceFacts(facts, original.value, core);
    const alteredFacts = validateReferenceFacts(facts, altered.value, core);
    expect(originalFacts.ok).toBe(true);
    expect(alteredFacts.ok).toBe(false);
    if (!originalFacts.ok) return;
    expect(evaluateDecisionPolicy(original.value, core, originalFacts.value).gate.status).toBe("passed");
    expect(() => evaluateDecisionPolicy(altered.value, core, originalFacts.value)).toThrow(
      "Policy resolution catalog does not match the final snapshot"
    );
  });
});
