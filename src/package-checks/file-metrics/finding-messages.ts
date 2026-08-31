import type { CheckMessage } from "../../check/check.ts";
import { boundedFindingMessages } from "../finding-presentation/bounded-messages.ts";
import type { FileRecordCandidate } from "./records.ts";

/** Projects actionable file-metric Records into bounded terminal summaries. */
export function fileMetricFindingMessages(
  findings: readonly FileRecordCandidate[]
): readonly CheckMessage[] {
  return boundedFindingMessages({
    findings,
    message: ({ data }) =>
      Object.freeze({
        code: "finding-detail",
        level: data.blocking ? ("error" as const) : ("warning" as const),
        message: `${data.path}: ${data.codeLines} code lines exceeds the ${data.limit} line limit (areas: ${data.codeAreas.join(", ")}).`
      }),
    omittedMessage: (omittedFindings) =>
      Object.freeze({
        code: "findings-omitted",
        level: omittedFindings.some(({ data }) => data.blocking)
          ? ("error" as const)
          : ("warning" as const),
        message: `${omittedFindings.length} additional file metric finding(s) were not shown; inspect this Check's Records for the complete set.`
      })
  });
}
