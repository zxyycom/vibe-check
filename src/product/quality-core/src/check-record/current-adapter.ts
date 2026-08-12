import type { AcceptedWarningConfig, SemanticCheckId } from "../model/schema.ts";
import type { ResolvedCheckCatalog } from "./catalog.ts";
import type {
  AcceptanceRule,
  NamedRecordView,
  NamedReferenceIdentity,
  PolicyReferenceRequirement,
  PolicyResolution,
  ReadinessClause,
  RecordPredicate,
  RecordSelector
} from "./policy-model.ts";
import { validatePolicyResolution } from "./policy-validation.ts";

export type CurrentGateRequest = "all" | "changed" | "regressions" | null;

type EnabledCurrentGateRequest = Exclude<CurrentGateRequest, null>;
type ComparisonCurrentGateRequest = Exclude<EnabledCurrentGateRequest, "all">;

export type CurrentPolicyAdapterResult = Readonly<
  | { ok: true; value: PolicyResolution }
  | {
    ok: false;
    error: Readonly<{
      kind: "current-policy-adapter-failed";
      reason: "baseline-required" | "catalog-surface-mismatch";
    }>;
  }
>;

export interface CurrentRecordObservation {
  readonly acceptance: readonly AcceptanceRule[];
  readonly catalogFingerprint: string;
  readonly views: readonly NamedRecordView[];
}

export type CurrentObservationAdapterResult = Readonly<
  | { ok: true; value: CurrentRecordObservation }
  | {
    ok: false;
    error: Readonly<{
      kind: "current-policy-adapter-failed";
      reason: "catalog-surface-mismatch";
    }>;
  }
>;

const SELECTOR_BY_SEMANTIC_CHECK_ID = {
  "duplicate-code": { checkId: "duplicate-detection", recordTypeId: "duplicate-code" },
  "file-code-lines": { checkId: "file-metrics", recordTypeId: "file-code-lines" },
  "function-code-lines": { checkId: "function-metrics", recordTypeId: "function-code-lines" },
  "function-cyclomatic-complexity": {
    checkId: "function-metrics",
    recordTypeId: "function-cyclomatic-complexity"
  },
  "function-parameter-count": {
    checkId: "function-metrics",
    recordTypeId: "function-parameter-count"
  }
} as const satisfies Readonly<Record<SemanticCheckId, RecordSelector>>;

interface CurrentPolicyScope {
  readonly allSelectors: readonly RecordSelector[];
  readonly comparisonCheckIds: readonly string[];
  readonly comparisonSelectors: readonly RecordSelector[];
  readonly currentReadiness: readonly ReadinessClause[];
}

interface CurrentPolicyComparison {
  readonly references: readonly NamedReferenceIdentity[];
  readonly requirements: readonly PolicyReferenceRequirement[];
  readonly predicates: readonly RecordPredicate[];
  readonly readiness: readonly ReadinessClause[];
}

type CurrentPolicyComparisonResult = Readonly<
  | { ok: true; value: CurrentPolicyComparison }
  | { ok: false; reason: "baseline-required" }
>;

export function resolveCurrentPolicy(input: Readonly<{
  acceptedWarnings: readonly AcceptedWarningConfig[];
  baseline: NamedReferenceIdentity | null;
  catalog: ResolvedCheckCatalog;
  gate: CurrentGateRequest;
}>): CurrentPolicyAdapterResult {
  if (input.gate === null) {
    return acceptedResolution({ policy: null, references: [] }, input.catalog);
  }
  const scope = resolveCurrentPolicyScope(input.catalog, input.gate);
  const comparison = resolveCurrentPolicyComparison(
    input.gate,
    input.baseline,
    scope.comparisonCheckIds
  );
  if (!comparison.ok) {
    return failed(comparison.reason);
  }
  const policy = {
    policyId: input.gate,
    references: comparison.value.requirements,
    acceptance: input.acceptedWarnings.map((warning, index) => ({
      acceptanceId: `accepted-warning-${index + 1}`,
      reason: warning.reason,
      selector: SELECTOR_BY_SEMANTIC_CHECK_ID[warning.checkId],
      predicates: acceptancePredicates(warning)
    })),
    views: [{
      viewId: "all-current",
      selectors: scope.allSelectors,
      acceptance: "all",
      predicates: []
    }, {
      viewId: `${input.gate}-unaccepted`,
      selectors: scope.comparisonSelectors,
      acceptance: "unaccepted",
      predicates: comparison.value.predicates
    }],
    readiness: [
      ...scope.currentReadiness,
      ...comparison.value.readiness
    ],
    blockWhen: { kind: "view-not-empty", viewId: `${input.gate}-unaccepted` }
  };
  return acceptedResolution({ policy, references: comparison.value.references }, input.catalog);
}

