export const WARNING_POLICIES = Object.freeze([
  "strict",
  "moderate",
  "relaxed",
  "watchlist-only",
  "exclude-warnings"
] as const);

export type CodeAreaWarningPolicy = (typeof WARNING_POLICIES)[number];

export interface ToolAvailability {
  available: boolean;
  error?: string | null;
  name: string;
  reason?: string | null;
  source: string;
  version: string | null;
}

export interface CodeAreaDefinition {
  readonly description: string;
  readonly excludeGlobs: readonly string[];
  readonly globs: readonly string[];
  readonly warningPolicy: CodeAreaWarningPolicy;
}

export interface CodeAreaFingerprint {
  fileCount: number;
  fileList: string[];
  fingerprint: string;
}

export type CodeAreaFileMap = Map<string, string[]>;

export interface MetricValue {
  source: string;
  value: number | null;
}

export interface FileMetric {
  blankLines?: number;
  codeArea: string;
  codeLines?: number;
  commentLines?: number;
  decisionTokens: MetricValue;
  language: string;
  lines: number;
  path: string;
}

export interface FunctionMetric {
  codeArea: string;
  cyclomaticComplexity: MetricValue;
  endLine: number;
  file: string;
  lines: number;
  name: string;
  parameterCount: number;
  startLine: number;
}

export interface DuplicateCodeLocation {
  codeArea: string;
  endLine: number;
  path: string;
  startLine: number;
}

export interface DuplicateCodeFragment {
  codeAreas: string[];
  id: number;
  lineCount: number;
  locations: DuplicateCodeLocation[];
  tokenCount: number;
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
