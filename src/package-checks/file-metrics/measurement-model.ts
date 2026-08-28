export interface FileMetric {
  readonly codeLines: number;
  readonly decisionTokens: Readonly<{ readonly source: "scc"; readonly value: number | null }>;
  readonly path: string;
}

export interface FileMetricsExactInputSet {
  readonly approvedExactPaths: readonly string[];
  readonly rootDir: string;
}
