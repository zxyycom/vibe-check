import { canonicalJsonBytes, createRecordId } from "./identity.ts";
import type {
  CheckDefinition,
  JsonObject,
  QualityRecord,
  QualityRecordCandidate,
  RecordFieldValue,
  RecordTypeDefinition
} from "./model.ts";
import { hasExactPlainRecordKeys, snapshotPlainRecord } from "./plain-record-values.ts";
import { validateQualityRecord } from "./validation.ts";

const CANDIDATE_FIELDS = [
  "recordTypeId",
  "level",
  "semanticSubject",
  "message",
  "fields",
  "location"
] as const;

const REFERENCE_RECORD_FIELDS = ["recordTypeId", "semanticSubject", "fields"] as const;
const LOCATION_FIELDS = ["path", "line", "column"] as const;

export type RecordSubmissionResult = "committed" | "replayed" | "conflicted" | "rejected";

export type RecordDiagnostic = "record-conflict" | "record-invalid";

export interface CoreRecordSlot {
  readonly definition: CheckDefinition;
  readonly diagnostics: Set<RecordDiagnostic>;
  readonly recordIds: Set<string>;
}

export interface RetainedRecordReference {
  readonly recordId: string;
  readonly recordTypeId: string;
}

interface RecordState {
  readonly bodies: Map<string, JsonObject>;
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function candidateRecordType(
  slot: CoreRecordSlot,
  recordTypeId: string
): RecordTypeDefinition | undefined {
  return slot.definition.recordTypes.find((recordType) => recordType.recordTypeId === recordTypeId);
}

function isRecordLevel(value: unknown): value is QualityRecordCandidate["level"] {
  return value === "info" || value === "warning" || value === "error";
}

function isRecordFieldValue(value: unknown): value is RecordFieldValue {
  return typeof value === "boolean" || typeof value === "number" || typeof value === "string";
}

function normalizeCandidateFields(value: unknown): QualityRecordCandidate["fields"] | undefined {
  const fields = snapshotPlainRecord(value);
  if (fields === undefined) return undefined;
  const normalized: Record<string, RecordFieldValue> = {};
  for (const [fieldId, fieldValue] of Object.entries(fields)) {
    if (!isRecordFieldValue(fieldValue)) return undefined;
    normalized[fieldId] = fieldValue;
  }
  return Object.freeze(normalized);
}

function normalizeCandidateLocation(
  value: unknown
): QualityRecordCandidate["location"] | undefined {
  if (value === null) return null;
  const location = snapshotPlainRecord(value);
  if (
    location === undefined ||
    !hasExactPlainRecordKeys(location, LOCATION_FIELDS) ||
    typeof location.path !== "string" ||
    typeof location.line !== "number" ||
    typeof location.column !== "number"
  ) {
    return undefined;
  }
  return Object.freeze({ path: location.path, line: location.line, column: location.column });
}

function normalizeRecordCandidate(
  candidate: Readonly<Record<string, unknown>>
): QualityRecordCandidate | undefined {
  if (
    typeof candidate.recordTypeId !== "string" ||
    !isRecordLevel(candidate.level) ||
    typeof candidate.semanticSubject !== "string" ||
    typeof candidate.message !== "string"
  ) {
    return undefined;
  }
  const fields = normalizeCandidateFields(candidate.fields);
  const location = normalizeCandidateLocation(candidate.location);
  if (fields === undefined || location === undefined) return undefined;
  return Object.freeze({
    recordTypeId: candidate.recordTypeId,
    level: candidate.level,
    semanticSubject: candidate.semanticSubject,
    message: candidate.message,
    fields,
    location
  });
}

function identityFields(
  value: unknown,
  fieldIds: readonly string[]
): QualityRecordCandidate["fields"] | undefined {
  if (!isNonArrayRecord(value)) return undefined;
  const fields: Record<string, RecordFieldValue> = {};
  for (const fieldId of fieldIds) {
    const fieldValue = value[fieldId];
    if (!isRecordFieldValue(fieldValue)) return undefined;
    fields[fieldId] = fieldValue;
  }
  return Object.freeze(fields);
}

function isNonArrayRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function recordBody(record: QualityRecord): JsonObject {
  return {
    recordId: record.recordId,
    checkId: record.checkId,
    recordTypeId: record.recordTypeId,
    level: record.level,
    semanticSubject: record.semanticSubject,
    message: record.message,
    fields: { ...record.fields },
    location: record.location === null ? null : { ...record.location }
  };
}

function bodyKey(body: JsonObject): string {
  return new TextDecoder().decode(canonicalJsonBytes(body));
}

/** Holds validated Check-owned records and detects same-identity conflicts. */
export class CoreRecordStore {
  readonly #records = new Map<string, QualityRecord>();
  readonly #recordStates = new Map<string, RecordState>();

