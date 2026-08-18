import { materializeSafePlainData } from "../identity.ts";

export interface ValidationIssue {
  readonly path: string;
  readonly code:
    | "duplicate"
    | "identity-mismatch"
    | "invalid-value"
    | "missing-field"
    | "unknown-field";
  readonly message: string;
}

export type ValidationResult<T> = Readonly<
  { ok: true; value: T } | { ok: false; issues: readonly [ValidationIssue, ...ValidationIssue[]] }
>;

const STABLE_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const FIELD_ID_PATTERN = /^[a-z][A-Za-z0-9]*$/;
export const RECORD_ID_PATTERN = /^check-record\/v1\/record\/sha256:[a-f0-9]{64}$/;
export const INVALID_RECORD_EVIDENCE_ID_PATTERN = /^invalid-record\/v1:[0-9]{6}$/;

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

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
  }
  return value;
}

export function accepted<T>(value: T): ValidationResult<T> {
  return Object.freeze({ ok: true, value });
}

export function acceptedDomain<T>(value: T): ValidationResult<T> {
  return Object.freeze({ ok: true, value: deepFreeze(structuredClone(value)) });
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasUnknownField(
  value: Readonly<Record<string, unknown>>,
  allowedFields: readonly string[]
): boolean {
  const allowed = new Set(allowedFields);
  return Object.keys(value).some((key) => !allowed.has(key));
}

function missingField(
  value: Readonly<Record<string, unknown>>,
  requiredFields: readonly string[]
): string | undefined {
  return requiredFields.find((key) => !Object.hasOwn(value, key));
}

export function validateClosedRecord(
  value: unknown,
  path: string,
  fields: readonly string[]
): ValidationResult<Record<string, unknown>> {
  if (!isRecord(value)) {
    return issue(path, "invalid-value", "Expected an object");
  }
  if (hasUnknownField(value, fields)) {
    return issue(path, "unknown-field", "Object contains an unsupported field");
  }
  const absentField = missingField(value, fields);
  if (absentField !== undefined) {
    return issue(`${path}.${absentField}`, "missing-field", `Missing field: ${absentField}`);
  }
  return accepted(value);
}

export function isStableId(value: unknown): value is string {
  return typeof value === "string" && STABLE_ID_PATTERN.test(value);
}

export function isFieldId(value: unknown): value is string {
  return typeof value === "string" && FIELD_ID_PATTERN.test(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1;
}

export function compareCanonicalText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

export function materializeUnknown(value: unknown): ValidationResult<unknown> {
  try {
    return accepted(materializeSafePlainData(value));
  } catch {
    return issue("$", "invalid-value", "Input must be safe plain JSON data");
  }
}
