import { isProxy } from "node:util/types";

import { createCatalogFingerprint } from "./identity.ts";
import type {
  CheckDefinition,
  FinalCoreSnapshot,
  JsonObject,
  JsonPrimitive,
  JsonValue,
  QualityRecord
} from "./model.ts";
import {
  GATE_NOT_EVALUATED_REASONS,
  REFERENCE_EVIDENCE_STATUSES,
  type AcceptanceRule,
  type BlockWhen,
  type CheckReferenceEvidence,
  type ComparisonRelation,
  type DecisionPolicy,
  type NamedRecordView,
  type NamedReferenceIdentity,
  type PolicyReferenceRequirement,
  type PolicyResolution,
  type ReadinessClause,
  type ReadinessPredicate,
  type RecordOperandDefinition,
  type RecordPolicySurface,
  type RecordPredicate,
  type RecordSelector,
  type ReferenceFacts,
  type ValidatedPolicyCatalog,
  type ValidatedPolicySurfaceRegistry
} from "./policy-model.ts";
import type { ValidationIssue, ValidationResult } from "./validation.ts";

const STABLE_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const REFERENCE_ID_PATTERN = /^reference\/v1\/sha256:[a-f0-9]{64}$/;
const UNSAFE_POLICY_INPUT_MESSAGE = "Policy input must be plain JSON data";

class UnsafePolicyInputError extends TypeError {}

function issue(path: string, code: ValidationIssue["code"], message: string): ValidationResult<never> {
  return Object.freeze({ ok: false, issues: Object.freeze([{ path, code, message }]) });
}

function materializePlainData(value: unknown, ancestors: Set<object>): JsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new UnsafePolicyInputError();
    return value;
  }
  if (typeof value !== "object" || isProxy(value)) throw new UnsafePolicyInputError();
  if (ancestors.has(value)) throw new UnsafePolicyInputError();

  const array = Array.isArray(value);
  const prototype = Object.getPrototypeOf(value) as object | null;
  if (!array && prototype !== Object.prototype && prototype !== null) {
    throw new UnsafePolicyInputError();
  }
  const descriptors = Object.getOwnPropertyDescriptors(value) as Readonly<
    Record<PropertyKey, PropertyDescriptor>
  >;
  const keys = Reflect.ownKeys(descriptors);
  for (const key of keys) {
    const descriptor = descriptors[key]!;
    if (typeof key === "symbol" || descriptor.get !== undefined || descriptor.set !== undefined) {
      throw new UnsafePolicyInputError();
    }
  }

  ancestors.add(value);
  try {
    if (array) {
      const length = descriptors.length?.value as unknown;
      if (typeof length !== "number" || !Number.isSafeInteger(length) || length < 0) {
        throw new UnsafePolicyInputError();
      }
      const entries: JsonValue[] = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (descriptor === undefined || descriptor.enumerable !== true) {
          throw new UnsafePolicyInputError();
        }
        entries.push(materializePlainData(descriptor.value as unknown, ancestors));
      }
      const expectedKeys = new Set(["length", ...entries.map((_, index) => String(index))]);
      if (keys.some((key) => typeof key !== "string" || !expectedKeys.has(key))) {
        throw new UnsafePolicyInputError();
      }
      return entries;
    }

    const snapshot: Record<string, JsonValue> = {};
    for (const key of keys) {
      if (typeof key !== "string") throw new UnsafePolicyInputError();
      const descriptor = descriptors[key]!;
      if (descriptor.enumerable !== true) throw new UnsafePolicyInputError();
      snapshot[key] = materializePlainData(descriptor.value as unknown, ancestors);
    }
    return snapshot as JsonObject;
  } finally {
    ancestors.delete(value);
  }
}

function safePolicyInput(value: unknown): ValidationResult<JsonValue> {
  try {
    return Object.freeze({ ok: true, value: materializePlainData(value, new Set()) });
  } catch {
    return issue("$", "invalid-value", UNSAFE_POLICY_INPUT_MESSAGE);
  }
}

function accepted<T>(value: T): ValidationResult<T> {
  return Object.freeze({ ok: true, value: deepFreeze(value) });
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value) as object | null;
  return prototype === Object.prototype || prototype === null;
}

