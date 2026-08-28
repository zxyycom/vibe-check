import type { CheckExecutionContext, CheckResult } from "../../check/check.ts";
import { collectProjectFiles } from "../project-files/collection.ts";
import { measureFileMetrics, type FileMeasurementResult } from "./measurement.ts";
import type { FileMetricsExactInputSet } from "./measurement-model.ts";
import type { ResolvedFileMetricsCodeAreaOptions, ResolvedFileMetricsOptions } from "./options.ts";
import { isValidResolvedFileMetricsOptions } from "./options-validation.ts";
import { buildFileRecordCandidates } from "./records.ts";

export const FILE_METRICS_CHECK_DEFINITION = {
  checkId: "file-metrics",
  displayName: "File metrics"
} as const;

type FileMetricsUnavailableReasonCode =
  | "external-dependency-unavailable"
  | "external-execution-failed"
  | "external-result-invalid"
  | "invalid-options";

interface CollectedFileMetricsScope extends FileMetricsExactInputSet {
  readonly areaIdsByPath: ReadonlyMap<string, readonly string[]>;
}

/** 使用 resolved area policy 和 scanner selection 执行一次完整的 file-metrics measurement。 */
export async function executeFileMetrics(
  context: CheckExecutionContext<ResolvedFileMetricsOptions>
): Promise<CheckResult> {
  if (!isValidResolvedFileMetricsOptions(context.options)) return unavailable("invalid-options");

  const collectedScope = collectAreaScope(context.project.root, context.options.codeAreas);
  if (collectedScope.approvedExactPaths.length === 0) {
    return Object.freeze({ status: "not-applicable", reason: { code: "no-eligible-input" } });
  }
  const measurement = await measureFileMetrics(collectedScope, context.options.scanner);
  if (measurement.kind !== "complete") return measurementFailureResult(measurement);
  const candidates = buildFileRecordCandidates(measurement.metrics, {
    areaIdsByPath: collectedScope.areaIdsByPath,
    codeAreas: context.options.codeAreas
  });
  if (candidates === undefined) return unavailable("external-result-invalid");
  for (const candidate of candidates) {
    context.records.report({ id: candidate.id }, candidate.data);
  }
  return Object.freeze({
    status: candidates.length > 0 ? "failed" : "passed",
    data: Object.freeze({ findingCount: candidates.length })
  });
}

function collectAreaScope(
  rootDir: string,
  codeAreas: Readonly<Record<string, ResolvedFileMetricsCodeAreaOptions>>
): CollectedFileMetricsScope {
  const areaIdsByPath = new Map<string, string[]>();
  for (const [areaId, area] of Object.entries(codeAreas)) {
    for (const path of collectProjectFiles(rootDir, area.files)) {
      const areaIds = areaIdsByPath.get(path);
      if (areaIds === undefined) areaIdsByPath.set(path, [areaId]);
      else areaIds.push(areaId);
    }
  }

  const normalizedMembership = new Map<string, readonly string[]>();
  for (const [path, areaIds] of areaIdsByPath) {
    normalizedMembership.set(path, Object.freeze(areaIds.sort(compareText)));
  }
  return Object.freeze({
    approvedExactPaths: Object.freeze([...normalizedMembership.keys()].sort(compareText)),
    areaIdsByPath: normalizedMembership,
    rootDir
  });
}

function measurementFailureResult(
  measurement: Exclude<FileMeasurementResult, { kind: "complete" }>
): CheckResult {
  switch (measurement.kind) {
    case "execution-failed":
      return unavailable("external-execution-failed");
    case "invalid-result":
      return unavailable("external-result-invalid");
    case "unavailable":
      return unavailable("external-dependency-unavailable");
  }
  const exhaustiveMeasurement: never = measurement;
  return exhaustiveMeasurement;
}

function unavailable(code: FileMetricsUnavailableReasonCode): CheckResult {
  return Object.freeze({ status: "unavailable", reason: { code } });
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
