import type { CheckResult } from "../../check/check.ts";

type CheckMessage = NonNullable<CheckResult["messages"]>[number];

/**
 * 将 Check-owned Finding 投影为有界 terminal messages 所需的超限上下文。
 * 完整 Finding facts 与深入查看位置继续由调用方拥有。
 */
export interface FindingOverflowContext<Finding> {
  readonly omittedFindings: readonly Finding[];
  readonly omittedCount: number;
  readonly presentedCount: number;
  readonly totalCount: number;
}

/**
 * 将调用方已经稳定排序的 Finding 投影为有界 Check messages。
 *
 * 调用方设置 `limit`，通过两个回调决定公开字段、消息等级及完整明细位置；helper 只负责有界投影。
 * `limit` 只限制明细数，省略汇总额外占一条；非空输入且 `limit: 0` 时仍返回一条汇总。
 * 空 Finding 集合不调用任一回调；非法 `limit` 在回调执行前抛出 `TypeError`。
 *
 * @see [输入与投影](../../../docs/guides/presenting-findings.md#输入与投影)
 */
export function presentCheckFindings<Finding>(input: {
  /** 调用方已稳定排序的 Finding 集合。 */
  readonly findings: readonly Finding[];
  /** 明细 message 上限；须为非负 safe integer，不含额外的省略汇总。 */
  readonly limit: number;
  /** 为前 `limit` 项各生成一条明细；index 是该 Finding 在输入中的零基索引。 */
  readonly message: (finding: Finding, index: number) => CheckMessage;
  /** 仅有省略项时调用一次，生成汇总；可按原省略项引用与计数决定等级及完整明细位置。 */
  readonly omittedMessage: (context: FindingOverflowContext<Finding>) => CheckMessage;
}): readonly CheckMessage[] {
  assertFindingLimit(input.limit);
  if (input.findings.length === 0) return Object.freeze([]);

  const presentedFindings = input.findings.slice(0, input.limit);
  const messages = presentedFindings.map((finding, index) =>
    Object.freeze({ ...input.message(finding, index) })
  );
  const omittedFindings = Object.freeze(input.findings.slice(input.limit));
  if (omittedFindings.length > 0) {
    messages.push(
      Object.freeze({
        ...input.omittedMessage(
          Object.freeze({
            omittedFindings,
            omittedCount: omittedFindings.length,
            presentedCount: presentedFindings.length,
            totalCount: input.findings.length
          })
        )
      })
    );
  }
  return Object.freeze(messages);
}

/** Appends presentation-only messages without changing the owning terminal result. */
export function appendCheckMessages<Data extends object>(
  result: CheckResult<Data>,
  messages: readonly CheckMessage[]
): CheckResult<Data> {
  if (messages.length === 0) return result;
  return Object.freeze({
    ...result,
    messages: Object.freeze([...(result.messages ?? []), ...messages])
  });
}

function assertFindingLimit(limit: number): void {
  if (!Number.isSafeInteger(limit) || limit < 0) {
    throw new TypeError("Finding presentation limit must be a non-negative safe integer");
  }
}
