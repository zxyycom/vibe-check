import type { FileScannerDependency } from "../measurement/scanners/dependencies.ts";
import type { FileMetricsOptions } from "../../definition/default-checks.ts";
import type { CheckExecutionContext, CheckResult } from "../../definition/custom-check.ts";
import { collectScanFiles } from "../input/files.ts";
import type { CodeAreaDefinition } from "../configuration/metric-contract.ts";
import { measureFileMetrics, type FileMeasurementResult } from "./file-metrics-measurement.ts";
import { buildFileRecordCandidates } from "./file-metrics-records.ts";

export const FILE_METRICS_CHECK_DEFINITION = {
  checkId: "file-metrics",
  displayName: "File metrics"
} as const;

export interface FileMetricsSemantics {
  readonly codeAreas: Readonly<Record<string, CodeAreaDefinition>>;
  readonly generatedFiles: readonly string[];
  readonly codeLines: Readonly<{
    absoluteFloor: number;
    lowDecisionTokenAllowance: Readonly<{
      codeLineFloor: number;
      maxDecisionTokens: number;
    }>;
  }>;
}

export interface FileMetricsExactInputSet {
  readonly approvedExactPaths: readonly string[];
  readonly rootDir: string;
}

/** Default Check callback; all scanner selection now arrives through options. */
export async function executeFileMetrics(
  context: CheckExecutionContext<FileMetricsOptions>
): Promise<CheckResult> {
  const current: FileMetricsExactInputSet = Object.freeze({
    approvedExactPaths: Object.freeze(
      collectScanFiles(context.project.root, context.project.files)
    ),
    rootDir: context.project.root
  });
  if (current.approvedExactPaths.length === 0) {
    return Object.freeze({ status: "not-applicable", reason: { code: "no-eligible-input" } });
  }
  const dependency: FileScannerDependency = context.options.scanner;
  const semantics: FileMetricsSemantics = {
    codeAreas: context.project.files.codeAreas,
    generatedFiles: context.project.files.generatedFiles,
    codeLines: context.options.codeLines
  };
  const measurement = await measureFileMetrics(current, dependency);
  if (measurement.kind !== "complete") return directMeasurementFailure(measurement);
  const candidates = buildFileRecordCandidates(measurement.metrics, semantics);
  if (candidates === undefined) return unavailable("external-result-invalid");
  for (const candidate of candidates) {
    context.records.report({ id: candidate.id }, candidate.data);
  }
  return Object.freeze({
    status: candidates.length > 0 ? "failed" : "passed",
    data: Object.freeze({ findingCount: candidates.length })
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
