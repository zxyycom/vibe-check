import type {
  CheckDefinition,
  CheckRun,
  FinalCoreSnapshot,
  QualityRecord
} from "../../src/product/quality-core/src/check-record/model.ts";
import type {
  DecisionEvidence,
  ReferenceFacts
} from "../../src/product/quality-core/src/check-record/policy-model.ts";
import {
  createCatalogFingerprint,
  createDeterministicCheckRunId,
  createRecordId
} from "../../src/product/quality-core/src/check-record/identity.ts";
import { projectHumanStatus } from "../../src/product/quality-core/src/check-record/human-status.ts";
import {
  createPublicationModelV2,
  projectMachinePublicationV2
} from "../../src/product/quality-core/src/output/publication-v2/index.ts";
import {
  FIXED_MACHINE_EXAMPLE_INPUT,
  type CanonicalMachineExample,
  type MachineExampleOutcome
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
  expectedExit: 0 | 1 | 2;
  expectedProcessOutcome: "failed" | "gate-failed" | "success";
  fixedInputSummary: string;
  gateRequest: string;
  outcome: MachineExampleOutcome;
  state: "empty" | "gate-failed" | "incomplete" | "passed" | "warning";
  title: string;
}>): CanonicalMachineExample {
  const run = createRun(input.outcome, input.state);
  const records = input.state === "warning" || input.state === "gate-failed"
    ? [createExampleRecord(run)]
    : [];
  const snapshot = createSnapshot(run, records);
  const decision = createDecision(input.state, run, records[0]);
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
    expectedExit: input.expectedExit,
    expectedProcessOutcome: input.expectedProcessOutcome,
    fixedInputSummary: input.fixedInputSummary,
    gateRequest: input.gateRequest,
    model,
    outcome: input.outcome,
    publication: projectMachinePublicationV2(model),
    title: input.title
  };
}

function createRun(
  outcome: MachineExampleOutcome,
  state: "empty" | "gate-failed" | "incomplete" | "passed" | "warning"
): CheckRun {
  const checkRunId = createDeterministicCheckRunId({
    invocationKey: `docs-${outcome}`,
    checkId: definition.checkId
  });
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
  run: CheckRun,
  records: readonly QualityRecord[]
): FinalCoreSnapshot {
  if (run.coverage === null) {
    throw new TypeError("Canonical selected example run requires coverage");
  }
  return {
    catalogFingerprint: createCatalogFingerprint([definition]).catalogFingerprint,
    definitions: [definition],
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
  state: "empty" | "gate-failed" | "incomplete" | "passed" | "warning",
  run: CheckRun,
  record: QualityRecord | undefined
): DecisionEvidence {
  if (state === "incomplete") {
    const evidenceRefs = [
      { kind: "run" as const, checkRunId: run.checkRunId },
      { kind: "readiness" as const, readinessId: "current-complete" }
    ];
    return {
      policyId: "all-current",
      acceptance: [],
      views: [],
      readiness: [{
        readinessId: "current-complete",
        status: "failed",
        reason: "scan-incomplete",
        evidenceRefs
      }],
      blockWhen: null,
      gate: {
        status: "not-evaluated",
        policyId: "all-current",
        reason: "scan-incomplete",
        evidenceRefs
      }
    };
  }
  if (state !== "gate-failed" || record === undefined) {
    return disabledDecision();
  }
  const recordRef = { kind: "record" as const, recordId: record.recordId };
  return {
    policyId: "all-current",
    acceptance: [],
    views: [{ viewId: "all-current", recordRefs: [recordRef] }],
    readiness: [{
      readinessId: "current-complete",
      status: "passed",
      evidenceRefs: [
        { kind: "run", checkRunId: run.checkRunId },
        { kind: "readiness", readinessId: "current-complete" }
      ]
    }],
    blockWhen: {
      status: "matched",
      evidenceRefs: [recordRef, { kind: "view", viewId: "all-current" }],
      blockingRecordRefs: [recordRef]
    },
    gate: {
      status: "failed",
      policyId: "all-current",
      evidenceRefs: [
        { kind: "run", checkRunId: run.checkRunId },
        recordRef,
        { kind: "view", viewId: "all-current" },
        { kind: "readiness", readinessId: "current-complete" }
      ],
      blockingRecordRefs: [recordRef]
    }
  };
}

function disabledDecision(): DecisionEvidence {
  return {
    policyId: null,
    acceptance: [],
    views: [],
    readiness: [],
    blockWhen: null,
    gate: { status: "disabled", policyId: null }
  };
}
