import type { CheckProjectContext } from "../definition/custom-check.ts";
import type { RecordTypeDefinition } from "../definition/check-definition.ts";
import type { NormalizedCheck } from "../definition/project.ts";
import type { TrustedCheckScope } from "../quality-core/check-record/core-session.ts";
import {
  snapshotClosedArray,
  snapshotClosedRecord
} from "../quality-core/check-record/plain-record-values.ts";

/** Canonical policy evidence submitted by one direct Check callback. */
export interface CheckReferenceSubmission {
  readonly checkId: string;
  readonly referenceName: string;
  readonly relations: readonly Readonly<{
    readonly recordId: string;
    readonly referenceName: string;
    readonly relationId: string;
  }>[];
  readonly status: "complete" | "incomplete" | "unavailable";
}

type CheckReferenceValidation = Readonly<
  | { readonly kind: "absent" }
  | { readonly kind: "invalid" }
  | { readonly kind: "submitted"; readonly submission: CheckReferenceSubmission }
>;

const NO_REFERENCE_SUBMISSION = Object.freeze({ kind: "absent" } as const);
const INVALID_REFERENCE_SUBMISSION = Object.freeze({ kind: "invalid" } as const);

/**
 * Converts one callback's raw reporter input into canonical policy evidence.
 * No candidate is a valid absence; malformed or contradictory input is invalid.
 */
export function validateCheckReferenceSubmission(
  input: Readonly<{
    readonly candidates: readonly unknown[];
    readonly check: NormalizedCheck;
    readonly project: CheckProjectContext;
    readonly scope: TrustedCheckScope;
  }>
): CheckReferenceValidation {
  if (input.candidates.length === 0) return NO_REFERENCE_SUBMISSION;
  if (input.candidates.length !== 1 || input.project.comparison === null) {
    return INVALID_REFERENCE_SUBMISSION;
  }
  const candidate = snapshotClosedRecord(input.candidates[0]);
  if (
    candidate === undefined ||
    !hasExactReferenceKeys(candidate, ["referenceName", "status", "relations"]) ||
    candidate.referenceName !== input.project.comparison.referenceName ||
    (candidate.status !== "complete" &&
      candidate.status !== "incomplete" &&
      candidate.status !== "unavailable")
  ) {
    return INVALID_REFERENCE_SUBMISSION;
  }
  const relations = snapshotClosedArray(candidate.relations);
  if (relations === undefined || (candidate.status !== "complete" && relations.length > 0)) {
    return INVALID_REFERENCE_SUBMISSION;
  }
  const resolvedRelations = resolveReferenceRelations(
    input.check,
    input.scope,
    candidate.referenceName,
    relations
  );
  if (resolvedRelations === undefined) return INVALID_REFERENCE_SUBMISSION;
  return Object.freeze({
    kind: "submitted",
    submission: Object.freeze({
      checkId: input.check.definition.checkId,
      referenceName: candidate.referenceName,
      relations: resolvedRelations,
      status: candidate.status
    })
  });
}

export function canonicalizeReferenceSubmissions(
  submissions: readonly CheckReferenceSubmission[]
): readonly CheckReferenceSubmission[] {
  return Object.freeze(
    [...submissions]
      .sort(
        (left, right) =>
          compareText(left.checkId, right.checkId) ||
          compareText(left.referenceName, right.referenceName)
      )
      .map((submission) =>
        Object.freeze({
          ...submission,
          relations: Object.freeze(
            submission.relations.map((relation) => Object.freeze({ ...relation }))
          )
        })
      )
  );
}

function resolveReferenceRelations(
  check: NormalizedCheck,
  scope: TrustedCheckScope,
  referenceName: string,
  relations: readonly unknown[]
): CheckReferenceSubmission["relations"] | undefined {
  const resolved: CheckReferenceSubmission["relations"][number][] = [];
  const keys = new Set<string>();
  for (const value of relations) {
    const relation = snapshotClosedRecord(value);
    if (
      relation === undefined ||
      !hasExactReferenceKeys(relation, ["record", "relationId"]) ||
      typeof relation.relationId !== "string" ||
      relation.relationId.length === 0
    ) {
      return undefined;
    }
    const record = scope.recordIdForReference(relation.record);
    if (record === undefined) return undefined;
    const recordType = check.definition.recordTypes.find(
      (candidate: RecordTypeDefinition) => candidate.recordTypeId === record.recordTypeId
    );
    if (recordType?.policy?.relations.includes(relation.relationId) !== true) return undefined;
    const key = `${record.recordId}\u0000${relation.relationId}`;
    if (keys.has(key)) continue;
    keys.add(key);
    resolved.push(
      Object.freeze({
        recordId: record.recordId,
        referenceName,
        relationId: relation.relationId
      })
    );
  }
  return Object.freeze(
    resolved.sort(
      (left, right) =>
        compareText(left.recordId, right.recordId) || compareText(left.relationId, right.relationId)
    )
  );
}

function hasExactReferenceKeys(
  value: Readonly<Record<string, unknown>>,
  keys: readonly string[]
): boolean {
  return (
    Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
  );
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
