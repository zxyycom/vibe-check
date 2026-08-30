import type { CheckMessage, CheckResult } from "../../check/check.ts";

export const FINDING_POLICIES = Object.freeze(["blocking", "non-blocking"] as const);

/** package-provided Check 用于结算 normal finding 的阻断策略。 */
export type FindingPolicy = (typeof FINDING_POLICIES)[number];

export const DEFAULT_FINDING_POLICY: FindingPolicy = "non-blocking";

/** 三个代码质量 Check 正常完成时返回的精确 finding 计数。 */
export interface FindingSummary {
  readonly blockingFindingCount: number;
  readonly findingCount: number;
}

/** 一项 finding 在 Check 自己结算前的领域中性处置。 */
export interface FindingSettlement {
  /** 该 finding 是否仍需要进入该 Check 的正常 finding 结算。 */
  readonly actionable: boolean;
  readonly blocking: boolean;
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

export function settleFindings(
  findings: readonly FindingSettlement[]
): CheckResult<FindingSummary> {
  const blockingFindingCount = findings.filter(
    (finding) => finding.actionable && finding.blocking
  ).length;
  const findingCount = findings.length;
  const actionableNonBlockingFindingCount = findings.filter(
    (finding) => finding.actionable && !finding.blocking
  ).length;
  const messages = findingMessages({ actionableNonBlockingFindingCount, blockingFindingCount });
  return Object.freeze({
    status: blockingFindingCount > 0 ? "failed" : "passed",
    data: Object.freeze({
      blockingFindingCount,
      findingCount
    }),
    ...(messages.length === 0 ? {} : { messages })
  });
}

function findingMessages(
  summary: Readonly<{
    readonly actionableNonBlockingFindingCount: number;
    readonly blockingFindingCount: number;
  }>
): readonly CheckMessage[] {
  if (summary.blockingFindingCount > 0) {
    return Object.freeze([
      Object.freeze({
        code: "blocking-findings",
        level: "error",
        message: `${summary.blockingFindingCount} blocking finding(s) require attention; inspect this Check's Records for affected paths and measurements, then update the code or policy.`
      })
    ]);
  }
  if (summary.actionableNonBlockingFindingCount > 0) {
    return Object.freeze([
      Object.freeze({
        code: "non-blocking-findings",
        level: "warning",
        message: `${summary.actionableNonBlockingFindingCount} non-blocking finding(s) were recorded; inspect this Check's Records for affected paths and measurements, then update the code or policy.`
      })
    ]);
  }
  return Object.freeze([]);
}
