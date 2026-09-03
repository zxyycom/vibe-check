import type { FindingPolicy } from "../code-quality-findings/policy.ts";
import type { ResolvedFunctionMetricsLimits } from "./options.ts";

export interface MetricValue {
  readonly source: "typescript-analyzer";
  readonly value: number | null;
}

/** One CCN-contributing token and its one-based source line. */
export interface ComplexityContributor {
  readonly line: number;
  readonly token: string;
}

/** A nesting-depth value is complete for every function admitted to this Product metric. */
export interface NestingDepthMetricValue {
  readonly source: "typescript-analyzer";
  readonly value: number;
}

export interface FunctionMetric {
  readonly complexityContributors: readonly ComplexityContributor[];
  readonly cyclomaticComplexity: MetricValue;
  readonly endLine: number;
  readonly file: string;
  readonly lines: number;
  readonly name: string;
  readonly nestingDepth: NestingDepthMetricValue;
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
