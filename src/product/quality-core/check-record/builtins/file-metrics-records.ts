import { classifyFile } from "../../model/code-areas.ts";
import type { FileMetric } from "../../model/schema.ts";
import { compareText } from "./builtin-support.ts";
import type { FileMetricsSemantics } from "./file-metrics.ts";

export interface FileRecordCandidate {
  readonly data: Readonly<{
    readonly codeArea: string;
    readonly codeLines: number;
    readonly limit: number;
    readonly metric: "code-lines";
    readonly path: string;
  }>;
  readonly id: string;
}

/** Converts trusted scanner metrics into Check-owned supplemental facts. */
export function buildFileRecordCandidates(
  metrics: readonly FileMetric[],
  semantics: FileMetricsSemantics
): readonly FileRecordCandidate[] | undefined {
  const seenPaths = new Set<string>();
  const candidates: FileRecordCandidate[] = [];
  for (const metric of metrics) {
    const codeLines = validFileCodeLines(metric, seenPaths);
    if (codeLines === undefined) return undefined;
    seenPaths.add(metric.path);
    const candidate = createFileRecordCandidate(metric, codeLines, semantics);
    if (candidate !== null) candidates.push(candidate);
  }
  candidates.sort((left, right) => compareText(left.id, right.id));
  return Object.freeze(candidates);
}

function validFileCodeLines(
  metric: FileMetric,
  seenPaths: ReadonlySet<string>
): number | undefined {
  const codeLines = metric.codeLines;
  const isValid =
    typeof metric.path === "string" &&
    metric.path.length > 0 &&
    typeof codeLines === "number" &&
    Number.isSafeInteger(codeLines) &&
    codeLines >= 0 &&
    !seenPaths.has(metric.path);
  return isValid ? codeLines : undefined;
}

function createFileRecordCandidate(
  metric: FileMetric,
  codeLines: number,
  semantics: FileMetricsSemantics
): FileRecordCandidate | null {
  const codeArea = classifyFile(metric.path, semantics.codeAreas, semantics.generatedFiles);
  const area = semantics.codeAreas[codeArea];
  if (area === undefined || area.warningPolicy === "exclude-warnings") return null;

  const limit = fileCodeLineFloor(metric, semantics);
  if (codeLines <= limit) return null;
  return Object.freeze({
    id: metric.path,
    data: Object.freeze({
      codeArea,
      codeLines,
      limit,
      metric: "code-lines",
      path: metric.path
    })
  });
}

function fileCodeLineFloor(metric: FileMetric, semantics: FileMetricsSemantics): number {
  const allowance = semantics.codeLines.lowDecisionTokenAllowance;
  const decisionTokens = metric.decisionTokens.value;
  return decisionTokens !== null && decisionTokens <= allowance.maxDecisionTokens
    ? allowance.codeLineFloor
    : semantics.codeLines.absoluteFloor;
}
