import { classifyFile } from "../../model/code-areas.ts";
import type { CodeAreaDefinition, FileMetric } from "../../model/schema.ts";
import type { QualityRecordCandidate, RecordLevel } from "../model.ts";
import { compareText, isInChangedScope, type RelationId } from "./builtin-support.ts";
import type { FileMetricsSemantics } from "./file-metrics.ts";

export interface FileRecordCandidate {
  readonly codeLines: number;
  readonly isChanged: boolean;
  readonly record: QualityRecordCandidate;
}

export function buildFileRecordCandidates(
  metrics: readonly FileMetric[],
  changedFiles: readonly string[],
  semantics: FileMetricsSemantics
): readonly FileRecordCandidate[] | undefined {
  const seenPaths = new Set<string>();
  const candidates: FileRecordCandidate[] = [];
  for (const metric of metrics) {
    const codeLines = validFileCodeLines(metric, seenPaths);
    if (codeLines === undefined) {
      return undefined;
    }
    seenPaths.add(metric.path);
    const candidate = createFileRecordCandidate(metric, codeLines, changedFiles, semantics);
    if (candidate !== null) {
      candidates.push(candidate);
    }
  }
  candidates.sort((left, right) => compareText(
    left.record.semanticSubject,
    right.record.semanticSubject
  ));
  return Object.freeze(candidates);
}

function validFileCodeLines(
  metric: FileMetric,
  seenPaths: ReadonlySet<string>
): number | undefined {
  const codeLines = metric.codeLines;
  const isValid = typeof metric.path === "string" && metric.path.length > 0
    && typeof codeLines === "number"
    && Number.isSafeInteger(codeLines) && codeLines >= 0
    && !seenPaths.has(metric.path);
  return isValid ? codeLines : undefined;
}

function createFileRecordCandidate(
  metric: FileMetric,
  codeLines: number,
  changedFiles: readonly string[],
  semantics: FileMetricsSemantics
): FileRecordCandidate | null {
  const codeArea = classifyFile(
    metric.path,
    semantics.codeAreas as Record<string, CodeAreaDefinition>,
    semantics.generatedFiles
  );
  const area = semantics.codeAreas[codeArea];
  if (area === undefined || area.warningPolicy === "exclude-warnings") {
    return null;
  }
  const limit = fileCodeLineFloor(metric, semantics);
  if (codeLines <= limit) {
    return null;
  }
  const level: RecordLevel = area.warningPolicy === "watchlist-only" ? "info" : "warning";
  return Object.freeze({
    codeLines,
    isChanged: isInChangedScope(metric.path, changedFiles),
    record: createFileQualityRecord(metric.path, codeLines, codeArea, limit, level)
  });
}

function createFileQualityRecord(
  path: string,
  codeLines: number,
  codeArea: string,
  limit: number,
  level: RecordLevel
): QualityRecordCandidate {
  return Object.freeze({
    recordTypeId: "file-code-lines",
    level,
    semanticSubject: path,
    message: `File ${path} has ${codeLines} code lines (threshold: ${limit})`,
    fields: Object.freeze({
      codeArea,
      limit,
      metric: "code-lines",
      value: codeLines
    }),
    location: Object.freeze({ path, line: 1, column: 1 })
  });
}

function fileCodeLineFloor(metric: FileMetric, semantics: FileMetricsSemantics): number {
  const allowance = semantics.codeLines.lowDecisionTokenAllowance;
  const decisionTokens = metric.decisionTokens.value;
  return decisionTokens !== null && decisionTokens <= allowance.maxDecisionTokens
    ? allowance.codeLineFloor
    : semantics.codeLines.absoluteFloor;
}

export function codeLinesByPath(
  metrics: readonly FileMetric[]
): ReadonlyMap<string, number> | undefined {
  const values = new Map<string, number>();
  const seenPaths = new Set<string>();
  for (const metric of metrics) {
    const codeLines = validFileCodeLines(metric, seenPaths);
    if (codeLines === undefined) {
      return undefined;
    }
    seenPaths.add(metric.path);
    values.set(metric.path, codeLines);
  }
  return values;
}

export function buildFileRelations(
  candidates: readonly FileRecordCandidate[],
  referenceValues: ReadonlyMap<string, number>,
  semantics: FileMetricsSemantics
): Map<string, readonly RelationId[]> {
  const relations = new Map<string, readonly RelationId[]>();
  for (const candidate of candidates) {
    const subject = candidate.record.semanticSubject;
    if (!candidate.isChanged) {
      relations.set(subject, Object.freeze([]));
      continue;
    }
    const baselineValue = referenceValues.get(subject) ?? 0;
    const relation: RelationId = candidate.codeLines - baselineValue
      > semantics.codeLines.changedDelta ? "regression" : "changed";
    relations.set(subject, Object.freeze([relation]));
  }
  return relations;
}
