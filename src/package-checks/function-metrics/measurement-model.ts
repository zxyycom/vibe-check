export interface MetricValue {
  readonly source: string;
  readonly value: number | null;
}

export interface FunctionMetric {
  readonly codeArea: string;
  readonly cyclomaticComplexity: MetricValue;
  readonly endLine: number;
  readonly file: string;
  readonly lines: number;
  readonly name: string;
  readonly parameterCount: number;
  readonly startLine: number;
}
