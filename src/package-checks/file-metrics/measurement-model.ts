export interface MetricValue {
  readonly source: string;
  readonly value: number | null;
}

export interface FileMetric {
  readonly blankLines?: number;
  readonly codeArea: string;
  readonly codeLines?: number;
  readonly commentLines?: number;
  readonly decisionTokens: MetricValue;
  readonly language: string;
  readonly lines: number;
  readonly path: string;
}

export interface LanguageAggregate {
  blankLines: number;
  codeLines: number;
  comments?: number;
  commentLines: number;
  files: number;
  language: string;
  lines: number;
}
