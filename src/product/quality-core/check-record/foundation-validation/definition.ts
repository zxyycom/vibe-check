import {
  RECORD_FIELD_VALUE_TYPES,
  type CheckDefinition,
  type RecordFieldDefinition,
  type RecordTypeDefinition,
  type RecordTypePolicySurface
} from "../model.ts";
import {
  accepted,
  acceptedDomain,
  compareCanonicalText,
  isFieldId,
  isNonEmptyString,
  isRecord,
  isStableId,
  issue,
  validateClosedRecord,
  type ValidationResult
} from "./common.ts";
import { validateRecordTypePolicySurface } from "./definition-policy.ts";

function isRecordFieldValueType(value: unknown): value is RecordFieldDefinition["valueType"] {
  return RECORD_FIELD_VALUE_TYPES.some((valueType) => valueType === value);
}

function validateFieldDefinition(
  value: unknown,
  path: string
): ValidationResult<RecordFieldDefinition> {
  const closed = validateClosedRecord(value, path, ["fieldId", "valueType", "required"]);
  if (!closed.ok) {
    return closed;
  }
  const field = closed.value;
  if (!isFieldId(field.fieldId)) {
    return issue(
      `${path}.fieldId`,
      "invalid-value",
      "fieldId must use stable lower-camel identity grammar"
    );
  }
  if (!isRecordFieldValueType(field.valueType)) {
    return issue(`${path}.valueType`, "invalid-value", "Unknown record field value type");
  }
  if (typeof field.required !== "boolean") {
    return issue(`${path}.required`, "invalid-value", "required must be boolean");
  }
  return accepted({
    fieldId: field.fieldId,
    valueType: field.valueType,
    required: field.required
  });
}

function validateRecordFields(
  values: readonly unknown[],
  path: string
): ValidationResult<readonly RecordFieldDefinition[]> {
  const fields: RecordFieldDefinition[] = [];
  const fieldIds = new Set<string>();
  let previousFieldId: string | undefined;
  for (let index = 0; index < values.length; index += 1) {
    const validated = validateFieldDefinition(values[index], `${path}.fields[${index}]`);
    if (!validated.ok) {
      return validated;
    }
    if (fieldIds.has(validated.value.fieldId)) {
      return issue(`${path}.fields[${index}].fieldId`, "duplicate", "Duplicate fieldId");
    }
    if (
      previousFieldId !== undefined &&
      compareCanonicalText(previousFieldId, validated.value.fieldId) >= 0
    ) {
      return issue(
        `${path}.fields`,
        "invalid-value",
        "Field definitions must use canonical unique fieldId order"
      );
    }
    previousFieldId = validated.value.fieldId;
    fieldIds.add(validated.value.fieldId);
    fields.push(validated.value);
  }
  return accepted(fields);
}

function validateIdentityFields(
  values: readonly unknown[],
  path: string,
  fields: readonly RecordFieldDefinition[]
): ValidationResult<readonly string[]> {
  const fieldById = new Map(fields.map((field) => [field.fieldId, field]));
  const identityFields: string[] = [];
  const identityFieldIds = new Set<string>();
  let previousFieldId: string | undefined;
  for (let index = 0; index < values.length; index += 1) {
    const fieldId = values[index];
    if (!isFieldId(fieldId)) {
      return issue(
        `${path}.identityFields[${index}]`,
        "invalid-value",
        "Identity field must be a fieldId"
      );
    }
    const field = fieldById.get(fieldId);
    if (field === undefined) {
      return issue(
        `${path}.identityFields[${index}]`,
        "identity-mismatch",
        "Identity field is not declared in fields"
      );
    }
    if (!field.required) {
      return issue(
        `${path}.identityFields[${index}]`,
        "identity-mismatch",
        "Identity fields must be required fields"
      );
    }
    if (identityFieldIds.has(fieldId)) {
      return issue(`${path}.identityFields[${index}]`, "duplicate", "Duplicate identity field");
    }
    if (previousFieldId !== undefined && compareCanonicalText(previousFieldId, fieldId) >= 0) {
      return issue(
        `${path}.identityFields`,
        "invalid-value",
        "Identity fields must use canonical unique fieldId order"
      );
    }
    previousFieldId = fieldId;
    identityFieldIds.add(fieldId);
    identityFields.push(fieldId);
  }
  return accepted(identityFields);
}

