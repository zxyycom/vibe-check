import type { CheckMessage, CheckResult } from "../../check/check.ts";

const PRESENTED_FINDING_LIMIT = 10;

/**
 * Projects an already stable Finding order into a bounded set of Check-owned messages.
 * The caller continues to own every message field and the full Finding facts.
 */
export function boundedFindingMessages<Finding>(input: {
  readonly findings: readonly Finding[];
  readonly message: (finding: Finding) => CheckMessage;
  readonly omittedMessage: (omittedFindings: readonly Finding[]) => CheckMessage;
}): readonly CheckMessage[] {
  if (input.findings.length === 0) return Object.freeze([]);

  const messages = input.findings
    .slice(0, PRESENTED_FINDING_LIMIT)
    .map((finding) => Object.freeze({ ...input.message(finding) }));
  const omittedFindings = Object.freeze(input.findings.slice(PRESENTED_FINDING_LIMIT));
  if (omittedFindings.length > 0) {
    messages.push(Object.freeze({ ...input.omittedMessage(omittedFindings) }));
  }
  return Object.freeze(messages);
}

/** Appends Check-owned Finding presentation without changing the owning terminal result. */
export function appendFindingMessages<Data extends object>(
  result: CheckResult<Data>,
  messages: readonly CheckMessage[]
): CheckResult<Data> {
  if (messages.length === 0) return result;
  return Object.freeze({
    ...result,
    messages: Object.freeze([...(result.messages ?? []), ...messages])
  });
}
