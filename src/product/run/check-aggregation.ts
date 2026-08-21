import type {
  CheckAggregate,
  CheckAggregation,
  ProjectDefinitionDiagnostic,
  ValidationResult
} from "../definition/project.ts";
import type { CoreSnapshot } from "../quality-core/check-record/model.ts";

/** Validates that aggregation selects only normalized executable Check IDs. */
export function validateCheckAggregationSelection(
  aggregation: CheckAggregation | undefined,
  checkIds: readonly string[]
): ValidationResult<CheckAggregation | undefined> {
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
  const selected =
    aggregation.checks === "all"
      ? snapshot.checks
      : aggregation.checks.map((checkId) => {
          const check = snapshot.checks.find((candidate) => candidate.checkId === checkId);
          if (check === undefined) throw new TypeError("Aggregation selection was not validated");
          return check;
        });
  const statuses: ("passed" | "failed")[] = [];
  for (const check of selected) {
    switch (check.outcome.status) {
      case "passed":
      case "failed":
        statuses.push(check.outcome.status);
        break;
      case "unavailable":
        if (aggregation.unavailable === "propagate") return "unavailable";
        if (aggregation.unavailable === "fail") statuses.push("failed");
        break;
      case "not-applicable":
        if (aggregation.notApplicable === "pass") statuses.push("passed");
        if (aggregation.notApplicable === "fail") statuses.push("failed");
        break;
    }
  }
  if (statuses.length === 0) return aggregation.empty;
  if (aggregation.mode === "all") {
    return statuses.includes("failed") ? "failed" : "passed";
  }
  return statuses.includes("passed") ? "passed" : "failed";
}

function invalidControls(path: string): ValidationResult<never> {
  const error: ProjectDefinitionDiagnostic = Object.freeze({
    kind: "invalid-run-controls",
    path,
    reason: "invalid-value"
  });
  return Object.freeze({ ok: false, error });
}
