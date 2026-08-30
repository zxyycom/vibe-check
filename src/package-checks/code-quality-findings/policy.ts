import type { CheckMessage, CheckResult } from "../../check/check.ts";

export const FINDING_POLICIES = Object.freeze(["blocking", "non-blocking"] as const);

/** package-provided Check 用于结算 normal finding 的阻断策略。 */
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
  const findingCount = blockingStates.length;
  const messages = findingMessages({ blockingFindingCount, findingCount });
  return Object.freeze({
    status: blockingFindingCount > 0 ? "failed" : "passed",
    data: Object.freeze({
      blockingFindingCount,
      findingCount
    }),
    ...(messages.length === 0 ? {} : { messages })
  });
}

function findingMessages(summary: FindingSummary): readonly CheckMessage[] {
  if (summary.blockingFindingCount > 0) {
    return Object.freeze([
      Object.freeze({
        code: "blocking-findings",
        level: "error",
        message: `${summary.blockingFindingCount} blocking finding(s) require attention; inspect this Check's Records for affected paths and measurements, then update the code or policy.`
      })
    ]);
  }
  if (summary.findingCount > 0) {
    return Object.freeze([
      Object.freeze({
        code: "non-blocking-findings",
        level: "warning",
        message: `${summary.findingCount} non-blocking finding(s) were recorded; inspect this Check's Records for affected paths and measurements, then update the code or policy.`
      })
    ]);
  }
  return Object.freeze([]);
}
