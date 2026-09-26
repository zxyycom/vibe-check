import type { MaterializedFindingWaiver } from "../../package-tools/finding-waivers/reconciliation.ts";
import {
  buildHashedFindingWaiverAuditRecord,
  type FindingWaiverAuditRecordData,
  type FindingWaiverRecordAudit
} from "../code-quality-findings/finding-waiver-evidence.ts";
import type { MarkdownLintBackendFinding } from "./adapter.ts";
import { resolveMarkdownLintFindingIdentity } from "./finding-waiver-identity.ts";
import type { MarkdownLintFindingIdentity, MarkdownLintRuleName } from "./options.ts";

/** 一条保留原位置的 lint Finding；唯一命中 waiver 时仅附加公开理由。 */
export type MarkdownLintFindingRecordData = Readonly<
  MarkdownLintFindingIdentity & {
    readonly kind: "lint-finding";
    readonly waiver?: Readonly<{ readonly reason: string }>;
  }
>;

/** 未使用或匹配多个 Markdown lint Findings 的精确 waiver audit Record data。 */
export type MarkdownLintFindingWaiverAuditRecordData =
  FindingWaiverAuditRecordData<MarkdownLintFindingIdentity>;

export type MarkdownLintInputRejectedRecordData = Readonly<{
  readonly kind: "input-rejected";
  readonly blocking: false;
  readonly path: string;
  readonly reason: "unsupported-file-type";
}>;

/** Markdown lint 发布的 Finding、input-rejection 或 finding-waiver audit Record data。 */
export type MarkdownLintRecordData =
  | MarkdownLintFindingRecordData
  | MarkdownLintInputRejectedRecordData
  | MarkdownLintFindingWaiverAuditRecordData;

export interface MarkdownLintRecordCandidate {
  readonly id: string;
  readonly data: MarkdownLintFindingRecordData;
}

export function markdownLintFindingIdentity(
  candidate: MarkdownLintRecordCandidate
): MarkdownLintFindingIdentity {
  const { path, rule, range } = candidate.data;
  return Object.freeze({ path, rule, range });
}

export function markdownLintWaiverIdentity(
  waiver: MaterializedFindingWaiver
): MarkdownLintFindingIdentity {
  const identity = resolveMarkdownLintFindingIdentity(waiver.identity);
  if (identity === undefined) {
    throw new TypeError("markdownLint waiver identity must retain a valid public finding location");
  }
  return identity;
}

export function markdownLintWaiverAuditRecord(audit: FindingWaiverRecordAudit): Readonly<{
  readonly id: string;
  readonly data: MarkdownLintFindingWaiverAuditRecordData;
}> {
  return buildHashedFindingWaiverAuditRecord(markdownLintWaiverIdentity(audit.waiver), audit);
}

export function orderedMarkdownLintCandidates(
  values: readonly Readonly<{
    readonly path: string;
    readonly finding: MarkdownLintBackendFinding;
  }>[],
  catalog: readonly MarkdownLintRuleName[]
): readonly MarkdownLintRecordCandidate[] {
  const rank = new Map(catalog.map((rule, index) => [rule, index]));
  const sorted = [...values].sort((left, right) => compareFindings(left, right, rank));
  const occurrences = new Map<string, number>();
  return Object.freeze(
    sorted.map(({ path, finding }) => {
      const range = publicRange(finding);
      const key = `${path}\u0000${finding.rule}\u0000${range.start.line}\u0000${range.start.column}`;
      const ordinal = (occurrences.get(key) ?? 0) + 1;
      occurrences.set(key, ordinal);
      const data = Object.freeze({
        kind: "lint-finding" as const,
        path,
        rule: finding.rule,
        range
      });
      return Object.freeze({
        id: `path:${encodeURIComponent(path)}:rule:${finding.rule}:line:${range.start.line}:column:${range.start.column}:ordinal:${ordinal}`,
        data
      });
    })
  );
}

export function buildMarkdownLintInputRejectedRecord(path: string): Readonly<{
  readonly id: string;
  readonly data: MarkdownLintInputRejectedRecordData;
}> {
  return Object.freeze({
    id: `/input-rejected/${path}`,
    data: Object.freeze({
      kind: "input-rejected",
      blocking: false,
      path,
      reason: "unsupported-file-type"
    })
  });
}

function compareFindings(
  left: Readonly<{ readonly path: string; readonly finding: MarkdownLintBackendFinding }>,
  right: Readonly<{ readonly path: string; readonly finding: MarkdownLintBackendFinding }>,
  rank: ReadonlyMap<MarkdownLintRuleName, number>
): number {
  const leftRange = publicRange(left.finding);
  const rightRange = publicRange(right.finding);
  return (
    left.path.localeCompare(right.path) ||
    leftRange.start.line - rightRange.start.line ||
    leftRange.start.column - rightRange.start.column ||
    (rank.get(left.finding.rule) ?? 0) - (rank.get(right.finding.rule) ?? 0)
  );
}

function publicRange(finding: MarkdownLintBackendFinding): MarkdownLintFindingRecordData["range"] {
  const column = finding.range?.[0] ?? 1;
  const endColumn = finding.range === null ? column : column + finding.range[1];
  return Object.freeze({
    start: Object.freeze({ line: finding.lineNumber, column }),
    end: Object.freeze({ line: finding.lineNumber, column: endColumn })
  });
}
