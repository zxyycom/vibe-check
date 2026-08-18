import { createCoreCheckSession } from "../../src/product/quality-core/check-record/core-session.ts";
import { projectHumanStatus } from "../../src/product/quality-core/check-record/human-status.ts";
import type {
  CheckDefinition,
  CoreSnapshot
} from "../../src/product/quality-core/check-record/model.ts";
import type {
  DecisionEvidence,
  ReferenceFacts
} from "../../src/product/quality-core/check-record/policy-model.ts";
import {
  createPublicationModelV3,
  projectMachinePublicationV3
} from "../../src/product/quality-core/output/publication-v3/index.ts";
import {
  FIXED_MACHINE_EXAMPLE_INPUT,
  type CanonicalMachineExample,
  type MachineExampleScenario,
  type MachineExampleState
} from "./machine-example-model.ts";

const definition = {
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
} as const satisfies CheckDefinition;

const EMPTY_REFERENCE_FACTS = {
  evidence: [],
  relations: []
} as const satisfies ReferenceFacts;

type SelectedPolicyId = Exclude<MachineExampleScenario["selectedPolicy"], null>;

export function buildCanonicalMachineExample(input: MachineExampleScenario): CanonicalMachineExample {
  const snapshot = createSnapshot(input.state);
  const decision = createDecision(input, snapshot);
  const verificationOutput = false;
  const model = createPublicationModelV3({
    humanStatus: projectHumanStatus({ snapshot, decision, verificationOutput }),
    invocation: {
      invocationId: `invocation/v1:docs-${input.outcome}`,
      projectRoot: FIXED_MACHINE_EXAMPLE_INPUT.projectRoot,
      timestamp: FIXED_MACHINE_EXAMPLE_INPUT.timestamp
    },
    snapshot,
    references: [],
    referenceFacts: EMPTY_REFERENCE_FACTS,
    decision,
    verificationOutput
  });
  return Object.freeze({
    ...input,
    model,
    publication: projectMachinePublicationV3(model)
  });
}

function createSnapshot(state: MachineExampleState): CoreSnapshot {
  const session = createCoreCheckSession([{ definition }]);
  const scope = session.openCheckScope(definition.checkId);
  if (state === "warning" || state === "gate-failed") {
    scope.records.report({
      recordTypeId: definition.recordTypes[0].recordTypeId,
      level: "warning",
      semanticSubject: "src/example.ts#canonical",
      message: "The canonical documentation example requires review.",
      fields: { category: "maintainability", value: 7 },
      location: { path: FIXED_MACHINE_EXAMPLE_INPUT.path, line: 7, column: 1 }
    });
  }
  if (state === "incomplete") {
    scope.settle({
      status: "unavailable",
      reason: { code: "dependency-unavailable" }
    });
  } else if (state === "empty") {
    scope.settle({ status: "not-applicable" });
  } else {
    scope.settle({
      status: "completed",
      verdict: state === "warning" || state === "gate-failed" ? "failed" : "passed"
    });
  }
  return session.freeze();
}

function createDecision(
  scenario: MachineExampleScenario,
  snapshot: CoreSnapshot
): DecisionEvidence {
  if (scenario.selectedPolicy === null) return disabledDecision();
  switch (scenario.outcome) {
    case "gate-failed":
      return failedGateDecision(scenario.selectedPolicy, snapshot);
    case "scan-incomplete":
      return incompleteDecision(scenario.selectedPolicy, requiredCheck(snapshot).checkId);
  }
  return unreachablePolicyScenario(scenario);
}

function incompleteDecision(policyId: SelectedPolicyId, checkId: string): DecisionEvidence {
  const readinessId = "scan-complete";
  const evidenceRefs = [{ kind: "check" as const, checkId }, {
    kind: "readiness" as const,
    readinessId
  }];
  return {
    policyId,
    acceptance: [],
    views: [],
    readiness: [{
      readinessId,
      status: "failed",
      reason: "scan-incomplete",
      evidenceRefs
    }],
    blockWhen: null,
    gate: {
      status: "not-evaluated",
      policyId,
      reason: "scan-incomplete",
      evidenceRefs
    }
  };
}

function failedGateDecision(
  policyId: SelectedPolicyId,
  snapshot: CoreSnapshot
): DecisionEvidence {
  const checkId = requiredCheck(snapshot).checkId;
  const recordId = snapshot.records[0]?.recordId;
  if (recordId === undefined) throw new TypeError("Gate-failed example requires one record");
  const readinessId = "scan-complete";
  const readinessRefs = [{ kind: "check" as const, checkId }, {
    kind: "readiness" as const,
    readinessId
  }];
  const blockRefs = [{ kind: "record" as const, recordId }, {
    kind: "view" as const,
    viewId: "all-current"
  }];
  return {
    policyId,
    acceptance: [],
    views: [{ viewId: "all-current", recordRefs: [{ kind: "record", recordId }] }],
    readiness: [{ readinessId, status: "passed", evidenceRefs: readinessRefs }],
    blockWhen: {
      status: "matched",
      evidenceRefs: blockRefs,
      blockingRecordRefs: [{ kind: "record", recordId }]
    },
    gate: {
      status: "failed",
      policyId,
      evidenceRefs: [
        { kind: "check", checkId },
        { kind: "record", recordId },
        { kind: "view", viewId: "all-current" },
        { kind: "readiness", readinessId }
      ],
      blockingRecordRefs: [{ kind: "record", recordId }]
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

function requiredCheck(snapshot: CoreSnapshot): CoreSnapshot["checks"][number] {
  const [check] = snapshot.checks;
  if (check === undefined || snapshot.checks.length !== 1) {
    throw new TypeError("Documentation example requires one Core Check");
  }
  return check;
}

function unreachablePolicyScenario(scenario: never): never {
  throw new TypeError(`Unexpected selected-policy example scenario: ${JSON.stringify(scenario)}`);
}
