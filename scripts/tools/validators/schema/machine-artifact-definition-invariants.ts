import { isCanonical, isCanonicalText } from "./machine-artifact-canonical.ts";
import { setFailure } from "./machine-artifact-diagnostics.ts";
import {
  RUN_ARTIFACT,
  type CheckShape,
  type DocsMachineValidationFailure,
  type PolicyOperandShape,
  type RecordFieldShape,
  type RecordTypeShape,
  type RunShape
} from "./machine-artifact-types.ts";

/**
 * Rechecks the Core Check-definition relationships that JSON Schema cannot
 * express. This stays independent from the Product validator so docs examples
 * do not inherit its implementation as their acceptance oracle.
 */
export function validateCheckDefinitionInvariants(
  run: RunShape,
  artifactRoot: string
): DocsMachineValidationFailure | null {
  const checkIds = new Set<string>();
  for (const [checkIndex, check] of run.checks.entries()) {
    if (checkIds.has(check.checkId)) {
      return definitionFailure(
        artifactRoot,
        `/checks/${checkIndex}/checkId`,
        "Published Check identities must be unique."
      );
    }
    checkIds.add(check.checkId);
    const failure = validateCheckDefinition(check, checkIndex, artifactRoot);
    if (failure !== null) return failure;
  }
  return null;
}

function validateCheckDefinition(
  check: CheckShape,
  checkIndex: number,
  artifactRoot: string
): DocsMachineValidationFailure | null {
  const recordTypeIds = new Set<string>();
  for (const [recordTypeIndex, recordType] of check.recordTypes.entries()) {
    if (recordTypeIds.has(recordType.recordTypeId)) {
      return definitionFailure(
        artifactRoot,
        `/checks/${checkIndex}/recordTypes/${recordTypeIndex}/recordTypeId`,
        "Record type identities must be unique within their Check."
      );
    }
    recordTypeIds.add(recordType.recordTypeId);
    const failure = validateRecordTypeDefinition(
      recordType,
      checkIndex,
      recordTypeIndex,
      artifactRoot
    );
    if (failure !== null) return failure;
  }
  return isCanonical(check.recordTypes, ({ recordTypeId }) => recordTypeId)
    ? null
    : definitionFailure(
        artifactRoot,
        `/checks/${checkIndex}/recordTypes`,
        "Record type definitions must use canonical unique recordTypeId order."
      );
}

function validateRecordTypeDefinition(
  recordType: RecordTypeShape,
  checkIndex: number,
  recordTypeIndex: number,
  artifactRoot: string
): DocsMachineValidationFailure | null {
  const basePointer = `/checks/${checkIndex}/recordTypes/${recordTypeIndex}`;
  const fieldById = new Map<string, RecordFieldShape>();
  for (const [fieldIndex, field] of recordType.fields.entries()) {
    if (fieldById.has(field.fieldId)) {
      return definitionFailure(
        artifactRoot,
        `${basePointer}/fields/${fieldIndex}/fieldId`,
        "Field identities must be unique within their record type."
      );
    }
    fieldById.set(field.fieldId, field);
  }
  if (!isCanonical(recordType.fields, ({ fieldId }) => fieldId)) {
    return definitionFailure(
      artifactRoot,
      `${basePointer}/fields`,
      "Field definitions must use canonical unique fieldId order."
    );
  }
  const identityFailure = validateIdentityFields(recordType, fieldById, basePointer, artifactRoot);
  if (identityFailure !== null) return identityFailure;
  return recordType.policy === undefined
    ? null
    : validatePolicySurface(recordType.policy, fieldById, basePointer, artifactRoot);
}

function validateIdentityFields(
  recordType: RecordTypeShape,
  fieldById: ReadonlyMap<string, RecordFieldShape>,
  basePointer: string,
  artifactRoot: string
): DocsMachineValidationFailure | null {
  if (!isCanonicalText(recordType.identityFields)) {
    return definitionFailure(
      artifactRoot,
      `${basePointer}/identityFields`,
      "Identity fields must use canonical unique fieldId order."
    );
  }
  for (const [index, fieldId] of recordType.identityFields.entries()) {
    const field = fieldById.get(fieldId);
    if (field === undefined) {
      return definitionFailure(
        artifactRoot,
        `${basePointer}/identityFields/${index}`,
        "Identity fields must be declared by the record type."
      );
    }
    if (!field.required) {
      return definitionFailure(
        artifactRoot,
        `${basePointer}/identityFields/${index}`,
        "Identity fields must be required."
      );
    }
  }
  return null;
}

function validatePolicySurface(
  policy: NonNullable<RecordTypeShape["policy"]>,
  fieldById: ReadonlyMap<string, RecordFieldShape>,
  basePointer: string,
  artifactRoot: string
): DocsMachineValidationFailure | null {
  const operandIds = new Set<string>();
  for (const [index, operand] of policy.operands.entries()) {
    if (operandIds.has(operand.operandId)) {
      return definitionFailure(
        artifactRoot,
        `${basePointer}/policy/operands/${index}/operandId`,
        "Policy operand identities must be unique within their record type."
      );
    }
    operandIds.add(operand.operandId);
    const sourceFailure = validatePolicyOperandSource(
      operand,
      fieldById,
      `${basePointer}/policy/operands/${index}`,
      artifactRoot
    );
    if (sourceFailure !== null) return sourceFailure;
  }
  if (!isCanonical(policy.operands, ({ operandId }) => operandId)) {
    return definitionFailure(
      artifactRoot,
      `${basePointer}/policy/operands`,
      "Policy operands must use canonical unique operandId order."
    );
  }
  return isCanonicalText(policy.relations)
    ? null
    : definitionFailure(
        artifactRoot,
        `${basePointer}/policy/relations`,
        "Policy relations must use canonical unique relationId order."
      );
}

function validatePolicyOperandSource(
  operand: PolicyOperandShape,
  fieldById: ReadonlyMap<string, RecordFieldShape>,
  basePointer: string,
  artifactRoot: string
): DocsMachineValidationFailure | null {
  switch (operand.source.kind) {
    case "field":
      return validateFieldOperand(operand, fieldById, basePointer, artifactRoot);
    case "level":
    case "location-path":
    case "message":
      return operand.valueType === "string"
        ? null
        : definitionFailure(
            artifactRoot,
            `${basePointer}/valueType`,
            "Built-in textual policy operands require string valueType."
          );
    default:
      return definitionFailure(
        artifactRoot,
        `${basePointer}/source`,
        "Policy operand source must use a supported closed descriptor."
      );
  }
}

function validateFieldOperand(
  operand: PolicyOperandShape,
  fieldById: ReadonlyMap<string, RecordFieldShape>,
  basePointer: string,
  artifactRoot: string
): DocsMachineValidationFailure | null {
  const fieldId = operand.source.fieldId;
  const field = typeof fieldId === "string" ? fieldById.get(fieldId) : undefined;
  const compatibleValueType = field?.valueType === "integer" ? "number" : field?.valueType;
  return compatibleValueType === operand.valueType
    ? null
    : definitionFailure(
        artifactRoot,
        `${basePointer}/source/fieldId`,
        "Policy field operand must bind a compatible declared field."
      );
}

function definitionFailure(
  artifactRoot: string,
  pointer: string,
  message: string
): DocsMachineValidationFailure {
  return setFailure(artifactRoot, RUN_ARTIFACT, {
    message,
    pointer,
    relationship: "check-definition"
  });
}
