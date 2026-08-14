import type {
  CheckDefinition,
  CheckRun,
  FinalCoreSnapshot,
  QualityRecord
} from "../../src/product/quality-core/src/check-record/model.ts";
import {
  resolveCheckCatalog,
  type ResolvedCheckCatalog
} from "../../src/product/quality-core/src/check-record/catalog.ts";
import {
  evaluateDecisionPolicy
} from "../../src/product/quality-core/src/check-record/policy-evaluator.ts";
import type {
  DecisionEvidence,
  DecisionPolicy,
  ReferenceFacts
} from "../../src/product/quality-core/src/check-record/policy-model.ts";
import {
  validatePolicyResolution
} from "../../src/product/quality-core/src/check-record/policy-validation.ts";
import { createRecordId } from "../../src/product/quality-core/src/check-record/identity.ts";
import { projectHumanStatus } from "../../src/product/quality-core/src/check-record/human-status.ts";
import {
  createPublicationModelV2,
  projectMachinePublicationV2
} from "../../src/product/quality-core/src/output/publication-v2/index.ts";
import {
  FIXED_MACHINE_EXAMPLE_INPUT,
  type CanonicalMachineExample,
  type MachineExampleOutcome,
  type MachineExampleSelectedPolicy
} from "./machine-example-model.ts";

const definition: CheckDefinition = {
  checkId: "docs-example",
  displayName: "Documentation Example",
  recordTypes: [{
    recordTypeId: "example-finding",
    fields: [
      { fieldId: "category", valueType: "string", required: true },
      { fieldId: "value", valueType: "integer", required: true }
    ],
    identityFields: ["category", "value"],
    policy: {
      operands: [{
        operandId: "category",
        valueType: "string",
        source: { kind: "field", fieldId: "category" }
      }],
      relations: ["regression"]
    }
  }]
};

const emptyReferenceFacts: ReferenceFacts = { evidence: [], relations: [] };

export function buildCanonicalMachineExample(input: Readonly<{
  fixedInputSummary: string;
  outcome: MachineExampleOutcome;
  selectedPolicy: MachineExampleSelectedPolicy;
  state: "empty" | "gate-failed" | "incomplete" | "passed" | "warning";
  title: string;
}>): CanonicalMachineExample {
  const catalog = createCatalog(input.outcome, input.state);
  const run = createRun(catalog, input.state);
  const records = input.state === "warning" || input.state === "gate-failed"
    ? [createExampleRecord(run)]
    : [];
  const snapshot = createSnapshot(catalog, run, records);
  const decision = createDecision(input.selectedPolicy, catalog, snapshot);
  const verificationOutput = false;
  const model = createPublicationModelV2({
    humanStatus: projectHumanStatus({ snapshot, decision, verificationOutput }),
    invocation: {
      invocationId: `invocation/v1:docs-${input.outcome}`,
      projectRoot: FIXED_MACHINE_EXAMPLE_INPUT.projectRoot,
      timestamp: FIXED_MACHINE_EXAMPLE_INPUT.timestamp
    },
    snapshot,
    references: [],
    referenceFacts: emptyReferenceFacts,
    decision,
    verificationOutput
  });
  return {
    fixedInputSummary: input.fixedInputSummary,
    model,
    outcome: input.outcome,
    publication: projectMachinePublicationV2(model),
    selectedPolicy: input.selectedPolicy,
    title: input.title
  };
}

function createCatalog(
  outcome: MachineExampleOutcome,
  state: "empty" | "gate-failed" | "incomplete" | "passed" | "warning"
): ResolvedCheckCatalog {
  const resolved = resolveCheckCatalog({
    invocationKey: `docs-${outcome}`,
    definitions: [definition],
    bindings: [{ checkId: definition.checkId, execute: () => ({ verdict: "passed" }) }],
    schedules: [{ checkId: definition.checkId, requiresChecks: [] }],
    selectedCheckIds: [definition.checkId],
    resolveApplicability: () => state === "empty"
      ? { status: "not-applicable" }
      : { status: "applicable", workHandles: ["work-handle/v1:docs-example"] }
  });
  if (!resolved.ok) {
    throw new TypeError(`Canonical example catalog failed at ${resolved.error.stage}`);
  }
  return resolved.value;
}

