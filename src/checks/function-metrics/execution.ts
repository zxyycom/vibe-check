import { validFunctionMetricsOptions } from "./options-validation.ts";
import type { FunctionMetricsOptions, FunctionMetricsScannerOptions } from "./options.ts";
import type { CheckExecutionContext, CheckResult } from "../../definition/custom-check.ts";
import { collectProjectFiles } from "../../project-files/collection.ts";
import { selectLizardTargetFiles } from "./target-files.ts";
import type { CodeAreaDefinition } from "../../project-files/configuration.ts";
import { analyzeFunctionMetrics } from "./analysis.ts";
import { measureFunctionMetrics, type FunctionMeasurementResult } from "./measurement.ts";
import { buildFunctionRecordCandidates } from "./records.ts";

export const FUNCTION_METRICS_CHECK_DEFINITION = {
  checkId: "function-metrics",
  displayName: "Function metrics"
} as const;

interface FunctionThreshold {
  readonly absoluteFloor: number;
}

export interface FunctionMetricsSemantics {
  readonly codeAreas: Readonly<Record<string, CodeAreaDefinition>>;
  readonly generatedFiles: readonly string[];
  readonly functions: Readonly<{
    codeLines: FunctionThreshold &
      Readonly<{
        lowComplexityAllowance: Readonly<{
          codeLineFloor: number;
          maxCyclomaticComplexityExclusive: number;
        }>;
      }>;
    cyclomaticComplexity: FunctionThreshold;
    parameterCount: FunctionThreshold;
  }>;
}

export interface FunctionMetricsExactInputSet {
  readonly approvedExactPaths: readonly string[];
  readonly rootDir: string;
}

/** Default Check callback; options carry the complete scanner binding. */
export async function executeFunctionMetrics(
  context: CheckExecutionContext<FunctionMetricsOptions>
): Promise<CheckResult> {
  if (!validFunctionMetricsOptions(context.options)) return unavailable("invalid-options");

  const scanFiles = collectProjectFiles(context.project.root, context.options.files);
  const current: FunctionMetricsExactInputSet = Object.freeze({
    approvedExactPaths: Object.freeze(selectLizardTargetFiles(scanFiles, context.options.files)),
    rootDir: context.project.root
  });
  if (current.approvedExactPaths.length === 0) {
    return Object.freeze({ status: "not-applicable", reason: { code: "no-eligible-input" } });
  }
  const dependency: FunctionMetricsScannerOptions = context.options.scanner;
  const semantics: FunctionMetricsSemantics = {
    codeAreas: context.options.codeAreas,
    functions: {
      codeLines: context.options.codeLines,
      cyclomaticComplexity: context.options.cyclomaticComplexity,
      parameterCount: context.options.parameterCount
    },
    generatedFiles: context.options.files.generatedFiles
  };
  const measurement = await measureFunctionMetrics(current, dependency);
  if (measurement.kind !== "complete") return directMeasurementFailure(measurement);
  const currentAnalysis = analyzeFunctionMetrics(measurement.metrics);
  if (currentAnalysis === undefined) return unavailable("external-result-invalid");
  const candidates = buildFunctionRecordCandidates(currentAnalysis, semantics);
  for (const candidate of candidates) {
    context.records.report({ id: candidate.id }, candidate.data);
  }
  return Object.freeze({
    status: candidates.length > 0 ? "failed" : "passed",
    data: Object.freeze({ findingCount: candidates.length })
  });
}

function directMeasurementFailure(
  measurement: Exclude<FunctionMeasurementResult, { kind: "complete" }>
): CheckResult {
  if (measurement.kind === "unavailable") return unavailable("external-dependency-unavailable");
  if (measurement.kind === "execution-failed") return unavailable("external-execution-failed");
  return unavailable("external-result-invalid");
}

function unavailable(code: string): CheckResult {
  return Object.freeze({ status: "unavailable", reason: { code } });
}
