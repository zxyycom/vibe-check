import type { CoreSnapshot } from "../model.ts";
import type { ReferenceFacts } from "../policy-model.ts";
import { compareText, type ReferenceStatus, type RelationId } from "./builtin-support.ts";

export function buildFileReferenceFacts(
  snapshot: CoreSnapshot,
  referenceName: string | null,
  referenceStatus: ReferenceStatus | null,
  relationsBySubject: ReadonlyMap<string, readonly RelationId[]>
): ReferenceFacts {
  if (referenceName === null || referenceStatus === null) {
    return Object.freeze({ evidence: Object.freeze([]), relations: Object.freeze([]) });
  }
  const relations = snapshot.records
    .filter((record) => (
      record.checkId === "file-metrics" && record.recordTypeId === "file-code-lines"
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
      checkId: "file-metrics",
      referenceName,
      status: referenceStatus
    })]),
    relations: Object.freeze(relations)
  });
}
