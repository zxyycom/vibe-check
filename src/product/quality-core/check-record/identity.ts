import { createHash } from "node:crypto";

import type {
  CheckDefinition,
  JsonObject,
  JsonValue,
  QualityRecord,
  RecordTypeDefinition
} from "./model.ts";

const RECORD_ID_PREFIX = "check-record/v1/record/sha256:";
const CATALOG_FINGERPRINT_PREFIX = "check-record/v1/catalog/sha256:";
const UNSAFE_MATERIALIZATION_MESSAGE = "Canonical JSON could not safely materialize the input";

class CanonicalJsonValidationError extends TypeError {}

type PrimitiveMaterialization = Readonly<
  | { kind: "non-primitive" }
  | { kind: "value"; value: boolean | number | string | null }
>;

function materializePlainData(
  value: unknown,
  ancestors: Set<object>,
  preserveInvalidLeaf: boolean
): unknown {
  const primitive = materializePrimitive(value);
  if (primitive.kind === "value") return primitive.value;
  if (typeof value !== "object") {
    if (preserveInvalidLeaf) {
      return value;
    }
    throw new CanonicalJsonValidationError("Canonical JSON accepts only JSON-safe values");
  }
  // `materializePrimitive` has already returned for null, but that fact is not
  // represented as a TypeScript narrowing across the helper boundary.
  const objectValue = value as object;
  if (ancestors.has(objectValue)) {
    throw new CanonicalJsonValidationError("Canonical JSON does not accept cyclic values");
  }
  try {
    rejectUnsupportedPrototype(objectValue);
    const descriptors = Object.getOwnPropertyDescriptors(objectValue) as Readonly<
      Record<string, PropertyDescriptor>
    >;
    rejectAccessors(descriptors);
    ancestors.add(objectValue);
    return Array.isArray(objectValue)
      ? materializeArray(descriptors, ancestors, preserveInvalidLeaf)
      : materializeObject(descriptors, ancestors, preserveInvalidLeaf);
  } catch (error: unknown) {
    if (error instanceof CanonicalJsonValidationError) {
      throw error;
    }
    // eslint-disable-next-line preserve-caught-error -- Untrusted reflection errors must not cross this boundary.
    throw new TypeError(UNSAFE_MATERIALIZATION_MESSAGE);
  } finally {
    ancestors.delete(objectValue);
  }
}

function rejectUnsupportedPrototype(value: object): void {
  const prototype = Object.getPrototypeOf(value) as object | null;
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) {
    throw new CanonicalJsonValidationError("Canonical JSON accepts only plain objects");
  }
}

function materializePrimitive(value: unknown): PrimitiveMaterialization {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return { kind: "value", value };
  }
  if (typeof value !== "number") return { kind: "non-primitive" };
  if (!Number.isFinite(value)) {
    throw new CanonicalJsonValidationError("Canonical JSON accepts only finite numbers");
  }
  return { kind: "value", value };
}

function rejectAccessors(
  descriptors: Readonly<Record<string, PropertyDescriptor>>
): void {
  const hasAccessor = Object.values(descriptors).some((descriptor) => (
    descriptor.get !== undefined || descriptor.set !== undefined
  ));
  if (hasAccessor) {
    throw new CanonicalJsonValidationError("Canonical JSON does not accept accessors");
  }
}

function materializeArray(
  descriptors: Readonly<Record<string, PropertyDescriptor>>,
  ancestors: Set<object>,
  preserveInvalidLeaf: boolean
): JsonValue[] {
  const length = descriptors.length?.value as unknown;
  if (typeof length !== "number" || !Number.isSafeInteger(length) || length < 0) {
    throw new CanonicalJsonValidationError("Canonical JSON array length is invalid");
  }
  const entries: JsonValue[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (descriptor === undefined) {
      throw new CanonicalJsonValidationError("Canonical JSON does not accept sparse arrays");
    }
    entries.push(materializePlainData(
      descriptor.value as unknown,
      ancestors,
      preserveInvalidLeaf
    ) as JsonValue);
  }
  const hasNamedField = Object.entries(descriptors).some(([key, descriptor]) => (
    descriptor.enumerable === true && !/^(?:0|[1-9][0-9]*)$/.test(key)
  ));
  if (hasNamedField) {
    throw new CanonicalJsonValidationError("Canonical JSON arrays do not accept named fields");
  }
  return entries;
}

