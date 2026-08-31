import type { CheckMessage } from "../../check/check.ts";
import { presentCheckFindings } from "../../check/finding-presentation.ts";
import type { FunctionInputRejectedCandidate, FunctionRecordCandidate } from "./records.ts";

const PRESENTED_FINDING_LIMIT = 10;

type FunctionFindingCandidate = FunctionRecordCandidate | FunctionInputRejectedCandidate;

/** Projects metric and rejected-input Records into bounded terminal summaries. */
export function functionFindingMessages(
  findings: readonly FunctionFindingCandidate[]
): readonly CheckMessage[] {
  return presentCheckFindings({
    findings,
    limit: PRESENTED_FINDING_LIMIT,
    message: ({ data }) => {
      if ("kind" in data) {
        return Object.freeze({
          code: "finding-detail",
          level: "warning" as const,
          message: `${data.path}: selected input is not supported by function metrics (areas: ${data.codeAreas.join(", ")}).`
        });
      }
      return Object.freeze({
        code: "finding-detail",
        level: data.blocking ? ("error" as const) : ("warning" as const),
        message: `${data.path}:${data.startLine} ${data.functionName}: ${data.metric} ${data.value} exceeds the ${data.limit} limit (areas: ${data.codeAreas.join(", ")}).`
      });
    },
    omittedMessage: ({ omittedCount, omittedFindings }) =>
      Object.freeze({
        code: "findings-omitted",
        level: omittedFindings.some(({ data }) => !("kind" in data) && data.blocking)
          ? ("error" as const)
          : ("warning" as const),
        message: `${omittedCount} additional function metric finding(s) were not shown; inspect this Check's Records for the complete set.`
      })
  });
}
