import { createCoreCheckSession } from "../../check-record/core-session.ts";
import { projectHumanStatus } from "../../check-record/human-status.ts";
import type { CheckDefinition, CoreSnapshot } from "../../check-record/model.ts";
import type {
  DecisionEvidence,
  NamedReferenceIdentity,
  ReferenceFacts
} from "../../check-record/policy-model.ts";

const BASELINE_REFERENCE_ID =
  "reference/v1/sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const definition = {
  checkId: "publication-check",
  displayName: "Publication Check",
  recordTypes: [{
    recordTypeId: "publication-record",
    fields: [{ fieldId: "value", valueType: "integer", required: true }],
    identityFields: ["value"],
    policy: {
      operands: [],
      relations: ["regression"]
    }
  }]
} as const satisfies CheckDefinition;

const emptyReferenceFacts: ReferenceFacts = { evidence: [], relations: [] };

export async function richPublicationInput() {
  const snapshot = snapshotWithRecords(["src/a.ts"]);
  const recordId = snapshot.records[0]!.recordId;
  const references: readonly NamedReferenceIdentity[] = [{
    referenceName: "baseline",
    referenceId: BASELINE_REFERENCE_ID
  }];
  const referenceFacts: ReferenceFacts = {
    evidence: [{
      checkId: requiredCheck(snapshot).checkId,
      referenceName: "baseline",
      status: "complete"
    }],
    relations: [{ recordId, referenceName: "baseline", relationId: "regression" }]
  };
  const decision = regressionDecision(snapshot);

  return {
    ...humanPublicationFields(snapshot, decision),
    invocation: {
      invocationId: "invocation/v1:publication-contract",
      projectRoot: "." as const,
      timestamp: "2026-08-12T00:00:00.000Z"
    },
    snapshot,
    references,
    referenceFacts,
    decision,
    privateInvocationMaterial: "must not cross publication"
  };
}

function regressionDecision(snapshot: CoreSnapshot): DecisionEvidence {
  const recordId = snapshot.records[0]!.recordId;
  const checkId = requiredCheck(snapshot).checkId;
  return {
    policyId: "regressions",
    acceptance: [{ acceptanceId: "accepted-large-file", reason: "Reviewed", recordId }],
    views: [{ viewId: "all-current", recordRefs: [{ kind: "record", recordId }] }],
    readiness: [{
      readinessId: "current-complete",
      status: "passed",
      evidenceRefs: [{ kind: "check", checkId }, {
        kind: "readiness",
        readinessId: "current-complete"
      }]
    }],
    blockWhen: {
      status: "matched",
      evidenceRefs: [{ kind: "record", recordId }, { kind: "view", viewId: "all-current" }],
      blockingRecordRefs: [{ kind: "record", recordId }]
    },
    gate: {
      status: "failed",
      policyId: "regressions",
      evidenceRefs: [
        { kind: "check", checkId },
        { kind: "record", recordId },
        { kind: "view", viewId: "all-current" },
        { kind: "readiness", readinessId: "current-complete" }
      ],
      blockingRecordRefs: [{ kind: "record", recordId }]
    }
  };
}

export async function reportProjectionInput() {
  const snapshot = snapshotWithRecords([
    "lib/src/a.ts",
    "src/a.ts",
    "src/a.tsx",
    "src/b.ts",
    "src/c.ts"
  ]);
  const decision: DecisionEvidence = {
    policyId: null,
    acceptance: [],
    views: [{
      viewId: "all-current",
      recordRefs: snapshot.records.map(({ recordId }) => ({ kind: "record", recordId }))
    }],
    readiness: [],
    blockWhen: null,
    gate: { status: "disabled", policyId: null }
  };
  return {
    ...humanPublicationFields(snapshot, decision),
    invocation: {
      invocationId: "invocation/v1:readable-projection",
      projectRoot: "." as const,
      timestamp: "2026-08-12T00:00:00.000Z"
    },
    snapshot,
    references: [] as readonly NamedReferenceIdentity[],
    referenceFacts: emptyReferenceFacts,
    decision
  };
}

export async function emptyPublicationInput() {
  const snapshot = snapshotWithoutRecords();
  const decision: DecisionEvidence = {
    policyId: null,
    acceptance: [],
    views: [],
    readiness: [],
    blockWhen: null,
    gate: { status: "disabled", policyId: null }
  };
  return {
    ...humanPublicationFields(snapshot, decision),
    invocation: {
      invocationId: "invocation/v1:publication-empty",
      projectRoot: "." as const,
      timestamp: "2026-08-12T00:00:00.000Z"
    },
    snapshot,
    references: [] as readonly NamedReferenceIdentity[],
    referenceFacts: emptyReferenceFacts,
    decision
  };
}

export async function noPolicyPublicationInput() {
  const noPolicyDefinition = {
    checkId: "no-policy-check",
    displayName: "No Policy Check",
    recordTypes: [{
      recordTypeId: "no-policy-record",
      fields: [],
      identityFields: []
    }]
  } as const satisfies CheckDefinition;
  const snapshot = snapshotForDefinition(noPolicyDefinition, "passed");
  const decision = {
    policyId: null,
    acceptance: [],
    views: [],
    readiness: [],
    blockWhen: null,
    gate: { status: "disabled", policyId: null }
  } satisfies DecisionEvidence;
  return {
    ...humanPublicationFields(snapshot, decision),
    invocation: {
      invocationId: "invocation/v1:no-policy-publication",
      projectRoot: "." as const,
      timestamp: "2026-08-12T00:00:00.000Z"
    },
    snapshot,
    references: [] as readonly NamedReferenceIdentity[],
    referenceFacts: emptyReferenceFacts,
    decision
  };
}

function humanPublicationFields(
  snapshot: CoreSnapshot,
  decision: DecisionEvidence,
  verificationOutput = false
) {
  return {
    humanStatus: projectHumanStatus({ snapshot, decision, verificationOutput }),
    verificationOutput
  };
}

function snapshotWithRecords(paths: readonly string[]): CoreSnapshot {
  const session = createCoreCheckSession([{ definition, applicability: "applicable" }]);
  const scope = session.openApplicableScope(definition.checkId);
  for (const [index, path] of paths.entries()) {
    scope.records.report({
      recordTypeId: definition.recordTypes[0].recordTypeId,
      level: "warning",
      semanticSubject: path,
      message: paths.length === 1 ? "Publication finding" : `Publication finding ${path}`,
      fields: { value: index + 7 },
      location: { path, line: index + 7, column: 1 }
    });
  }
  scope.settle({ kind: "completed", verdict: "failed" });
  return session.freeze();
}

function snapshotWithoutRecords(): CoreSnapshot {
  const session = createCoreCheckSession([{ definition, applicability: "not-applicable" }]);
  session.closeNotApplicable(definition.checkId);
  return session.freeze();
}

function snapshotForDefinition(
  checkDefinition: CheckDefinition,
  verdict: "failed" | "passed"
): CoreSnapshot {
  const session = createCoreCheckSession([{ definition: checkDefinition, applicability: "applicable" }]);
  session.openApplicableScope(checkDefinition.checkId).settle({ kind: "completed", verdict });
  return session.freeze();
}

function requiredCheck(snapshot: CoreSnapshot): CoreSnapshot["checks"][number] {
  const [check] = snapshot.checks;
  if (check === undefined || snapshot.checks.length !== 1) {
    throw new TypeError("Publication fixture requires one Core Check");
  }
  return check;
}
