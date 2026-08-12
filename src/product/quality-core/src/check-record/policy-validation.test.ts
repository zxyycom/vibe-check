import { describe, expect, test } from "bun:test";

import { resolveCheckCatalog } from "./catalog.ts";
import { createCatalogFingerprint, createDeterministicCheckRunId, createRecordId } from "./identity.ts";
import type {
  CheckDefinition,
  FinalCoreSnapshot,
  ManagerBoundQualityRecordCandidate,
  QualityRecord,
} from "./model.ts";
import {
  createPolicySurfaceRegistry,
  validatePolicyResolution,
  validateReferenceFacts
} from "./policy-validation.ts";

const referenceId = `reference/v1/sha256:${"a".repeat(64)}`;

const definitions = [
  {
    checkId: "alpha-check",
    displayName: "Alpha",
    recordTypes: [{
      recordTypeId: "finding",
      fields: [
        { fieldId: "area", valueType: "string", required: true },
        { fieldId: "score", valueType: "number", required: true }
      ],
      identityFields: ["area"],
      policy: {
        operands: [{ operandId: "area", valueType: "string", source: { kind: "field", fieldId: "area" } }],
        relations: ["changed", "regression"]
      }
    }]
  },
  {
    checkId: "beta-check",
    displayName: "Beta",
    recordTypes: [{
      recordTypeId: "finding",
      fields: [{ fieldId: "area", valueType: "string", required: true }],
      identityFields: ["area"],
      policy: {
        operands: [{ operandId: "beta-area", valueType: "string", source: { kind: "field", fieldId: "area" } }],
        relations: []
      }
    }]
  }
] as const satisfies readonly CheckDefinition[];

function makeCatalog(source: unknown = definitions) {
  const resolved = resolveCheckCatalog({
    invocationKey: "policy-validation",
    definitions: source,
    bindings: definitions.map((definition) => ({ checkId: definition.checkId, execute: () => undefined })),
    selectedCheckIds: [],
    resolveApplicability: () => ({ status: "not-applicable" })
  });
  if (!resolved.ok) throw new Error("Policy catalog fixture must resolve");
  return resolved.value;
}

const policyResolution = {
  references: [{ referenceName: "baseline", referenceId }],
  policy: {
    policyId: "current-style",
    references: [{ referenceName: "baseline", checkIds: ["alpha-check"] }],
    acceptance: [{
      acceptanceId: "accept-generated",
      reason: "Generated finding is reviewed.",
      selector: { checkId: "alpha-check", recordTypeId: "finding" },
      predicates: [{ kind: "operand-equals", operandId: "area", value: "generated" }]
    }],
    views: [{
      viewId: "blocking",
      selectors: [{ checkId: "alpha-check", recordTypeId: "finding" }],
      acceptance: "unaccepted",
      predicates: [{ kind: "relation-is", referenceName: "baseline", relationId: "regression" }]
    }],
    readiness: [{
      readinessId: "alpha-completed",
      predicate: { kind: "run-status", checkId: "alpha-check", status: "completed" },
      reason: "scan-incomplete"
    }, {
      readinessId: "baseline-complete",
      predicate: {
        kind: "reference-status",
        checkId: "alpha-check",
        referenceName: "baseline",
        status: "complete"
      },
      reason: "comparison-unavailable"
    }],
    blockWhen: { kind: "view-not-empty", viewId: "blocking" }
  }
} as const;

function mutableObject(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Expected mutable test object");
  }
  return value as Record<string, unknown>;
}

function mutableArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new TypeError("Expected mutable test array");
  return value;
}

function childObject(value: unknown, field: string): Record<string, unknown> {
  return mutableObject(mutableObject(value)[field]);
}

function arrayObject(value: unknown, field: string, index: number): Record<string, unknown> {
  return mutableObject(mutableArray(mutableObject(value)[field])[index]);
}

function makeRecord(area: string): QualityRecord {
  const runId = createDeterministicCheckRunId({ invocationKey: "validation", checkId: "alpha-check" });
  const candidate: ManagerBoundQualityRecordCandidate = {
    checkId: "alpha-check",
    checkRunId: runId,
    recordTypeId: "finding",
    level: "warning",
    semanticSubject: area,
    message: `${area} finding`,
    fields: { area, score: 3 },
    location: null
  };
  return { ...candidate, recordId: createRecordId(candidate, definitions[0].recordTypes[0]).recordId };
}