function closed(
  value: unknown,
  path: string,
  fields: readonly string[]
): ValidationResult<Record<string, unknown>> {
  if (!isRecord(value)) return issue(path, "invalid-value", "Expected an object");
  const allowed = new Set(fields);
  const unknownField = Object.keys(value).sort().find((field) => !allowed.has(field));
  if (unknownField !== undefined) return issue(path, "unknown-field", `Unknown field: ${unknownField}`);
  const missingField = fields.find((field) => !Object.hasOwn(value, field));
  if (missingField !== undefined) return issue(`${path}.${missingField}`, "missing-field", `Missing field: ${missingField}`);
  return Object.freeze({ ok: true, value });
}

function isStableId(value: unknown): value is string {
  return typeof value === "string" && STABLE_ID_PATTERN.test(value);
}

function isSafeAcceptanceReason(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && !/[\p{Cc}\p{Cs}]/u.test(value);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function selectorKey(selector: RecordSelector): string {
  return `${selector.checkId}\u0000${selector.recordTypeId}`;
}

function referenceEvidenceKey(evidence: Pick<CheckReferenceEvidence, "checkId" | "referenceName">): string {
  return `${evidence.checkId}\u0000${evidence.referenceName}`;
}

function findRecordType(definitions: readonly CheckDefinition[], selector: RecordSelector) {
  return definitions
    .find((definition) => definition.checkId === selector.checkId)
    ?.recordTypes.find((recordType) => recordType.recordTypeId === selector.recordTypeId);
}

function validateSelector(
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

function valueMatchesType(value: unknown, valueType: RecordOperandDefinition["valueType"]): boolean {
  return valueType === "number"
    ? typeof value === "number" && Number.isFinite(value)
    : typeof value === valueType;
}

interface PredicateContext {
  readonly surfacesBySelector: ReadonlyMap<string, RecordPolicySurface>;
  readonly selectors: readonly RecordSelector[];
  readonly referenceRequirements: ReadonlySet<string>;
}

function validateRecordPredicate(
  value: unknown,
  path: string,
  context: PredicateContext
): ValidationResult<RecordPredicate> {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return issue(path, "invalid-value", "Record predicate must be a closed predicate");
  }
  if (value.kind === "operand-equals" || value.kind === "operand-includes") {
    const fields = value.kind === "operand-equals" ? ["kind", "operandId", "value"] : ["kind", "operandId", "value"];
    const shape = closed(value, path, fields);
    if (!shape.ok) return shape;
    if (typeof shape.value.operandId !== "string") {
      return issue(`${path}.operandId`, "invalid-value", "operandId must be a string");
    }
    const operands = context.selectors.map((selector) => (
      context.surfacesBySelector.get(selectorKey(selector))?.operands.find((operand) => operand.operandId === shape.value.operandId)
    ));
    if (operands.some((operand) => operand === undefined)) {
      return issue(`${path}.operandId`, "identity-mismatch", "Operand is not registered for every selected record type");
    }
    const expectedType = operands[0]!.valueType;
    if (operands.some((operand) => operand!.valueType !== expectedType)
      || !valueMatchesType(shape.value.value, expectedType)
      || (value.kind === "operand-includes" && expectedType !== "string")) {
      return issue(`${path}.value`, "invalid-value", "Predicate value does not match its registered operand type");
    }
    return accepted(value.kind === "operand-equals"
      ? { kind: "operand-equals", operandId: shape.value.operandId, value: shape.value.value as Exclude<JsonPrimitive, null> }
      : { kind: "operand-includes", operandId: shape.value.operandId, value: shape.value.value as string });
  }
  if (value.kind === "relation-is") {
    const shape = closed(value, path, ["kind", "referenceName", "relationId"]);
    if (!shape.ok) return shape;
    if (!isStableId(shape.value.referenceName)
      || !context.selectors.every((selector) => context.referenceRequirements.has(`${selector.checkId}\u0000${shape.value.referenceName}`))) {
      return issue(`${path}.referenceName`, "identity-mismatch", "Relation reference is not declared for every selected Check");
    }
    if (!isStableId(shape.value.relationId)
      || !context.selectors.every((selector) => (
        context.surfacesBySelector.get(selectorKey(selector))?.relations.includes(shape.value.relationId as string)
      ))) {
      return issue(`${path}.relationId`, "identity-mismatch", "Relation is not registered for every selected record type");
    }
    return accepted({
      kind: "relation-is",
      referenceName: shape.value.referenceName,
      relationId: shape.value.relationId
    });
  }
  if (value.kind === "relation-kind-in") {
    const shape = closed(value, path, ["kind", "referenceName", "values"]);
    if (!shape.ok) return shape;
    if (!isStableId(shape.value.referenceName)
      || !context.selectors.every((selector) => context.referenceRequirements.has(`${selector.checkId}\u0000${shape.value.referenceName}`))) {
      return issue(`${path}.referenceName`, "identity-mismatch", "Relation reference is not declared for every selected Check");
    }
    if (!Array.isArray(shape.value.values) || shape.value.values.length === 0) {
      return issue(`${path}.values`, "invalid-value", "Relation membership requires at least one value");
    }
    const rawValues = shape.value.values as readonly unknown[];
    const values: string[] = [];
    const seen = new Set<string>();
    for (let index = 0; index < rawValues.length; index += 1) {
      const relationId = rawValues[index];
      const valuePath = `${path}.values[${index}]`;
      if (!isStableId(relationId)) {
        return issue(valuePath, "invalid-value", "Relation value must use stable kebab-case grammar");
      }
      if (seen.has(relationId)) {
        return issue(valuePath, "duplicate", "Duplicate relation membership value");
      }
      if (!context.selectors.every((selector) => (
        context.surfacesBySelector.get(selectorKey(selector))?.relations.includes(relationId)
      ))) {
        return issue(valuePath, "identity-mismatch", "Relation is not registered for every selected record type");
      }
      seen.add(relationId);
      values.push(relationId);
    }
    if (values.some((relationId, index) => index > 0 && compareText(values[index - 1]!, relationId) >= 0)) {
      return issue(`${path}.values`, "invalid-value", "Relation membership values must use canonical order");
    }
    return accepted({
      kind: "relation-kind-in",
      referenceName: shape.value.referenceName,
      values
    });
  }
  return issue(`${path}.kind`, "invalid-value", "Unknown record predicate");
}

function validatePredicates(
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

function validateReferenceRequirements(
  value: unknown,
  referencesByName: ReadonlyMap<string, NamedReferenceIdentity>,
  definitions: readonly CheckDefinition[]
): ValidationResult<readonly PolicyReferenceRequirement[]> {
  if (!Array.isArray(value)) return issue("$.policy.references", "invalid-value", "Policy references must be an array");
  const requirements: PolicyReferenceRequirement[] = [];
  const names = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const path = `$.policy.references[${index}]`;
    const shape = closed(value[index], path, ["referenceName", "checkIds"]);
    if (!shape.ok) return shape;
    if (!isStableId(shape.value.referenceName) || !referencesByName.has(shape.value.referenceName)) {
      return issue(`${path}.referenceName`, "identity-mismatch", "Policy reference must have an explicit frozen identity");
    }
    if (names.has(shape.value.referenceName)) {
      return issue(`${path}.referenceName`, "duplicate", "Duplicate policy reference requirement");
    }
    if (!Array.isArray(shape.value.checkIds) || shape.value.checkIds.length === 0) {
      return issue(`${path}.checkIds`, "invalid-value", "Reference requirement needs at least one Check");
    }
    const checkIds: string[] = [];
    const seenCheckIds = new Set<string>();
    const rawCheckIds = shape.value.checkIds as readonly unknown[];
    for (let checkIndex = 0; checkIndex < rawCheckIds.length; checkIndex += 1) {
      const checkId = rawCheckIds[checkIndex];
      if (!isStableId(checkId) || !definitions.some((definition) => definition.checkId === checkId)) {
        return issue(`${path}.checkIds[${checkIndex}]`, "identity-mismatch", "Unknown reference Check");
      }
      if (seenCheckIds.has(checkId)) {
        return issue(`${path}.checkIds[${checkIndex}]`, "duplicate", "Duplicate reference Check");
      }
      seenCheckIds.add(checkId);
      checkIds.push(checkId);
    }
    names.add(shape.value.referenceName);
    requirements.push({ referenceName: shape.value.referenceName, checkIds });
  }
  return accepted(requirements);
}

function validateRunIdentity(checkId: unknown, path: string, definitions: readonly CheckDefinition[]): ValidationResult<string> {
  if (!isStableId(checkId) || !definitions.some((definition) => definition.checkId === checkId)) {
    return issue(path, "identity-mismatch", "Unknown Check operand");
  }
  return accepted(checkId);
}

function validateReferenceOperand(
  value: Record<string, unknown>,
  path: string,
  requiredPairs: ReadonlySet<string>
): ValidationResult<ReadinessPredicate | BlockWhen> {
  if (!isStableId(value.checkId) || !isStableId(value.referenceName)
    || !requiredPairs.has(`${value.checkId}\u0000${value.referenceName}`)) {
    return issue(`${path}.referenceName`, "identity-mismatch", "Unknown required Check/reference operand");
  }
  if (!REFERENCE_EVIDENCE_STATUSES.includes(value.status as never)) {
    return issue(`${path}.status`, "invalid-value", "Unknown reference evidence status");
  }
  return accepted({
    kind: "reference-status",
    checkId: value.checkId,
    referenceName: value.referenceName,
    status: value.status as CheckReferenceEvidence["status"]
  });
}

function validateReadinessPredicate(
  value: unknown,
  path: string,
  definitions: readonly CheckDefinition[],
  viewIds: ReadonlySet<string>,
  requiredPairs: ReadonlySet<string>
): ValidationResult<ReadinessPredicate> {
  if (!isRecord(value) || typeof value.kind !== "string") return issue(path, "invalid-value", "Invalid readiness predicate");
  if (value.kind === "run-status") {
    const shape = closed(value, path, ["kind", "checkId", "status"]);
    if (!shape.ok) return shape;
    const checkId = validateRunIdentity(shape.value.checkId, `${path}.checkId`, definitions);
    if (!checkId.ok) return checkId;
    if (shape.value.status !== "completed" && shape.value.status !== "failed" && shape.value.status !== "skipped") {
      return issue(`${path}.status`, "invalid-value", "Unknown run status");
    }
    return accepted({ kind: "run-status", checkId: checkId.value, status: shape.value.status });
  }
  if (value.kind === "run-verdict") {
    const shape = closed(value, path, ["kind", "checkId", "verdict"]);
    if (!shape.ok) return shape;
    const checkId = validateRunIdentity(shape.value.checkId, `${path}.checkId`, definitions);
    if (!checkId.ok) return checkId;
    if (shape.value.verdict !== "passed" && shape.value.verdict !== "failed" && shape.value.verdict !== "not-applicable") {
      return issue(`${path}.verdict`, "invalid-value", "Unknown run verdict");
    }
    return accepted({ kind: "run-verdict", checkId: checkId.value, verdict: shape.value.verdict });
  }
  if (value.kind === "run-coverage-complete") {
    const shape = closed(value, path, ["kind", "checkId"]);
    if (!shape.ok) return shape;
    const checkId = validateRunIdentity(shape.value.checkId, `${path}.checkId`, definitions);
    return checkId.ok ? accepted({ kind: "run-coverage-complete", checkId: checkId.value }) : checkId;
  }
  if (value.kind === "reference-status") {
    const shape = closed(value, path, ["kind", "checkId", "referenceName", "status"]);
    if (!shape.ok) return shape;
    return validateReferenceOperand(shape.value, path, requiredPairs) as ValidationResult<ReadinessPredicate>;
  }
  if (value.kind === "view-empty") {
    const shape = closed(value, path, ["kind", "viewId"]);
    if (!shape.ok) return shape;
    if (!isStableId(shape.value.viewId) || !viewIds.has(shape.value.viewId)) {
      return issue(`${path}.viewId`, "identity-mismatch", "Unknown view operand");
    }
    return accepted({ kind: "view-empty", viewId: shape.value.viewId });
  }
  return issue(`${path}.kind`, "invalid-value", "Unknown readiness predicate");
}

function validateBlockWhen(
  value: unknown,
  definitions: readonly CheckDefinition[],
  viewIds: ReadonlySet<string>,
  requiredPairs: ReadonlySet<string>
): ValidationResult<BlockWhen> {
  const path = "$.policy.blockWhen";
  if (!isRecord(value) || typeof value.kind !== "string") return issue(path, "invalid-value", "Invalid blockWhen predicate");
  if (value.kind === "view-not-empty") {
    const shape = closed(value, path, ["kind", "viewId"]);
    if (!shape.ok) return shape;
    if (!isStableId(shape.value.viewId) || !viewIds.has(shape.value.viewId)) {
      return issue(`${path}.viewId`, "identity-mismatch", "Unknown view operand");
    }
    return accepted({ kind: "view-not-empty", viewId: shape.value.viewId });
  }
  if (value.kind === "run-status") {
    const shape = closed(value, path, ["kind", "checkId", "status"]);
    if (!shape.ok) return shape;
    const checkId = validateRunIdentity(shape.value.checkId, `${path}.checkId`, definitions);
    if (!checkId.ok) return checkId;
    if (shape.value.status !== "completed" && shape.value.status !== "failed" && shape.value.status !== "skipped") {
      return issue(`${path}.status`, "invalid-value", "Unknown run status");
    }
    return accepted({ kind: "run-status", checkId: checkId.value, status: shape.value.status });
  }
  if (value.kind === "reference-status") {
    const shape = closed(value, path, ["kind", "checkId", "referenceName", "status"]);
    if (!shape.ok) return shape;
    return validateReferenceOperand(shape.value, path, requiredPairs) as ValidationResult<BlockWhen>;
  }
  return issue(`${path}.kind`, "invalid-value", "Unknown blockWhen predicate");
}

function validateDecisionPolicy(
  value: unknown,
  references: readonly NamedReferenceIdentity[],
  surfaces: readonly RecordPolicySurface[],
  definitions: readonly CheckDefinition[]
): ValidationResult<DecisionPolicy> {
  const shape = closed(value, "$.policy", ["policyId", "references", "acceptance", "views", "readiness", "blockWhen"]);
  if (!shape.ok) return shape;
  if (!isStableId(shape.value.policyId)) return issue("$.policy.policyId", "invalid-value", "policyId must be stable kebab-case");
  const referencesByName = new Map(references.map((reference) => [reference.referenceName, reference]));
  const requirements = validateReferenceRequirements(shape.value.references, referencesByName, definitions);
  if (!requirements.ok) return requirements;
  const requiredPairs = new Set(requirements.value.flatMap((requirement) => (
    requirement.checkIds.map((checkId) => `${checkId}\u0000${requirement.referenceName}`)
  )));
  const surfacesBySelector = new Map(surfaces.map((surface) => [selectorKey(surface), surface]));

  if (!Array.isArray(shape.value.acceptance)) return issue("$.policy.acceptance", "invalid-value", "acceptance must be an array");
  const acceptance: AcceptanceRule[] = [];
  const acceptanceIds = new Set<string>();
  for (let index = 0; index < shape.value.acceptance.length; index += 1) {
    const path = `$.policy.acceptance[${index}]`;
    const ruleShape = closed(shape.value.acceptance[index], path, ["acceptanceId", "reason", "selector", "predicates"]);
    if (!ruleShape.ok) return ruleShape;
    if (!isStableId(ruleShape.value.acceptanceId)) return issue(`${path}.acceptanceId`, "invalid-value", "Invalid acceptanceId");
    if (acceptanceIds.has(ruleShape.value.acceptanceId)) return issue(`${path}.acceptanceId`, "duplicate", "Duplicate acceptanceId");
    if (!isSafeAcceptanceReason(ruleShape.value.reason)) {
      return issue(`${path}.reason`, "invalid-value", "Acceptance reason must be non-empty safe text");
    }
    const selector = validateSelector(ruleShape.value.selector, `${path}.selector`, definitions);
    if (!selector.ok) return selector;
    if (!surfacesBySelector.has(selectorKey(selector.value))) return issue(`${path}.selector`, "identity-mismatch", "Selector has no policy surface");
    const predicates = validatePredicates(ruleShape.value.predicates, `${path}.predicates`, {
      surfacesBySelector,
      selectors: [selector.value],
      referenceRequirements: requiredPairs
    });
    if (!predicates.ok) return predicates;
    acceptanceIds.add(ruleShape.value.acceptanceId);
    acceptance.push({
      acceptanceId: ruleShape.value.acceptanceId,
      reason: ruleShape.value.reason,
      selector: selector.value,
      predicates: predicates.value
    });
  }

  if (!Array.isArray(shape.value.views)) return issue("$.policy.views", "invalid-value", "views must be an array");
  const views: NamedRecordView[] = [];
  const viewIds = new Set<string>();
  for (let index = 0; index < shape.value.views.length; index += 1) {
    const path = `$.policy.views[${index}]`;
    const viewShape = closed(shape.value.views[index], path, ["viewId", "selectors", "acceptance", "predicates"]);
    if (!viewShape.ok) return viewShape;
    if (!isStableId(viewShape.value.viewId)) return issue(`${path}.viewId`, "invalid-value", "Invalid viewId");
    if (viewIds.has(viewShape.value.viewId)) return issue(`${path}.viewId`, "duplicate", "Duplicate viewId");
    if (!Array.isArray(viewShape.value.selectors) || viewShape.value.selectors.length === 0) {
      return issue(`${path}.selectors`, "invalid-value", "View requires at least one selector");
    }
    const selectors: RecordSelector[] = [];
    const selectedKeys = new Set<string>();
    for (let selectorIndex = 0; selectorIndex < viewShape.value.selectors.length; selectorIndex += 1) {
      const selector = validateSelector(viewShape.value.selectors[selectorIndex], `${path}.selectors[${selectorIndex}]`, definitions);
      if (!selector.ok) return selector;
      const key = selectorKey(selector.value);
      if (!surfacesBySelector.has(key)) return issue(`${path}.selectors[${selectorIndex}]`, "identity-mismatch", "Selector has no policy surface");
      if (selectedKeys.has(key)) return issue(`${path}.selectors[${selectorIndex}]`, "duplicate", "Duplicate view selector");
      selectedKeys.add(key);
      selectors.push(selector.value);
    }
    if (viewShape.value.acceptance !== "all" && viewShape.value.acceptance !== "accepted" && viewShape.value.acceptance !== "unaccepted") {
      return issue(`${path}.acceptance`, "invalid-value", "Unknown view acceptance membership");
    }
    const predicates = validatePredicates(viewShape.value.predicates, `${path}.predicates`, {
      surfacesBySelector,
      selectors,
      referenceRequirements: requiredPairs
    });
    if (!predicates.ok) return predicates;
    viewIds.add(viewShape.value.viewId);
    views.push({ viewId: viewShape.value.viewId, selectors, acceptance: viewShape.value.acceptance, predicates: predicates.value });
  }

  if (!Array.isArray(shape.value.readiness)) return issue("$.policy.readiness", "invalid-value", "readiness must be an array");
  const readiness: ReadinessClause[] = [];
  const readinessIds = new Set<string>();
  for (let index = 0; index < shape.value.readiness.length; index += 1) {
    const path = `$.policy.readiness[${index}]`;
    const clauseShape = closed(shape.value.readiness[index], path, ["readinessId", "predicate", "reason"]);
    if (!clauseShape.ok) return clauseShape;
    if (!isStableId(clauseShape.value.readinessId)) return issue(`${path}.readinessId`, "invalid-value", "Invalid readinessId");
    if (readinessIds.has(clauseShape.value.readinessId)) return issue(`${path}.readinessId`, "duplicate", "Duplicate readinessId");
    if (!GATE_NOT_EVALUATED_REASONS.includes(clauseShape.value.reason as never)) {
      return issue(`${path}.reason`, "invalid-value", "Unknown not-evaluated reason");
    }
    const predicate = validateReadinessPredicate(clauseShape.value.predicate, `${path}.predicate`, definitions, viewIds, requiredPairs);
    if (!predicate.ok) return predicate;
    readinessIds.add(clauseShape.value.readinessId);
    readiness.push({
      readinessId: clauseShape.value.readinessId,
      predicate: predicate.value,
      reason: clauseShape.value.reason as ReadinessClause["reason"]
    });
  }
  const blockWhen = validateBlockWhen(shape.value.blockWhen, definitions, viewIds, requiredPairs);
  if (!blockWhen.ok) return blockWhen;
  return accepted({
    policyId: shape.value.policyId,
    references: requirements.value,
    acceptance,
    views,
    readiness,
    blockWhen: blockWhen.value
  });
}

export function createPolicySurfaceRegistry(
  catalog: ValidatedPolicyCatalog
): ValidatedPolicySurfaceRegistry {
  const expectedFingerprint = createCatalogFingerprint(catalog.definitions).catalogFingerprint;
  if (catalog.catalogFingerprint !== expectedFingerprint) {
    throw new TypeError("Policy surface catalog fingerprint mismatch");
  }
  const recordTypes = catalog.definitions.flatMap((definition) => (
    definition.recordTypes.map((recordType): RecordPolicySurface => {
      const policy = recordType.policy ?? { operands: [], relations: [] };
      return {
        checkId: definition.checkId,
        recordTypeId: recordType.recordTypeId,
        operands: policy.operands.map((operand) => ({
          operandId: operand.operandId,
          valueType: operand.valueType,
          source: operand.source.kind === "field"
            ? { kind: "field", fieldId: operand.source.fieldId }
            : { kind: operand.source.kind }
        })),
        relations: [...policy.relations]
      };
    })
  ));
  return deepFreeze({
    catalogFingerprint: catalog.catalogFingerprint,
    recordTypes: recordTypes.sort((left, right) => compareText(selectorKey(left), selectorKey(right)))
  });
}

export function validatePolicyResolution(
  value: unknown,
  catalog: ValidatedPolicyCatalog
): ValidationResult<PolicyResolution> {
  let registry: ValidatedPolicySurfaceRegistry;
  try {
    registry = createPolicySurfaceRegistry(catalog);
  } catch {
    return issue("$.catalogFingerprint", "identity-mismatch", "Policy catalog fingerprint is invalid");
  }
  const materialized = safePolicyInput(value);
  if (!materialized.ok) return materialized;
  const shape = closed(materialized.value, "$", ["policy", "references"]);
  if (!shape.ok) return shape;
  if (!Array.isArray(shape.value.references)) return issue("$.references", "invalid-value", "references must be an array");
  const references: NamedReferenceIdentity[] = [];
  const referenceNames = new Set<string>();
  const referenceIds = new Set<string>();
  for (let index = 0; index < shape.value.references.length; index += 1) {
    const path = `$.references[${index}]`;
    const referenceShape = closed(shape.value.references[index], path, ["referenceName", "referenceId"]);
    if (!referenceShape.ok) return referenceShape;
    if (!isStableId(referenceShape.value.referenceName)) return issue(`${path}.referenceName`, "invalid-value", "Invalid referenceName");
    if (typeof referenceShape.value.referenceId !== "string" || !REFERENCE_ID_PATTERN.test(referenceShape.value.referenceId)) {
      return issue(`${path}.referenceId`, "invalid-value", "referenceId must be a safe opaque identity");
    }
    if (referenceNames.has(referenceShape.value.referenceName) || referenceIds.has(referenceShape.value.referenceId)) {
      return issue(`${path}.referenceName`, "duplicate", "Duplicate named reference identity");
    }
    referenceNames.add(referenceShape.value.referenceName);
    referenceIds.add(referenceShape.value.referenceId);
    references.push({ referenceName: referenceShape.value.referenceName, referenceId: referenceShape.value.referenceId });
  }
  if (shape.value.policy === null) {
    if (references.length > 0) {
      return issue("$.policy", "invalid-value", "Disabled policy resolution must not retain unused policy inputs");
    }
    return accepted({
      catalogFingerprint: catalog.catalogFingerprint,
      policy: null,
      references: []
    });
  }
  const policy = validateDecisionPolicy(
    shape.value.policy,
    references,
    registry.recordTypes,
    catalog.definitions
  );
  if (!policy.ok) return policy;
  return accepted({
    catalogFingerprint: catalog.catalogFingerprint,
    policy: policy.value,
    references: references.sort((left, right) => compareText(left.referenceName, right.referenceName))
  });
}

function requiredReferencePairs(resolution: PolicyResolution): ReadonlySet<string> {
  return new Set(resolution.policy?.references.flatMap((requirement) => (
    requirement.checkIds.map((checkId) => `${checkId}\u0000${requirement.referenceName}`)
  )) ?? []);
}

export function validateReferenceFacts(
  value: unknown,
  resolution: PolicyResolution,
  snapshot: FinalCoreSnapshot
): ValidationResult<ReferenceFacts> {
  if (resolution.catalogFingerprint !== snapshot.catalogFingerprint) {
    return issue(
      "$.catalogFingerprint",
      "identity-mismatch",
      "Policy resolution catalog does not match the final snapshot"
    );
  }
  let registry: ValidatedPolicySurfaceRegistry;
  try {
    registry = createPolicySurfaceRegistry(snapshot);
  } catch {
    return issue("$.catalogFingerprint", "identity-mismatch", "Final snapshot catalog fingerprint is invalid");
  }
  const materialized = safePolicyInput(value);
  if (!materialized.ok) return materialized;
  const shape = closed(materialized.value, "$", ["evidence", "relations"]);
  if (!shape.ok) return shape;
  if (!Array.isArray(shape.value.evidence) || !Array.isArray(shape.value.relations)) {
    return issue("$", "invalid-value", "Reference evidence and relations must be arrays");
  }
  const requiredPairs = requiredReferencePairs(resolution);
  const referencesByName = new Map(resolution.references.map((reference) => [reference.referenceName, reference]));
  const evidence: CheckReferenceEvidence[] = [];
  const evidenceByPair = new Map<string, CheckReferenceEvidence>();
  for (let index = 0; index < shape.value.evidence.length; index += 1) {
    const path = `$.evidence[${index}]`;
    const evidenceShape = closed(shape.value.evidence[index], path, ["checkId", "referenceName", "status"]);
    if (!evidenceShape.ok) return evidenceShape;
    if (!isStableId(evidenceShape.value.checkId) || !isStableId(evidenceShape.value.referenceName)
      || !referencesByName.has(evidenceShape.value.referenceName)) {
      return issue(path, "identity-mismatch", "Unknown Check/reference evidence identity");
    }
    const pair = `${evidenceShape.value.checkId}\u0000${evidenceShape.value.referenceName}`;
    if (!requiredPairs.has(pair)) return issue(path, "identity-mismatch", "Reference evidence is not required by the selected policy");
    if (evidenceByPair.has(pair)) return issue(path, "duplicate", "Duplicate Check/reference evidence");
    if (!REFERENCE_EVIDENCE_STATUSES.includes(evidenceShape.value.status as never)) {
      return issue(`${path}.status`, "invalid-value", "Unknown reference evidence status");
    }
    const normalized: CheckReferenceEvidence = {
      checkId: evidenceShape.value.checkId,
      referenceName: evidenceShape.value.referenceName,
      status: evidenceShape.value.status as CheckReferenceEvidence["status"]
    };
    evidence.push(normalized);
    evidenceByPair.set(pair, normalized);
  }
  if (evidenceByPair.size !== requiredPairs.size || [...requiredPairs].some((pair) => !evidenceByPair.has(pair))) {
    return issue("$.evidence", "missing-field", "Every required Check/reference pair needs one evidence status");
  }

  const surfacesBySelector = new Map(registry.recordTypes.map((surface) => [selectorKey(surface), surface]));
  const recordsById = new Map(snapshot.records.map((record) => [record.recordId, record]));
  const relations: ComparisonRelation[] = [];
  const relationBindings = new Set<string>();
  for (let index = 0; index < shape.value.relations.length; index += 1) {
    const path = `$.relations[${index}]`;
    const relationShape = closed(shape.value.relations[index], path, ["recordId", "referenceName", "relationId"]);
    if (!relationShape.ok) return relationShape;
    if (typeof relationShape.value.recordId !== "string") return issue(`${path}.recordId`, "invalid-value", "Invalid record identity");
    const record = recordsById.get(relationShape.value.recordId);
    if (record === undefined) return issue(`${path}.recordId`, "identity-mismatch", "Relation record is not in the current snapshot");
    if (!isStableId(relationShape.value.referenceName) || !requiredPairs.has(`${record.checkId}\u0000${relationShape.value.referenceName}`)) {
      return issue(`${path}.referenceName`, "identity-mismatch", "Relation reference is not declared for the owning Check");
    }
    const pairEvidence = evidenceByPair.get(`${record.checkId}\u0000${relationShape.value.referenceName}`)!;
    if (pairEvidence.status !== "complete") {
      return issue(path, "invalid-value", "Incomplete reference evidence cannot publish comparison relations");
    }
    const surface = surfacesBySelector.get(selectorKey(record));
    if (!isStableId(relationShape.value.relationId) || !surface?.relations.includes(relationShape.value.relationId)) {
      return issue(`${path}.relationId`, "identity-mismatch", "Relation variant is not registered by the record descriptor");
    }
    const binding = `${record.recordId}\u0000${relationShape.value.referenceName}`;
    if (relationBindings.has(binding)) return issue(path, "duplicate", "Duplicate record/reference relation binding");
    relationBindings.add(binding);
    relations.push({
      recordId: record.recordId,
      referenceName: relationShape.value.referenceName,
      relationId: relationShape.value.relationId
    });
  }
  return accepted({
    evidence: evidence.sort((left, right) => compareText(referenceEvidenceKey(left), referenceEvidenceKey(right))),
    relations: relations.sort((left, right) => compareText(
      `${left.recordId}\u0000${left.referenceName}`,
      `${right.recordId}\u0000${right.referenceName}`
    ))
  });
}

export function readRecordOperand(record: QualityRecord, operand: RecordOperandDefinition): Exclude<JsonPrimitive, null> | null {
  if (operand.source.kind === "level") return record.level;
  if (operand.source.kind === "message") return record.message;
  if (operand.source.kind === "location-path") return record.location?.path ?? null;
  return record.fields[operand.source.fieldId] as Exclude<JsonPrimitive, null> | undefined ?? null;
}
