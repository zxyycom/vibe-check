import type { FinalCoreSnapshot } from "../model.ts";
import type { ReferenceFacts } from "../policy-model.ts";
import { compareText, type ReferenceStatus, type RelationId } from "./builtin-support.ts";

export function buildDuplicateReferenceFacts(
  snapshot: FinalCoreSnapshot,
  referenceName: string | null,
  referenceStatus: ReferenceStatus | null,
  relationsBySubject: ReadonlyMap<string, readonly RelationId[]>
): ReferenceFacts {
  if (referenceName === null || referenceStatus === null) {
    return Object.freeze({ evidence: Object.freeze([]), relations: Object.freeze([]) });
  }
  const relations = snapshot.records
    .filter((record) => (
      record.checkId === "duplicate-detection" && record.recordTypeId === "duplicate-code"
    ))
    .flatMap((record) => (
      (relationsBySubject.get(record.semanticSubject) ?? []).map((relationId) => Object.freeze({
        recordId: record.recordId,
        referenceName,
        relationId
      }))
    ))
    .sort((left, right) => compareText(
      `${left.recordId}\u0000${left.relationId}`,
      `${right.recordId}\u0000${right.relationId}`
    ));
  return Object.freeze({
    evidence: Object.freeze([Object.freeze({
      checkId: "duplicate-detection",
      referenceName,
      status: referenceStatus
    })]),
    relations: Object.freeze(relations)
  });
}
