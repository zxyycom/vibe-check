import { validFileMetricsOptions } from "./options-validation.ts";
import type { FileMetricsOptions, FileMetricsScannerOptions } from "./options.ts";
import type { CheckExecutionContext, CheckResult } from "../../check/check.ts";
import { collectProjectFiles } from "../project-files/collection.ts";
import type { CodeAreaDefinition } from "../project-files/configuration.ts";
import { measureFileMetrics, type FileMeasurementResult } from "./measurement.ts";
import { buildFileRecordCandidates } from "./records.ts";

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
  if (!validFileMetricsOptions(context.options)) return unavailable("invalid-options");

  const current: FileMetricsExactInputSet = Object.freeze({
    approvedExactPaths: Object.freeze(
      collectProjectFiles(context.project.root, context.options.files)
    ),
    rootDir: context.project.root
  });
  if (current.approvedExactPaths.length === 0) {
    return Object.freeze({ status: "not-applicable", reason: { code: "no-eligible-input" } });
  }
  const dependency: FileMetricsScannerOptions = context.options.scanner;
  const semantics: FileMetricsSemantics = {
    codeAreas: context.options.codeAreas,
    generatedFiles: context.options.files.generatedFiles,
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
