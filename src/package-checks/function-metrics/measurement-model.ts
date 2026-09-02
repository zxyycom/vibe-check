import type { FindingPolicy } from "../code-quality-findings/policy.ts";
import type { ResolvedFunctionMetricsLimits } from "./options.ts";

export interface MetricValue {
  readonly source: "typescript-analyzer";
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
  readonly findingPolicy: FindingPolicy;
  readonly limits: ResolvedFunctionMetricsLimits;
}

export interface FunctionMetricsExactInputSet {
  readonly approvedExactPaths: readonly string[];
  readonly areas: readonly FunctionMetricsAreaInput[];
  readonly rootDir: string;
}
