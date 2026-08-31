import type { CheckMessage } from "../../check/check.ts";
import { boundedFindingMessages } from "../finding-presentation/bounded-messages.ts";
import type { FunctionInputRejectedCandidate, FunctionRecordCandidate } from "./records.ts";

type FunctionFindingCandidate = FunctionRecordCandidate | FunctionInputRejectedCandidate;

/** Projects metric and rejected-input Records into bounded terminal summaries. */
export function functionFindingMessages(
  findings: readonly FunctionFindingCandidate[]
): readonly CheckMessage[] {
  return boundedFindingMessages({
    findings,
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
    omittedMessage: (omittedFindings) =>
      Object.freeze({
        code: "findings-omitted",
        level: omittedFindings.some(({ data }) => !("kind" in data) && data.blocking)
          ? ("error" as const)
          : ("warning" as const),
        message: `${omittedFindings.length} additional function metric finding(s) were not shown; inspect this Check's Records for the complete set.`
      })
  });
}
