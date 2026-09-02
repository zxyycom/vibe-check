import type { CheckMessage } from "../../check/check.ts";
import { presentCheckFindings } from "../../check/finding-presentation.ts";
import type {
  FindingWaiverAudit,
  FindingWaiverReconciliation
} from "../../finding-waivers/reconciliation.ts";
import type { DuplicateDetectionFindingLocation } from "./options.ts";
import { duplicateDetectionWaiverIdentity, type DuplicateRecordCandidate } from "./records.ts";

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
        message: `Duplicate fragment contains ${data.tokenCount} tokens across ${data.lineCount} lines at ${duplicateLocationSummary(data.locations)}.`
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

/** 将每项 duplicate-detection waiver audit 投影为可行动的 terminal message。 */
export function duplicateWaiverMessages(
  reconciliation: FindingWaiverReconciliation<DuplicateRecordCandidate>
): readonly CheckMessage[] {
  return Object.freeze(reconciliation.waiverAudits.map(duplicateWaiverMessage));
}

function duplicateWaiverMessage(audit: FindingWaiverAudit): CheckMessage {
  const identity = duplicateDetectionWaiverIdentity(audit.waiver);
  const subject = duplicateLocationSummary(identity.locations);
  switch (audit.status) {
    case "applied":
      return Object.freeze({
        code: "finding-waived",
        level: "info",
        message: `Duplicate finding at ${subject} was waived: ${audit.waiver.reason}`
      });
    case "unused":
      return Object.freeze({
        code: "unused-finding-waiver",
        level: "warning",
        message: `Configured duplicate-detection finding waiver at ${subject} matched no finding; remove it or update its identity. Reason: ${audit.waiver.reason}`
      });
    case "overmatched":
      return Object.freeze({
        code: "overmatched-finding-waiver",
        level: "warning",
        message: `Configured duplicate-detection finding waiver at ${subject} matched ${audit.matchCount} findings and was not applied; narrow its identity. Reason: ${audit.waiver.reason}`
      });
  }
}

function duplicateLocationSummary(locations: readonly DuplicateDetectionFindingLocation[]): string {
  const presented = locations
    .slice(0, 2)
    .map(({ endLine, path, startLine }) => `${path}:${startLine}-${endLine}`)
    .join(", ");
  const omitted = locations.length - 2;
  return omitted > 0 ? `${presented}, and ${omitted} more location(s)` : presented;
}
