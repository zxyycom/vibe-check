import type {
  PolicyOperandDefinition,
  PolicyOperandSource,
  RecordFieldDefinition,
  RecordTypePolicySurface
} from "../model.ts";
import {
  accepted,
  compareCanonicalText,
  isRecord,
  isStableId,
  issue,
  validateClosedRecord,
  type ValidationResult
} from "./common.ts";

const POLICY_OPERAND_ID_PATTERN = /^[a-z][A-Za-z0-9]*(?:-[a-z0-9]+)*$/;

function isPolicyOperandValueType(value: unknown): value is PolicyOperandDefinition["valueType"] {
  return value === "boolean" || value === "number" || value === "string";
}

function validateFieldOperandSource(
  value: Readonly<Record<string, unknown>>,
  path: string,
  fields: readonly RecordFieldDefinition[],
  valueType: PolicyOperandDefinition["valueType"]
): ValidationResult<PolicyOperandSource> {
  const closed = validateClosedRecord(value, path, ["kind", "fieldId"]);
  if (!closed.ok) {
    return closed;
  }
  const field = fields.find((candidate) => candidate.fieldId === closed.value.fieldId);
  const compatibleValueType = field?.valueType === "integer" ? "number" : field?.valueType;
  if (field === undefined || compatibleValueType !== valueType) {
    return issue(
      `${path}.fieldId`,
      "identity-mismatch",
      "Policy operand must bind a compatible declared field"
    );
  }
  return accepted({ kind: "field", fieldId: field.fieldId });
}

function validateTextualOperandSource(
  value: Readonly<Record<string, unknown>>,
  path: string,
  valueType: PolicyOperandDefinition["valueType"]
): ValidationResult<PolicyOperandSource> {
  const closed = validateClosedRecord(value, path, ["kind"]);
  if (!closed.ok) {
    return closed;
  }
  if (value.kind !== "level" && value.kind !== "message" && value.kind !== "location-path") {
    return issue(`${path}.kind`, "invalid-value", "Unknown policy operand source");
  }
  if (valueType !== "string") {
    return issue(
      path,
      "invalid-value",
      "Built-in textual policy operands require string valueType"
    );
  }
  return accepted({ kind: value.kind });
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
  return value.kind === "field"
    ? validateFieldOperandSource(value, path, fields, valueType)
    : validateTextualOperandSource(value, path, valueType);
}

function validatePolicyOperands(
  values: readonly unknown[],
  path: string,
  fields: readonly RecordFieldDefinition[]
): ValidationResult<readonly PolicyOperandDefinition[]> {
  const operands: PolicyOperandDefinition[] = [];
  const operandIds = new Set<string>();
  let previousOperandId: string | undefined;
  for (let index = 0; index < values.length; index += 1) {
    const operandPath = `${path}.operands[${index}]`;
    const operand = validateClosedRecord(values[index], operandPath, [
      "operandId",
      "valueType",
      "source"
    ]);
    if (!operand.ok) {
      return operand;
    }
    if (
      typeof operand.value.operandId !== "string" ||
      !POLICY_OPERAND_ID_PATTERN.test(operand.value.operandId)
    ) {
      return issue(`${operandPath}.operandId`, "invalid-value", "Invalid policy operand identity");
    }
    if (operandIds.has(operand.value.operandId)) {
      return issue(`${operandPath}.operandId`, "duplicate", "Duplicate policy operand identity");
    }
    if (
      previousOperandId !== undefined &&
      compareCanonicalText(previousOperandId, operand.value.operandId) >= 0
    ) {
      return issue(
        `${path}.operands`,
        "invalid-value",
        "Policy operands must use canonical unique operandId order"
      );
    }
    if (!isPolicyOperandValueType(operand.value.valueType)) {
      return issue(
        `${operandPath}.valueType`,
        "invalid-value",
        "Unknown policy operand value type"
      );
    }
    const source = validatePolicyOperandSource(
      operand.value.source,
      `${operandPath}.source`,
      fields,
      operand.value.valueType
    );
    if (!source.ok) {
      return source;
    }
    operandIds.add(operand.value.operandId);
    previousOperandId = operand.value.operandId;
    operands.push({
      operandId: operand.value.operandId,
      valueType: operand.value.valueType,
      source: source.value
    });
  }
  return accepted(operands);
}

function validatePolicyRelations(
  values: readonly unknown[],
  path: string
): ValidationResult<readonly string[]> {
  const relations: string[] = [];
  const relationIds = new Set<string>();
  let previousRelationId: string | undefined;
  for (let index = 0; index < values.length; index += 1) {
    const relationId = values[index];
    if (!isStableId(relationId)) {
      return issue(
        `${path}.relations[${index}]`,
        "invalid-value",
        "Invalid policy relation identity"
      );
    }
    if (relationIds.has(relationId)) {
      return issue(
        `${path}.relations[${index}]`,
        "duplicate",
        "Duplicate policy relation identity"
      );
    }
    if (
      previousRelationId !== undefined &&
      compareCanonicalText(previousRelationId, relationId) >= 0
    ) {
      return issue(
        `${path}.relations`,
        "invalid-value",
        "Policy relations must use canonical unique relationId order"
      );
    }
    relationIds.add(relationId);
    previousRelationId = relationId;
    relations.push(relationId);
  }
  return accepted(relations);
}

export function validateRecordTypePolicySurface(
  value: unknown,
  path: string,
  fields: readonly RecordFieldDefinition[]
): ValidationResult<RecordTypePolicySurface> {
  const closed = validateClosedRecord(value, path, ["operands", "relations"]);
  if (!closed.ok) {
    return closed;
  }
  if (!Array.isArray(closed.value.operands) || !Array.isArray(closed.value.relations)) {
    return issue(path, "invalid-value", "Policy operands and relations must be arrays");
  }
  const operands = validatePolicyOperands(closed.value.operands, path, fields);
  if (!operands.ok) {
    return operands;
  }
  const relations = validatePolicyRelations(closed.value.relations, path);
  return relations.ok
    ? accepted({ operands: operands.value, relations: relations.value })
    : relations;
}