function makeSnapshot(record: QualityRecord): FinalCoreSnapshot {
  const alphaRunId = record.checkRunId;
  const betaRunId = createDeterministicCheckRunId({ invocationKey: "validation", checkId: "beta-check" });
  return {
    catalogFingerprint: createCatalogFingerprint(definitions).catalogFingerprint,
    definitions,
    runs: [{
      checkId: "alpha-check",
      checkRunId: alphaRunId,
      selection: "selected",
      applicability: "applicable",
      status: "completed",
      result: { verdict: "passed" },
      coverage: { plannedWorkCount: 1, acknowledgedWorkCount: 1 },
      diagnostic: null
    }, {
      checkId: "beta-check",
      checkRunId: betaRunId,
      selection: "unselected",
      applicability: null,
      status: "skipped",
      result: null,
      coverage: null,
      diagnostic: null
    }],
    records: [record],
    integrity: { status: "valid", invalidRecords: [], conflicts: [] },
    completeness: {
      status: "complete",
      selectedRunCount: 1,
      completedRunCount: 1,
      failedRunCount: 0,
      plannedWorkCount: 1,
      acknowledgedWorkCount: 1
    }
  };
}

describe("check-record policy pre-work validation", () => {
  test("derives the detached policy surface only from the resolved fingerprinted catalog", () => {
    const mutableDefinitions = structuredClone(definitions);
    const catalog = makeCatalog(mutableDefinitions);
    const registry = createPolicySurfaceRegistry(catalog);

    const mutableAlpha = mutableObject(mutableArray(mutableDefinitions)[0]);
    childObject(arrayObject(mutableAlpha, "recordTypes", 0), "policy").relations = [];
    expect(registry.catalogFingerprint).toBe(catalog.catalogFingerprint);
    expect(registry.recordTypes[0]?.relations).toEqual(["changed", "regression"]);
    expect(Object.isFrozen(registry.recordTypes[0]?.operands)).toBe(true);
  });

  test("normalizes pure serializable policy data with qualified selectors into a detached frozen value", () => {
    const catalog = makeCatalog();
    const input: unknown = structuredClone(policyResolution);
    const result = validatePolicyResolution(input, catalog);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    childObject(arrayObject(childObject(input, "policy"), "acceptance", 0), "selector").checkId = "beta-check";
    expect(result.value.policy?.acceptance[0]?.selector).toEqual({
      checkId: "alpha-check",
      recordTypeId: "finding"
    });
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.policy?.views[0]?.predicates)).toBe(true);
    expect(result.value.policy?.acceptance[0]?.reason).toBe("Generated finding is reviewed.");
    expect(JSON.parse(JSON.stringify(result.value))).toEqual(result.value);
  });

  test("requires a non-empty safe acceptance reason and rejects unknown acceptance fields", () => {
    const catalog = makeCatalog();
    const cases: readonly [reason: unknown, expectedPath: string][] = [
      [undefined, "$.policy.acceptance[0].reason"],
      ["", "$.policy.acceptance[0].reason"],
      ["\nreviewed", "$.policy.acceptance[0].reason"],
      ["reviewed\u0000finding", "$.policy.acceptance[0].reason"]
    ];

    for (const [reason, expectedPath] of cases) {
      const invalid: unknown = structuredClone(policyResolution);
      const acceptance = arrayObject(childObject(invalid, "policy"), "acceptance", 0);
      if (reason === undefined) delete acceptance.reason;
      else acceptance.reason = reason;
      const rejected = validatePolicyResolution(invalid, catalog);
      expect(rejected.ok).toBe(false);
      if (!rejected.ok) expect(rejected.issues[0]?.path).toBe(expectedPath);
    }

    const unknown: unknown = structuredClone(policyResolution);
    arrayObject(childObject(unknown, "policy"), "acceptance", 0).preview = "accepted";
    const rejected = validatePolicyResolution(unknown, catalog);
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.issues[0]?.path).toBe("$.policy.acceptance[0]");
  });

  test("accepts only non-empty unique canonical registered relation-kind-in values", () => {
    const catalog = makeCatalog();
    const valid: unknown = structuredClone(policyResolution);
    const validPredicates = mutableArray(
      arrayObject(childObject(valid, "policy"), "views", 0).predicates
    );
    validPredicates[0] = {
      kind: "relation-kind-in",
      referenceName: "baseline",
      values: ["changed", "regression"]
    };

    const accepted = validatePolicyResolution(valid, catalog);

    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    expect(accepted.value.policy?.views[0]?.predicates).toEqual([{
      kind: "relation-kind-in",
      referenceName: "baseline",
      values: ["changed", "regression"]
    }]);
    const predicate = accepted.value.policy?.views[0]?.predicates[0];
    expect(predicate?.kind).toBe("relation-kind-in");
    if (predicate?.kind !== "relation-kind-in") return;
    expect(Object.isFrozen(predicate.values)).toBe(true);

    const unknownKind: unknown = structuredClone(valid);
    const unknownPredicate = mutableObject(mutableArray(
      arrayObject(childObject(unknownKind, "policy"), "views", 0).predicates
    )[0]);
    unknownPredicate.kind = "relation-kind-any";
    const unknownRejected = validatePolicyResolution(unknownKind, catalog);
    expect(unknownRejected.ok).toBe(false);
    if (!unknownRejected.ok) {
      expect(unknownRejected.issues[0]?.path).toBe("$.policy.views[0].predicates[0].kind");
      expect(unknownRejected.issues[0]?.code).toBe("invalid-value");
    }

    const cases: readonly [
      values: readonly string[],
      expectedPath: string,
      expectedCode: "invalid-value" | "duplicate" | "identity-mismatch"
    ][] = [
      [[], "$.policy.views[0].predicates[0].values", "invalid-value"],
      [["changed", "changed"], "$.policy.views[0].predicates[0].values[1]", "duplicate"],
      [["regression", "changed"], "$.policy.views[0].predicates[0].values", "invalid-value"],
      [["changed", "unregistered"], "$.policy.views[0].predicates[0].values[1]", "identity-mismatch"]
    ];
    for (const [values, expectedPath, expectedCode] of cases) {
      const invalid: unknown = structuredClone(valid);
      const predicates = mutableArray(
        arrayObject(childObject(invalid, "policy"), "views", 0).predicates
      );
      mutableObject(predicates[0]).values = [...values];
      const rejected = validatePolicyResolution(invalid, catalog);
      expect(rejected.ok).toBe(false);
      if (!rejected.ok) {
        expect(rejected.issues[0]?.path).toBe(expectedPath);
        expect(rejected.issues[0]?.code).toBe(expectedCode);
      }
    }

    const crossSelector: unknown = structuredClone(valid);
    mutableArray(arrayObject(childObject(crossSelector, "policy"), "views", 0).selectors).push({
      checkId: "beta-check",
      recordTypeId: "finding"
    });
    mutableArray(arrayObject(childObject(crossSelector, "policy"), "references", 0).checkIds)
      .push("beta-check");
    const crossSelectorRejected = validatePolicyResolution(crossSelector, catalog);
    expect(crossSelectorRejected.ok).toBe(false);
    if (!crossSelectorRejected.ok) {
      expect(crossSelectorRejected.issues[0]?.path)
        .toBe("$.policy.views[0].predicates[0].values[0]");
      expect(crossSelectorRejected.issues[0]?.code).toBe("identity-mismatch");
    }
  });

  test("rejects missing or duplicate references and unknown qualified selectors, operands, relations, and fields", () => {
    const catalog = makeCatalog();
    const cases: readonly [mutate: (value: unknown) => void, expectedPath: string][] = [
      [(value) => { mutableObject(value).references = []; }, "$.policy.references[0].referenceName"],
      [(value) => {
        const references = mutableArray(mutableObject(value).references);
        references.push(references[0]);
      }, "$.references[1].referenceName"],
      [(value) => {
        childObject(arrayObject(childObject(value, "policy"), "acceptance", 0), "selector").checkId = "beta-check";
      }, "$.policy.acceptance[0].predicates[0].operandId"],
      [(value) => {
        childObject(arrayObject(childObject(value, "policy"), "acceptance", 0), "selector").checkId = "unknown-check";
      }, "$.policy.acceptance[0].selector"],
      [(value) => {
        arrayObject(arrayObject(childObject(value, "policy"), "acceptance", 0), "predicates", 0).operandId = "arbitrary.path";
      }, "$.policy.acceptance[0].predicates[0].operandId"],
      [(value) => {
        arrayObject(arrayObject(childObject(value, "policy"), "acceptance", 0), "predicates", 0).operandId = "message";
      }, "$.policy.acceptance[0].predicates[0].operandId"],
      [(value) => {
        arrayObject(arrayObject(childObject(value, "policy"), "acceptance", 0), "predicates", 0).operandId = "score";
      }, "$.policy.acceptance[0].predicates[0].operandId"],
      [(value) => {
        arrayObject(arrayObject(childObject(value, "policy"), "views", 0), "predicates", 0).relationId = "unknown";
      }, "$.policy.views[0].predicates[0].relationId"],
      [(value) => {
        mutableObject(value).recordTypes = [{
          checkId: "alpha-check",
          recordTypeId: "finding",
          operands: [{ operandId: "message", valueType: "string", source: { kind: "message" } }],
          relations: ["unknown"]
        }];
      }, "$"],
      [(value) => { childObject(value, "policy").script = () => true; }, "$"],
      [(value) => { childObject(childObject(value, "policy"), "blockWhen").field = "records[0].message"; }, "$.policy.blockWhen"]
    ];

    for (const [mutate, expectedPath] of cases) {
      const value: unknown = structuredClone(policyResolution);
      mutate(value);
      const result = validatePolicyResolution(value, catalog);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.issues[0]?.path).toBe(expectedPath);
    }
  });

  test("rejects accessors and reflection failures without invocation or credential disclosure", () => {
    const catalog = makeCatalog();
    const secret = "credential-TOP-SECRET";
    let accessorCalls = 0;
    const accessorInput = structuredClone(policyResolution) as object;
    Object.defineProperty(accessorInput, "policy", {
      enumerable: true,
      get: () => {
        accessorCalls += 1;
        throw new Error(secret);
      }
    });
    const proxyInput = new Proxy({}, {
      getPrototypeOf: () => {
        throw new Error(secret);
      }
    });

    for (const input of [accessorInput, proxyInput]) {
      const result = validatePolicyResolution(input, catalog);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues).toEqual([{
          path: "$",
          code: "invalid-value",
          message: "Policy input must be plain JSON data"
        }]);
        expect(JSON.stringify(result.issues).includes(secret)).toBe(false);
      }
    }
    expect(accessorCalls).toBe(0);
  });

  test("keeps validation execution-free even when rejected data contains callable material", () => {
    const catalog = makeCatalog();
    let calls = 0;
    const value: unknown = structuredClone(policyResolution);
    childObject(value, "policy").blockWhen = {
      kind: "script",
      execute: () => { calls += 1; return true; }
    };

    const result = validatePolicyResolution(value, catalog);

    expect(result.ok).toBe(false);
    expect(calls).toBe(0);
  });
});

