import type { CheckDefinition } from "../model.ts";
import type { RecordPolicySurface, RecordPredicate, RecordSelector } from "../policy-model.ts";
import type { ValidationResult } from "../validation.ts";
import {
  accepted,
  checkReferenceKey,
  closed,
  compareText,
  isRecord,
  isStableId,
  issue,
  selectorKey
} from "./validation-helpers.ts";

export interface PredicateContext {
  readonly surfacesBySelector: ReadonlyMap<string, RecordPolicySurface>;
  readonly selectors: readonly RecordSelector[];
  readonly referenceRequirements: ReadonlySet<string>;
}

function findRecordType(definitions: readonly CheckDefinition[], selector: RecordSelector) {
  return definitions
    .find((definition) => definition.checkId === selector.checkId)
    ?.recordTypes.find((recordType) => recordType.recordTypeId === selector.recordTypeId);
}

export function validateSelector(
  value: unknown,
  path: string,
  definitions: readonly CheckDefinition[]
): ValidationResult<RecordSelector> {
  const shape = closed(value, path, ["checkId", "recordTypeId"]);
  if (!shape.ok) return shape;
  if (!isStableId(shape.value.checkId) || !isStableId(shape.value.recordTypeId)) {
    return issue(path, "invalid-value", "Selector identities must use stable kebab-case grammar");
  }
  const selector = { checkId: shape.value.checkId, recordTypeId: shape.value.recordTypeId };
  if (findRecordType(definitions, selector) === undefined) {
    return issue(path, "identity-mismatch", "Unknown qualified record selector");
  }
  return accepted(selector);
}

function selectedOperands(context: PredicateContext, operandId: string) {
  return context.selectors.map((selector) =>
    context.surfacesBySelector
      .get(selectorKey(selector))
      ?.operands.find((operand) => operand.operandId === operandId)
  );
}

function normalizeNumberOperand(
  kind: string,
  operandId: string,
  value: unknown,
  path: string
): ValidationResult<RecordPredicate> {
  if (kind === "operand-includes" || typeof value !== "number" || !Number.isFinite(value)) {
    return issue(
      `${path}.value`,
      "invalid-value",
      "Predicate value does not match its registered operand type"
    );
  }
  return accepted({ kind: "operand-equals", operandId, value });
}

function normalizeBooleanOperand(
  kind: string,
  operandId: string,
  value: unknown,
  path: string
): ValidationResult<RecordPredicate> {
  if (kind === "operand-includes" || typeof value !== "boolean") {
    return issue(
      `${path}.value`,
      "invalid-value",
      "Predicate value does not match its registered operand type"
    );
  }
  return accepted({ kind: "operand-equals", operandId, value });
}

function normalizeStringOperand(
  kind: string,
  operandId: string,
  value: unknown,
  path: string
): ValidationResult<RecordPredicate> {
  if (typeof value !== "string") {
    return issue(
      `${path}.value`,
      "invalid-value",
      "Predicate value does not match its registered operand type"
    );
  }
  return kind === "operand-includes"
    ? accepted({ kind: "operand-includes", operandId, value })
    : accepted({ kind: "operand-equals", operandId, value });
}

function normalizeOperandValue(
  kind: string,
  operandId: string,
  value: unknown,
  valueType: "boolean" | "number" | "string",
  path: string
): ValidationResult<RecordPredicate> {
  if (valueType === "number") return normalizeNumberOperand(kind, operandId, value, path);
  if (valueType === "boolean") return normalizeBooleanOperand(kind, operandId, value, path);
  return normalizeStringOperand(kind, operandId, value, path);
}

function validateOperandPredicate(
  value: Record<string, unknown>,
  kind: string,
  path: string,
  context: PredicateContext
): ValidationResult<RecordPredicate> {
  const shape = closed(value, path, ["kind", "operandId", "value"]);
  if (!shape.ok) return shape;
  if (typeof shape.value.operandId !== "string") {
    return issue(`${path}.operandId`, "invalid-value", "operandId must be a string");
  }
  const operands = selectedOperands(context, shape.value.operandId);
  const firstOperand = operands[0];
  if (firstOperand === undefined || operands.some((operand) => operand === undefined)) {
    return issue(
      `${path}.operandId`,
      "identity-mismatch",
      "Operand is not registered for every selected record type"
    );
  }
  if (operands.some((operand) => operand?.valueType !== firstOperand.valueType)) {
    return issue(
      `${path}.value`,
      "invalid-value",
      "Predicate value does not match its registered operand type"
    );
  }
  return normalizeOperandValue(
    kind,
    shape.value.operandId,
    shape.value.value,
    firstOperand.valueType,
    path
  );
}

function isReferenceRequiredForAllSelectors(
  referenceName: unknown,
  context: PredicateContext
): referenceName is string {
  return (
    isStableId(referenceName) &&
    context.selectors.every((selector) =>
      context.referenceRequirements.has(checkReferenceKey(selector.checkId, referenceName))
    )
  );
}

