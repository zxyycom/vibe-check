import { createHash } from "node:crypto";

import type {
  CheckShape,
  EvidenceRefShape,
  JsonRecord,
  RecordShape,
  RecordTypeShape,
  RunShape
} from "./machine-artifact-types.ts";

export function catalogFingerprint(checks: readonly CheckShape[]): string {
  const canonical = checks.map((check) => ({
    checkId: check.checkId,
    displayName: check.displayName,
    recordTypes: check.recordTypes.map((recordType) => ({
      fields: recordType.fields.map((field) => ({ ...field }))
        .sort((left, right) => compareText(left.fieldId, right.fieldId)),
      identityFields: [...recordType.identityFields].sort(),
      policy: {
        operands: [...(recordType.policy?.operands ?? [])]
          .sort((left, right) => compareText(left.operandId, right.operandId)),
        relations: [...(recordType.policy?.relations ?? [])].sort()
      },
      recordTypeId: recordType.recordTypeId
    })).sort((left, right) => compareText(left.recordTypeId, right.recordTypeId))
  })).sort((left, right) => compareText(left.checkId, right.checkId));
  return `check-record/v1/catalog/sha256:${digest(canonical)}`;
}

export function recordsFingerprint(records: readonly RecordShape[]): string {
  return `check-record/v1/records/sha256:${digest(records)}`;
}

export function recordIdentity(record: RecordShape, recordType: RecordTypeShape): string {
  const identityFields = Object.fromEntries(recordType.identityFields.map((fieldId) => [
    fieldId,
    record.fields[fieldId]
  ]));
  return `check-record/v1/record/sha256:${digest({
    checkId: record.checkId,
    identityFields,
    recordTypeId: record.recordTypeId,
    semanticSubject: record.semanticSubject
      .replaceAll("\r\n", "\n")
      .replaceAll("\r", "\n")
      .normalize("NFC")
  })}`;
}

export function evidenceKey(reference: EvidenceRefShape): string {
  switch (reference.kind) {
    case "check":
      return `0\u0000${reference.checkId}`;
    case "record":
      return `1\u0000${reference.recordId}`;
    case "reference":
      return `2\u0000${reference.checkId}\u0000${reference.referenceName}\u0000${reference.referenceId}`;
    case "view":
      return `3\u0000${reference.viewId}`;
    case "readiness":
      return `4\u0000${reference.readinessId}`;
  }
  return unreachableEvidenceRef(reference);
}

export function referenceEvidenceKey(
  value: { checkId: string; referenceName: string }
): string {
  return `${value.checkId}\u0000${value.referenceName}`;
}

export function relationKey(value: { recordId: string; referenceName: string }): string {
  return `${value.recordId}\u0000${value.referenceName}`;
}

export function readinessEvidencePrefix(
  readiness: RunShape["decision"]["readiness"]
): readonly EvidenceRefShape[] {
  return canonicalEvidence(readiness.flatMap(({ evidenceRefs }) => evidenceRefs));
}

export function canonicalEvidence(
  references: readonly EvidenceRefShape[]
): readonly EvidenceRefShape[] {
  return [...new Map(references.map((reference) => [evidenceKey(reference), reference]))]
    .sort(([left], [right]) => compareText(left, right))
    .map(([, reference]) => reference);
}

export function sameEvidence(
  left: readonly EvidenceRefShape[],
  right: readonly EvidenceRefShape[]
): boolean {
  return sameText(left.map(evidenceKey), canonicalEvidence(right).map(evidenceKey));
}

export function sameText(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function isCanonicalText(values: readonly string[]): boolean {
  return isCanonical(values, (value) => value);
}

export function isCanonical<Value>(
  values: readonly Value[],
  key: (value: Value) => string
): boolean {
  let previousKey: string | undefined;
  for (const value of values) {
    const currentKey = key(value);
    if (previousKey !== undefined && previousKey >= currentKey) {
      return false;
    }
    previousKey = currentKey;
  }
  return true;
}

function digest(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const object = value as JsonRecord;
  return `{${Object.keys(object).sort().map((key) => (
    `${JSON.stringify(key)}:${canonicalJson(object[key])}`
  )).join(",")}}`;
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function unreachableEvidenceRef(reference: never): never {
  throw new TypeError(`Unknown machine evidence reference: ${JSON.stringify(reference)}`);
}
