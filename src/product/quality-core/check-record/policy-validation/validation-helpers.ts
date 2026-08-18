import {
  GATE_NOT_EVALUATED_REASONS,
  REFERENCE_EVIDENCE_STATUSES,
  type CheckReferenceEvidence,
  type ReadinessClause,
  type RecordSelector
} from "../policy-model.ts";
import type { ValidationIssue, ValidationResult } from "../validation.ts";

const STABLE_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export function issue(
  path: string,
  code: ValidationIssue["code"],
  message: string
): ValidationResult<never> {
  const issues: readonly [ValidationIssue] = Object.freeze([
    Object.freeze({ path, code, message })
  ]);
  return Object.freeze({ ok: false, issues });
}

export function accepted<T>(value: T): ValidationResult<T> {
  return Object.freeze({ ok: true, value: deepFreeze(value) });
}

export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function closed(
  value: unknown,
  path: string,
  fields: readonly string[]
): ValidationResult<Record<string, unknown>> {
  if (!isRecord(value)) return issue(path, "invalid-value", "Expected an object");
  const allowed = new Set(fields);
  const unknownField = Object.keys(value)
    .sort()
    .find((field) => !allowed.has(field));
  if (unknownField !== undefined)
    return issue(path, "unknown-field", `Unknown field: ${unknownField}`);
  const missingField = fields.find((field) => !Object.hasOwn(value, field));
  if (missingField !== undefined) {
    return issue(`${path}.${missingField}`, "missing-field", `Missing field: ${missingField}`);
  }
  return Object.freeze({ ok: true, value });
}

export function isStableId(value: unknown): value is string {
  return typeof value === "string" && STABLE_ID_PATTERN.test(value);
}

export function isReferenceEvidenceStatus(
  value: unknown
): value is CheckReferenceEvidence["status"] {
  return REFERENCE_EVIDENCE_STATUSES.some((status) => status === value);
}

export function isGateNotEvaluatedReason(value: unknown): value is ReadinessClause["reason"] {
  return GATE_NOT_EVALUATED_REASONS.some((reason) => reason === value);
}

export function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function selectorKey(selector: RecordSelector): string {
  return `${selector.checkId}\u0000${selector.recordTypeId}`;
}

export function checkReferenceKey(checkId: string, referenceName: string): string {
  return `${checkId}\u0000${referenceName}`;
}

export function referenceEvidenceKey(
  evidence: Pick<CheckReferenceEvidence, "checkId" | "referenceName">
): string {
  return checkReferenceKey(evidence.checkId, evidence.referenceName);
}