function isRelationRegisteredForAllSelectors(
  relationId: string,
  context: PredicateContext
): boolean {
  return context.selectors.every((selector) =>
    context.surfacesBySelector.get(selectorKey(selector))?.relations.includes(relationId)
  );
}

function validateRelationIsPredicate(
  value: Record<string, unknown>,
  path: string,
  context: PredicateContext
): ValidationResult<RecordPredicate> {
  const shape = closed(value, path, ["kind", "referenceName", "relationId"]);
  if (!shape.ok) return shape;
  if (!isReferenceRequiredForAllSelectors(shape.value.referenceName, context)) {
    return issue(
      `${path}.referenceName`,
      "identity-mismatch",
      "Relation reference is not declared for every selected Check"
    );
  }
  const relationId = shape.value.relationId;
  if (!isStableId(relationId) || !isRelationRegisteredForAllSelectors(relationId, context)) {
    return issue(
      `${path}.relationId`,
      "identity-mismatch",
      "Relation is not registered for every selected record type"
    );
  }
  return accepted({ kind: "relation-is", referenceName: shape.value.referenceName, relationId });
}

function validateRelationMember(
  relationId: unknown,
  valuePath: string,
  seen: Set<string>,
  context: PredicateContext
): ValidationResult<string> {
  if (!isStableId(relationId)) {
    return issue(valuePath, "invalid-value", "Relation value must use stable kebab-case grammar");
  }
  if (seen.has(relationId))
    return issue(valuePath, "duplicate", "Duplicate relation membership value");
  if (!isRelationRegisteredForAllSelectors(relationId, context)) {
    return issue(
      valuePath,
      "identity-mismatch",
      "Relation is not registered for every selected record type"
    );
  }
  seen.add(relationId);
  return accepted(relationId);
}

function validateRelationMembers(
  rawValues: readonly unknown[],
  path: string,
  context: PredicateContext
): ValidationResult<readonly string[]> {
  const values: string[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < rawValues.length; index += 1) {
    const member = validateRelationMember(
      rawValues[index],
      `${path}.values[${index}]`,
      seen,
      context
    );
    if (!member.ok) return member;
    values.push(member.value);
  }
  if (
    values.some((relationId, index) => index > 0 && compareText(values[index - 1], relationId) >= 0)
  ) {
    return issue(
      `${path}.values`,
      "invalid-value",
      "Relation membership values must use canonical order"
    );
  }
  return accepted(values);
}

function validateRelationKindInPredicate(
  value: Record<string, unknown>,
  path: string,
  context: PredicateContext
): ValidationResult<RecordPredicate> {
  const shape = closed(value, path, ["kind", "referenceName", "values"]);
  if (!shape.ok) return shape;
  if (!isReferenceRequiredForAllSelectors(shape.value.referenceName, context)) {
    return issue(
      `${path}.referenceName`,
      "identity-mismatch",
      "Relation reference is not declared for every selected Check"
    );
  }
  if (!Array.isArray(shape.value.values) || shape.value.values.length === 0) {
    return issue(
      `${path}.values`,
      "invalid-value",
      "Relation membership requires at least one value"
    );
  }
  const values = validateRelationMembers(shape.value.values, path, context);
  if (!values.ok) return values;
  return accepted({
    kind: "relation-kind-in",
    referenceName: shape.value.referenceName,
    values: values.value
  });
}

function validateKnownRecordPredicate(
  value: Record<string, unknown>,
  kind: string,
  path: string,
  context: PredicateContext
): ValidationResult<RecordPredicate> {
  switch (kind) {
    case "operand-equals":
    case "operand-includes":
      return validateOperandPredicate(value, kind, path, context);
    case "relation-is":
      return validateRelationIsPredicate(value, path, context);
    case "relation-kind-in":
      return validateRelationKindInPredicate(value, path, context);
    default:
      return issue(`${path}.kind`, "invalid-value", "Unknown record predicate");
  }
}

export function validateRecordPredicate(
  value: unknown,
  path: string,
  context: PredicateContext
): ValidationResult<RecordPredicate> {
  if (!isRecord(value)) {
    return issue(path, "invalid-value", "Record predicate must be a closed predicate");
  }
  const kind = value.kind;
  if (typeof kind !== "string") {
    return issue(path, "invalid-value", "Record predicate must be a closed predicate");
  }
  return validateKnownRecordPredicate(value, kind, path, context);
}

export function validatePredicates(
  value: unknown,
  path: string,
  context: PredicateContext
): ValidationResult<readonly RecordPredicate[]> {
  if (!Array.isArray(value)) return issue(path, "invalid-value", "predicates must be an array");
  const predicates: RecordPredicate[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const predicate = validateRecordPredicate(value[index], `${path}[${index}]`, context);
    if (!predicate.ok) return predicate;
    predicates.push(predicate.value);
  }
  return accepted(predicates);
}
