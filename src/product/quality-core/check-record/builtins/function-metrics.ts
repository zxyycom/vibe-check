import type { FunctionScannerDependency } from "../../../scanner-dependencies/index.ts";
import type { FunctionMetricsOptions } from "../../../definition/built-ins.ts";
import type { CheckExecutionContext, CheckResult } from "../../../definition/custom-check.ts";
import { collectScanFiles } from "../../input/files.ts";
import { selectLizardTargetFiles } from "../../measurement/metrics.ts";
import type { CodeAreaDefinition } from "../../model/schema.ts";
import { analyzeFunctionMetrics } from "./function-metrics-analysis.ts";
import {
  measureFunctionMetrics,
  type FunctionMeasurementResult
} from "./function-metrics-measurement.ts";
import { buildFunctionRecordCandidates } from "./function-metrics-records.ts";

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
  const scanFiles = collectScanFiles(context.project.root, context.project.files);
  const current: FunctionMetricsExactInputSet = Object.freeze({
    approvedExactPaths: Object.freeze(selectLizardTargetFiles(scanFiles, context.project.files)),
    rootDir: context.project.root
  });
  if (current.approvedExactPaths.length === 0) {
    return Object.freeze({ status: "not-applicable", reason: { code: "no-eligible-input" } });
  }
  const dependency: FunctionScannerDependency = context.options.scanner;
  const semantics: FunctionMetricsSemantics = {
    codeAreas: context.project.files.codeAreas,
    functions: {
      codeLines: context.options.codeLines,
      cyclomaticComplexity: context.options.cyclomaticComplexity,
      parameterCount: context.options.parameterCount
    },
    generatedFiles: context.project.files.generatedFiles
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
