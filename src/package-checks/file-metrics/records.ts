import type { FileMetric } from "./measurement-model.ts";
import type { ResolvedFileMetricsCodeAreaOptions } from "./options.ts";

interface FileMetricsAreaPolicy {
  readonly areaIdsByPath: ReadonlyMap<string, readonly string[]>;
  readonly codeAreas: Readonly<Record<string, ResolvedFileMetricsCodeAreaOptions>>;
}

export interface FileRecordCandidate {
  readonly data: Readonly<{
    readonly codeAreas: readonly string[];
    readonly codeLines: number;
    readonly limit: number;
    readonly metric: "code-lines";
    readonly path: string;
  }>;
  readonly id: string;
}

/** Converts trusted scanner metrics into area-policy-owned supplemental facts. */
export function buildFileRecordCandidates(
  metrics: readonly FileMetric[],
  semantics: FileMetricsAreaPolicy
): readonly FileRecordCandidate[] | undefined {
  const seenPaths = new Set<string>();
  const candidates: FileRecordCandidate[] = [];
  for (const metric of metrics) {
    const codeLines = validFileCodeLines(metric, seenPaths);
    if (codeLines === undefined) return undefined;
    seenPaths.add(metric.path);
    const candidate = createFileRecordCandidate(metric, codeLines, semantics);
    if (candidate === undefined) return undefined;
    if (candidate !== null) candidates.push(candidate);
  }
  candidates.sort((left, right) => compareText(left.id, right.id));
  return Object.freeze(candidates);
}

function validFileCodeLines(
  metric: FileMetric,
  seenPaths: ReadonlySet<string>
): number | undefined {
  const isValid =
    typeof metric.path === "string" &&
    metric.path.length > 0 &&
    Number.isSafeInteger(metric.codeLines) &&
    metric.codeLines >= 0 &&
    !seenPaths.has(metric.path);
  return isValid ? metric.codeLines : undefined;
}

function createFileRecordCandidate(
  metric: FileMetric,
  codeLines: number,
  semantics: FileMetricsAreaPolicy
): FileRecordCandidate | null | undefined {
  const areaIds = semantics.areaIdsByPath.get(metric.path);
  if (areaIds === undefined || areaIds.length === 0) return undefined;
  let limit = Number.POSITIVE_INFINITY;
  for (const areaId of areaIds) {
    const policy = semantics.codeAreas[areaId];
    if (policy === undefined) return undefined;
    limit = Math.min(limit, fileCodeLineMaximum(metric, policy));
  }
  if (codeLines <= limit) return null;
  return Object.freeze({
    id: metric.path,
    data: Object.freeze({
      codeAreas: Object.freeze([...areaIds]),
      codeLines,
      limit,
      metric: "code-lines" as const,
      path: metric.path
    })
  });
}

function fileCodeLineMaximum(metric: FileMetric, area: ResolvedFileMetricsCodeAreaOptions): number {
  const allowance = area.codeLines.lowDecisionTokenAllowance;
  const decisionTokens = metric.decisionTokens.value;
  return decisionTokens !== null && decisionTokens <= allowance.maximumDecisionTokens
    ? allowance.maximumCodeLines
    : area.codeLines.maximum;
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