  public report(slot: CoreRecordSlot, rawCandidate: unknown): RecordSubmissionResult {
    const candidateData = snapshotPlainRecord(rawCandidate);
    if (candidateData === undefined || !hasExactPlainRecordKeys(candidateData, CANDIDATE_FIELDS)) {
      return this.#rejectInvalidRecord(slot);
    }
    const candidate = normalizeRecordCandidate(candidateData);
    if (candidate === undefined) return this.#rejectInvalidRecord(slot);
    const recordType = candidateRecordType(slot, candidate.recordTypeId);
    if (recordType === undefined) return this.#rejectInvalidRecord(slot);
    const record = this.#validateRecord(slot, candidate, recordType);
    if (record === undefined) return this.#rejectInvalidRecord(slot);

    const body = recordBody(record);
    const key = bodyKey(body);
    const state = this.#recordStates.get(record.recordId);
    if (state === undefined) {
      this.#recordStates.set(record.recordId, { bodies: new Map([[key, body]]) });
      this.#records.set(record.recordId, record);
      slot.recordIds.add(record.recordId);
      return "committed";
    }
    if (state.bodies.has(key))
      return this.#records.has(record.recordId) ? "replayed" : "conflicted";
    state.bodies.set(key, body);
    this.#records.delete(record.recordId);
    slot.diagnostics.add("record-conflict");
    return "conflicted";
  }

  public recordIdForReference(
    slot: CoreRecordSlot,
    rawCandidate: unknown
  ): RetainedRecordReference | undefined {
    try {
      const candidate = snapshotPlainRecord(rawCandidate);
      if (
        candidate === undefined ||
        !hasExactPlainRecordKeys(candidate, REFERENCE_RECORD_FIELDS) ||
        typeof candidate.recordTypeId !== "string" ||
        typeof candidate.semanticSubject !== "string"
      ) {
        return undefined;
      }
      const recordType = candidateRecordType(slot, candidate.recordTypeId);
      if (recordType === undefined) return undefined;
      const fields = identityFields(candidate.fields, recordType.identityFields);
      if (fields === undefined) return undefined;
      const recordId = createRecordId(
        {
          checkId: slot.definition.checkId,
          fields,
          recordTypeId: candidate.recordTypeId,
          semanticSubject: candidate.semanticSubject
        },
        recordType
      ).recordId;
      return this.#records.has(recordId)
        ? Object.freeze({ recordId, recordTypeId: recordType.recordTypeId })
        : undefined;
    } catch {
      return undefined;
    }
  }

  public recordsInCanonicalOrder(): QualityRecord[] {
    return [...this.#records.values()].sort((left, right) =>
      compareText(left.recordId, right.recordId)
    );
  }

  #validateRecord(
    slot: CoreRecordSlot,
    candidate: QualityRecordCandidate,
    recordType: RecordTypeDefinition
  ): QualityRecord | undefined {
    try {
      const bound = {
        checkId: slot.definition.checkId,
        recordTypeId: candidate.recordTypeId,
        level: candidate.level,
        semanticSubject: candidate.semanticSubject,
        message: candidate.message,
        fields: candidate.fields,
        location: candidate.location
      };
      const recordId = createRecordId(bound, recordType).recordId;
      const validated = validateQualityRecord({ ...bound, recordId }, slot.definition);
      return validated.ok ? validated.value : undefined;
    } catch {
      return undefined;
    }
  }

  #rejectInvalidRecord(slot: CoreRecordSlot): "rejected" {
    slot.diagnostics.add("record-invalid");
    return "rejected";
  }
}
