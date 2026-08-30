import type { CheckMessage, CheckResult } from "../../check/check.ts";

import type { MarkdownLinkValidationFinalData } from "./final-data.ts";
import type { ResolvedMarkdownLinkValidationOptions } from "./options.ts";

/** Materializes one completed source traversal into its Check-owned final result. */
export function settledMarkdownTraversalResult(
  input: Readonly<{
    readonly findingCount: number;
    readonly findingPolicy: ResolvedMarkdownLinkValidationOptions["findingPolicy"];
    readonly occurrenceCount: number;
    readonly rejectedInputCount: number;
    readonly sourceFileCount: number;
    readonly targetReadCount: number;
  }>
): CheckResult<MarkdownLinkValidationFinalData> {
  const data = Object.freeze({
    sourceFileCount: input.sourceFileCount,
    occurrenceCount: input.occurrenceCount,
    targetReadCount: input.targetReadCount,
    findingCount: input.findingCount + input.rejectedInputCount,
    rejectedInputCount: input.rejectedInputCount
  });
  const messages: CheckMessage[] = [];
  if (input.findingCount > 0) messages.push(linkFindingMessage(input));
  if (input.rejectedInputCount > 0) messages.push(rejectedInputMessage(input.rejectedInputCount));
  if (messages.length === 0) return Object.freeze({ data, status: "passed" });
  const isBlocking = input.findingPolicy === "blocking";
  return Object.freeze({
    data,
    messages: Object.freeze(messages),
    status: isBlocking && input.findingCount > 0 ? "failed" : "passed"
  });
}

function linkFindingMessage(
  input: Readonly<{
    readonly findingCount: number;
    readonly findingPolicy: ResolvedMarkdownLinkValidationOptions["findingPolicy"];
  }>
): CheckMessage {
  const isBlocking = input.findingPolicy === "blocking";
  return Object.freeze({
    code: "invalid-local-links",
    level: isBlocking ? ("error" as const) : ("warning" as const),
    message: isBlocking
      ? `${input.findingCount} local Markdown link finding(s) require attention; inspect this Check's Records for source ranges, targets, and reasons.`
      : `${input.findingCount} local Markdown link finding(s) were recorded as non-blocking; inspect this Check's Records for source ranges, targets, and reasons.`
  });
}

function rejectedInputMessage(rejectedInputCount: number): CheckMessage {
  return Object.freeze({
    code: "input-rejected",
    level: "warning" as const,
    message: `${rejectedInputCount} selected markdownLinkValidation input file(s) were rejected because only .md/.markdown paths are supported; inspect this Check's Records and narrow files.include/exclude.`
  });
}
