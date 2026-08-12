import type { AcceptedWarningConfig, SemanticCheckId } from "../model/schema.ts";
import type { ResolvedCheckCatalog } from "./catalog.ts";
import type {
  AcceptanceRule,
  NamedRecordView,
  NamedReferenceIdentity,
  PolicyResolution,
  RecordPredicate,
  RecordSelector
} from "./policy-model.ts";
import { validatePolicyResolution } from "./policy-validation.ts";

export type CurrentGateRequest = "all" | "changed" | "regressions" | null;

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

export function resolveCurrentPolicy(input: Readonly<{
  acceptedWarnings: readonly AcceptedWarningConfig[];
  baseline: NamedReferenceIdentity | null;
  catalog: ResolvedCheckCatalog;
  gate: CurrentGateRequest;
}>): CurrentPolicyAdapterResult {
  if (input.gate === null) {
    return acceptedResolution({ policy: null, references: [] }, input.catalog);
  }
  if (input.gate !== "all" && input.baseline === null) {
    return failed("baseline-required");
  }

  const allSelectors = input.catalog.definitions.flatMap((definition) => (
    definition.recordTypes.map((recordType): RecordSelector => ({
      checkId: definition.checkId,
      recordTypeId: recordType.recordTypeId
    }))
  ));
  const selectedChecks = input.catalog.checks.filter((check) => check.selection === "selected");
  const selectedCheckIds = selectedChecks.map((check) => check.definition.checkId);
  const eligibleChecks = selectedChecks.filter((check) => check.applicability === "applicable");
  const eligibleCheckIds = eligibleChecks.map((check) => check.definition.checkId);
  const comparisonSelectors = input.gate === "all"
    ? allSelectors
    : allSelectors.filter((selector) => eligibleCheckIds.includes(selector.checkId));
  const readiness = eligibleChecks.length === 0
    ? noEligibleReadiness(selectedChecks, input.catalog)
    : selectedCheckIds.map((checkId) => ({
      readinessId: `current-${checkId}-complete`,
      predicate: { kind: "run-status", checkId, status: "completed" },
      reason: "scan-incomplete"
    }));
  const references = input.gate === "all" ? [] : [input.baseline!];
  const comparisonCheckIds = eligibleCheckIds;
  const referenceRequirements = input.gate === "all" ? [] : [{
    referenceName: input.baseline!.referenceName,
    checkIds: comparisonCheckIds
  }];
  const relationPredicates = input.gate === "all" ? [] : [input.gate === "changed"
    ? {
      kind: "relation-kind-in" as const,
      referenceName: input.baseline!.referenceName,
      values: ["changed", "regression"]
    }
    : {
      kind: "relation-is" as const,
      referenceName: input.baseline!.referenceName,
      relationId: "regression"
    }];
  const policy = {
    policyId: input.gate,
    references: referenceRequirements,
    acceptance: input.acceptedWarnings.map((warning, index) => ({
      acceptanceId: `accepted-warning-${index + 1}`,
      reason: warning.reason,
      selector: SELECTOR_BY_SEMANTIC_CHECK_ID[warning.checkId],
      predicates: acceptancePredicates(warning)
    })),
    views: [{
      viewId: "all-current",
      selectors: allSelectors,
      acceptance: "all",
      predicates: []
    }, {
      viewId: `${input.gate}-unaccepted`,
      selectors: comparisonSelectors,
      acceptance: "unaccepted",
      predicates: relationPredicates
    }],
    readiness: [
      ...readiness,
      ...(input.gate === "all" ? [] : comparisonCheckIds.map((checkId) => ({
        readinessId: `reference-baseline-${checkId}-complete`,
        predicate: {
          kind: "reference-status",
          checkId,
          referenceName: input.baseline!.referenceName,
          status: "complete"
        },
        reason: "comparison-unavailable"
      })))
    ],
    blockWhen: { kind: "view-not-empty", viewId: `${input.gate}-unaccepted` }
  };
  return acceptedResolution({ policy, references }, input.catalog);
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
) {
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
