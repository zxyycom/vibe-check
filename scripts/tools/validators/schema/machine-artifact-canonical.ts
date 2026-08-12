import { createHash } from "node:crypto";

import type {
  DefinitionShape,
  EvidenceRefShape,
  JsonRecord,
  RecordShape,
  RecordTypeShape,
  RunShape
} from "./machine-artifact-types.ts";

export function catalogFingerprint(definitions: readonly DefinitionShape[]): string {
  const canonical = definitions.map((definition) => ({
    checkId: definition.checkId,
    displayName: definition.displayName,
    recordTypes: definition.recordTypes.map((recordType) => ({
      fields: recordType.fields.map((field) => ({ ...field }))
        .sort((left, right) => compareText(left.fieldId, right.fieldId)),
      identityFields: [...recordType.identityFields].sort(),
      policy: {
        operands: [...(recordType.policy?.operands ?? [])]
          .sort((left, right) => compareText(String(left.operandId), String(right.operandId))),
        relations: [...(recordType.policy?.relations ?? [])].sort()
      },
      recordTypeId: recordType.recordTypeId
    })).sort((left, right) => compareText(left.recordTypeId, right.recordTypeId))
  })).sort((left, right) => compareText(left.checkId, right.checkId));
  return `check-record/v1/catalog/sha256:${digest(canonical)}`;
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
  if (reference.kind === "run") return `0\u0000${String(reference.checkRunId)}`;
  if (reference.kind === "record") return `1\u0000${String(reference.recordId)}`;
  if (reference.kind === "reference") {
    return `2\u0000${String(reference.checkId)}\u0000${String(reference.referenceName)}\u0000${String(reference.referenceId)}`;
  }
  if (reference.kind === "view") return `3\u0000${String(reference.viewId)}`;
  return `4\u0000${String(reference.readinessId)}`;
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
  return values.every((value, index) => index === 0 || key(values[index - 1]!) < key(value));
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
