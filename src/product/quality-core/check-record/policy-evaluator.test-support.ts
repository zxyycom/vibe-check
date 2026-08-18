import { createCatalogFingerprint, createRecordId } from "./identity.ts";
import type { CheckDefinition, CoreSnapshot, QualityRecord } from "./model.ts";
import { validatePolicyResolution, validateReferenceFacts } from "./policy-validation.ts";

export const referenceId = `reference/v1/sha256:${"b".repeat(64)}`;
export const definition = {
  checkId: "file-metrics",
  displayName: "Files",
  recordTypes: [
    {
      recordTypeId: "file-code-lines",
      fields: [
        { fieldId: "approved", valueType: "boolean", required: true },
        { fieldId: "generated", valueType: "boolean", required: true },
        { fieldId: "path", valueType: "string", required: true }
      ],
      identityFields: ["path"],
      policy: {
        operands: [
          {
            operandId: "generated",
            valueType: "boolean",
            source: { kind: "field", fieldId: "generated" }
          }
        ],
        relations: ["changed", "regression"]
      }
    }
  ]
} as const satisfies CheckDefinition;

export function makeCatalog(source: readonly CheckDefinition[] = [definition]) {
  return {
    catalogFingerprint: createCatalogFingerprint(source).catalogFingerprint,
    definitions: source
  };
}

function record(path: string, generated: boolean): QualityRecord {
  const candidate = {
    checkId: "file-metrics",
    recordTypeId: "file-code-lines",
    level: "warning",
    semanticSubject: path,
    message: `${path} is long`,
    fields: { path, generated, approved: false },
    location: { path, line: 10, column: 1 }
  } as const;
  return {
    ...candidate,
    recordId: createRecordId(candidate, definition.recordTypes[0]).recordId
  };
}

export function snapshot(status: "completed" | "unavailable"): CoreSnapshot {
  const records = [
    record("src/z.ts", false),
    record("src/a.ts", true),
    record("src/m.ts", false)
  ].sort((left, right) => left.recordId.localeCompare(right.recordId));
  return {
    checks: [
      {
        ...definition,
        outcome:
          status === "completed"
            ? { status: "completed", verdict: "passed" }
            : { status: "unavailable", reason: { code: "execution-threw" } }
      }
    ],
    records
  };
}

export function currentPolicy() {
  return {
    references: [{ referenceName: "baseline", referenceId }],
    policy: {
      policyId: "current-regressions",
      references: [{ referenceName: "baseline", checkIds: ["file-metrics"] }],
      acceptance: [
        {
          acceptanceId: "accept-generated",
          reason: "Generated finding is reviewed.",
          selector: { checkId: "file-metrics", recordTypeId: "file-code-lines" },
          predicates: [{ kind: "operand-equals", operandId: "generated", value: true }]
        }
      ],
      views: [
        {
          viewId: "unaccepted-regressions",
          selectors: [{ checkId: "file-metrics", recordTypeId: "file-code-lines" }],
          acceptance: "unaccepted",
          predicates: [
            {
              kind: "relation-is",
              referenceName: "baseline",
              relationId: "regression"
            }
          ]
        }
      ],
      readiness: [
        {
          readinessId: "current-complete",
          predicate: { kind: "check-outcome", checkId: "file-metrics", outcome: "completed" },
          reason: "scan-incomplete"
        },
        {
          readinessId: "comparison-complete",
          predicate: {
            kind: "reference-status",
            checkId: "file-metrics",
            referenceName: "baseline",
            status: "complete"
          },
          reason: "comparison-unavailable"
        }
      ],
      blockWhen: { kind: "view-not-empty", viewId: "unaccepted-regressions" }
    }
  } as const;
}

export function relationPolicy(mode: "changed-or-regression" | "regression") {
  const predicate =
    mode === "changed-or-regression"
      ? {
          kind: "relation-kind-in" as const,
          referenceName: "baseline",
          values: ["changed", "regression"] as const
        }
      : {
          kind: "relation-is" as const,
          referenceName: "baseline",
          relationId: "regression"
        };
  return {
    references: [{ referenceName: "baseline", referenceId }],
    policy: {
      policyId: mode === "changed-or-regression" ? "current-changed" : "current-regressions",
      references: [{ referenceName: "baseline", checkIds: ["file-metrics"] }],
      acceptance: [],
      views: [
        {
          viewId: "changed",
          selectors: [{ checkId: "file-metrics", recordTypeId: "file-code-lines" }],
          acceptance: "all",
          predicates: [predicate]
        }
      ],
      readiness: [],
      blockWhen: { kind: "view-not-empty", viewId: "changed" }
    }
  } as const;
}

export function changedAndRegressionFacts(core: CoreSnapshot) {
  return {
    evidence: [
      {
        checkId: "file-metrics",
        referenceName: "baseline",
        status: "complete"
      }
    ],
    relations: [
      {
        recordId: core.records[0].recordId,
        referenceName: "baseline",
        relationId: "changed"
      },
      {
        recordId: core.records[1].recordId,
        referenceName: "baseline",
        relationId: "regression"
      }
    ]
  } as const;
}

export function validateInputs(
  core: CoreSnapshot,
  evidenceStatus: "complete" | "unavailable" = "complete"
) {
  const resolution = validatePolicyResolution(currentPolicy(), makeCatalog());
  if (!resolution.ok) throw new Error("Policy resolution fixture must validate");
  const relations = core.records.map((entry) => ({
    recordId: entry.recordId,
    referenceName: "baseline",
    relationId: "regression"
  }));
  const facts = validateReferenceFacts(
    {
      evidence: [{ checkId: "file-metrics", referenceName: "baseline", status: evidenceStatus }],
      relations: evidenceStatus === "complete" ? relations : []
    },
    resolution.value,
    core
  );
  if (!facts.ok) throw new Error("Reference facts fixture must validate");
  return { resolution: resolution.value, facts: facts.value };
}
