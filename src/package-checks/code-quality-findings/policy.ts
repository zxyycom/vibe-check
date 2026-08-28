import type { CheckResult } from "../../check/check.ts";

export const FINDING_POLICIES = Object.freeze(["blocking", "non-blocking"] as const);

/** 三个基于区域的代码质量 Check 共用的 finding 阻断策略。 */
export type FindingPolicy = (typeof FINDING_POLICIES)[number];

export const DEFAULT_FINDING_POLICY: FindingPolicy = "blocking";

/** 三个代码质量 Check 正常完成时返回的精确 finding 计数。 */
export interface FindingSummary {
  readonly blockingFindingCount: number;
  readonly findingCount: number;
}

export function resolveFindingPolicy(
  value: unknown,
  fallback: FindingPolicy = DEFAULT_FINDING_POLICY
): FindingPolicy | undefined {
  if (value === undefined) return fallback;
  return FINDING_POLICIES.find((policy) => policy === value);
}

export function validFindingPolicy(value: unknown): value is FindingPolicy {
  return FINDING_POLICIES.some((policy) => policy === value);
}

export function isBlockingFinding(policies: readonly FindingPolicy[]): boolean {
  return policies.some((policy) => policy === "blocking");
}

export function settleFindings(blockingStates: readonly boolean[]): CheckResult<FindingSummary> {
  const blockingFindingCount = blockingStates.filter((isBlocking) => isBlocking).length;
  return Object.freeze({
    status: blockingFindingCount > 0 ? "failed" : "passed",
    data: Object.freeze({
      blockingFindingCount,
      findingCount: blockingStates.length
    })
  });
}