function resolveCurrentPolicyScope(
  catalog: ResolvedCheckCatalog,
  gate: EnabledCurrentGateRequest
): CurrentPolicyScope {
  const allSelectors = catalog.definitions.flatMap((definition) => (
    definition.recordTypes.map((recordType): RecordSelector => ({
      checkId: definition.checkId,
      recordTypeId: recordType.recordTypeId
    }))
  ));
  const selectedChecks = catalog.checks.filter((check) => check.selection === "selected");
  const selectedCheckIds = selectedChecks.map((check) => check.definition.checkId);
  const eligibleChecks = selectedChecks.filter((check) => check.applicability === "applicable");
  const comparisonCheckIds = eligibleChecks.map((check) => check.definition.checkId);
  const comparisonSelectors = gate === "all"
    ? allSelectors
    : allSelectors.filter((selector) => comparisonCheckIds.includes(selector.checkId));
  const currentReadiness = eligibleChecks.length === 0
    ? noEligibleReadiness(selectedChecks, catalog)
    : selectedCheckIds.map((checkId): ReadinessClause => ({
      readinessId: `current-${checkId}-complete`,
      predicate: { kind: "run-status", checkId, status: "completed" },
      reason: "scan-incomplete"
    }));
  return { allSelectors, comparisonCheckIds, comparisonSelectors, currentReadiness };
}

function resolveCurrentPolicyComparison(
  gate: EnabledCurrentGateRequest,
  baseline: NamedReferenceIdentity | null,
  comparisonCheckIds: readonly string[]
): CurrentPolicyComparisonResult {
  if (gate === "all") {
    return {
      ok: true,
      value: { references: [], requirements: [], predicates: [], readiness: [] }
    };
  }
  if (baseline === null) {
    return { ok: false, reason: "baseline-required" };
  }
  return {
    ok: true,
    value: {
      references: [baseline],
      requirements: [{
        referenceName: baseline.referenceName,
        checkIds: comparisonCheckIds
      }],
      predicates: [comparisonPredicate(gate, baseline.referenceName)],
      readiness: comparisonCheckIds.map((checkId): ReadinessClause => ({
        readinessId: `reference-baseline-${checkId}-complete`,
        predicate: {
          kind: "reference-status",
          checkId,
          referenceName: baseline.referenceName,
          status: "complete"
        },
        reason: "comparison-unavailable"
      }))
    }
  };
}

function comparisonPredicate(
  gate: ComparisonCurrentGateRequest,
  referenceName: string
): RecordPredicate {
  return gate === "changed"
    ? { kind: "relation-kind-in", referenceName, values: ["changed", "regression"] }
    : { kind: "relation-is", referenceName, relationId: "regression" };
}

export function resolveCurrentObservation(input: Readonly<{
  acceptedWarnings: readonly AcceptedWarningConfig[];
  catalog: ResolvedCheckCatalog;
}>): CurrentObservationAdapterResult {
  const resolved = resolveCurrentPolicy({
    acceptedWarnings: input.acceptedWarnings,
    baseline: null,
    catalog: input.catalog,
    gate: "all"
  });
  if (!resolved.ok || resolved.value.policy === null) {
    return Object.freeze({
      ok: false,
      error: Object.freeze({
        kind: "current-policy-adapter-failed",
        reason: "catalog-surface-mismatch"
      })
    });
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      acceptance: resolved.value.policy.acceptance,
      catalogFingerprint: resolved.value.catalogFingerprint,
      views: Object.freeze(resolved.value.policy.views.filter((view) => (
        view.viewId === "all-current"
      )))
    })
  });
}

function noEligibleReadiness(
  selectedChecks: readonly ResolvedCheckCatalog["checks"][number][],
  catalog: ResolvedCheckCatalog
): readonly ReadinessClause[] {
  const checkId = selectedChecks[0]?.definition.checkId ?? catalog.definitions[0]?.checkId;
  if (checkId === undefined) return [];
  return [{
    readinessId: "current-eligible",
    // A selected non-applicable (or unselected-only) catalog cannot return this status.
    predicate: { kind: "run-status", checkId, status: "failed" },
    reason: "no-eligible-input"
  }];
}

function acceptancePredicates(warning: AcceptedWarningConfig): readonly RecordPredicate[] {
  return [
    ...(warning.codeArea === undefined ? [] : [{
      kind: "operand-equals" as const,
      operandId: "codeArea",
      value: warning.codeArea
    }]),
    ...(warning.messageIncludes ?? []).map((value) => ({
      kind: "operand-includes" as const,
      operandId: "message",
      value
    })),
    ...(warning.metric === undefined ? [] : [{
      kind: "operand-equals" as const,
      operandId: "metric",
      value: warning.metric
    }]),
    ...(warning.path === undefined ? [] : [{
      kind: "operand-equals" as const,
      operandId: "path",
      value: warning.path
    }]),
    ...(warning.suggestionIncludes ?? []).map((value) => ({
      kind: "operand-includes" as const,
      operandId: "suggestion",
      value
    })),
    ...(warning.value === undefined ? [] : [{
      kind: "operand-equals" as const,
      operandId: "value",
      value: warning.value
    }])
  ];
}

function acceptedResolution(
  value: unknown,
  catalog: ResolvedCheckCatalog
): CurrentPolicyAdapterResult {
  const validated = validatePolicyResolution(value, catalog);
  return validated.ok
    ? Object.freeze({ ok: true, value: validated.value })
    : failed("catalog-surface-mismatch");
}

function failed(
  reason: "baseline-required" | "catalog-surface-mismatch"
): CurrentPolicyAdapterResult {
  return Object.freeze({
    ok: false,
    error: Object.freeze({ kind: "current-policy-adapter-failed", reason })
  });
}
