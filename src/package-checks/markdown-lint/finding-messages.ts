import type { CheckMessage } from "../../check/check.ts";
import { presentCheckFindings } from "../../package-tools/finding-presentation/finding-presentation.ts";
import type {
  FindingWaiverAudit,
  FindingWaiverReconciliation
} from "../../package-tools/finding-waivers/reconciliation.ts";
import { markdownLintWaiverIdentity, type MarkdownLintRecordCandidate } from "./records.ts";

const SUMMARY: Readonly<Record<MarkdownLintRecordCandidate["data"]["rule"], string>> = {
  "heading-increment": "heading levels may increase by only one level",
  "no-reversed-links": "reversed link syntax is not supported",
  "no-missing-space-atx": "ATX heading markers require a following space",
  "fenced-code-language": "fenced code blocks require a language",
  "no-empty-links": "links require a non-empty destination",
  "no-alt-text": "images require alternative text",
  "link-fragments": "same-document fragments must match a heading",
  "reference-links-images": "reference links and images require a definition",
  "table-column-count": "pipe table rows must have a consistent column count"
};

export function markdownLintFindingMessages(
  candidates: readonly MarkdownLintRecordCandidate[],
  rejectedPaths: readonly string[],
  blocking: boolean
): readonly CheckMessage[] {
  const findings = [
    ...candidates.map((candidate) => Object.freeze({ kind: "lint" as const, candidate })),
    ...rejectedPaths.map((path) => Object.freeze({ kind: "rejected" as const, path }))
  ];
  return presentCheckFindings({
    findings,
    limit: 10,
    message: (finding) => {
      if (finding.kind === "rejected") {
        return Object.freeze({
          code: "finding-detail",
          level: "warning" as const,
          message: `${finding.path}: selected input is not a supported Markdown source.`
        });
      }
      const { path, range, rule } = finding.candidate.data;
      return Object.freeze({
        code: "finding-detail",
        level: blocking ? ("error" as const) : ("warning" as const),
        message: `${path}:${range.start.line}:${range.start.column} ${rule}: ${SUMMARY[rule]}.`
      });
    },
    omittedMessage: ({ omittedCount }) =>
      Object.freeze({
        code: "findings-omitted",
        level: blocking ? ("error" as const) : ("warning" as const),
        message: `${omittedCount} additional Markdown lint finding(s) were not shown; inspect this Check's Records for the complete set.`
      })
  });
}

/** Explains every configured waiver without turning accepted findings into error messages. */
export function markdownLintWaiverMessages(
  reconciliation: FindingWaiverReconciliation<MarkdownLintRecordCandidate>
): readonly CheckMessage[] {
  return Object.freeze(reconciliation.waiverAudits.map(markdownLintWaiverMessage));
}

function markdownLintWaiverMessage(audit: FindingWaiverAudit): CheckMessage {
  const { path, rule, range } = markdownLintWaiverIdentity(audit.waiver);
  const subject = `${path}:${range.start.line}:${range.start.column}-${range.end.column} ${rule}`;
  switch (audit.status) {
    case "applied":
      return Object.freeze({
        code: "finding-waived",
        level: "info",
        message: `Markdown lint finding for ${subject} was waived: ${audit.waiver.reason}`
      });
    case "unused":
      return Object.freeze({
        code: "unused-finding-waiver",
        level: "warning",
        message: `Configured markdown-lint finding waiver for ${subject} matched no finding; remove it or update its identity. Reason: ${audit.waiver.reason}`
      });
    case "overmatched":
      return Object.freeze({
        code: "overmatched-finding-waiver",
        level: "warning",
        message: `Configured markdown-lint finding waiver for ${subject} matched ${audit.matchCount} findings and was not applied; inspect the duplicate identities. Reason: ${audit.waiver.reason}`
      });
  }
}
