import type {
  MarkdownLinkFindingReason,
  MarkdownLocalResolution,
  MarkdownSafeTargetDescriptor
} from "./local-resolver.ts";
import type { MarkdownLinkOccurrence, MarkdownSourceRange } from "./markdown-parser.ts";

/** 一条本地 Markdown link finding supplemental Record 的 data。 */
export type MarkdownLinkFindingRecordData = Readonly<{
  readonly occurrenceKind: "link" | "image";
  readonly range: Readonly<{
    readonly end: Readonly<{ readonly column: number; readonly line: number }>;
    readonly start: Readonly<{ readonly column: number; readonly line: number }>;
  }>;
  readonly reason: MarkdownLinkFindingReason;
  readonly sourcePath: string;
  readonly target: MarkdownSafeTargetDescriptor;
}>;

/** 一条 files policy 已选中但不受 Markdown Link 支持的输入 Finding。 */
export type MarkdownLinkInputRejectedRecordData = Readonly<{
  readonly blocking: false;
  readonly kind: "input-rejected";
  readonly path: string;
  readonly reason: "unsupported-file-type";
}>;

/** Markdown Link 发布的 link 或 input-rejection Record data。 */
export type MarkdownLinkValidationRecordData =
  | MarkdownLinkFindingRecordData
  | MarkdownLinkInputRejectedRecordData;

export interface MarkdownLinkRecordCandidate {
  readonly data: MarkdownLinkFindingRecordData;
  readonly id: string;
}

export function buildMarkdownLinkRecordCandidate(
  sourcePath: string,
  occurrenceIndex: number,
  occurrence: MarkdownLinkOccurrence,
  resolution: MarkdownLocalResolution
): MarkdownLinkRecordCandidate | undefined {
  if (resolution.kind !== "finding") return undefined;
  return Object.freeze({
    id: `source:${encodeURIComponent(sourcePath)}:occurrence:${occurrenceIndex + 1}:reason:${resolution.reason}`,
    data: Object.freeze({
      reason: resolution.reason,
      occurrenceKind: occurrence.kind,
      sourcePath,
      range: publicRange(occurrence.range),
      target: resolution.target
    })
  });
}

export function buildMarkdownInputRejectedRecord(path: string): Readonly<{
  readonly data: MarkdownLinkInputRejectedRecordData;
  readonly id: string;
}> {
  return Object.freeze({
    data: Object.freeze({
      blocking: false,
      kind: "input-rejected",
      path,
      reason: "unsupported-file-type"
    }),
    id: `/input-rejected/${path}`
  });
}

function publicRange(range: MarkdownSourceRange): MarkdownLinkFindingRecordData["range"] {
  return Object.freeze({
    start: Object.freeze({ line: range.start.line, column: range.start.column }),
    end: Object.freeze({ line: range.end.line, column: range.end.column })
  });
}
