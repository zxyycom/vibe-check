import type { CheckRun, FinalCoreSnapshot } from "./model.ts";
import {
  type BlockWhenEvidence,
  type BlockWhen,
  type DecisionPolicy,
  type DecisionEvidence,
  type EvidenceRef,
  type GateNotEvaluatedReason,
  type AcceptanceEvidence,
  type PolicyResolution,
  type ReadinessEvidence,
  type ReadinessPredicate,
  type RecordEvidenceRef,
  type ReferenceFacts,
  type ViewEvidence
} from "./policy-model.ts";
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

function compareText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function evidenceKey(reference: EvidenceRef): string {
  if (reference.kind === "run") return `0\u0000${reference.checkRunId}`;
  if (reference.kind === "record") return `1\u0000${reference.recordId}`;
  if (reference.kind === "reference") {
    return `2\u0000${reference.checkId}\u0000${reference.referenceName}\u0000${reference.referenceId}`;
  }
  if (reference.kind === "view") return `3\u0000${reference.viewId}`;
  return `4\u0000${reference.readinessId}`;
}

function canonicalEvidence(references: readonly EvidenceRef[]): readonly EvidenceRef[] {
  const unique = new Map(references.map((reference) => [evidenceKey(reference), reference]));
  return [...unique.entries()]
    .sort(([left], [right]) => compareText(left, right))
    .map(([, reference]) => reference);
}

function referenceRef(
  resolution: PolicyResolution,
  checkId: string,
  referenceName: string
): EvidenceRef {
  const identity = resolution.references.find((reference) => reference.referenceName === referenceName)!;
  return { kind: "reference", checkId, referenceName, referenceId: identity.referenceId };
}

function runRef(run: CheckRun): EvidenceRef {
  return { kind: "run", checkRunId: run.checkRunId };
}

interface PredicateResult {
  readonly matched: boolean;
  readonly evidenceRefs: readonly EvidenceRef[];
}

type ReadinessEvaluation = Readonly<
  | {
    status: "ready";
    readiness: readonly ReadinessEvidence[];
    gateEvidence: readonly EvidenceRef[];
  }
  | {
    status: "not-evaluated";
    readiness: readonly ReadinessEvidence[];
    gateEvidence: readonly EvidenceRef[];
    reason: GateNotEvaluatedReason;
  }
>;

interface CompletedDecisionInput {
  readonly acceptance: readonly AcceptanceEvidence[];
  readonly policy: DecisionPolicy;
  readonly readiness: Extract<ReadinessEvaluation, { status: "ready" }>;
  readonly referenceFacts: ReferenceFacts;
  readonly resolution: PolicyResolution;
  readonly snapshot: FinalCoreSnapshot;
  readonly views: readonly ViewEvidence[];
  readonly viewsById: ReadonlyMap<string, ViewEvidence>;
}

function evaluateReadinessPredicate(
  predicate: ReadinessPredicate,
  resolution: PolicyResolution,
  snapshot: FinalCoreSnapshot,
  facts: ReferenceFacts,
  viewsById: ReadonlyMap<string, ViewEvidence>
): PredicateResult {
  if (predicate.kind === "view-empty") {
    const view = viewsById.get(predicate.viewId)!;
    return {
      matched: view.recordRefs.length === 0,
      evidenceRefs: [{ kind: "view", viewId: predicate.viewId }, ...view.recordRefs]
    };
  }
  if (predicate.kind === "reference-status") {
    const evidence = facts.evidence.find((candidate) => (
      candidate.checkId === predicate.checkId && candidate.referenceName === predicate.referenceName
    ))!;
    return {
      matched: evidence.status === predicate.status,
      evidenceRefs: [referenceRef(resolution, predicate.checkId, predicate.referenceName)]
    };
  }
  const run = snapshot.runs.find((candidate) => candidate.checkId === predicate.checkId)!;
  if (predicate.kind === "run-status") {
    return { matched: run.status === predicate.status, evidenceRefs: [runRef(run)] };
  }
  if (predicate.kind === "run-verdict") {
    return { matched: run.result?.verdict === predicate.verdict, evidenceRefs: [runRef(run)] };
  }
  return {
    matched: run.coverage !== null
      && run.coverage.acknowledgedWorkCount === run.coverage.plannedWorkCount,
    evidenceRefs: [runRef(run)]
  };
}