function createRun(
  catalog: ResolvedCheckCatalog,
  state: "empty" | "gate-failed" | "incomplete" | "passed" | "warning"
): CheckRun {
  const checkRunId = catalog.checks[0]!.checkRunId;
  if (state === "empty") {
    return {
      checkId: definition.checkId,
      checkRunId,
      selection: "selected",
      applicability: "not-applicable",
      status: "completed",
      result: { verdict: "not-applicable" },
      coverage: { plannedWorkCount: 0, acknowledgedWorkCount: 0 },
      diagnostic: null
    };
  }
  if (state === "incomplete") {
    return {
      checkId: definition.checkId,
      checkRunId,
      selection: "selected",
      applicability: "applicable",
      status: "failed",
      result: null,
      coverage: { plannedWorkCount: 1, acknowledgedWorkCount: 0 },
      diagnostic: {
        category: "unavailable",
        tieBreakKey: "dependency/v1:docs-example"
      }
    };
  }
  return {
    checkId: definition.checkId,
    checkRunId,
    selection: "selected",
    applicability: "applicable",
    status: "completed",
    result: { verdict: state === "warning" || state === "gate-failed" ? "failed" : "passed" },
    coverage: { plannedWorkCount: 1, acknowledgedWorkCount: 1 },
    diagnostic: null
  };
}

function createExampleRecord(run: CheckRun): QualityRecord {
  const recordType = definition.recordTypes[0]!;
  const candidate = {
    checkId: definition.checkId,
    checkRunId: run.checkRunId,
    recordTypeId: recordType.recordTypeId,
    level: "warning" as const,
    semanticSubject: "src/example.ts#canonical",
    message: "The canonical documentation example requires review.",
    fields: { category: "maintainability", value: 7 },
    location: { path: FIXED_MACHINE_EXAMPLE_INPUT.path, line: 7, column: 1 }
  };
  return { ...candidate, recordId: createRecordId(candidate, recordType).recordId };
}

function createSnapshot(
  catalog: ResolvedCheckCatalog,
  run: CheckRun,
  records: readonly QualityRecord[]
): FinalCoreSnapshot {
  if (run.coverage === null) {
    throw new TypeError("Canonical selected example run requires coverage");
  }
  return {
    catalogFingerprint: catalog.catalogFingerprint,
    definitions: catalog.definitions,
    runs: [run],
    records,
    integrity: { status: "valid", invalidRecords: [], conflicts: [] },
    completeness: {
      status: run.status === "failed" ? "incomplete" : "complete",
      selectedRunCount: 1,
      completedRunCount: run.status === "completed" ? 1 : 0,
      failedRunCount: run.status === "failed" ? 1 : 0,
      plannedWorkCount: run.coverage.plannedWorkCount,
      acknowledgedWorkCount: run.coverage.acknowledgedWorkCount
    }
  };
}

function createDecision(
  selectedPolicy: MachineExampleSelectedPolicy,
  catalog: ResolvedCheckCatalog,
  snapshot: FinalCoreSnapshot
): DecisionEvidence {
  const policyResult = validatePolicyResolution({
    policy: selectedPolicy === null ? null : docsGatePolicy(),
    references: []
  }, catalog);
  if (!policyResult.ok) {
    throw new TypeError("Canonical example policy failed validation");
  }
  return evaluateDecisionPolicy(policyResult.value, snapshot, emptyReferenceFacts);
}

function docsGatePolicy(): DecisionPolicy {
  return Object.freeze({
    policyId: "docs-gate",
    references: Object.freeze([]),
    acceptance: Object.freeze([]),
    views: Object.freeze([Object.freeze({
      viewId: "all-current",
      selectors: Object.freeze([Object.freeze({
        checkId: definition.checkId,
        recordTypeId: definition.recordTypes[0]!.recordTypeId
      })]),
      acceptance: "all" as const,
      predicates: Object.freeze([])
    })]),
    readiness: Object.freeze([Object.freeze({
      readinessId: "scan-complete",
      predicate: Object.freeze({
        kind: "run-status" as const,
        checkId: definition.checkId,
        status: "completed" as const
      }),
      reason: "scan-incomplete" as const
    })]),
    blockWhen: Object.freeze({ kind: "view-not-empty" as const, viewId: "all-current" })
  });
}
