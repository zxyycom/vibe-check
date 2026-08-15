import {
  createCatalogFingerprint,
  createRecordId
} from "./identity.ts";
import type {
  CheckDefinition,
  CoreSnapshot,
  QualityRecord
} from "./model.ts";

export const referenceId = `reference/v1/sha256:${"a".repeat(64)}`;

export const definitions = [
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
        operands: [{
          operandId: "area",
          valueType: "string",
          source: { kind: "field", fieldId: "area" }
        }],
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
        operands: [{
          operandId: "beta-area",
          valueType: "string",
          source: { kind: "field", fieldId: "area" }
        }],
        relations: []
      }
    }]
  }
] as const satisfies readonly CheckDefinition[];

export function makeCatalog(source: unknown = definitions) {
  const sourceDefinitions = source as readonly CheckDefinition[];
  return {
    catalogFingerprint: createCatalogFingerprint(sourceDefinitions).catalogFingerprint,
    definitions: sourceDefinitions
  };
}

export const policyResolution = {
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
      predicates: [{
        kind: "relation-is",
        referenceName: "baseline",
        relationId: "regression"
      }]
    }],
    readiness: [{
      readinessId: "alpha-completed",
      predicate: { kind: "check-outcome", checkId: "alpha-check", outcome: "completed" },
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

export function mutableObject(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Expected mutable test object");
  }
  return value as Record<string, unknown>;
}

export function mutableArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new TypeError("Expected mutable test array");
  return value;
}

export function childObject(value: unknown, field: string): Record<string, unknown> {
  return mutableObject(mutableObject(value)[field]);
}

export function arrayObject(
  value: unknown,
  field: string,
  index: number
): Record<string, unknown> {
  return mutableObject(mutableArray(mutableObject(value)[field])[index]);
}

export function relationKindPolicyInput(): unknown {
  const input: unknown = structuredClone(policyResolution);
  const predicates = mutableArray(
    arrayObject(childObject(input, "policy"), "views", 0).predicates
  );
  predicates[0] = {
    kind: "relation-kind-in",
    referenceName: "baseline",
    values: ["changed", "regression"]
  };
  return input;
}

export function makeRecord(area: string): QualityRecord {
  const candidate = {
    checkId: "alpha-check",
    recordTypeId: "finding",
    level: "warning",
    semanticSubject: area,
    message: `${area} finding`,
    fields: { area, score: 3 },
    location: null
  } as const;
  return {
    ...candidate,
    recordId: createRecordId(candidate, definitions[0].recordTypes[0]).recordId
  };
}

export function makeSnapshot(record: QualityRecord): CoreSnapshot {
  return {
    checks: [{
      ...definitions[0],
      outcome: { kind: "completed", verdict: "passed" }
    }, {
      ...definitions[1],
      outcome: { kind: "not-applicable" }
    }],
    records: [record]
  };
}
