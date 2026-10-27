import { isNonArrayRecord } from "../../../value-guards.ts";

import type { ProjectGateSelection } from "./controls.ts";

export type ProjectGatePerformanceProfile = Exclude<
  ProjectGateSelection["kind"],
  "focused" | "scoped"
>;

export interface ProjectGatePerformanceBudget {
  readonly maxElapsedMs: number;
  readonly maxMeanCheckMs: number;
  readonly maxP95CheckMs: number;
}

/** One version-controlled policy for every runtime; no invocation-local overrides. */
export type ProjectGatePerformancePolicy = Readonly<
  Record<ProjectGatePerformanceProfile, ProjectGatePerformanceBudget>
>;

export const PROJECT_GATE_PERFORMANCE_POLICY: ProjectGatePerformancePolicy = Object.freeze({
  fast: Object.freeze({ maxElapsedMs: 30000, maxMeanCheckMs: 2000, maxP95CheckMs: 5000 }),
  changed: Object.freeze({ maxElapsedMs: 30000, maxMeanCheckMs: 2000, maxP95CheckMs: 5000 }),
  all: Object.freeze({ maxElapsedMs: 90000, maxMeanCheckMs: 2000, maxP95CheckMs: 5000 })
});

/** Rejects invalid standard-profile policy before candidate preparation; partial selections use no standard budget. */
export function preflightPerformancePolicy(
  selection: ProjectGateSelection,
  load: () => unknown
): ProjectGatePerformancePolicy | undefined {
  if (selection.kind === "focused" || selection.kind === "scoped")
    return PROJECT_GATE_PERFORMANCE_POLICY;
  try {
    const policy = load();
    if (isPerformancePolicy(policy)) return policy;
  } catch {
    console.error("project gate performance policy could not be loaded");
    return undefined;
  }
  console.error("project gate performance policy is invalid: repair runtime/performance-policy.ts");
  return undefined;
}

function isPerformancePolicy(value: unknown): value is ProjectGatePerformancePolicy {
  if (!isNonArrayRecord(value) || !hasExactKeys(value, ["fast", "changed", "all"])) return false;
  return Object.values(value).every(
    (budget: unknown) =>
      isNonArrayRecord(budget) &&
      hasExactKeys(budget, ["maxElapsedMs", "maxMeanCheckMs", "maxP95CheckMs"]) &&
      Object.values(budget).every(
        (limit: unknown) => typeof limit === "number" && Number.isSafeInteger(limit) && limit > 0
      )
  );
}

function hasExactKeys(
  value: Readonly<Record<string, unknown>>,
  expected: readonly string[]
): boolean {
  const actual = Object.keys(value);
  return actual.length === expected.length && expected.every((key) => Object.hasOwn(value, key));
}