function recordTypeFields(value: unknown): readonly string[] {
  return isRecord(value) && Object.hasOwn(value, "policy")
    ? ["recordTypeId", "fields", "identityFields", "policy"]
    : ["recordTypeId", "fields", "identityFields"];
}

function validateOptionalRecordTypePolicy(
  recordType: Readonly<Record<string, unknown>>,
  path: string,
  fields: readonly RecordFieldDefinition[]
): ValidationResult<Readonly<{ policy?: RecordTypePolicySurface }>> {
  if (!Object.hasOwn(recordType, "policy")) {
    return accepted({});
  }
  const policy = validateRecordTypePolicySurface(recordType.policy, `${path}.policy`, fields);
  return policy.ok ? accepted({ policy: policy.value }) : policy;
}

function validateRecordTypeDefinition(
  value: unknown,
  path: string
): ValidationResult<RecordTypeDefinition> {
  const closed = validateClosedRecord(value, path, recordTypeFields(value));
  if (!closed.ok) {
    return closed;
  }
  const recordType = closed.value;
  if (!isStableId(recordType.recordTypeId)) {
    return issue(
      `${path}.recordTypeId`,
      "invalid-value",
      "recordTypeId must use stable kebab-case identity grammar"
    );
  }
  if (!Array.isArray(recordType.fields)) {
    return issue(`${path}.fields`, "invalid-value", "fields must be an array");
  }
  const fields = validateRecordFields(recordType.fields, path);
  if (!fields.ok) {
    return fields;
  }
  if (!Array.isArray(recordType.identityFields)) {
    return issue(`${path}.identityFields`, "invalid-value", "identityFields must be an array");
  }
  const identityFields = validateIdentityFields(recordType.identityFields, path, fields.value);
  if (!identityFields.ok) {
    return identityFields;
  }
  const policy = validateOptionalRecordTypePolicy(recordType, path, fields.value);
  if (!policy.ok) {
    return policy;
  }
  return accepted({
    recordTypeId: recordType.recordTypeId,
    fields: fields.value,
    identityFields: identityFields.value,
    ...policy.value
  });
}

export function validateMaterializedCheckDefinition(
  value: unknown
): ValidationResult<CheckDefinition> {
  const closed = validateClosedRecord(value, "$", ["checkId", "displayName", "recordTypes"]);
  if (!closed.ok) {
    return closed;
  }
  const definition = closed.value;
  if (!isStableId(definition.checkId)) {
    return issue(
      "$.checkId",
      "invalid-value",
      "checkId must use stable kebab-case identity grammar"
    );
  }
  if (!isNonEmptyString(definition.displayName)) {
    return issue("$.displayName", "invalid-value", "displayName must be non-empty");
  }
  if (!Array.isArray(definition.recordTypes)) {
    return issue("$.recordTypes", "invalid-value", "recordTypes must be an array");
  }
  const recordTypes: RecordTypeDefinition[] = [];
  const recordTypeIds = new Set<string>();
  let previousRecordTypeId: string | undefined;
  for (let index = 0; index < definition.recordTypes.length; index += 1) {
    const validated = validateRecordTypeDefinition(
      definition.recordTypes[index],
      `$.recordTypes[${index}]`
    );
    if (!validated.ok) {
      return validated;
    }
    if (recordTypeIds.has(validated.value.recordTypeId)) {
      return issue(
        `$.recordTypes[${index}].recordTypeId`,
        "duplicate",
        "Duplicate recordTypeId within Check"
      );
    }
    if (
      previousRecordTypeId !== undefined &&
      compareCanonicalText(previousRecordTypeId, validated.value.recordTypeId) >= 0
    ) {
      return issue(
        "$.recordTypes",
        "invalid-value",
        "Record type definitions must use canonical unique recordTypeId order"
      );
    }
    previousRecordTypeId = validated.value.recordTypeId;
    recordTypeIds.add(validated.value.recordTypeId);
    recordTypes.push(validated.value);
  }
  return acceptedDomain({
    checkId: definition.checkId,
    displayName: definition.displayName,
    recordTypes
  });
}