function materializeObject(
  descriptors: Readonly<Record<string, PropertyDescriptor>>,
  ancestors: Set<object>,
  preserveInvalidLeaf: boolean
): JsonObject {
  const snapshot: Record<string, JsonValue> = {};
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (descriptor.enumerable === true) {
      snapshot[key] = materializePlainData(
        descriptor.value as unknown,
        ancestors,
        preserveInvalidLeaf
      ) as JsonValue;
    }
  }
  return snapshot;
}

function materializeCanonicalJsonValue(value: unknown): JsonValue {
  return materializePlainData(value, new Set(), false) as JsonValue;
}

export function materializeSafePlainData(value: unknown): unknown {
  return materializePlainData(value, new Set(), true);
}

function canonicalJsonText(value: JsonValue): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    const entries = value as readonly JsonValue[];
    return `[${entries.map((entry) => canonicalJsonText(entry)).join(",")}]`;
  }
  const object = value as JsonObject;
  const entries = Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJsonText(object[key]!)}`);
  return `{${entries.join(",")}}`;
}

export function canonicalJsonBytes(value: unknown): Uint8Array {
  const snapshot = materializeCanonicalJsonValue(value);
  return new TextEncoder().encode(canonicalJsonText(snapshot));
}

function digest(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function compareCanonicalText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

export function normalizeSemanticSubject(subject: string): string {
  return subject.replaceAll("\r\n", "\n").replaceAll("\r", "\n").normalize("NFC");
}

export interface RecordIdentityResult {
  readonly bytes: Uint8Array;
  readonly recordId: string;
}

export function createRecordId<
  Candidate extends Pick<QualityRecord, "checkId" | "recordTypeId" | "semanticSubject" | "fields">
>(
  candidate: Candidate,
  recordType: RecordTypeDefinition
): RecordIdentityResult {
  if (candidate.recordTypeId !== recordType.recordTypeId) {
    throw new TypeError("Record candidate and descriptor recordTypeId differ");
  }
  const identityFields: Record<string, JsonValue> = {};
  for (const fieldId of recordType.identityFields) {
    const fieldValue = candidate.fields[fieldId];
    if (fieldValue === undefined) {
      throw new TypeError(`Missing identity field: ${fieldId}`);
    }
    identityFields[fieldId] = fieldValue;
  }
  const bytes = canonicalJsonBytes({
    checkId: candidate.checkId,
    identityFields,
    recordTypeId: candidate.recordTypeId,
    semanticSubject: normalizeSemanticSubject(candidate.semanticSubject)
  });
  return Object.freeze({ bytes, recordId: `${RECORD_ID_PREFIX}${digest(bytes)}` });
}

function canonicalCatalog(definitions: readonly CheckDefinition[]): JsonValue {
  return definitions
    .map((definition) => ({
      checkId: definition.checkId,
      displayName: definition.displayName,
      recordTypes: definition.recordTypes
        .map((recordType) => ({
          fields: recordType.fields
            .map((field) => ({
              fieldId: field.fieldId,
              required: field.required,
              valueType: field.valueType
            }))
            .sort((left, right) => compareCanonicalText(left.fieldId, right.fieldId)),
          identityFields: [...recordType.identityFields].sort(),
          policy: {
            operands: (recordType.policy?.operands ?? [])
              .map((operand) => ({
                operandId: operand.operandId,
                source: operand.source,
                valueType: operand.valueType
              }))
              .sort((left, right) => compareCanonicalText(left.operandId, right.operandId)),
            relations: [...(recordType.policy?.relations ?? [])].sort()
          },
          recordTypeId: recordType.recordTypeId
        }))
        .sort((left, right) => compareCanonicalText(left.recordTypeId, right.recordTypeId))
    }))
    .sort((left, right) => compareCanonicalText(left.checkId, right.checkId));
}

export interface CatalogFingerprintResult {
  readonly bytes: Uint8Array;
  readonly catalogFingerprint: string;
}

export function createCatalogFingerprint(
  definitions: readonly CheckDefinition[]
): CatalogFingerprintResult {
  const bytes = canonicalJsonBytes(canonicalCatalog(definitions));
  return Object.freeze({
    bytes,
    catalogFingerprint: `${CATALOG_FINGERPRINT_PREFIX}${digest(bytes)}`
  });
}
