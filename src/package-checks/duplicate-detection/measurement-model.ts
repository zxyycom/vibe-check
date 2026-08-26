export interface DuplicateCodeLocation {
  readonly codeArea: string;
  readonly endLine: number;
  readonly path: string;
  readonly startLine: number;
}

export interface DuplicateCodeFragment {
  readonly codeAreas: readonly string[];
  readonly id: number;
  readonly lineCount: number;
  readonly locations: readonly DuplicateCodeLocation[];
  readonly tokenCount: number;
}
