import type { CheckDefinition } from "../model.ts";
import type {
  AcceptanceRule,
  DecisionPolicy,
  NamedRecordView,
  NamedReferenceIdentity,
  PolicyReferenceRequirement,
  ReadinessClause,
  RecordPolicySurface,
  RecordSelector
} from "../policy-model.ts";
import type { ValidationResult } from "../validation.ts";
import { validateReferenceRequirements } from "./policy-references.ts";
import { validatePredicates, validateSelector } from "./record-predicates.ts";
import {
  type ReadinessContext,
  validateBlockWhen,
  validateReadinessPredicate
} from "./readiness-predicates.ts";
import {
  accepted,
  checkReferenceKey,
  closed,
  isGateNotEvaluatedReason,
  isStableId,
  issue,
  selectorKey
} from "./validation-helpers.ts";

interface PolicyContext {
  readonly definitions: readonly CheckDefinition[];
  readonly surfacesBySelector: ReadonlyMap<string, RecordPolicySurface>;
  readonly requiredPairs: ReadonlySet<string>;
}

function isSafeAcceptanceReason(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && !/[\p{Cc}\p{Cs}]/u.test(value);
}

function validateAcceptanceRule(
  value: unknown,
  path: string,
  context: PolicyContext,
  acceptanceIds: Set<string>
): ValidationResult<AcceptanceRule> {
  const shape = closed(value, path, ["acceptanceId", "reason", "selector", "predicates"]);
  if (!shape.ok) return shape;
  if (!isStableId(shape.value.acceptanceId)) {
    return issue(`${path}.acceptanceId`, "invalid-value", "Invalid acceptanceId");
  }
  if (acceptanceIds.has(shape.value.acceptanceId)) {
    return issue(`${path}.acceptanceId`, "duplicate", "Duplicate acceptanceId");
  }
  if (!isSafeAcceptanceReason(shape.value.reason)) {
    return issue(`${path}.reason`, "invalid-value", "Acceptance reason must be non-empty safe text");
  }
  const selector = validateSelector(shape.value.selector, `${path}.selector`, context.definitions);
  if (!selector.ok) return selector;
  if (!context.surfacesBySelector.has(selectorKey(selector.value))) {
    return issue(`${path}.selector`, "identity-mismatch", "Selector has no policy surface");
  }
  const predicates = validatePredicates(shape.value.predicates, `${path}.predicates`, {
    surfacesBySelector: context.surfacesBySelector,
    selectors: [selector.value],
    referenceRequirements: context.requiredPairs
  });
  if (!predicates.ok) return predicates;
  acceptanceIds.add(shape.value.acceptanceId);
  return accepted({
    acceptanceId: shape.value.acceptanceId,
    reason: shape.value.reason,
    selector: selector.value,
    predicates: predicates.value
  });
}

function validateAcceptanceRules(
  value: unknown,
  context: PolicyContext
): ValidationResult<readonly AcceptanceRule[]> {
  if (!Array.isArray(value)) {
    return issue("$.policy.acceptance", "invalid-value", "acceptance must be an array");
  }
  const rules: AcceptanceRule[] = [];
  const acceptanceIds = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const rule = validateAcceptanceRule(
      value[index],
      `$.policy.acceptance[${index}]`,
      context,
      acceptanceIds
    );
    if (!rule.ok) return rule;
    rules.push(rule.value);
  }
  return accepted(rules);
}

function validateViewSelectors(
  value: unknown,
  path: string,
  context: PolicyContext
): ValidationResult<readonly RecordSelector[]> {
  if (!Array.isArray(value) || value.length === 0) {
    return issue(path, "invalid-value", "View requires at least one selector");
  }
  const selectors: RecordSelector[] = [];
  const selectedKeys = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const selectorPath = `${path}[${index}]`;
    const selector = validateSelector(value[index], selectorPath, context.definitions);
    if (!selector.ok) return selector;
    const key = selectorKey(selector.value);
    if (!context.surfacesBySelector.has(key)) {
      return issue(selectorPath, "identity-mismatch", "Selector has no policy surface");
    }
    if (selectedKeys.has(key)) return issue(selectorPath, "duplicate", "Duplicate view selector");
    selectedKeys.add(key);
    selectors.push(selector.value);
  }
  return accepted(selectors);
}

function validateViewAcceptance(
  value: unknown,
  path: string
): ValidationResult<NamedRecordView["acceptance"]> {
  if (value !== "all" && value !== "accepted" && value !== "unaccepted") {
    return issue(path, "invalid-value", "Unknown view acceptance membership");
  }
  return accepted(value);
}

