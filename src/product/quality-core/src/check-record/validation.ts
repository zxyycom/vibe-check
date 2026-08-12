import {
  CHECK_RESULT_VERDICTS,
  RECORD_FIELD_VALUE_TYPES,
  RECORD_LEVELS,
  RUN_FAILURE_CATEGORIES,
  type CheckDefinition,
  type CheckRun,
  type FinalCoreSnapshot,
  type InvalidRecordEvidence,
  type PolicyOperandDefinition,
  type PolicyOperandSource,
  type QualityRecord,
  type RecordFields,
  type RecordConflictEvidence,
  type RecordFieldDefinition,
  type RecordLocation,
  type RecordTypePolicySurface,
  type RecordTypeDefinition,
  type RunCoverage,
  type RunDiagnostic,
  type SnapshotCompleteness,
  type SnapshotIntegrity
} from "./model.ts";
import {
  createCatalogFingerprint,
  createRecordId,
  isCheckRunId,
  materializeSafePlainData,
  normalizeSemanticSubject
} from "./identity.ts";

export interface ValidationIssue {
  readonly path: string;
  readonly code: "duplicate" | "identity-mismatch" | "invalid-value" | "missing-field" | "unknown-field";
  readonly message: string;
}

export type ValidationResult<T> = Readonly<
  | { ok: true; value: T }
  | { ok: false; issues: readonly ValidationIssue[] }
>;

const STABLE_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const FIELD_ID_PATTERN = /^[a-z][A-Za-z0-9]*$/;
const POLICY_OPERAND_ID_PATTERN = /^[a-z][A-Za-z0-9]*(?:-[a-z0-9]+)*$/;
const RECORD_ID_PATTERN = /^check-record\/v1\/record\/sha256:[a-f0-9]{64}$/;
const CATALOG_FINGERPRINT_PATTERN = /^check-record\/v1\/catalog\/sha256:[a-f0-9]{64}$/;
const BODY_FINGERPRINT_PATTERN = /^check-record\/v1\/body\/sha256:[a-f0-9]{64}$/;
const INVALID_RECORD_EVIDENCE_ID_PATTERN = /^invalid-record\/v1:[0-9]{6}$/;
const RUN_DIAGNOSTIC_ID_PATTERN = Object.freeze({
  "record-conflict": RECORD_ID_PATTERN,
  "invalid-record": INVALID_RECORD_EVIDENCE_ID_PATTERN,
  "ack-protocol": /^work-handle\/v1:[a-z0-9]+(?:-[a-z0-9]+)*$/,
  "terminal-report-set": /^terminal-report\/v1:[a-z0-9]+(?:-[a-z0-9]+)*$/,
  "invalid-result": /^result\/v1:[a-z0-9]+(?:-[a-z0-9]+)*$/,
  unavailable: /^dependency\/v1:[a-z0-9]+(?:-[a-z0-9]+)*$/,
  "execution-failed": /^execution\/v1:[a-z0-9]+(?:-[a-z0-9]+)*$/
});

function issue(
  path: string,
  code: ValidationIssue["code"],
  message: string
): ValidationResult<never> {
  return Object.freeze({ ok: false, issues: Object.freeze([{ path, code, message }]) });
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

function accepted<T>(value: T): ValidationResult<T> {
  return Object.freeze({ ok: true, value });
}

function acceptedDomain<T>(value: T): ValidationResult<T> {
  return Object.freeze({ ok: true, value: deepFreeze(structuredClone(value)) });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value) as object | null;
  return prototype === Object.prototype || prototype === null;
}

function findUnknownField(
  value: Readonly<Record<string, unknown>>,
  allowedFields: readonly string[]
): boolean {
  const allowed = new Set(allowedFields);
  return Object.keys(value).some((key) => !allowed.has(key));
}

function hasAllFields(
  value: Readonly<Record<string, unknown>>,
  requiredFields: readonly string[]
): string | undefined {
  return requiredFields.find((key) => !Object.hasOwn(value, key));
}

function validateClosedRecord(
  value: unknown,
  path: string,
  fields: readonly string[]
): ValidationResult<Record<string, unknown>> {
  if (!isRecord(value)) {
    return issue(path, "invalid-value", "Expected an object");
  }
  if (findUnknownField(value, fields)) {
    return issue(path, "unknown-field", "Object contains an unsupported field");
  }
  const missingField = hasAllFields(value, fields);
  if (missingField !== undefined) {
    return issue(`${path}.${missingField}`, "missing-field", `Missing field: ${missingField}`);
  }
  return accepted(value);
}

function isStableId(value: unknown): value is string {
  return typeof value === "string" && STABLE_ID_PATTERN.test(value);
}

