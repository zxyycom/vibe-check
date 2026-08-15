import { createCatalogFingerprint } from "./identity.ts";
import type { CoreSnapshot, QualityRecord } from "./model.ts";
import type {
  AcceptanceEvidence,
  AcceptanceRule,
  NamedRecordView,
  RecordEvidenceRef,
  RecordPolicySurface,
  RecordPredicate,
  RecordSelector,
  ReferenceFacts,
  ViewEvidence
} from "./policy-model.ts";
import { createPolicySurfaceRegistry, readRecordOperand } from "./policy-validation.ts";

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
  snapshot: CoreSnapshot,
  referenceFacts: ReferenceFacts
): RecordObservationEvidence {
  const surfacesBySelector = resolveObservationSurfaces(input.catalogFingerprint, snapshot);
  const acceptance = evaluateAcceptance(input.acceptance, snapshot.records, surfacesBySelector, referenceFacts);
  const acceptedRecordIds = new Set(acceptance.map((evidence) => evidence.recordId));
  const views = evaluateViews(input.views, snapshot.records, surfacesBySelector, acceptedRecordIds, referenceFacts);
  return deepFreeze({ acceptance, views });
}

function resolveObservationSurfaces(catalogFingerprint: string, snapshot: CoreSnapshot) {
  if (catalogFingerprint !== createCatalogFingerprint(snapshot.checks).catalogFingerprint) {
    throw new TypeError("Record observation catalog does not match the final snapshot");
  }
  try {
    return new Map(createPolicySurfaceRegistry({
      catalogFingerprint,
      definitions: snapshot.checks
    }).recordTypes.map((surface) => [
      selectorKey(surface), surface
    ]));
  } catch {
    throw new TypeError("Record observation catalog does not match the final snapshot");
  }
}

function evaluateAcceptance(
  rules: readonly AcceptanceRule[],
  records: readonly QualityRecord[],
  surfacesBySelector: ReadonlyMap<string, RecordPolicySurface>,
  referenceFacts: ReferenceFacts
): AcceptanceEvidence[] {
  const acceptance: AcceptanceEvidence[] = [];
  for (const rule of rules) {
    const surface = surfaceForSelector(rule.selector, surfacesBySelector);
    for (const record of records) {
      if (matchesSelector(record, rule.selector)
        && rule.predicates.every((predicate) => matchesRecordPredicate(record, predicate, surface, referenceFacts))) {
        acceptance.push({
          acceptanceId: rule.acceptanceId,
          reason: rule.reason,
          recordId: record.recordId
        });
      }
    }
  }
  return acceptance.sort(compareAcceptanceEvidence);
}

function evaluateViews(
  views: readonly NamedRecordView[],
  records: readonly QualityRecord[],
  surfacesBySelector: ReadonlyMap<string, RecordPolicySurface>,
  acceptedRecordIds: ReadonlySet<string>,
  referenceFacts: ReferenceFacts
): ViewEvidence[] {
  return views.map((view) => ({
    viewId: view.viewId,
    recordRefs: records
      .filter((record) => matchesView(record, view, surfacesBySelector, acceptedRecordIds, referenceFacts))
      .map((record) => recordRef(record.recordId))
      .sort((left, right) => compareText(left.recordId, right.recordId))
  }));
}

function matchesView(
  record: QualityRecord,
  view: NamedRecordView,
  surfacesBySelector: ReadonlyMap<string, RecordPolicySurface>,
  acceptedRecordIds: ReadonlySet<string>,
  referenceFacts: ReferenceFacts
): boolean {
  const selector = view.selectors.find((candidate) => matchesSelector(record, candidate));
  if (selector === undefined || !matchesViewAcceptance(record.recordId, view.acceptance, acceptedRecordIds)) {
    return false;
  }
  return view.predicates.every((predicate) => (
    matchesRecordPredicate(record, predicate, surfaceForSelector(selector, surfacesBySelector), referenceFacts)
  ));
}

function matchesViewAcceptance(
  recordId: string,
  acceptance: NamedRecordView["acceptance"],
  acceptedRecordIds: ReadonlySet<string>
): boolean {
  const accepted = acceptedRecordIds.has(recordId);
  return acceptance === "all" || (acceptance === "accepted" ? accepted : !accepted);
}

function surfaceForSelector(
  selector: RecordSelector,
  surfacesBySelector: ReadonlyMap<string, RecordPolicySurface>
): RecordPolicySurface {
  const surface = surfacesBySelector.get(selectorKey(selector));
  if (surface === undefined) {
    throw new TypeError("Record observation selector is not registered by the catalog");
  }
  return surface;
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

function compareAcceptanceEvidence(left: AcceptanceEvidence, right: AcceptanceEvidence): number {
  return compareText(
    `${left.recordId}\u0000${left.acceptanceId}`,
    `${right.recordId}\u0000${right.acceptanceId}`
  );
}

function selectorKey(selector: RecordSelector): string {
  return `${selector.checkId}\u0000${selector.recordTypeId}`;
}

function recordRef(recordId: string): RecordEvidenceRef {
  return { kind: "record", recordId };
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