function validateNamedView(
  value: unknown,
  path: string,
  context: PolicyContext,
  viewIds: Set<string>
): ValidationResult<NamedRecordView> {
  const shape = closed(value, path, ["viewId", "selectors", "acceptance", "predicates"]);
  if (!shape.ok) return shape;
  if (!isStableId(shape.value.viewId)) return issue(`${path}.viewId`, "invalid-value", "Invalid viewId");
  if (viewIds.has(shape.value.viewId)) return issue(`${path}.viewId`, "duplicate", "Duplicate viewId");
  const selectors = validateViewSelectors(shape.value.selectors, `${path}.selectors`, context);
  if (!selectors.ok) return selectors;
  const acceptance = validateViewAcceptance(shape.value.acceptance, `${path}.acceptance`);
  if (!acceptance.ok) return acceptance;
  const predicates = validatePredicates(shape.value.predicates, `${path}.predicates`, {
    surfacesBySelector: context.surfacesBySelector,
    selectors: selectors.value,
    referenceRequirements: context.requiredPairs
  });
  if (!predicates.ok) return predicates;
  viewIds.add(shape.value.viewId);
  return accepted({
    viewId: shape.value.viewId,
    selectors: selectors.value,
    acceptance: acceptance.value,
    predicates: predicates.value
  });
}

function validateNamedViews(
  value: unknown,
  context: PolicyContext,
  viewIds: Set<string>
): ValidationResult<readonly NamedRecordView[]> {
  if (!Array.isArray(value)) return issue("$.policy.views", "invalid-value", "views must be an array");
  const views: NamedRecordView[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const view = validateNamedView(value[index], `$.policy.views[${index}]`, context, viewIds);
    if (!view.ok) return view;
    views.push(view.value);
  }
  return accepted(views);
}

function validateReadinessClause(
  value: unknown,
  path: string,
  context: ReadinessContext,
  readinessIds: Set<string>
): ValidationResult<ReadinessClause> {
  const shape = closed(value, path, ["readinessId", "predicate", "reason"]);
  if (!shape.ok) return shape;
  if (!isStableId(shape.value.readinessId)) {
    return issue(`${path}.readinessId`, "invalid-value", "Invalid readinessId");
  }
  if (readinessIds.has(shape.value.readinessId)) {
    return issue(`${path}.readinessId`, "duplicate", "Duplicate readinessId");
  }
  if (!isGateNotEvaluatedReason(shape.value.reason)) {
    return issue(`${path}.reason`, "invalid-value", "Unknown not-evaluated reason");
  }
  const predicate = validateReadinessPredicate(shape.value.predicate, `${path}.predicate`, context);
  if (!predicate.ok) return predicate;
  readinessIds.add(shape.value.readinessId);
  return accepted({
    readinessId: shape.value.readinessId,
    predicate: predicate.value,
    reason: shape.value.reason
  });
}

function validateReadinessClauses(
  value: unknown,
  context: ReadinessContext
): ValidationResult<readonly ReadinessClause[]> {
  if (!Array.isArray(value)) {
    return issue("$.policy.readiness", "invalid-value", "readiness must be an array");
  }
  const clauses: ReadinessClause[] = [];
  const readinessIds = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const clause = validateReadinessClause(
      value[index],
      `$.policy.readiness[${index}]`,
      context,
      readinessIds
    );
    if (!clause.ok) return clause;
    clauses.push(clause.value);
  }
  return accepted(clauses);
}

function requiredReferencePairs(
  requirements: readonly PolicyReferenceRequirement[]
): ReadonlySet<string> {
  return new Set(requirements.flatMap((requirement) => (
    requirement.checkIds.map((checkId) => checkReferenceKey(checkId, requirement.referenceName))
  )));
}

export function validateDecisionPolicy(
  value: unknown,
  references: readonly NamedReferenceIdentity[],
  surfaces: readonly RecordPolicySurface[],
  definitions: readonly CheckDefinition[]
): ValidationResult<DecisionPolicy> {
  const shape = closed(value, "$.policy", [
    "policyId", "references", "acceptance", "views", "readiness", "blockWhen"
  ]);
  if (!shape.ok) return shape;
  if (!isStableId(shape.value.policyId)) {
    return issue("$.policy.policyId", "invalid-value", "policyId must be stable kebab-case");
  }
  const referencesByName = new Map(references.map((reference) => [reference.referenceName, reference]));
  const requirements = validateReferenceRequirements(shape.value.references, referencesByName, definitions);
  if (!requirements.ok) return requirements;
  const context: PolicyContext = {
    definitions,
    surfacesBySelector: new Map(surfaces.map((surface) => [selectorKey(surface), surface])),
    requiredPairs: requiredReferencePairs(requirements.value)
  };
  const acceptance = validateAcceptanceRules(shape.value.acceptance, context);
  if (!acceptance.ok) return acceptance;
  const viewIds = new Set<string>();
  const views = validateNamedViews(shape.value.views, context, viewIds);
  if (!views.ok) return views;
  const readinessContext = { definitions, viewIds, requiredPairs: context.requiredPairs };
  const readiness = validateReadinessClauses(shape.value.readiness, readinessContext);
  if (!readiness.ok) return readiness;
  const blockWhen = validateBlockWhen(shape.value.blockWhen, readinessContext);
  if (!blockWhen.ok) return blockWhen;
  return accepted({
    policyId: shape.value.policyId,
    references: requirements.value,
    acceptance: acceptance.value,
    views: views.value,
    readiness: readiness.value,
    blockWhen: blockWhen.value
  });
}
