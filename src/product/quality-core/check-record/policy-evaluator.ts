import { createCatalogFingerprint } from "./identity.ts";
import type { CoreSnapshot } from "./model.ts";
import type {
  AcceptanceEvidence,
  BlockWhenEvidence,
  DecisionEvidence,
  DecisionPolicy,
  EvidenceRef,
  PolicyResolution,
  ReferenceFacts,
  ViewEvidence
} from "./policy-model.ts";
import {
  canonicalEvidence,
  compareText,
  evaluateBlockWhen,
  evaluateReadiness,
  type ReadinessEvaluation
} from "./policy-evaluator-predicates.ts";
import { createPolicySurfaceRegistry } from "./policy-validation.ts";
import { evaluateRecordObservation } from "./record-observation-evaluator.ts";

export {
  evaluateRecordObservation,
  type RecordObservationEvidence
} from "./record-observation-evaluator.ts";

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function snapshotCatalogFingerprint(snapshot: CoreSnapshot): string {
  return createCatalogFingerprint(snapshot.checks).catalogFingerprint;
}

interface CompletedDecisionInput {
  readonly acceptance: readonly AcceptanceEvidence[];
  readonly policy: DecisionPolicy;
  readonly readiness: Extract<ReadinessEvaluation, { status: "ready" }>;
  readonly referenceFacts: ReferenceFacts;
  readonly resolution: PolicyResolution;
  readonly snapshot: CoreSnapshot;
  readonly views: readonly ViewEvidence[];
  readonly viewsById: ReadonlyMap<string, ViewEvidence>;
}

export function evaluateDecisionPolicy(
  resolution: PolicyResolution,
  snapshot: CoreSnapshot,
  referenceFacts: ReferenceFacts
): DecisionEvidence {
  if (resolution.catalogFingerprint !== snapshotCatalogFingerprint(snapshot)) {
    throw new TypeError("Policy resolution catalog does not match the final snapshot");
  }
  const policy = resolution.policy;
  if (policy === null) return disabledDecision(snapshot);

  const { acceptance, views } = evaluateRecordObservation(
    {
      acceptance: policy.acceptance,
      catalogFingerprint: resolution.catalogFingerprint,
      views: policy.views
    },
    snapshot,
    referenceFacts
  );
  const viewsById = new Map(views.map((view) => [view.viewId, view]));
  const readiness = evaluateReadiness(policy, resolution, snapshot, referenceFacts, viewsById);
  if (readiness.status === "not-evaluated") {
    return notEvaluatedDecision(policy, acceptance, views, readiness);
  }
  return completedDecision({
    policy,
    resolution,
    snapshot,
    referenceFacts,
    viewsById,
    acceptance,
    views,
    readiness
  });
}

function disabledDecision(snapshot: CoreSnapshot): DecisionEvidence {
  try {
    createPolicySurfaceRegistry({
      catalogFingerprint: snapshotCatalogFingerprint(snapshot),
      definitions: snapshot.checks
    });
  } catch {
    throw new TypeError("Policy resolution catalog does not match the final snapshot");
  }
  return deepFreeze({
    policyId: null,
    acceptance: [],
    views: [],
    readiness: [],
    blockWhen: null,
    gate: { status: "disabled", policyId: null }
  });
}

function notEvaluatedDecision(
  policy: DecisionPolicy,
  acceptance: readonly AcceptanceEvidence[],
  views: readonly ViewEvidence[],
  readiness: Extract<ReadinessEvaluation, { status: "not-evaluated" }>
): DecisionEvidence {
  return deepFreeze({
    policyId: policy.policyId,
    acceptance,
    views,
    readiness: readiness.readiness,
    blockWhen: null,
    gate: {
      status: "not-evaluated",
      policyId: policy.policyId,
      reason: readiness.reason,
      evidenceRefs: canonicalEvidence(readiness.gateEvidence)
    }
  });
}

function completedDecision(input: CompletedDecisionInput): DecisionEvidence {
  const blocked = evaluateBlockWhen(
    input.policy.blockWhen,
    input.resolution,
    input.snapshot,
    input.referenceFacts,
    input.viewsById
  );
  const blockWhen: BlockWhenEvidence = {
    status: blocked.isMatched ? "matched" : "not-matched",
    evidenceRefs: canonicalEvidence(blocked.evidenceRefs),
    blockingRecordRefs: [...blocked.blockingRecordRefs].sort((left, right) =>
      compareText(left.recordId, right.recordId)
    )
  };
  const gateEvidence: EvidenceRef[] = [...input.readiness.gateEvidence, ...blocked.evidenceRefs];
  return deepFreeze({
    policyId: input.policy.policyId,
    acceptance: input.acceptance,
    views: input.views,
    readiness: input.readiness.readiness,
    blockWhen,
    gate: {
      status: blocked.isMatched ? "failed" : "passed",
      policyId: input.policy.policyId,
      evidenceRefs: canonicalEvidence(gateEvidence),
      blockingRecordRefs: blockWhen.blockingRecordRefs
    }
  });
}