function evaluateBlockWhen(
  blockWhen: BlockWhen,
  resolution: PolicyResolution,
  snapshot: FinalCoreSnapshot,
  facts: ReferenceFacts,
  viewsById: ReadonlyMap<string, ViewEvidence>
): PredicateResult & { readonly blockingRecordRefs: readonly RecordEvidenceRef[] } {
  if (blockWhen.kind === "view-not-empty") {
    const view = viewsById.get(blockWhen.viewId)!;
    return {
      matched: view.recordRefs.length > 0,
      evidenceRefs: [{ kind: "view", viewId: blockWhen.viewId }, ...view.recordRefs],
      blockingRecordRefs: view.recordRefs
    };
  }
  if (blockWhen.kind === "reference-status") {
    const evidence = facts.evidence.find((candidate) => (
      candidate.checkId === blockWhen.checkId && candidate.referenceName === blockWhen.referenceName
    ))!;
    return {
      matched: evidence.status === blockWhen.status,
      evidenceRefs: [referenceRef(resolution, blockWhen.checkId, blockWhen.referenceName)],
      blockingRecordRefs: []
    };
  }
  const run = snapshot.runs.find((candidate) => candidate.checkId === blockWhen.checkId)!;
  return {
    matched: run.status === blockWhen.status,
    evidenceRefs: [runRef(run)],
    blockingRecordRefs: []
  };
}

function evaluateReadiness(
  resolution: PolicyResolution,
  snapshot: FinalCoreSnapshot,
  referenceFacts: ReferenceFacts,
  viewsById: ReadonlyMap<string, ViewEvidence>
): ReadinessEvaluation {
  const readiness: ReadinessEvidence[] = [];
  const gateEvidence: EvidenceRef[] = [];
  for (const clause of resolution.policy!.readiness) {
    const evaluated = evaluateReadinessPredicate(clause.predicate, resolution, snapshot, referenceFacts, viewsById);
    const evidenceRefs = canonicalEvidence([...evaluated.evidenceRefs, {
      kind: "readiness",
      readinessId: clause.readinessId
    }]);
    gateEvidence.push(...evidenceRefs);
    readiness.push(evaluated.matched
      ? { readinessId: clause.readinessId, status: "passed", evidenceRefs }
      : { readinessId: clause.readinessId, status: "failed", reason: clause.reason, evidenceRefs });
    if (!evaluated.matched) {
      return { status: "not-evaluated", readiness, gateEvidence, reason: clause.reason };
    }
  }
  return { status: "ready", readiness, gateEvidence };
}

export function evaluateDecisionPolicy(
  resolution: PolicyResolution,
  snapshot: FinalCoreSnapshot,
  referenceFacts: ReferenceFacts
): DecisionEvidence {
  if (resolution.catalogFingerprint !== snapshot.catalogFingerprint) {
    throw new TypeError("Policy resolution catalog does not match the final snapshot");
  }
  const policy = resolution.policy;
  if (policy === null) return disabledDecision(snapshot);

  const { acceptance, views } = evaluateRecordObservation({
    acceptance: policy.acceptance,
    catalogFingerprint: resolution.catalogFingerprint,
    views: policy.views
  }, snapshot, referenceFacts);
  const viewsById = new Map(views.map((view) => [view.viewId, view]));

  const readiness = evaluateReadiness(resolution, snapshot, referenceFacts, viewsById);
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

function disabledDecision(snapshot: FinalCoreSnapshot): DecisionEvidence {
  try {
    createPolicySurfaceRegistry(snapshot);
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
    status: blocked.matched ? "matched" : "not-matched",
    evidenceRefs: canonicalEvidence(blocked.evidenceRefs),
    blockingRecordRefs: [...blocked.blockingRecordRefs].sort((left, right) => compareText(left.recordId, right.recordId))
  };
  const gateEvidence = [...input.readiness.gateEvidence, ...blocked.evidenceRefs];
  return deepFreeze({
    policyId: input.policy.policyId,
    acceptance: input.acceptance,
    views: input.views,
    readiness: input.readiness.readiness,
    blockWhen,
    gate: {
      status: blocked.matched ? "failed" : "passed",
      policyId: input.policy.policyId,
      evidenceRefs: canonicalEvidence(gateEvidence),
      blockingRecordRefs: blockWhen.blockingRecordRefs
    }
  });
}
