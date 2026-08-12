import { createHash } from "node:crypto";

import type {
  CheckDefinition,
  JsonObject,
  JsonValue,
  ManagerBoundQualityRecordCandidate,
  RecordConflictEvidence,
  RecordTypeDefinition
} from "./model.ts";

const RECORD_ID_PREFIX = "check-record/v1/record/sha256:";
const CATALOG_FINGERPRINT_PREFIX = "check-record/v1/catalog/sha256:";
const BODY_FINGERPRINT_PREFIX = "check-record/v1/body/sha256:";
const CHECK_RUN_ID_PREFIX = "check-run/v1:";
const SHA_256_HEX_PATTERN = /^[a-f0-9]{64}$/;
const UNSAFE_MATERIALIZATION_MESSAGE = "Canonical JSON could not safely materialize the input";

class CanonicalJsonValidationError extends TypeError {}

function materializePlainData(
  value: unknown,
  ancestors: Set<object>,
  preserveInvalidLeaf: boolean
): unknown {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new CanonicalJsonValidationError("Canonical JSON accepts only finite numbers");
    }
    return value;
  }
  if (typeof value !== "object") {
    if (preserveInvalidLeaf) {
      return value;
    }
    throw new CanonicalJsonValidationError("Canonical JSON accepts only JSON-safe values");
  }
  if (ancestors.has(value)) {
    throw new CanonicalJsonValidationError("Canonical JSON does not accept cyclic values");
  }
  try {
    const prototype = Object.getPrototypeOf(value) as object | null;
    if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) {
      throw new CanonicalJsonValidationError("Canonical JSON accepts only plain objects");
    }
    ancestors.add(value);
    const descriptors = Object.getOwnPropertyDescriptors(value) as Readonly<
      Record<string, PropertyDescriptor>
    >;
    for (const descriptor of Object.values(descriptors)) {
      if (descriptor.get !== undefined || descriptor.set !== undefined) {
        throw new CanonicalJsonValidationError("Canonical JSON does not accept accessors");
      }
    }
    if (Array.isArray(value)) {
      const lengthDescriptor = descriptors.length;
      const length = lengthDescriptor?.value as unknown;
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
      const extraEnumerableField = Object.entries(descriptors).find(([key, descriptor]) => (
        descriptor.enumerable === true && !/^(?:0|[1-9][0-9]*)$/.test(key)
      ));
      if (extraEnumerableField !== undefined) {
        throw new CanonicalJsonValidationError("Canonical JSON arrays do not accept named fields");
      }
      ancestors.delete(value);
      return entries;
    }
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
    ancestors.delete(value);
    return snapshot;
  } catch (error: unknown) {
    ancestors.delete(value);
    if (error instanceof CanonicalJsonValidationError) {
      throw error;
    }
    // eslint-disable-next-line preserve-caught-error -- Untrusted reflection errors must not cross this boundary.
    throw new TypeError(UNSAFE_MATERIALIZATION_MESSAGE);
  }
}

export function materializeCanonicalJsonValue(value: unknown): JsonValue {
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

export function canonicalJsonBytes(value: JsonValue): Uint8Array {
  const snapshot = materializeCanonicalJsonValue(value);
  return new TextEncoder().encode(canonicalJsonText(snapshot));
}

function digest(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function compareCanonicalText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function normalizeSemanticSubject(subject: string): string {
  return subject.replaceAll("\r\n", "\n").replaceAll("\r", "\n").normalize("NFC");
}

export interface RecordIdentityResult {
  readonly bytes: Uint8Array;
  readonly recordId: string;
}

export function createRecordId(
  candidate: ManagerBoundQualityRecordCandidate,
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

function createRecordBodyFingerprint(body: JsonObject): string {
  return `${BODY_FINGERPRINT_PREFIX}${digest(canonicalJsonBytes(body))}`;
}

export function createRecordConflictEvidence(input: Readonly<{
  checkId: string;
  checkRunId: string;
  recordTypeId: string;
  recordId: string;
  bodies: readonly JsonObject[];
}>): RecordConflictEvidence {
  const bodyFingerprints = [...new Set(input.bodies.map(createRecordBodyFingerprint))].sort();
  if (bodyFingerprints.length < 2) {
    throw new TypeError("Record conflict evidence requires at least two distinct bodies");
  }
  return Object.freeze({
    kind: "record-conflict",
    checkId: input.checkId,
    checkRunId: input.checkRunId,
    recordTypeId: input.recordTypeId,
    recordId: input.recordId,
    bodyFingerprints: Object.freeze(bodyFingerprints)
  });
}

export function createDeterministicCheckRunId(input: Readonly<{
  invocationKey: string;
  checkId: string;
}>): string {
  const bytes = canonicalJsonBytes({ checkId: input.checkId, invocationKey: input.invocationKey });
  return `${CHECK_RUN_ID_PREFIX}${digest(bytes)}`;
}

export function isCheckRunId(value: unknown): value is string {
  return typeof value === "string"
    && value.startsWith(CHECK_RUN_ID_PREFIX)
    && SHA_256_HEX_PATTERN.test(value.slice(CHECK_RUN_ID_PREFIX.length));
}
