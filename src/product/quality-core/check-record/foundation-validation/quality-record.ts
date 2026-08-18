import {
  RECORD_LEVELS,
  type CheckDefinition,
  type QualityRecord,
  type RecordFieldDefinition,
  type RecordLocation,
  type RecordTypeDefinition
} from "../model.ts";
import { createRecordId, normalizeSemanticSubject } from "../identity.ts";
import {
  accepted,
  acceptedDomain,
  isNonEmptyString,
  isPositiveSafeInteger,
  isRecord,
  issue,
  RECORD_ID_PATTERN,
  validateClosedRecord,
  type ValidationResult
} from "./common.ts";

const QUALITY_RECORD_FIELDS = [
  "recordId",
  "checkId",
  "recordTypeId",
  "level",
  "semanticSubject",
  "message",
  "fields",
  "location"
];

interface ValidatedRecordBinding {
  readonly recordId: string;
  readonly recordType: RecordTypeDefinition;
}

interface ValidatedRecordContent {
  readonly level: QualityRecord["level"];
  readonly semanticSubject: string;
  readonly message: string;
  readonly fields: Readonly<Record<string, unknown>>;
}

function isRecordLevel(value: unknown): value is QualityRecord["level"] {
  return RECORD_LEVELS.some((level) => level === value);
}

function isExpectedFieldValue(
  value: unknown,
  valueType: RecordFieldDefinition["valueType"]
): value is boolean | number | string {
  switch (valueType) {
    case "string":
      return typeof value === "string";
    case "boolean":
      return typeof value === "boolean";
    case "integer":
      return typeof value === "number" && Number.isSafeInteger(value);
    case "number":
      return typeof value === "number" && Number.isFinite(value);
  }
}

function validateFieldValue(
  value: unknown,
  definition: RecordFieldDefinition,
  path: string
): ValidationResult<boolean | number | string> {
  return isExpectedFieldValue(value, definition.valueType)
    ? accepted(value)
    : issue(path, "invalid-value", `Expected ${definition.valueType}`);
}

function validateLocation(value: unknown): ValidationResult<RecordLocation | null> {
  if (value === null) {
    return accepted(null);
  }
  const closed = validateClosedRecord(value, "$.location", ["path", "line", "column"]);
  if (!closed.ok) {
    return closed;
  }
  const location = closed.value;
  if (
    !isNonEmptyString(location.path) ||
    !isPositiveSafeInteger(location.line) ||
    !isPositiveSafeInteger(location.column)
  ) {
    return issue(
      "$.location",
      "invalid-value",
      "Location requires path and positive line/column integers"
    );
  }
  return accepted({
    path: location.path,
    line: location.line,
    column: location.column
  });
}

function validateRecordBinding(
  record: Readonly<Record<string, unknown>>,
  definition: CheckDefinition
): ValidationResult<ValidatedRecordBinding> {
  if (record.checkId !== definition.checkId) {
    return issue(
      "$.checkId",
      "identity-mismatch",
      "Record provenance does not match its Check definition"
    );
  }
  if (typeof record.recordId !== "string" || !RECORD_ID_PATTERN.test(record.recordId)) {
    return issue("$.recordId", "invalid-value", "Invalid recordId");
  }
  const recordType = definition.recordTypes.find(
    (candidate) => candidate.recordTypeId === record.recordTypeId
  );
  if (recordType === undefined) {
    return issue("$.recordTypeId", "identity-mismatch", "Unknown recordTypeId for Check");
  }
  return accepted({
    recordId: record.recordId,
    recordType
  });
}

function validateRecordContent(
  record: Readonly<Record<string, unknown>>
): ValidationResult<ValidatedRecordContent> {
  if (
    !isRecordLevel(record.level) ||
    !isNonEmptyString(record.semanticSubject) ||
    !isNonEmptyString(record.message) ||
    !isRecord(record.fields)
  ) {
    return issue(
      "$",
      "invalid-value",
      "Record level, semantic subject, message, or fields are invalid"
    );
  }
  return accepted({
    level: record.level,
    semanticSubject: record.semanticSubject,
    message: record.message,
    fields: record.fields
  });
}

function validateRecordFields(
  values: Readonly<Record<string, unknown>>,
  definitions: readonly RecordFieldDefinition[]
): ValidationResult<Readonly<Record<string, boolean | number | string>>> {
  const fieldById = new Map(definitions.map((field) => [field.fieldId, field]));
  if (Object.keys(values).some((fieldId) => !fieldById.has(fieldId))) {
    return issue("$.fields", "unknown-field", "Record fields contain an unsupported field");
  }
  const validatedFields: Record<string, boolean | number | string> = {};
  for (const definition of definitions) {
    const value = values[definition.fieldId];
    if (value === undefined) {
      if (definition.required) {
        return issue(
          `$.fields.${definition.fieldId}`,
          "missing-field",
          `Missing field: ${definition.fieldId}`
        );
      }
      continue;
    }
    const validated = validateFieldValue(value, definition, `$.fields.${definition.fieldId}`);
    if (!validated.ok) {
      return validated;
    }
    validatedFields[definition.fieldId] = validated.value;
  }
  return accepted(validatedFields);
}

export function validateMaterializedQualityRecord(
  value: unknown,
  definition: CheckDefinition
): ValidationResult<QualityRecord> {
  const closed = validateClosedRecord(value, "$", QUALITY_RECORD_FIELDS);
  if (!closed.ok) {
    return closed;
  }
  const binding = validateRecordBinding(closed.value, definition);
  if (!binding.ok) {
    return binding;
  }
  const content = validateRecordContent(closed.value);
  if (!content.ok) {
    return content;
  }
  const validatedFields = validateRecordFields(
    content.value.fields,
    binding.value.recordType.fields
  );
  if (!validatedFields.ok) {
    return validatedFields;
  }
  const location = validateLocation(closed.value.location);
  if (!location.ok) {
    return location;
  }
  const normalizedRecord: QualityRecord = {
    recordId: binding.value.recordId,
    checkId: definition.checkId,
    recordTypeId: binding.value.recordType.recordTypeId,
    level: content.value.level,
    semanticSubject: normalizeSemanticSubject(content.value.semanticSubject),
    message: content.value.message,
    fields: validatedFields.value,
    location: location.value
  };
  const expectedRecordId = createRecordId(normalizedRecord, binding.value.recordType).recordId;
  if (normalizedRecord.recordId !== expectedRecordId) {
    return issue(
      "$.recordId",
      "identity-mismatch",
      "recordId does not match canonical identity fields"
    );
  }
  return acceptedDomain(normalizedRecord);
}
