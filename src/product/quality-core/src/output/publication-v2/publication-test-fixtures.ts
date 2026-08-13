import { strict as assert } from "node:assert";

import {
  resolveCheckCatalog,
  type CheckExecutionBinding
} from "../../check-record/catalog.ts";
import { coordinateCheckRecordsWithTestPolicy } from "../../check-record/coordinator-test-support.ts";
import { projectHumanStatus } from "../../check-record/human-status.ts";
import type { CheckDefinition, FinalCoreSnapshot } from "../../check-record/model.ts";
import type {
  DecisionEvidence,
  NamedReferenceIdentity,
  ReferenceFacts
} from "../../check-record/policy-model.ts";
import { validateCheckDefinition } from "../../check-record/validation.ts";

const BASELINE_REFERENCE_ID =
  "reference/v1/sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

export async function richPublicationInput() {
  const snapshot = await snapshotWithRecord();
  const recordId = snapshot.records[0]!.recordId;
  const run = snapshot.runs[0]!;
  const references: readonly NamedReferenceIdentity[] = [{
    referenceName: "baseline",
    referenceId: BASELINE_REFERENCE_ID
  }];
  const referenceFacts: ReferenceFacts = {
    evidence: [{ checkId: run.checkId, referenceName: "baseline", status: "complete" }],
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

function regressionDecision(snapshot: FinalCoreSnapshot): DecisionEvidence {
  const recordId = snapshot.records[0]!.recordId;
  const run = snapshot.runs[0]!;
  return {
    policyId: "regressions",
    acceptance: [{ acceptanceId: "accepted-large-file", reason: "Reviewed", recordId }],
    views: [{ viewId: "all-current", recordRefs: [{ kind: "record", recordId }] }],
    readiness: [{
      readinessId: "current-complete",
      status: "passed",
      evidenceRefs: [{ kind: "run", checkRunId: run.checkRunId }, {
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
        { kind: "run", checkRunId: run.checkRunId },
        { kind: "record", recordId },
        { kind: "view", viewId: "all-current" },
        { kind: "readiness", readinessId: "current-complete" }
      ],
      blockingRecordRefs: [{ kind: "record", recordId }]
    }
  };
}

export async function reportProjectionInput() {
  const snapshot = await snapshotWithRecords([
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
    referenceFacts: { evidence: [], relations: [] } satisfies ReferenceFacts,
    decision
  };
}

export async function emptyPublicationInput() {
  const snapshot = await snapshotWithoutRecords();
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
    referenceFacts: { evidence: [], relations: [] } satisfies ReferenceFacts,
    decision
  };
}

export async function noPolicyPublicationInput() {
  const noPolicyDefinition: CheckDefinition = {
    checkId: "no-policy-check",
    displayName: "No Policy Check",
    recordTypes: [{
      recordTypeId: "no-policy-record",
      fields: [],
      identityFields: []
    }]
  };
  const snapshot = await coordinateCheckRecordsWithTestPolicy(catalogFor(
    noPolicyDefinition,
    () => ({ verdict: "passed" }),
    true
  ));
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
    referenceFacts: { evidence: [], relations: [] } satisfies ReferenceFacts,
    decision
  };
}

function humanPublicationFields(
  snapshot: FinalCoreSnapshot,
  decision: DecisionEvidence,
  verificationOutput = false
) {
  return {
    humanStatus: projectHumanStatus({ snapshot, decision, verificationOutput }),
    verificationOutput
  };
}

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
} as const;

async function snapshotWithRecord(): Promise<FinalCoreSnapshot> {
  return snapshotWithRecords(["src/a.ts"]);
}

async function snapshotWithRecords(paths: readonly string[]): Promise<FinalCoreSnapshot> {
  return coordinateCheckRecordsWithTestPolicy(catalog(async (ports) => {
    for (const [index, path] of paths.entries()) {
      ports.submitRecord({
        recordTypeId: "publication-record",
        level: "warning",
        semanticSubject: path,
        message: paths.length === 1 ? "Publication finding" : `Publication finding ${path}`,
        fields: { value: index + 7 },
        location: { path, line: index + 7, column: 1 }
      });
    }
    ports.acknowledge(ports.workHandles[0]!);
    return { verdict: "failed" };
  }, true));
}

async function snapshotWithoutRecords(): Promise<FinalCoreSnapshot> {
  return coordinateCheckRecordsWithTestPolicy(catalog(() => ({ verdict: "not-applicable" }), false));
}

function catalog(execute: CheckExecutionBinding, applicable: boolean) {
  return catalogFor(definition, execute, applicable);
}

function catalogFor(
  checkDefinition: CheckDefinition,
  execute: CheckExecutionBinding,
  applicable: boolean
) {
  assert.equal(validateCheckDefinition(checkDefinition).ok, true);
  const result = resolveCheckCatalog({
    invocationKey: `publication-${applicable}`,
    definitions: [checkDefinition],
    bindings: [{ checkId: checkDefinition.checkId, execute }],
    schedules: [{ checkId: checkDefinition.checkId, requiresChecks: [] }],
    selectedCheckIds: [checkDefinition.checkId],
    resolveApplicability: () => applicable
      ? { status: "applicable", workHandles: ["work-handle/v1:publication-check"] }
      : { status: "not-applicable" }
  });
  if (!result.ok) throw new Error("Expected catalog");
  return result.value;
}
