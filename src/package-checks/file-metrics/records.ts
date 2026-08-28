import type { FileMetric } from "./measurement-model.ts";
import type { ResolvedFileMetricsCodeAreaOptions } from "./options.ts";
import { isBlockingFinding } from "../code-quality-findings/policy.ts";

const FILE_CODE_LINES_METRIC = "code-lines" as const;

interface FileMetricsAreaPolicyContext {
  readonly areaIdsByPath: ReadonlyMap<string, readonly string[]>;
  readonly codeAreas: Readonly<Record<string, ResolvedFileMetricsCodeAreaOptions>>;
}

interface EffectiveFileRecordPolicy {
  readonly areaIds: readonly string[];
  readonly blocking: boolean;
  readonly limit: number;
}

/** 一条超出文件代码行上限的 supplemental Record data。 */
export type FileMetricsRecordData = Readonly<{
  readonly blocking: boolean;
  readonly codeAreas: readonly string[];
  readonly codeLines: number;
  readonly limit: number;
  readonly metric: "code-lines";
  readonly path: string;
}>;

export interface FileRecordCandidate {
  readonly data: FileMetricsRecordData;
  readonly id: string;
}

/** Converts trusted scanner metrics into area-policy-owned supplemental facts. */
export function buildFileRecordCandidates(
  metrics: readonly FileMetric[],
  areaPolicy: FileMetricsAreaPolicyContext
): readonly FileRecordCandidate[] | undefined {
  const seenPaths = new Set<string>();
  const candidates: FileRecordCandidate[] = [];
  for (const metric of metrics) {
    if (!isValidUniqueFileMetric(metric, seenPaths)) return undefined;
    seenPaths.add(metric.path);

    const recordPolicy = effectiveFileRecordPolicy(metric, areaPolicy);
    if (recordPolicy === undefined) return undefined;
    if (metric.codeLines <= recordPolicy.limit) continue;
    candidates.push(createFileRecordCandidate(metric, recordPolicy));
  }
  candidates.sort((left, right) => compareText(left.id, right.id));
  return Object.freeze(candidates);
}

function isValidUniqueFileMetric(metric: FileMetric, seenPaths: ReadonlySet<string>): boolean {
  return (
    typeof metric.path === "string" &&
    metric.path.length > 0 &&
    Number.isSafeInteger(metric.codeLines) &&
    metric.codeLines >= 0 &&
    !seenPaths.has(metric.path)
  );
}

function effectiveFileRecordPolicy(
  metric: FileMetric,
  areaPolicy: FileMetricsAreaPolicyContext
): EffectiveFileRecordPolicy | undefined {
  const areaIds = areaPolicy.areaIdsByPath.get(metric.path);
  if (areaIds === undefined || areaIds.length === 0) return undefined;
  const matchingAreas: ResolvedFileMetricsCodeAreaOptions[] = [];
  let strictestMaximum: number | undefined;
  for (const areaId of areaIds) {
    const codeArea = areaPolicy.codeAreas[areaId];
    if (codeArea === undefined) return undefined;
    matchingAreas.push(codeArea);
    const maximum = fileCodeLineMaximum(metric, codeArea);
    strictestMaximum =
      strictestMaximum === undefined ? maximum : Math.min(strictestMaximum, maximum);
  }
  return strictestMaximum === undefined
    ? undefined
    : Object.freeze({
        areaIds,
        blocking: isBlockingFinding(matchingAreas.map((area) => area.findingPolicy)),
        limit: strictestMaximum
      });
}

function createFileRecordCandidate(
  metric: FileMetric,
  recordPolicy: EffectiveFileRecordPolicy
): FileRecordCandidate {
  return Object.freeze({
    id: metric.path,
    data: Object.freeze({
      blocking: recordPolicy.blocking,
      codeAreas: Object.freeze([...recordPolicy.areaIds]),
      codeLines: metric.codeLines,
      limit: recordPolicy.limit,
      metric: FILE_CODE_LINES_METRIC,
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
