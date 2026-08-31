import type { CheckMessage } from "../../check/check.ts";
import { presentCheckFindings } from "../../check/finding-presentation.ts";
import type { MarkdownLinkRecordCandidate } from "./records.ts";

const PRESENTED_FINDING_LIMIT = 10;

type PresentedMarkdownFinding =
  | Readonly<{ readonly kind: "link"; readonly candidate: MarkdownLinkRecordCandidate }>
  | Readonly<{ readonly kind: "input-rejected"; readonly path: string }>;

/** Projects completed Link findings without copying raw destinations into presentation. */
export function markdownFindingMessages(
  candidates: readonly MarkdownLinkRecordCandidate[],
  rejectedPaths: readonly string[],
  blocking: boolean
): readonly CheckMessage[] {
  const findings: PresentedMarkdownFinding[] = [
    ...candidates.map((candidate) => Object.freeze({ kind: "link" as const, candidate })),
    ...rejectedPaths.map((path) => Object.freeze({ kind: "input-rejected" as const, path }))
  ];
  return presentCheckFindings({
    findings,
    limit: PRESENTED_FINDING_LIMIT,
    message: (finding) => {
      if (finding.kind === "input-rejected") {
        return Object.freeze({
          code: "finding-detail",
          level: "warning" as const,
          message: `${finding.path}: selected input is not a supported Markdown source.`
        });
      }
      const { occurrenceKind, range, reason, sourcePath } = finding.candidate.data;
      return Object.freeze({
        code: "finding-detail",
        level: blocking ? ("error" as const) : ("warning" as const),
        message: `${sourcePath}:${range.start.line}:${range.start.column} ${occurrenceKind}: ${reason}.`
      });
    },
    omittedMessage: ({ omittedCount, omittedFindings }) =>
      Object.freeze({
        code: "findings-omitted",
        level: omittedFindings.some((finding) => finding.kind === "link" && blocking)
          ? ("error" as const)
          : ("warning" as const),
        message: `${omittedCount} additional Markdown link finding(s) were not shown; inspect this Check's Records for the complete set.`
      })
  });
}
