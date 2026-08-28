import type { CheckExecutionContext, CheckResult } from "../../check/check.ts";
import { collectProjectFiles } from "../project-files/collection.ts";
import { measureFileMetrics, type FileMeasurementResult } from "./measurement.ts";
import type { FileMetricsExactInputSet } from "./measurement-model.ts";
import type { ResolvedFileMetricsCodeAreaOptions, ResolvedFileMetricsOptions } from "./options.ts";
import { validResolvedFileMetricsOptions } from "./options-validation.ts";
import { buildFileRecordCandidates } from "./records.ts";

export const FILE_METRICS_CHECK_DEFINITION = {
  checkId: "file-metrics",
  displayName: "File metrics"
} as const;

interface CollectedFileMetricsScope extends FileMetricsExactInputSet {
  readonly areaIdsByPath: ReadonlyMap<string, readonly string[]>;
}

/** Default Check callback; area policy 与 scanner selection 均从 resolved options 到达。 */
export async function executeFileMetrics(
  context: CheckExecutionContext<ResolvedFileMetricsOptions>
): Promise<CheckResult> {
  if (!validResolvedFileMetricsOptions(context.options)) return unavailable("invalid-options");

  const current = collectAreaScope(context.project.root, context.options.codeAreas);
  if (current.approvedExactPaths.length === 0) {
    return Object.freeze({ status: "not-applicable", reason: { code: "no-eligible-input" } });
  }
  const measurement = await measureFileMetrics(current, context.options.scanner);
  if (measurement.kind !== "complete") return directMeasurementFailure(measurement);
  const candidates = buildFileRecordCandidates(measurement.metrics, {
    areaIdsByPath: current.areaIdsByPath,
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

function directMeasurementFailure(
  measurement: Exclude<FileMeasurementResult, { kind: "complete" }>
): CheckResult {
  if (measurement.kind === "unavailable") return unavailable("external-dependency-unavailable");
  if (measurement.kind === "execution-failed") return unavailable("external-execution-failed");
  return unavailable("external-result-invalid");
}

function unavailable(code: string): CheckResult {
  return Object.freeze({ status: "unavailable", reason: { code } });
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