function isFieldId(value: unknown): value is string {
  return typeof value === "string" && FIELD_ID_PATTERN.test(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function compareCanonicalText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function materializeUnknown(value: unknown): ValidationResult<unknown> {
  try {
    return accepted(materializeSafePlainData(value));
  } catch {
    return issue("$", "invalid-value", "Input must be safe plain JSON data");
  }
}

function validateFieldDefinition(value: unknown, path: string): ValidationResult<RecordFieldDefinition> {
  const closed = validateClosedRecord(value, path, ["fieldId", "valueType", "required"]);
  if (!closed.ok) {
    return closed;
  }
  const field = closed.value;
  if (!isFieldId(field.fieldId)) {
    return issue(`${path}.fieldId`, "invalid-value", "fieldId must use stable lower-camel identity grammar");
  }
  if (!RECORD_FIELD_VALUE_TYPES.includes(field.valueType as never)) {
    return issue(`${path}.valueType`, "invalid-value", "Unknown record field value type");
  }
  if (typeof field.required !== "boolean") {
    return issue(`${path}.required`, "invalid-value", "required must be boolean");
  }
  return accepted({
    fieldId: field.fieldId,
    valueType: field.valueType as RecordFieldDefinition["valueType"],
    required: field.required
  });
}

function validatePolicyOperandSource(
  value: unknown,
  path: string,
  fields: readonly RecordFieldDefinition[],
  valueType: PolicyOperandDefinition["valueType"]
): ValidationResult<PolicyOperandSource> {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return issue(path, "invalid-value", "Policy operand source must be a closed descriptor");
  }
  if (value.kind === "field") {
    const closed = validateClosedRecord(value, path, ["kind", "fieldId"]);
    if (!closed.ok) return closed;
    const field = fields.find((candidate) => candidate.fieldId === closed.value.fieldId);
    const fieldValueType = field?.valueType === "integer" ? "number" : field?.valueType;
    if (field === undefined || fieldValueType !== valueType) {
      return issue(`${path}.fieldId`, "identity-mismatch", "Policy operand must bind a compatible declared field");
    }
    return accepted({ kind: "field", fieldId: field.fieldId });
  }
  const closed = validateClosedRecord(value, path, ["kind"]);
  if (!closed.ok) return closed;
  if (value.kind !== "level" && value.kind !== "message" && value.kind !== "location-path") {
    return issue(`${path}.kind`, "invalid-value", "Unknown policy operand source");
  }
  if (valueType !== "string") {
    return issue(path, "invalid-value", "Built-in textual policy operands require string valueType");
  }
  return accepted({ kind: value.kind });
}

function validateRecordTypePolicySurface(
  value: unknown,
  path: string,
  fields: readonly RecordFieldDefinition[]
): ValidationResult<RecordTypePolicySurface> {
  const closed = validateClosedRecord(value, path, ["operands", "relations"]);
  if (!closed.ok) return closed;
  if (!Array.isArray(closed.value.operands) || !Array.isArray(closed.value.relations)) {
    return issue(path, "invalid-value", "Policy operands and relations must be arrays");
  }
  const operands: PolicyOperandDefinition[] = [];
  const operandIds = new Set<string>();
  for (let index = 0; index < closed.value.operands.length; index += 1) {
    const operandPath = `${path}.operands[${index}]`;
    const operand = validateClosedRecord(
      closed.value.operands[index],
      operandPath,
      ["operandId", "valueType", "source"]
    );
    if (!operand.ok) return operand;
    if (typeof operand.value.operandId !== "string"
      || !POLICY_OPERAND_ID_PATTERN.test(operand.value.operandId)) {
      return issue(`${operandPath}.operandId`, "invalid-value", "Invalid policy operand identity");
    }
    if (operandIds.has(operand.value.operandId)) {
      return issue(`${operandPath}.operandId`, "duplicate", "Duplicate policy operand identity");
    }
    if (operand.value.valueType !== "boolean"
      && operand.value.valueType !== "number"
      && operand.value.valueType !== "string") {
      return issue(`${operandPath}.valueType`, "invalid-value", "Unknown policy operand value type");
    }
    const source = validatePolicyOperandSource(
      operand.value.source,
      `${operandPath}.source`,
      fields,
      operand.value.valueType
    );
    if (!source.ok) return source;
    operandIds.add(operand.value.operandId);
    operands.push({
      operandId: operand.value.operandId,
      valueType: operand.value.valueType,
      source: source.value
    });
  }
  const relations: string[] = [];
  const relationIds = new Set<string>();
  const rawRelations = closed.value.relations as readonly unknown[];
  for (let index = 0; index < rawRelations.length; index += 1) {
    const relationId = rawRelations[index];
    if (!isStableId(relationId)) {
      return issue(`${path}.relations[${index}]`, "invalid-value", "Invalid policy relation identity");
    }
    if (relationIds.has(relationId)) {
      return issue(`${path}.relations[${index}]`, "duplicate", "Duplicate policy relation identity");
    }
    relationIds.add(relationId);
    relations.push(relationId);
  }
  return accepted({ operands, relations });
}

function validateRecordTypeDefinition(
  value: unknown,
  path: string
): ValidationResult<RecordTypeDefinition> {
  const fields = isRecord(value) && Object.hasOwn(value, "policy")
    ? ["recordTypeId", "fields", "identityFields", "policy"]
    : ["recordTypeId", "fields", "identityFields"];
  const closed = validateClosedRecord(value, path, fields);
  if (!closed.ok) {
    return closed;
  }
  const recordType = closed.value;
  if (!isStableId(recordType.recordTypeId)) {
    return issue(`${path}.recordTypeId`, "invalid-value", "recordTypeId must use stable kebab-case identity grammar");
  }
  if (!Array.isArray(recordType.fields)) {
    return issue(`${path}.fields`, "invalid-value", "fields must be an array");
  }
  const fieldDefinitions: RecordFieldDefinition[] = [];
  const fieldIds = new Set<string>();
  for (let index = 0; index < recordType.fields.length; index += 1) {
    const validated = validateFieldDefinition(recordType.fields[index], `${path}.fields[${index}]`);
    if (!validated.ok) {
      return validated;
    }
    if (fieldIds.has(validated.value.fieldId)) {
      return issue(`${path}.fields[${index}].fieldId`, "duplicate", "Duplicate fieldId");
    }
    fieldIds.add(validated.value.fieldId);
    fieldDefinitions.push(validated.value);
  }
  if (!Array.isArray(recordType.identityFields)) {
    return issue(`${path}.identityFields`, "invalid-value", "identityFields must be an array");
  }
  const identityFields: string[] = [];
  const identityFieldIds = new Set<string>();
  const rawIdentityFields = recordType.identityFields as readonly unknown[];
  for (let index = 0; index < rawIdentityFields.length; index += 1) {
    const fieldId = rawIdentityFields[index];
    if (!isFieldId(fieldId)) {
      return issue(`${path}.identityFields[${index}]`, "invalid-value", "Identity field must be a fieldId");
    }
    if (!fieldIds.has(fieldId)) {
      return issue(`${path}.identityFields[${index}]`, "identity-mismatch", "Identity field is not declared in fields");
    }
    if (!fieldDefinitions.find((field) => field.fieldId === fieldId)?.required) {
      return issue(`${path}.identityFields[${index}]`, "identity-mismatch", "Identity fields must be required fields");
    }
    if (identityFieldIds.has(fieldId)) {
      return issue(`${path}.identityFields[${index}]`, "duplicate", "Duplicate identity field");
    }
    identityFieldIds.add(fieldId);
    identityFields.push(fieldId);
  }
  const hasPolicy = Object.hasOwn(recordType, "policy");
  const policy = hasPolicy
    ? validateRecordTypePolicySurface(recordType.policy, `${path}.policy`, fieldDefinitions)
    : null;
  if (policy !== null && !policy.ok) return policy;
  return accepted({
    recordTypeId: recordType.recordTypeId,
    fields: fieldDefinitions,
    identityFields,
    ...(policy === null ? {} : { policy: policy.value })
  });
}

function validateMaterializedCheckDefinition(value: unknown): ValidationResult<CheckDefinition> {
  const closed = validateClosedRecord(value, "$", ["checkId", "displayName", "recordTypes"]);
  if (!closed.ok) {
    return closed;
  }
  const definition = closed.value;
  if (!isStableId(definition.checkId)) {
    return issue("$.checkId", "invalid-value", "checkId must use stable kebab-case identity grammar");
  }
  if (!isNonEmptyString(definition.displayName)) {
    return issue("$.displayName", "invalid-value", "displayName must be non-empty");
  }
  if (!Array.isArray(definition.recordTypes)) {
    return issue("$.recordTypes", "invalid-value", "recordTypes must be an array");
  }
  const recordTypes: RecordTypeDefinition[] = [];
  const recordTypeIds = new Set<string>();
  for (let index = 0; index < definition.recordTypes.length; index += 1) {
    const validated = validateRecordTypeDefinition(definition.recordTypes[index], `$.recordTypes[${index}]`);
    if (!validated.ok) {
      return validated;
    }
    if (recordTypeIds.has(validated.value.recordTypeId)) {
      return issue(`$.recordTypes[${index}].recordTypeId`, "duplicate", "Duplicate recordTypeId within Check");
    }
    recordTypeIds.add(validated.value.recordTypeId);
    recordTypes.push(validated.value);
  }
  return acceptedDomain({ checkId: definition.checkId, displayName: definition.displayName, recordTypes });
}

export function validateCheckDefinition(value: unknown): ValidationResult<CheckDefinition> {
  const materialized = materializeUnknown(value);
  return materialized.ok ? validateMaterializedCheckDefinition(materialized.value) : materialized;
}

function validateCoverage(value: unknown, path: string): ValidationResult<RunCoverage> {
  const closed = validateClosedRecord(value, path, ["plannedWorkCount", "acknowledgedWorkCount"]);
  if (!closed.ok) {
    return closed;
  }
  const coverage = closed.value;
  if (!Number.isSafeInteger(coverage.plannedWorkCount) || (coverage.plannedWorkCount as number) < 0) {
    return issue(`${path}.plannedWorkCount`, "invalid-value", "plannedWorkCount must be a non-negative safe integer");
  }
  if (!Number.isSafeInteger(coverage.acknowledgedWorkCount)
    || (coverage.acknowledgedWorkCount as number) < 0
    || (coverage.acknowledgedWorkCount as number) > (coverage.plannedWorkCount as number)) {
    return issue(`${path}.acknowledgedWorkCount`, "invalid-value", "acknowledgedWorkCount must be between zero and plannedWorkCount");
  }
  return accepted({
    plannedWorkCount: coverage.plannedWorkCount as number,
    acknowledgedWorkCount: coverage.acknowledgedWorkCount as number
  });
}

function validateDiagnostic(value: unknown, path: string): ValidationResult<RunDiagnostic> {
  const closed = validateClosedRecord(value, path, ["category", "tieBreakKey"]);
  if (!closed.ok) {
    return closed;
  }
  const diagnostic = closed.value;
  if (!RUN_FAILURE_CATEGORIES.includes(diagnostic.category as never)) {
    return issue(`${path}.category`, "invalid-value", "Unknown run failure category");
  }
  if (!isNonEmptyString(diagnostic.tieBreakKey)) {
    return issue(`${path}.tieBreakKey`, "invalid-value", "tieBreakKey must be non-empty");
  }
  const category = diagnostic.category as RunDiagnostic["category"];
  if (!RUN_DIAGNOSTIC_ID_PATTERN[category].test(diagnostic.tieBreakKey)) {
    return issue(`${path}.tieBreakKey`, "invalid-value", "Diagnostic identity does not match its category grammar");
  }
  return accepted({
    category,
    tieBreakKey: diagnostic.tieBreakKey
  });
}

function validateMaterializedCheckRun(value: unknown): ValidationResult<CheckRun> {
  const fields = [
    "checkId",
    "checkRunId",
    "selection",
    "applicability",
    "status",
    "result",
    "coverage",
    "diagnostic"
  ];
  const closed = validateClosedRecord(value, "$", fields);
  if (!closed.ok) {
    return closed;
  }
  const run = closed.value;
  if (!isStableId(run.checkId)) {
    return issue("$.checkId", "invalid-value", "Invalid checkId");
  }
  if (!isCheckRunId(run.checkRunId)) {
    return issue("$.checkRunId", "invalid-value", "Invalid checkRunId");
  }
  if (run.selection === "unselected") {
    if (run.applicability !== null || run.status !== "skipped" || run.result !== null
      || run.coverage !== null || run.diagnostic !== null) {
      return issue("$", "invalid-value", "Unselected runs must be skipped without applicability, result, coverage, or diagnostic");
    }
    return acceptedDomain({
      checkId: run.checkId,
      checkRunId: run.checkRunId,
      selection: "unselected",
      applicability: null,
      status: "skipped",
      result: null,
      coverage: null,
      diagnostic: null
    });
  }
  if (run.selection !== "selected") {
    return issue("$.selection", "invalid-value", "Unknown selection");
  }
  const coverage = validateCoverage(run.coverage, "$.coverage");
  if (!coverage.ok) {
    return coverage;
  }
  if (run.applicability === "not-applicable") {
    if (run.status !== "completed" || !isRecord(run.result) || run.result.verdict !== "not-applicable"
      || Object.keys(run.result).length !== 1 || run.diagnostic !== null
      || coverage.value.plannedWorkCount !== 0 || coverage.value.acknowledgedWorkCount !== 0) {
      return issue("$", "invalid-value", "Not-applicable runs must complete with only a not-applicable result and zero coverage");
    }
    return acceptedDomain({
      checkId: run.checkId,
      checkRunId: run.checkRunId,
      selection: "selected",
      applicability: "not-applicable",
      status: "completed",
      result: { verdict: "not-applicable" },
      coverage: coverage.value,
      diagnostic: null
    });
  }
  if (run.applicability !== "applicable") {
    return issue("$.applicability", "invalid-value", "Selected run applicability must be closed");
  }
  if (run.status === "completed") {
    if (!isRecord(run.result) || Object.keys(run.result).length !== 1
      || !CHECK_RESULT_VERDICTS.includes(run.result.verdict as never)
      || run.result.verdict === "not-applicable" || run.diagnostic !== null
      || coverage.value.acknowledgedWorkCount !== coverage.value.plannedWorkCount) {
      return issue("$", "invalid-value", "Completed applicable runs require passed or failed result, complete coverage, and no diagnostic");
    }
    return acceptedDomain({
      checkId: run.checkId,
      checkRunId: run.checkRunId,
      selection: "selected",
      applicability: "applicable",
      status: "completed",
      result: { verdict: run.result.verdict as "failed" | "passed" },
      coverage: coverage.value,
      diagnostic: null
    });
  }
  if (run.status === "failed") {
    if (run.result !== null) {
      return issue("$.result", "invalid-value", "Failed runs must have a null result");
    }
    const diagnostic = validateDiagnostic(run.diagnostic, "$.diagnostic");
    if (!diagnostic.ok) {
      return diagnostic;
    }
    return acceptedDomain({
      checkId: run.checkId,
      checkRunId: run.checkRunId,
      selection: "selected",
      applicability: "applicable",
      status: "failed",
      result: null,
      coverage: coverage.value,
      diagnostic: diagnostic.value
    });
  }
  return issue("$.status", "invalid-value", "Selected applicable run status must be completed or failed");
}

export function validateCheckRun(value: unknown): ValidationResult<CheckRun> {
  const materialized = materializeUnknown(value);
  return materialized.ok ? validateMaterializedCheckRun(materialized.value) : materialized;
}

function validateFieldValue(
  value: unknown,
  definition: RecordFieldDefinition,
  path: string
): ValidationResult<boolean | number | string> {
  const isValid = definition.valueType === "string"
    ? typeof value === "string"
    : definition.valueType === "boolean"
      ? typeof value === "boolean"
      : definition.valueType === "integer"
        ? Number.isSafeInteger(value)
        : typeof value === "number" && Number.isFinite(value);
  return isValid
    ? accepted(value as boolean | number | string)
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
  if (!isNonEmptyString(location.path)
    || !Number.isSafeInteger(location.line) || (location.line as number) < 1
    || !Number.isSafeInteger(location.column) || (location.column as number) < 1) {
    return issue("$.location", "invalid-value", "Location requires path and positive line/column integers");
  }
  return accepted({
    path: location.path,
    line: location.line as number,
    column: location.column as number
  });
}

function validateMaterializedQualityRecord(
  value: unknown,
  definition: CheckDefinition
): ValidationResult<QualityRecord> {
  const fields = [
    "recordId",
    "checkId",
    "checkRunId",
    "recordTypeId",
    "level",
    "semanticSubject",
    "message",
    "fields",
    "location"
  ];
  const closed = validateClosedRecord(value, "$", fields);
  if (!closed.ok) {
    return closed;
  }
  const record = closed.value;
  if (record.checkId !== definition.checkId || !isCheckRunId(record.checkRunId)) {
    return issue("$.checkId", "identity-mismatch", "Record provenance does not match its Check definition");
  }
  if (typeof record.recordId !== "string" || !RECORD_ID_PATTERN.test(record.recordId)) {
    return issue("$.recordId", "invalid-value", "Invalid recordId");
  }
  const recordType = definition.recordTypes.find((candidate) => candidate.recordTypeId === record.recordTypeId);
  if (recordType === undefined) {
    return issue("$.recordTypeId", "identity-mismatch", "Unknown recordTypeId for Check");
  }
  if (!RECORD_LEVELS.includes(record.level as never)
    || !isNonEmptyString(record.semanticSubject)
    || !isNonEmptyString(record.message)
    || !isRecord(record.fields)) {
    return issue("$", "invalid-value", "Record level, semantic subject, message, or fields are invalid");
  }
  const fieldDefinitions = new Map(recordType.fields.map((field) => [field.fieldId, field]));
  const hasUnknownField = Object.keys(record.fields).some((fieldId) => !fieldDefinitions.has(fieldId));
  if (hasUnknownField) {
    return issue("$.fields", "unknown-field", "Record fields contain an unsupported field");
  }
  const validatedFields: Record<string, boolean | number | string> = {};
  for (const fieldDefinition of recordType.fields) {
    const fieldValue = record.fields[fieldDefinition.fieldId];
    if (fieldValue === undefined) {
      if (fieldDefinition.required) {
        return issue(`$.fields.${fieldDefinition.fieldId}`, "missing-field", `Missing field: ${fieldDefinition.fieldId}`);
      }
      continue;
    }
    const validated = validateFieldValue(fieldValue, fieldDefinition, `$.fields.${fieldDefinition.fieldId}`);
    if (!validated.ok) {
      return validated;
    }
    validatedFields[fieldDefinition.fieldId] = validated.value;
  }
  const location = validateLocation(record.location);
  if (!location.ok) {
    return location;
  }
  const normalizedRecord: QualityRecord = {
    recordId: record.recordId,
    checkId: definition.checkId,
    checkRunId: record.checkRunId,
    recordTypeId: recordType.recordTypeId,
    level: record.level as QualityRecord["level"],
    semanticSubject: normalizeSemanticSubject(record.semanticSubject),
    message: record.message,
    fields: validatedFields as RecordFields,
    location: location.value
  };
  const expectedRecordId = createRecordId(normalizedRecord, recordType).recordId;
  if (normalizedRecord.recordId !== expectedRecordId) {
    return issue("$.recordId", "identity-mismatch", "recordId does not match canonical identity fields");
  }
  return acceptedDomain(normalizedRecord);
}

export function validateQualityRecord(
  value: unknown,
  definition: CheckDefinition
): ValidationResult<QualityRecord> {
  const materialized = materializeUnknown(value);
  return materialized.ok
    ? validateMaterializedQualityRecord(materialized.value, definition)
    : materialized;
}

function validateInvalidRecordEvidence(
  value: unknown,
  path: string
): ValidationResult<InvalidRecordEvidence> {
  const closed = validateClosedRecord(value, path, [
    "kind",
    "checkId",
    "checkRunId",
    "recordTypeId",
    "evidenceId"
  ]);
  if (!closed.ok) {
    return closed;
  }
  const evidence = closed.value;
  if (evidence.kind !== "invalid-record" || !isStableId(evidence.checkId)
    || !isCheckRunId(evidence.checkRunId) || !isStableId(evidence.recordTypeId)
    || typeof evidence.evidenceId !== "string"
    || !INVALID_RECORD_EVIDENCE_ID_PATTERN.test(evidence.evidenceId)) {
    return issue(path, "invalid-value", "Invalid invalid-record evidence");
  }
  return accepted(evidence as unknown as InvalidRecordEvidence);
}

function validateConflictEvidence(
  value: unknown,
  path: string
): ValidationResult<RecordConflictEvidence> {
  const closed = validateClosedRecord(value, path, [
    "kind",
    "checkId",
    "checkRunId",
    "recordTypeId",
    "recordId",
    "bodyFingerprints"
  ]);
  if (!closed.ok) {
    return closed;
  }
  const evidence = closed.value;
  if (evidence.kind !== "record-conflict" || !isStableId(evidence.checkId)
    || !isCheckRunId(evidence.checkRunId) || !isStableId(evidence.recordTypeId)
    || typeof evidence.recordId !== "string"
    || !RECORD_ID_PATTERN.test(evidence.recordId) || !Array.isArray(evidence.bodyFingerprints)
    || evidence.bodyFingerprints.length < 2) {
    return issue(path, "invalid-value", "Invalid record-conflict evidence");
  }
  const bodyFingerprints = evidence.bodyFingerprints as readonly unknown[];
  if (!bodyFingerprints.every((fingerprint): fingerprint is string => (
    typeof fingerprint === "string" && BODY_FINGERPRINT_PATTERN.test(fingerprint)
  ))) {
    return issue(`${path}.bodyFingerprints`, "invalid-value", "Conflict body fingerprints must be SHA-256 identities");
  }
  const validatedBodyFingerprints = bodyFingerprints as readonly string[];
  if (new Set(validatedBodyFingerprints).size !== validatedBodyFingerprints.length
    || validatedBodyFingerprints.some((fingerprint, index) => (
      index > 0 && validatedBodyFingerprints[index - 1]! >= fingerprint
    ))) {
    return issue(`${path}.bodyFingerprints`, "invalid-value", "Conflict body fingerprints must be distinct and canonically sorted");
  }
  return acceptedDomain({
    kind: "record-conflict",
    checkId: evidence.checkId,
    checkRunId: evidence.checkRunId,
    recordTypeId: evidence.recordTypeId,
    recordId: evidence.recordId,
    bodyFingerprints: validatedBodyFingerprints
  });
}

function validateIntegrity(value: unknown): ValidationResult<SnapshotIntegrity> {
  const closed = validateClosedRecord(value, "$.integrity", ["status", "invalidRecords", "conflicts"]);
  if (!closed.ok) {
    return closed;
  }
  const integrity = closed.value;
  if (!Array.isArray(integrity.invalidRecords) || !Array.isArray(integrity.conflicts)) {
    return issue("$.integrity", "invalid-value", "Integrity evidence must use arrays");
  }
  const invalidRecords: InvalidRecordEvidence[] = [];
  for (let index = 0; index < integrity.invalidRecords.length; index += 1) {
    const validated = validateInvalidRecordEvidence(integrity.invalidRecords[index], `$.integrity.invalidRecords[${index}]`);
    if (!validated.ok) {
      return validated;
    }
    invalidRecords.push(validated.value);
  }
  const conflicts: RecordConflictEvidence[] = [];
  for (let index = 0; index < integrity.conflicts.length; index += 1) {
    const validated = validateConflictEvidence(integrity.conflicts[index], `$.integrity.conflicts[${index}]`);
    if (!validated.ok) {
      return validated;
    }
    conflicts.push(validated.value);
  }
  const expectedStatus = conflicts.length > 0
    ? "conflicted"
    : invalidRecords.length > 0
      ? "invalid"
      : "valid";
  if (integrity.status !== expectedStatus) {
    return issue("$.integrity.status", "invalid-value", `Integrity status must be ${expectedStatus}`);
  }
  const invalidEvidenceIds = invalidRecords.map((evidence) => evidence.evidenceId);
  if (new Set(invalidEvidenceIds).size !== invalidEvidenceIds.length) {
    return issue("$.integrity.invalidRecords", "duplicate", "Integrity evidence identities must be unique");
  }
  const conflictRecordIds = conflicts.map((evidence) => evidence.recordId);
  if (new Set(conflictRecordIds).size !== conflictRecordIds.length) {
    return issue("$.integrity.conflicts", "duplicate", "Conflict record identities must be unique");
  }
  return accepted({
    status: expectedStatus,
    invalidRecords: invalidRecords.sort((left, right) => compareCanonicalText(left.evidenceId, right.evidenceId)),
    conflicts: conflicts.sort((left, right) => compareCanonicalText(left.recordId, right.recordId))
  });
}

function validateCompleteness(
  value: unknown,
  runs: readonly CheckRun[]
): ValidationResult<SnapshotCompleteness> {
  const fields = [
    "status",
    "selectedRunCount",
    "completedRunCount",
    "failedRunCount",
    "plannedWorkCount",
    "acknowledgedWorkCount"
  ];
  const closed = validateClosedRecord(value, "$.completeness", fields);
  if (!closed.ok) {
    return closed;
  }
  const selectedRuns = runs.filter((run) => run.selection === "selected");
  const expected: SnapshotCompleteness = {
    status: selectedRuns.some((run) => run.status === "failed") ? "incomplete" : "complete",
    selectedRunCount: selectedRuns.length,
    completedRunCount: selectedRuns.filter((run) => run.status === "completed").length,
    failedRunCount: selectedRuns.filter((run) => run.status === "failed").length,
    plannedWorkCount: selectedRuns.reduce((sum, run) => sum + run.coverage.plannedWorkCount, 0),
    acknowledgedWorkCount: selectedRuns.reduce((sum, run) => sum + run.coverage.acknowledgedWorkCount, 0)
  };
  for (const field of fields) {
    if (closed.value[field] !== expected[field as keyof SnapshotCompleteness]) {
      return issue(`$.completeness.${field}`, "invalid-value", "Completeness must equal manager-derived run facts");
    }
  }
  return accepted(expected);
}

function validateMaterializedFinalCoreSnapshot(value: unknown): ValidationResult<FinalCoreSnapshot> {
  const fields = ["catalogFingerprint", "definitions", "runs", "records", "integrity", "completeness"];
  const closed = validateClosedRecord(value, "$", fields);
  if (!closed.ok) {
    return closed;
  }
  const snapshot = closed.value;
  if (typeof snapshot.catalogFingerprint !== "string"
    || !CATALOG_FINGERPRINT_PATTERN.test(snapshot.catalogFingerprint)
    || !Array.isArray(snapshot.definitions) || !Array.isArray(snapshot.runs) || !Array.isArray(snapshot.records)) {
    return issue("$", "invalid-value", "Snapshot catalog, definitions, runs, or records are invalid");
  }
  const definitions: CheckDefinition[] = [];
  const checkIds = new Set<string>();
  for (let index = 0; index < snapshot.definitions.length; index += 1) {
    const validated = validateMaterializedCheckDefinition(snapshot.definitions[index]);
    if (!validated.ok) {
      return issue(`$.definitions[${index}]`, validated.issues[0]!.code, validated.issues[0]!.message);
    }
    if (checkIds.has(validated.value.checkId)) {
      return issue(`$.definitions[${index}].checkId`, "duplicate", "Duplicate checkId");
    }
    checkIds.add(validated.value.checkId);
    definitions.push(validated.value);
  }
  if (createCatalogFingerprint(definitions).catalogFingerprint !== snapshot.catalogFingerprint) {
    return issue("$.catalogFingerprint", "identity-mismatch", "Catalog fingerprint does not match definitions");
  }
  const runs: CheckRun[] = [];
  const runsByCheckId = new Map<string, CheckRun>();
  for (let index = 0; index < snapshot.runs.length; index += 1) {
    const validated = validateMaterializedCheckRun(snapshot.runs[index]);
    if (!validated.ok) {
      return issue(`$.runs[${index}]`, validated.issues[0]!.code, validated.issues[0]!.message);
    }
    if (!checkIds.has(validated.value.checkId) || runsByCheckId.has(validated.value.checkId)) {
      return issue(`$.runs[${index}].checkId`, "identity-mismatch", "Each definition requires exactly one owned run");
    }
    runsByCheckId.set(validated.value.checkId, validated.value);
    runs.push(validated.value);
  }
  if (runsByCheckId.size !== definitions.length) {
    return issue("$.runs", "missing-field", "Each definition requires exactly one run");
  }
  const records: QualityRecord[] = [];
  const recordIds = new Set<string>();
  const rawRecords = snapshot.records as readonly unknown[];
  for (let index = 0; index < rawRecords.length; index += 1) {
    const rawRecord = rawRecords[index];
    const definition = isRecord(rawRecord)
      ? definitions.find((candidate) => candidate.checkId === rawRecord.checkId)
      : undefined;
    if (definition === undefined) {
      return issue(`$.records[${index}].checkId`, "identity-mismatch", "Record has no owning definition");
    }
    const validated = validateMaterializedQualityRecord(rawRecord, definition);
    if (!validated.ok) {
      return issue(`$.records[${index}]`, validated.issues[0]!.code, validated.issues[0]!.message);
    }
    const run = runsByCheckId.get(validated.value.checkId)!;
    if (validated.value.checkRunId !== run.checkRunId || run.applicability !== "applicable") {
      return issue(`$.records[${index}].checkRunId`, "identity-mismatch", "Record has no applicable owning run");
    }
    if (recordIds.has(validated.value.recordId)) {
      return issue(`$.records[${index}].recordId`, "duplicate", "Trusted records require unique recordIds");
    }
    recordIds.add(validated.value.recordId);
    records.push(validated.value);
  }
  const integrity = validateIntegrity(snapshot.integrity);
  if (!integrity.ok) {
    return integrity;
  }
  for (const conflict of integrity.value.conflicts) {
    const run = runsByCheckId.get(conflict.checkId);
    const definition = definitions.find((candidate) => candidate.checkId === conflict.checkId);
    const ownsRecordType = definition?.recordTypes.some((recordType) => (
      recordType.recordTypeId === conflict.recordTypeId
    ));
    if (run?.checkRunId !== conflict.checkRunId || run.status !== "failed"
      || ownsRecordType !== true || recordIds.has(conflict.recordId)) {
      return issue("$.integrity.conflicts", "identity-mismatch", "Conflict evidence has no failed run and record-type owner");
    }
  }
  for (const invalidRecord of integrity.value.invalidRecords) {
    const run = runsByCheckId.get(invalidRecord.checkId);
    const definition = definitions.find((candidate) => candidate.checkId === invalidRecord.checkId);
    const ownsRecordType = definition?.recordTypes.some((recordType) => (
      recordType.recordTypeId === invalidRecord.recordTypeId
    ));
    if (run?.checkRunId !== invalidRecord.checkRunId || run.status !== "failed"
      || ownsRecordType !== true) {
      return issue("$.integrity.invalidRecords", "identity-mismatch", "Invalid-record evidence has no failed run and record-type owner");
    }
  }
  for (const run of runs) {
    const conflicts = integrity.value.conflicts.filter((evidence) => evidence.checkId === run.checkId);
    const invalidRecords = integrity.value.invalidRecords.filter((evidence) => evidence.checkId === run.checkId);
    if (conflicts.length > 0) {
      const primaryConflictId = conflicts[0]!.recordId;
      if (run.status !== "failed" || run.diagnostic.category !== "record-conflict"
        || run.diagnostic.tieBreakKey !== primaryConflictId) {
        return issue("$.runs", "identity-mismatch", "Run diagnostic does not identify its primary conflict evidence");
      }
      continue;
    }
    if (invalidRecords.length > 0) {
      const primaryInvalidRecordId = invalidRecords[0]!.evidenceId;
      if (run.status !== "failed" || run.diagnostic.category !== "invalid-record"
        || run.diagnostic.tieBreakKey !== primaryInvalidRecordId) {
        return issue("$.runs", "identity-mismatch", "Run diagnostic does not identify its primary invalid-record evidence");
      }
      continue;
    }
    if (run.status === "failed"
      && (run.diagnostic.category === "record-conflict" || run.diagnostic.category === "invalid-record")) {
      return issue("$.runs", "identity-mismatch", "Record-integrity diagnostic requires corresponding evidence");
    }
  }
  const completeness = validateCompleteness(snapshot.completeness, runs);
  if (!completeness.ok) {
    return completeness;
  }
  return acceptedDomain({
    catalogFingerprint: snapshot.catalogFingerprint,
    definitions: definitions.sort((left, right) => compareCanonicalText(left.checkId, right.checkId)),
    runs: runs.sort((left, right) => compareCanonicalText(left.checkId, right.checkId)),
    records: records.sort((left, right) => compareCanonicalText(left.recordId, right.recordId)),
    integrity: integrity.value,
    completeness: completeness.value
  });
}


export function validateFinalCoreSnapshot(value: unknown): ValidationResult<FinalCoreSnapshot> {
  const materialized = materializeUnknown(value);
  return materialized.ok
    ? validateMaterializedFinalCoreSnapshot(materialized.value)
    : materialized;
}
