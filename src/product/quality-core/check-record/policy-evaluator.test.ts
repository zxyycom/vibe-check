import { describe, expect, test } from "bun:test";

import type { CheckDefinition } from "./model.ts";
import { evaluateDecisionPolicy } from "./policy-evaluator.ts";
import {
  changedAndRegressionFacts,
  currentPolicy,
  definition,
  makeCatalog,
  referenceId,
  relationPolicy,
  snapshot,
  validateInputs
} from "./policy-evaluator.test-support.ts";
import { validatePolicyResolution, validateReferenceFacts } from "./policy-validation.ts";

describe("check-record policy evaluation", () => {
  test("matches relation-kind-in membership so regressions enter changed views and unchanged records stay out", () => {
    const core = snapshot("completed");
    const resolution = validatePolicyResolution(
      relationPolicy("changed-or-regression"),
      makeCatalog()
    );
    expect(resolution.ok).toBe(true);
    if (!resolution.ok) return;
    const facts = validateReferenceFacts(changedAndRegressionFacts(core), resolution.value, core);
    expect(facts.ok).toBe(true);
    if (!facts.ok) return;

    const changed = evaluateDecisionPolicy(resolution.value, core, facts.value);
    const expectedChanged = core.records
      .slice(0, 2)
      .map((entry) => ({ kind: "record" as const, recordId: entry.recordId }))
      .sort((left, right) => left.recordId.localeCompare(right.recordId));
    expect(changed.views[0]?.recordRefs).toEqual(expectedChanged);
    expect(changed.gate).toEqual({
      status: "failed",
      policyId: "current-changed",
      evidenceRefs: [...expectedChanged, { kind: "view", viewId: "changed" }],
      blockingRecordRefs: expectedChanged
    });

    const regressionsOnly = validatePolicyResolution(relationPolicy("regression"), makeCatalog());
    expect(regressionsOnly.ok).toBe(true);
    if (!regressionsOnly.ok) return;
    const regressionResult = evaluateDecisionPolicy(regressionsOnly.value, core, facts.value);
    expect(regressionResult.views[0]?.recordRefs).toEqual([
      {
        kind: "record",
        recordId: core.records[1].recordId
      }
    ]);
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
        { kind: "check", checkId: "file-metrics" },
        ...expectedBlocking,
        { kind: "reference", checkId: "file-metrics", referenceName: "baseline", referenceId },
        { kind: "view", viewId: "unaccepted-regressions" },
        { kind: "readiness", readinessId: "comparison-complete" },
        { kind: "readiness", readinessId: "current-complete" }
      ],
      blockingRecordRefs: expectedBlocking
    });
    expect(result.acceptance).toHaveLength(1);
    expect(result.acceptance).toEqual([
      {
        acceptanceId: "accept-generated",
        reason: "Generated finding is reviewed.",
        recordId: core.records.find((entry) => entry.fields.generated === true)!.recordId
      }
    ]);
    expect(result.views[0]?.recordRefs).toEqual(expectedBlocking);
    expect(result.readiness).toEqual([
      {
        readinessId: "current-complete",
        status: "passed",
        evidenceRefs: [
          { kind: "check", checkId: "file-metrics" },
          { kind: "readiness", readinessId: "current-complete" }
        ]
      },
      {
        readinessId: "comparison-complete",
        status: "passed",
        evidenceRefs: [
          { kind: "reference", checkId: "file-metrics", referenceName: "baseline", referenceId },
          { kind: "readiness", readinessId: "comparison-complete" }
        ]
      }
    ]);
    expect(result.blockWhen).toEqual({
      status: "matched",
      evidenceRefs: [...expectedBlocking, { kind: "view", viewId: "unaccepted-regressions" }],
      blockingRecordRefs: expectedBlocking
    });
    expect(result.blockWhen?.blockingRecordRefs).toEqual(
      result.gate.status === "failed" ? result.gate.blockingRecordRefs : []
    );
    expect({ core, facts }).toEqual(before);
    expect(result.gate.status).toBe("failed");
    if (result.gate.status === "disabled") return;
    expect(Object.isFrozen(result.gate.evidenceRefs)).toBe(true);
    expect(evaluateDecisionPolicy(resolution, core, facts)).toEqual(result);
  });

  test("stops at the first readiness failure while retaining unavailable-Check records as not evaluated", () => {
    const core = snapshot("unavailable");
    const { resolution, facts } = validateInputs(core);

    const result = evaluateDecisionPolicy(resolution, core, facts);

    expect(result.readiness).toEqual([
      {
        readinessId: "current-complete",
        status: "failed",
        reason: "scan-incomplete",
        evidenceRefs: [
          { kind: "check", checkId: "file-metrics" },
          { kind: "readiness", readinessId: "current-complete" }
        ]
      }
    ]);
    expect(result.blockWhen).toBe(null);
    expect(result.gate).toEqual({
      status: "not-evaluated",
      policyId: "current-regressions",
      reason: "scan-incomplete",
      evidenceRefs: [
        { kind: "check", checkId: "file-metrics" },
        { kind: "readiness", readinessId: "current-complete" }
      ]
    });
    expect(result.views[0]?.recordRefs.length).toBe(2);
  });

  test("allows another closed policy to treat the same unavailable Check as an ordinary blocking operand", () => {
    const core = snapshot("unavailable");
    const input = {
      references: [],
      policy: {
        policyId: "block-check-unavailable",
        references: [],
        acceptance: [],
        views: [],
        readiness: [],
        blockWhen: { kind: "check-outcome", checkId: "file-metrics", outcome: "unavailable" }
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
      policyId: "block-check-unavailable",
      evidenceRefs: [{ kind: "check", checkId: "file-metrics" }],
      blockingRecordRefs: []
    });
    expect(decision.blockWhen).toEqual({
      status: "matched",
      evidenceRefs: [{ kind: "check", checkId: "file-metrics" }],
      blockingRecordRefs: []
    });
  });

  test("keeps a disabled policy closed without blockWhen evidence", () => {
    const core = snapshot("completed");
    const catalog = makeCatalog();
    const disabled = validatePolicyResolution({ policy: null, references: [] }, catalog);
    expect(disabled.ok).toBe(true);
    if (!disabled.ok) return;
    const emptyFacts = validateReferenceFacts(
      { evidence: [], relations: [] },
      disabled.value,
      core
    );
    expect(emptyFacts.ok).toBe(true);
    if (!emptyFacts.ok) return;
    const disabledDecision = evaluateDecisionPolicy(disabled.value, core, emptyFacts.value);
    expect(disabledDecision.gate).toEqual({
      status: "disabled",
      policyId: null
    });
    expect(disabledDecision.blockWhen).toBe(null);
  });

  test("passes a ready policy when complete reference facts leave its view empty", () => {
    const core = snapshot("completed");
    const catalog = makeCatalog();
    const readyResolution = validatePolicyResolution(currentPolicy(), catalog);
    expect(readyResolution.ok).toBe(true);
    if (!readyResolution.ok) return;
    const acceptedRecord = core.records.find((entry) => entry.fields.generated === true)!;
    const passingFacts = validateReferenceFacts(
      {
        evidence: [{ checkId: "file-metrics", referenceName: "baseline", status: "complete" }],
        relations: [
          {
            recordId: acceptedRecord.recordId,
            referenceName: "baseline",
            relationId: "regression"
          }
        ]
      },
      readyResolution.value,
      core
    );
    expect(passingFacts.ok).toBe(true);
    if (!passingFacts.ok) return;
    const passedDecision = evaluateDecisionPolicy(readyResolution.value, core, passingFacts.value);
    expect(passedDecision.gate).toEqual({
      status: "passed",
      policyId: "current-regressions",
      evidenceRefs: [
        { kind: "check", checkId: "file-metrics" },
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
  });

  test("makes unavailable reference evidence policy-local without changing Core facts", () => {
    const core = snapshot("completed");
    const { resolution, facts } = validateInputs(core, "unavailable");
    const result = evaluateDecisionPolicy(resolution, core, facts);
    expect(result.blockWhen).toBe(null);
    expect(result.gate).toEqual({
      status: "not-evaluated",
      policyId: "current-regressions",
      reason: "comparison-unavailable",
      evidenceRefs: [
        { kind: "check", checkId: "file-metrics" },
        { kind: "reference", checkId: "file-metrics", referenceName: "baseline", referenceId },
        { kind: "readiness", readinessId: "comparison-complete" },
        { kind: "readiness", readinessId: "current-complete" }
      ]
    });
    expect(core.checks[0]?.outcome.status).toBe("completed");
    expect(core.records).toHaveLength(3);
  });

  test("binds policy surfaces to the resolved catalog fingerprint instead of a replaceable registry", () => {
    const core = snapshot("completed");
    const policy = currentPolicy();
    const originalCatalog = makeCatalog();
    const alteredDefinition = {
      ...definition,
      recordTypes: [
        {
          ...definition.recordTypes[0],
          policy: {
            ...definition.recordTypes[0].policy,
            operands: [
              {
                ...definition.recordTypes[0].policy.operands[0],
                source: { kind: "field", fieldId: "approved" }
              }
            ]
          }
        }
      ]
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
      relations: [
        {
          recordId: acceptedRecord.recordId,
          referenceName: "baseline",
          relationId: "regression"
        }
      ]
    } as const;
    const originalFacts = validateReferenceFacts(facts, original.value, core);
    const alteredFacts = validateReferenceFacts(facts, altered.value, core);
    expect(originalFacts.ok).toBe(true);
    expect(alteredFacts.ok).toBe(false);
    if (!originalFacts.ok) return;
    expect(evaluateDecisionPolicy(original.value, core, originalFacts.value).gate.status).toBe(
      "passed"
    );
    expect(() => evaluateDecisionPolicy(altered.value, core, originalFacts.value)).toThrow(
      "Policy resolution catalog does not match the final snapshot"
    );
  });
});
