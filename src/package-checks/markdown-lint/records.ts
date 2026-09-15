import type { MarkdownLintBackendFinding } from "./adapter.ts";
import type { MarkdownLintRuleName } from "./options.ts";

export type MarkdownLintFindingRecordData = Readonly<{
  readonly kind: "lint-finding";
  readonly path: string;
  readonly rule: MarkdownLintRuleName;
  readonly range: Readonly<{
    readonly start: Readonly<{ readonly line: number; readonly column: number }>;
    readonly end: Readonly<{ readonly line: number; readonly column: number }>;
  }>;
}>;

export type MarkdownLintInputRejectedRecordData = Readonly<{
  readonly kind: "input-rejected";
  readonly blocking: false;
  readonly path: string;
  readonly reason: "unsupported-file-type";
}>;

/** Markdown lint 发布的 Finding 或 input-rejection Record data。 */
export type MarkdownLintRecordData =
  | MarkdownLintFindingRecordData
  | MarkdownLintInputRejectedRecordData;

export interface MarkdownLintRecordCandidate {
  readonly id: string;
  readonly data: MarkdownLintFindingRecordData;
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
