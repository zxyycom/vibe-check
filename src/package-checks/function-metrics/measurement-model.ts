import type { FunctionMetricsFindingPolicy, ResolvedFunctionMetricsLimits } from "./options.ts";

export interface MetricValue {
  readonly source: "lizard";
  readonly value: number | null;
}

export interface FunctionMetric {
  readonly cyclomaticComplexity: MetricValue;
  readonly endLine: number;
  readonly file: string;
  readonly lines: number;
  readonly name: string;
  readonly parameterCount: number;
  readonly startLine: number;
}

export interface FunctionMetricsAreaInput {
  readonly approvedExactPaths: readonly string[];
  readonly codeArea: string;
  readonly findingPolicy: FunctionMetricsFindingPolicy;
  readonly limits: ResolvedFunctionMetricsLimits;
}

export interface FunctionMetricsExactInputSet {
  readonly approvedExactPaths: readonly string[];
  readonly areas: readonly FunctionMetricsAreaInput[];
  readonly rootDir: string;
}
