import type { CheckMessage } from "../../check/check.ts";
import { presentCheckFindings } from "../../check/finding-presentation.ts";
import type { DuplicateDetectionRecordData, DuplicateRecordCandidate } from "./records.ts";

const PRESENTED_FINDING_LIMIT = 10;

/** Projects duplicate Records into bounded, project-relative terminal summaries. */
export function duplicateFindingMessages(
  candidates: readonly DuplicateRecordCandidate[]
): readonly CheckMessage[] {
  return presentCheckFindings({
    findings: candidates,
    limit: PRESENTED_FINDING_LIMIT,
    message: ({ data }) =>
      Object.freeze({
        code: "finding-detail",
        level: data.blocking ? ("error" as const) : ("warning" as const),
        message: `Duplicate fragment contains ${data.tokenCount} tokens across ${data.lineCount} lines at ${duplicateLocations(data.locations)}.`
      }),
    omittedMessage: ({ omittedCount, omittedFindings }) =>
      Object.freeze({
        code: "findings-omitted",
        level: omittedFindings.some(({ data }) => data.blocking)
          ? ("error" as const)
          : ("warning" as const),
        message: `${omittedCount} additional duplicate finding(s) were not shown; inspect this Check's Records for the complete set.`
      })
  });
}

function duplicateLocations(locations: DuplicateDetectionRecordData["locations"]): string {
  const presented = locations
    .slice(0, 2)
    .map(({ endLine, path, startLine }) => `${path}:${startLine}-${endLine}`)
    .join(", ");
  const omitted = locations.length - 2;
  return omitted > 0 ? `${presented}, and ${omitted} more location(s)` : presented;
}
