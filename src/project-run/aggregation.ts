import type { CoreCheck, CoreSnapshot } from "../check-settlement/facts.ts";
import type { CheckAggregate, CheckAggregation } from "./controls/contract.ts";

/** Identifies a callback failure so the invocation boundary can close outputs before rethrowing it. */
export class CheckAggregationFailure extends Error {
  readonly originalError: Error;

  public constructor(originalError: Error) {
    super("Check aggregation failed", { cause: originalError });
    this.originalError = originalError;
  }
}

/** Builds the canonical ordered, read-only effective Check list and derives its invocation aggregate. */
export function aggregateEffectiveChecks(
  snapshot: CoreSnapshot,
  effectiveCheckIds: readonly string[],
  aggregation: CheckAggregation | undefined
): CheckAggregate {
  const checks = effectiveChecks(snapshot, effectiveCheckIds);
  return aggregation === undefined
    ? strictAggregate(checks)
    : invokeAggregation(aggregation, checks);
}

function effectiveChecks(
  snapshot: CoreSnapshot,
  effectiveCheckIds: readonly string[]
): readonly CoreCheck[] {
  const effectiveCheckIdSet = new Set(effectiveCheckIds);
  return Object.freeze(snapshot.checks.filter((check) => effectiveCheckIdSet.has(check.checkId)));
}

function strictAggregate(checks: readonly CoreCheck[]): CheckAggregate {
  return checks.length > 0 && checks.every((check) => check.outcome.status === "passed")
    ? "passed"
    : "failed";
}

function invokeAggregation(
  aggregation: CheckAggregation,
  checks: readonly CoreCheck[]
): CheckAggregate {
  let aggregate: unknown;
  try {
    aggregate = aggregation(checks);
  } catch (error) {
    throw new CheckAggregationFailure(errorFromThrownValue(error));
  }
  if (isCheckAggregate(aggregate)) return aggregate;
  discardPromiseRejection(aggregate);
  throw new CheckAggregationFailure(
    new TypeError("Check aggregation must synchronously return a CheckAggregate")
  );
}

function isCheckAggregate(value: unknown): value is CheckAggregate {
  return (
    value === "passed" ||
    value === "failed" ||
    value === "not-applicable" ||
    value === "unavailable"
  );
}

function discardPromiseRejection(value: unknown): void {
  if (value instanceof Promise) void value.catch(() => undefined);
}

function errorFromThrownValue(value: unknown): Error {
  return value instanceof Error ? value : new Error("Check aggregation threw a non-Error value");
}
