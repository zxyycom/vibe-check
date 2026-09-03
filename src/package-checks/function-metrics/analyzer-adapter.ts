import {
  analyzeLizardSource,
  isLizardSourceSupported,
  lizardSourceExtensions,
  type LizardFunctionInfo
} from "./analyzer/port-facade.ts";
import type { FunctionMetric } from "./measurement-model.ts";

/** One parent-admitted source passed through the Product adapter to the Lizard port. */
export interface FunctionMetricsAnalyzerSource {
  readonly path: string;
  readonly source: string;
}

/** The complete in-memory source batch that one Worker asks the adapter to analyze. */
export interface FunctionMetricsAnalyzerInput {
  readonly files: readonly FunctionMetricsAnalyzerSource[];
}

/** Product-facing result of a complete adapter analysis; failures never carry a prefix. */
export type FunctionMetricsAnalyzerResult =
  | Readonly<{ readonly kind: "analysis-failed" }>
  | Readonly<{ readonly kind: "complete"; readonly metrics: readonly FunctionMetric[] }>;

/** The translated port's fixed suffix capability, presented for functionMetrics selection. */
export const FUNCTION_METRICS_SUPPORTED_FILE_EXTENSIONS = Object.freeze([
  ...lizardSourceExtensions()
]);

/** Whether a Product-selected path is supported by the translated Lizard port. */
export function isFunctionMetricsAnalyzerSourceSupported(filePath: string): boolean {
  return isLizardSourceSupported(filePath);
}

/**
 * Maps complete Lizard-domain analyses into the Product's function metrics.
 * An unsupported source or analyzer exception discards every collected metric.
 */
export function analyzeFunctionMetricsSources(
  input: FunctionMetricsAnalyzerInput
): FunctionMetricsAnalyzerResult {
  try {
    const metrics: FunctionMetric[] = [];
    for (const sourceFile of input.files) {
      const analysis = analyzeLizardSource({
        filename: sourceFile.path,
        sourceCode: sourceFile.source
      });
      if (analysis === undefined) return analysisFailed();
      for (const functionInfo of analysis.function_list) {
        metrics.push(toFunctionMetric(sourceFile.path, functionInfo));
      }
    }
    return Object.freeze({ kind: "complete", metrics: Object.freeze(metrics) });
  } catch {
    return analysisFailed();
  }
}

function analysisFailed(): FunctionMetricsAnalyzerResult {
  return Object.freeze({ kind: "analysis-failed" });
}

function toFunctionMetric(filePath: string, functionInfo: LizardFunctionInfo): FunctionMetric {
  return Object.freeze({
    complexityContributors: Object.freeze(
      functionInfo.complex_tags.map(([token, line]) => Object.freeze({ line, token }))
    ),
    cyclomaticComplexity: Object.freeze({
      source: "typescript-analyzer" as const,
      value: functionInfo.cyclomatic_complexity
    }),
    endLine: functionInfo.end_line,
    file: filePath,
    lines: functionInfo.nloc,
    name: functionInfo.name,
    nestingDepth: Object.freeze({
      source: "typescript-analyzer" as const,
      value: functionInfo.max_nesting_depth
    }),
    parameterCount: functionInfo.parameter_count,
    startLine: functionInfo.start_line
  });
}
