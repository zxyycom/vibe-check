import type {
  ResolvedDuplicateDetectionOptions,
  ResolvedDuplicateDetectionScannerOptions
} from "./options.ts";

export interface DuplicateCodeLocation {
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

export interface DuplicateDetectionAreaInput {
  readonly approvedExactPaths: readonly string[];
  readonly codeArea: string;
  readonly minimumLines: number;
  readonly minimumTokens: number;
}

export interface DuplicateDetectionExactInputSet {
  readonly approvedExactPaths: readonly string[];
  readonly areas: readonly DuplicateDetectionAreaInput[];
  readonly rootDir: string;
}

export interface DuplicateMeasurementInput {
  readonly cache: ResolvedDuplicateDetectionOptions["cache"];
  readonly dependency: ResolvedDuplicateDetectionScannerOptions;
  readonly exactInput: DuplicateDetectionExactInputSet;
}
