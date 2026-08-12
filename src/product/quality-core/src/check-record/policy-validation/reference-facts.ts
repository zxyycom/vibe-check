import type { FinalCoreSnapshot, QualityRecord } from "../model.ts";
import type {
  CheckReferenceEvidence,
  ComparisonRelation,
  PolicyResolution,
  RecordPolicySurface,
  ReferenceFacts
} from "../policy-model.ts";
import type { ValidationResult } from "../validation.ts";
import { safePolicyInput } from "./safe-input.ts";
import {
  accepted,
  checkReferenceKey,
  closed,
  compareText,
  isReferenceEvidenceStatus,
  isStableId,
  issue,
  referenceEvidenceKey,
  selectorKey
} from "./validation-helpers.ts";

interface FactsContext {
  readonly requiredPairs: ReadonlySet<string>;
  readonly referencesByName: ReadonlyMap<string, unknown>;
  readonly surfacesBySelector: ReadonlyMap<string, RecordPolicySurface>;
  readonly recordsById: ReadonlyMap<string, QualityRecord>;
}

interface EvidenceResult {
  readonly evidence: readonly CheckReferenceEvidence[];
  readonly evidenceByPair: ReadonlyMap<string, CheckReferenceEvidence>;
}

function requiredReferencePairs(resolution: PolicyResolution): ReadonlySet<string> {
  return new Set(resolution.policy?.references.flatMap((requirement) => (
    requirement.checkIds.map((checkId) => checkReferenceKey(checkId, requirement.referenceName))
  )) ?? []);
}

function validateEvidenceItem(
  value: unknown,
  path: string,
  context: Pick<FactsContext, "requiredPairs" | "referencesByName">,
  evidenceByPair: ReadonlyMap<string, CheckReferenceEvidence>
): ValidationResult<CheckReferenceEvidence> {
  const shape = closed(value, path, ["checkId", "referenceName", "status"]);
  if (!shape.ok) return shape;
  if (!isStableId(shape.value.checkId) || !isStableId(shape.value.referenceName)
    || !context.referencesByName.has(shape.value.referenceName)) {
    return issue(path, "identity-mismatch", "Unknown Check/reference evidence identity");
  }
  const pair = checkReferenceKey(shape.value.checkId, shape.value.referenceName);
  if (!context.requiredPairs.has(pair)) {
    return issue(path, "identity-mismatch", "Reference evidence is not required by the selected policy");
  }
  if (evidenceByPair.has(pair)) return issue(path, "duplicate", "Duplicate Check/reference evidence");
  if (!isReferenceEvidenceStatus(shape.value.status)) {
    return issue(`${path}.status`, "invalid-value", "Unknown reference evidence status");
  }
  return accepted({
    checkId: shape.value.checkId,
    referenceName: shape.value.referenceName,
    status: shape.value.status
  });
}

function validateEvidence(
  value: readonly unknown[],
  context: Pick<FactsContext, "requiredPairs" | "referencesByName">
): ValidationResult<EvidenceResult> {
  const evidence: CheckReferenceEvidence[] = [];
  const evidenceByPair = new Map<string, CheckReferenceEvidence>();
  for (let index = 0; index < value.length; index += 1) {
    const item = validateEvidenceItem(value[index], `$.evidence[${index}]`, context, evidenceByPair);
    if (!item.ok) return item;
    evidence.push(item.value);
    evidenceByPair.set(referenceEvidenceKey(item.value), item.value);
  }
  if (evidenceByPair.size !== context.requiredPairs.size
    || [...context.requiredPairs].some((pair) => !evidenceByPair.has(pair))) {
    return issue("$.evidence", "missing-field", "Every required Check/reference pair needs one evidence status");
  }
  return accepted({ evidence, evidenceByPair });
}

