import type {
  RunControlDiagnostic,
  RunControlValidationResult
} from "./controls/validation-result.ts";
import type { CheckAggregate, CheckAggregation } from "./controls/contract.ts";
import type { CoreCheck, CoreSnapshot } from "../check-settlement/facts.ts";

type AggregateStatus = Exclude<CheckAggregate, "not-applicable">;

/** Validates that aggregation selects only normalized executable Check IDs. */
export function validateCheckAggregationSelection(
  aggregation: CheckAggregation | undefined,
  checkIds: readonly string[]
): RunControlValidationResult<CheckAggregation | undefined> {
  if (aggregation === undefined) return Object.freeze({ ok: true, value: undefined });
  if (aggregation.checks === "all") return Object.freeze({ ok: true, value: aggregation });
  const knownCheckIds = new Set(checkIds);
  const selectedCheckIds = new Set<string>();
  for (const checkId of aggregation.checks) {
    if (!knownCheckIds.has(checkId) || selectedCheckIds.has(checkId)) {
      return invalidControls("controls.checkAggregation.checks");
    }
    selectedCheckIds.add(checkId);
  }
  return Object.freeze({ ok: true, value: aggregation });
}

/** Derives one explicit consumer-selected aggregate from settled Check statuses only. */
export function aggregateCheckOutcomes(
  snapshot: CoreSnapshot,
  aggregation: CheckAggregation
): CheckAggregate {
  const statuses = selectedChecks(snapshot, aggregation.checks).map((check) =>
    aggregateStatus(check, aggregation)
  );
  if (statuses.includes("unavailable")) return "unavailable";
  return aggregateSelectedStatuses(
    statuses.filter(
      (status): status is Exclude<AggregateStatus, "unavailable"> =>
        status !== null && status !== "unavailable"
    ),
    aggregation
  );
}

function selectedChecks(
  snapshot: CoreSnapshot,
  selection: CheckAggregation["checks"]
): readonly CoreCheck[] {
  if (selection === "all") return snapshot.checks;
  return selection.map((checkId) => {
    const check = snapshot.checks.find((candidate) => candidate.checkId === checkId);
    if (check === undefined) throw new TypeError("Aggregation selection was not validated");
    return check;
  });
}

function aggregateStatus(check: CoreCheck, aggregation: CheckAggregation): AggregateStatus | null {
  switch (check.outcome.status) {
    case "passed":
    case "failed":
      return check.outcome.status;
    case "unavailable": {
      if (aggregation.unavailable === "propagate") return "unavailable";
      return aggregation.unavailable === "fail" ? "failed" : null;
    }
    case "not-applicable": {
      if (aggregation.notApplicable === "pass") return "passed";
      return aggregation.notApplicable === "fail" ? "failed" : null;
    }
  }
}

function aggregateSelectedStatuses(
  statuses: readonly Exclude<AggregateStatus, "unavailable">[],
  aggregation: CheckAggregation
): CheckAggregate {
  if (statuses.length === 0) return aggregation.empty;
  if (aggregation.mode === "all") return statuses.includes("failed") ? "failed" : "passed";
  return statuses.includes("passed") ? "passed" : "failed";
}

function invalidControls(path: string): RunControlValidationResult<never> {
  const error: RunControlDiagnostic = Object.freeze({
    kind: "invalid-run-controls",
    path,
    reason: "invalid-value"
  });
  return Object.freeze({ ok: false, error });
}
