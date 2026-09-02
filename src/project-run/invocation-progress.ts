import type { CoreSnapshot } from "../check-settlement/facts.ts";
import type { CheckExecutionClock } from "./check-execution/resolved-checks.ts";

/** Forms the terminal progress counters without changing Core Check facts. */
export function outcomeCounts(snapshot: CoreSnapshot): Readonly<{
  readonly failed: number;
  readonly notApplicable: number;
  readonly passed: number;
  readonly unavailable: number;
}> {
  let failed = 0;
  let notApplicable = 0;
  let passed = 0;
  let unavailable = 0;
  for (const check of snapshot.checks) {
    switch (check.outcome.status) {
      case "passed":
        passed += 1;
        break;
      case "failed":
        failed += 1;
        break;
      case "not-applicable":
        notApplicable += 1;
        break;
      case "unavailable":
        unavailable += 1;
        break;
    }
  }
  return Object.freeze({ failed, notApplicable, passed, unavailable });
}

/** Converts the invocation monotonic clock into a safe progress duration. */
export function elapsedSince(startedAt: number, clock: CheckExecutionClock): number {
  const elapsed = clock.now() - startedAt;
  return Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : 0;
}
