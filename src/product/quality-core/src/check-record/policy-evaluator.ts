import type { CheckRun, FinalCoreSnapshot, QualityRecord } from "./model.ts";
import {
  type AcceptanceEvidence,
  type AcceptanceRule,
  type BlockWhenEvidence,
  type BlockWhen,
  type DecisionEvidence,
  type EvidenceRef,
  type PolicyResolution,
  type ReadinessEvidence,
  type ReadinessPredicate,
  type RecordEvidenceRef,
  type NamedRecordView,
  type RecordPolicySurface,
  type RecordPredicate,
  type RecordSelector,
  type ReferenceFacts,
  type ViewEvidence
} from "./policy-model.ts";
import { createPolicySurfaceRegistry, readRecordOperand } from "./policy-validation.ts";

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function selectorKey(selector: RecordSelector): string {
  return `${selector.checkId}\u0000${selector.recordTypeId}`;
}

function recordRef(recordId: string): RecordEvidenceRef {
  return { kind: "record", recordId };
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

function matchesSelector(record: QualityRecord, selector: RecordSelector): boolean {
  return record.checkId === selector.checkId && record.recordTypeId === selector.recordTypeId;
}

function matchesRecordPredicate(
  record: QualityRecord,
  predicate: RecordPredicate,
  surface: RecordPolicySurface,
  facts: ReferenceFacts
): boolean {
  if (predicate.kind === "relation-is" || predicate.kind === "relation-kind-in") {
    return facts.relations.some((relation) => (
      relation.recordId === record.recordId
      && relation.referenceName === predicate.referenceName
      && (predicate.kind === "relation-is"
        ? relation.relationId === predicate.relationId
        : predicate.values.includes(relation.relationId))
    ));
  }
  const operand = surface.operands.find((candidate) => candidate.operandId === predicate.operandId)!;
  const value = readRecordOperand(record, operand);
  return predicate.kind === "operand-equals"
    ? value === predicate.value
    : typeof value === "string" && value.includes(predicate.value);
}

function runRef(run: CheckRun): EvidenceRef {
  return { kind: "run", checkRunId: run.checkRunId };
}

interface PredicateResult {
  readonly matched: boolean;
  readonly evidenceRefs: readonly EvidenceRef[];
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

export interface RecordObservationEvidence {
  readonly acceptance: readonly AcceptanceEvidence[];
  readonly views: readonly ViewEvidence[];
}

export function evaluateRecordObservation(
  input: Readonly<{
    acceptance: readonly AcceptanceRule[];
    catalogFingerprint: string;
    views: readonly NamedRecordView[];
  }>,
  snapshot: FinalCoreSnapshot,
  referenceFacts: ReferenceFacts
): RecordObservationEvidence {
  if (input.catalogFingerprint !== snapshot.catalogFingerprint) {
    throw new TypeError("Record observation catalog does not match the final snapshot");
  }
  let registry: ReturnType<typeof createPolicySurfaceRegistry>;
  try {
    registry = createPolicySurfaceRegistry(snapshot);
  } catch {
    throw new TypeError("Record observation catalog does not match the final snapshot");
  }
  const surfacesBySelector = new Map(
    registry.recordTypes.map((surface) => [selectorKey(surface), surface])
  );
  const acceptance: AcceptanceEvidence[] = [];
  const acceptedRecordIds = new Set<string>();
  for (const rule of input.acceptance) {
    const surface = surfacesBySelector.get(selectorKey(rule.selector));
    if (surface === undefined) {
      throw new TypeError("Record observation selector is not registered by the catalog");
    }
    for (const record of snapshot.records) {
      if (matchesSelector(record, rule.selector)
        && rule.predicates.every((predicate) => (
          matchesRecordPredicate(record, predicate, surface, referenceFacts)
        ))) {
        acceptance.push({
          acceptanceId: rule.acceptanceId,
          reason: rule.reason,
          recordId: record.recordId
        });
        acceptedRecordIds.add(record.recordId);
      }
    }
  }
  acceptance.sort((left, right) => compareText(
    `${left.recordId}\u0000${left.acceptanceId}`,
    `${right.recordId}\u0000${right.acceptanceId}`
  ));

  const views: ViewEvidence[] = [];
  for (const view of input.views) {
    const records = snapshot.records.filter((record) => {
      const selector = view.selectors.find((candidate) => matchesSelector(record, candidate));
      if (selector === undefined) return false;
      const accepted = acceptedRecordIds.has(record.recordId);
      if ((view.acceptance === "accepted" && !accepted)
        || (view.acceptance === "unaccepted" && accepted)) {
        return false;
      }
      const surface = surfacesBySelector.get(selectorKey(selector));
      if (surface === undefined) {
        throw new TypeError("Record observation selector is not registered by the catalog");
      }
      return view.predicates.every((predicate) => (
        matchesRecordPredicate(record, predicate, surface, referenceFacts)
      ));
    });
    views.push({
      viewId: view.viewId,
      recordRefs: records
        .map((record) => recordRef(record.recordId))
        .sort((left, right) => compareText(left.recordId, right.recordId))
    });
  }
  return deepFreeze({ acceptance, views });
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
  if (policy === null) {
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

  const { acceptance, views } = evaluateRecordObservation({
    acceptance: policy.acceptance,
    catalogFingerprint: resolution.catalogFingerprint,
    views: policy.views
  }, snapshot, referenceFacts);
  const viewsById = new Map(views.map((view) => [view.viewId, view]));

  const readiness: ReadinessEvidence[] = [];
  const gateEvidence: EvidenceRef[] = [];
  for (const clause of policy.readiness) {
    const evaluated = evaluateReadinessPredicate(clause.predicate, resolution, snapshot, referenceFacts, viewsById);
    const clauseRef: EvidenceRef = { kind: "readiness", readinessId: clause.readinessId };
    const evidenceRefs = canonicalEvidence([...evaluated.evidenceRefs, clauseRef]);
    readiness.push(evaluated.matched
      ? { readinessId: clause.readinessId, status: "passed", evidenceRefs }
      : { readinessId: clause.readinessId, status: "failed", reason: clause.reason, evidenceRefs });
    gateEvidence.push(...evidenceRefs);
    if (!evaluated.matched) {
      return deepFreeze({
        policyId: policy.policyId,
        acceptance,
        views,
        readiness,
        blockWhen: null,
        gate: {
          status: "not-evaluated",
          policyId: policy.policyId,
          reason: clause.reason,
          evidenceRefs: canonicalEvidence(gateEvidence)
        }
      });
    }
  }

  const blocked = evaluateBlockWhen(policy.blockWhen, resolution, snapshot, referenceFacts, viewsById);
  const blockWhen: BlockWhenEvidence = {
    status: blocked.matched ? "matched" : "not-matched",
    evidenceRefs: canonicalEvidence(blocked.evidenceRefs),
    blockingRecordRefs: [...blocked.blockingRecordRefs].sort((left, right) => compareText(left.recordId, right.recordId))
  };
  gateEvidence.push(...blocked.evidenceRefs);
  return deepFreeze({
    policyId: policy.policyId,
    acceptance,
    views,
    readiness,
    blockWhen,
    gate: {
      status: blocked.matched ? "failed" : "passed",
      policyId: policy.policyId,
      evidenceRefs: canonicalEvidence(gateEvidence),
      blockingRecordRefs: blockWhen.blockingRecordRefs
    }
  });
}