function validateRelationIdentity(
  shape: Record<string, unknown>,
  path: string,
  context: FactsContext,
  evidenceByPair: ReadonlyMap<string, CheckReferenceEvidence>
): ValidationResult<Readonly<{ record: QualityRecord; referenceName: string; relationId: string }>> {
  if (typeof shape.recordId !== "string") {
    return issue(`${path}.recordId`, "invalid-value", "Invalid record identity");
  }
  const record = context.recordsById.get(shape.recordId);
  if (record === undefined) {
    return issue(`${path}.recordId`, "identity-mismatch", "Relation record is not in the current snapshot");
  }
  if (!isStableId(shape.referenceName)
    || !context.requiredPairs.has(checkReferenceKey(record.checkId, shape.referenceName))) {
    return issue(`${path}.referenceName`, "identity-mismatch", "Relation reference is not declared for the owning Check");
  }
  const pairEvidence = evidenceByPair.get(checkReferenceKey(record.checkId, shape.referenceName))!;
  if (pairEvidence.status !== "complete") {
    return issue(path, "invalid-value", "Incomplete reference evidence cannot publish comparison relations");
  }
  const surface = context.surfacesBySelector.get(selectorKey(record));
  if (!isStableId(shape.relationId) || !surface?.relations.includes(shape.relationId)) {
    return issue(`${path}.relationId`, "identity-mismatch", "Relation variant is not registered by the record descriptor");
  }
  return accepted({ record, referenceName: shape.referenceName, relationId: shape.relationId });
}

function validateRelationItem(
  value: unknown,
  path: string,
  context: FactsContext,
  evidenceByPair: ReadonlyMap<string, CheckReferenceEvidence>,
  relationBindings: Set<string>
): ValidationResult<ComparisonRelation> {
  const shape = closed(value, path, ["recordId", "referenceName", "relationId"]);
  if (!shape.ok) return shape;
  const identity = validateRelationIdentity(shape.value, path, context, evidenceByPair);
  if (!identity.ok) return identity;
  const binding = `${identity.value.record.recordId}\u0000${identity.value.referenceName}`;
  if (relationBindings.has(binding)) {
    return issue(path, "duplicate", "Duplicate record/reference relation binding");
  }
  relationBindings.add(binding);
  return accepted({
    recordId: identity.value.record.recordId,
    referenceName: identity.value.referenceName,
    relationId: identity.value.relationId
  });
}

function validateRelations(
  value: readonly unknown[],
  context: FactsContext,
  evidenceByPair: ReadonlyMap<string, CheckReferenceEvidence>
): ValidationResult<readonly ComparisonRelation[]> {
  const relations: ComparisonRelation[] = [];
  const relationBindings = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const relation = validateRelationItem(
      value[index],
      `$.relations[${index}]`,
      context,
      evidenceByPair,
      relationBindings
    );
    if (!relation.ok) return relation;
    relations.push(relation.value);
  }
  return accepted(relations);
}

function sortedFacts(
  evidence: readonly CheckReferenceEvidence[],
  relations: readonly ComparisonRelation[]
): ReferenceFacts {
  return {
    evidence: [...evidence].sort((left, right) => compareText(
      referenceEvidenceKey(left),
      referenceEvidenceKey(right)
    )),
    relations: [...relations].sort((left, right) => compareText(
      `${left.recordId}\u0000${left.referenceName}`,
      `${right.recordId}\u0000${right.referenceName}`
    ))
  };
}

export function validateReferenceFactsData(
  value: unknown,
  resolution: PolicyResolution,
  snapshot: FinalCoreSnapshot,
  surfaces: readonly RecordPolicySurface[]
): ValidationResult<ReferenceFacts> {
  const materialized = safePolicyInput(value);
  if (!materialized.ok) return materialized;
  const shape = closed(materialized.value, "$", ["evidence", "relations"]);
  if (!shape.ok) return shape;
  if (!Array.isArray(shape.value.evidence) || !Array.isArray(shape.value.relations)) {
    return issue("$", "invalid-value", "Reference evidence and relations must be arrays");
  }
  const context: FactsContext = {
    requiredPairs: requiredReferencePairs(resolution),
    referencesByName: new Map(resolution.references.map((reference) => [reference.referenceName, reference])),
    surfacesBySelector: new Map(surfaces.map((surface) => [selectorKey(surface), surface])),
    recordsById: new Map(snapshot.records.map((record) => [record.recordId, record]))
  };
  const evidence = validateEvidence(shape.value.evidence as readonly unknown[], context);
  if (!evidence.ok) return evidence;
  const relations = validateRelations(
    shape.value.relations as readonly unknown[],
    context,
    evidence.value.evidenceByPair
  );
  if (!relations.ok) return relations;
  return accepted(sortedFacts(evidence.value.evidence, relations.value));
}
