import type { CheckExecutionContext, CheckResult } from "../../check/check.ts";
import { collectProjectFileSets, requireProjectFileSet } from "../project-files/collection.ts";
import { settleFindings } from "../code-quality-findings/policy.ts";
import { measureFileMetrics, type FileMeasurementResult } from "./measurement.ts";
import type { FileMetricsExactInputSet } from "./measurement-model.ts";
import type { ResolvedFileMetricsCodeAreaOptions, ResolvedFileMetricsOptions } from "./options.ts";
import { isValidResolvedFileMetricsOptions } from "./options-validation.ts";
import { buildFileRecordCandidates } from "./records.ts";
import type { FileMetricsFinalData } from "./final-data.ts";

export const FILE_METRICS_CHECK_DEFINITION = {
  checkId: "file-metrics",
  displayName: "File metrics"
} as const;

/** `file-metrics` whole-Check unavailable outcome 的稳定 reason code。 */
export type FileMetricsUnavailableReasonCode =
  | "external-dependency-unavailable"
  | "external-execution-failed"
  | "external-result-invalid"
  | "invalid-options"
  | "source-unavailable";

interface CollectedFileMetricsScope extends FileMetricsExactInputSet {
  readonly areaIdsByPath: ReadonlyMap<string, readonly string[]>;
}

/** 使用 resolved area policy 和 scanner selection 执行一次完整的 file-metrics measurement。 */
export async function executeFileMetrics(
  context: CheckExecutionContext<ResolvedFileMetricsOptions>
): Promise<CheckResult<FileMetricsFinalData>> {
  if (!isValidResolvedFileMetricsOptions(context.options)) return unavailable("invalid-options");

  let collectedScope: CollectedFileMetricsScope;
  try {
    collectedScope = collectAreaScope(context.project.root, context.options.codeAreas);
  } catch {
    return unavailable("source-unavailable");
  }
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
  return settleFindings(candidates.map((candidate) => candidate.data.blocking));
}

function collectAreaScope(
  rootDir: string,
  codeAreas: Readonly<Record<string, ResolvedFileMetricsCodeAreaOptions>>
): CollectedFileMetricsScope {
  const areaIdsByPath = new Map<string, string[]>();
  const filesByArea = collectProjectFileSets(
    rootDir,
    Object.fromEntries(Object.entries(codeAreas).map(([areaId, area]) => [areaId, area.files]))
  );
  for (const [areaId] of Object.entries(codeAreas)) {
    for (const path of requireProjectFileSet(filesByArea, areaId)) {
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
): CheckResult<FileMetricsFinalData> {
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

function unavailable(code: FileMetricsUnavailableReasonCode): CheckResult<FileMetricsFinalData> {
  return Object.freeze({
    status: "unavailable",
    reason: { code },
    messages: Object.freeze([
      Object.freeze({ code, level: "error" as const, message: unavailableMessage(code) })
    ])
  });
}

function unavailableMessage(code: FileMetricsUnavailableReasonCode): string {
  switch (code) {
    case "invalid-options":
      return "fileMetrics options are invalid; recreate the Check with fileMetrics(options) or restore its complete resolved options.";
    case "source-unavailable":
      return "File metrics could not collect its configured project files; check the project root, file permissions, and selected file source.";
    case "external-dependency-unavailable":
      return "The configured SCC command is unavailable or incompatible; install SCC 3.7.0 or configure a compatible executable.";
    case "external-execution-failed":
      return "SCC did not complete successfully; run the configured command directly and inspect its environment.";
    case "external-result-invalid":
      return "SCC output could not form a trusted complete result; check the executable version and CSV compatibility.";
  }
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
