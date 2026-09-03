import type { CheckMessage } from "../../check/check.ts";
import { presentCheckFindings } from "../../check/finding-presentation.ts";
import type {
  FindingWaiverAudit,
  FindingWaiverReconciliation
} from "../../finding-waivers/reconciliation.ts";
import {
  functionMetricsWaiverIdentity,
  type FunctionInputRejectedCandidate,
  type FunctionMetricsFindingRecordData,
  type FunctionRecordCandidate
} from "./records.ts";

const PRESENTED_FINDING_LIMIT = 10;
const PRESENTED_COMPLEXITY_CONTRIBUTOR_LIMIT = 8;

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
        message: `${data.path}:${data.startLine} ${data.functionName}: ${data.metric} ${data.value} exceeds the ${data.limit} limit (areas: ${data.codeAreas.join(", ")}).${complexityContributorMessage(data)}`
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

function complexityContributorMessage(data: FunctionMetricsFindingRecordData): string {
  if (data.metric !== "cyclomatic-complexity" || data.complexityContributors === undefined)
    return "";
  const shown = data.complexityContributors.slice(0, PRESENTED_COMPLEXITY_CONTRIBUTOR_LIMIT);
  if (shown.length === 0) return "";
  const displayedContributors = shown
    .map((contributor) => `${contributor.token} at line ${contributor.line}`)
    .join(", ");
  const omittedCount = data.complexityContributors.length - shown.length;
  return omittedCount === 0
    ? ` Complexity contributors: ${displayedContributors}.`
    : ` Complexity contributors: ${displayedContributors}; ${omittedCount} additional contributor(s) are in this finding Record.`;
}

/** 将每项 function-metrics waiver audit 投影为可行动的 terminal message。 */
export function functionWaiverMessages(
  reconciliation: FindingWaiverReconciliation<FunctionRecordCandidate>
): readonly CheckMessage[] {
  return Object.freeze(reconciliation.waiverAudits.map(functionWaiverMessage));
}

function functionWaiverMessage(audit: FindingWaiverAudit): CheckMessage {
  const identity = functionMetricsWaiverIdentity(audit.waiver);
  const subject = `${identity.path}:${identity.startLine} ${identity.functionName} ${identity.metric}`;
  switch (audit.status) {
    case "applied":
      return Object.freeze({
        code: "finding-waived",
        level: "info",
        message: `Function metric finding for ${subject} was waived: ${audit.waiver.reason}`
      });
    case "unused":
      return Object.freeze({
        code: "unused-finding-waiver",
        level: "warning",
        message: `Configured function-metrics finding waiver for ${subject} matched no finding; remove it or update its identity. Reason: ${audit.waiver.reason}`
      });
    case "overmatched":
      return Object.freeze({
        code: "overmatched-finding-waiver",
        level: "warning",
        message: `Configured function-metrics finding waiver for ${subject} matched ${audit.matchCount} findings and was not applied; narrow its identity. Reason: ${audit.waiver.reason}`
      });
  }
}
