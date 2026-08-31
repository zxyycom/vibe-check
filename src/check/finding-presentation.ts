import type { CheckMessage, CheckResult } from "./check.ts";

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
 * `limit`、安全字段和超限后的深入查看说明都由 producing Check 决定。Product 不读取 Finding
 * shape，也不猜测完整明细位于 Records、artifact、transcript 或其它位置。
 */
export function presentCheckFindings<Finding>(input: {
  readonly findings: readonly Finding[];
  readonly limit: number;
  readonly message: (finding: Finding, index: number) => CheckMessage;
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