describe("check-record reference fact validation", () => {
  test("binds one status to each required check/reference pair and accepts only registered relation variants", () => {
    const catalog = makeCatalog();
    const resolution = validatePolicyResolution(policyResolution, catalog);
    expect(resolution.ok).toBe(true);
    if (!resolution.ok) return;
    const record = makeRecord("src");
    const facts = {
      evidence: [{ checkId: "alpha-check", referenceName: "baseline", status: "complete" }],
      relations: [{ recordId: record.recordId, referenceName: "baseline", relationId: "regression" }]
    };

    const result = validateReferenceFacts(facts, resolution.value, makeSnapshot(record));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual(facts);
    expect(Object.isFrozen(result.value.relations[0])).toBe(true);
    expect("runs" in result.value).toBe(false);

    const cases: readonly [mutate: (value: unknown) => void, expectedPath: string][] = [
      [(value) => { mutableObject(value).evidence = []; }, "$.evidence"],
      [(value) => {
        const evidence = mutableArray(mutableObject(value).evidence);
        evidence.push(evidence[0]);
      }, "$.evidence[1]"],
      [(value) => { arrayObject(value, "evidence", 0).status = "failed"; }, "$.evidence[0].status"],
      [(value) => { arrayObject(value, "relations", 0).relationId = "changed-unknown"; }, "$.relations[0].relationId"],
      [(value) => { arrayObject(value, "relations", 0).referenceName = "implicit"; }, "$.relations[0].referenceName"]
    ];
    for (const [mutate, expectedPath] of cases) {
      const invalid: unknown = structuredClone(facts);
      mutate(invalid);
      const rejected = validateReferenceFacts(invalid, resolution.value, makeSnapshot(record));
      expect(rejected.ok).toBe(false);
      if (!rejected.ok) expect(rejected.issues[0]?.path).toBe(expectedPath);
    }
  });
});
