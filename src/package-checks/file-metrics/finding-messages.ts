import type { CheckMessage } from "../../check/check.ts";
import { presentCheckFindings } from "../../check/finding-presentation.ts";
import type { FileRecordCandidate } from "./records.ts";

const PRESENTED_FINDING_LIMIT = 10;

/** Projects actionable file-metric Records into bounded terminal summaries. */
export function fileMetricFindingMessages(
  findings: readonly FileRecordCandidate[]
): readonly CheckMessage[] {
  return presentCheckFindings({
    findings,
    limit: PRESENTED_FINDING_LIMIT,
    message: ({ data }) =>
      Object.freeze({
        code: "finding-detail",
        level: data.blocking ? ("error" as const) : ("warning" as const),
        message: `${data.path}: ${data.codeLines} code lines exceeds the ${data.limit} line limit (areas: ${data.codeAreas.join(", ")}).`
      }),
    omittedMessage: ({ omittedCount, omittedFindings }) =>
      Object.freeze({
        code: "findings-omitted",
        level: omittedFindings.some(({ data }) => data.blocking)
          ? ("error" as const)
          : ("warning" as const),
        message: `${omittedCount} additional file metric finding(s) were not shown; inspect this Check's Records for the complete set.`
      })
  });
}
