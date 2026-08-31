import { isAbsolute, resolve } from "node:path";

import {
  duplicateDetection,
  fileMetrics,
  functionMetrics,
  markdownLinkValidation,
  type DuplicateDetectionOptions,
  type FileMetricsOptions,
  type FunctionMetricsOptions,
  type MarkdownLinkValidationOptions
} from "@zxyycom/vibe-check";

const MISE_LIZARD_COMMAND_ENV = "VIBE_CHECK_LIZARD_CMD";
const MISE_SCC_COMMAND_ENV = "VIBE_CHECK_SCC_CMD";
const unavailableScannerDirectory = resolve(
  ".cache",
  "vibe-check",
  "unavailable-repository-quality-scanner"
);

export interface RepositoryQualityCheckOptions {
  readonly duplicateDetection: DuplicateDetectionOptions;
  readonly fileMetrics: Omit<FileMetricsOptions, "scanner">;
  readonly functionMetrics: Omit<FunctionMetricsOptions, "scanner">;
  readonly markdownLinkValidation: MarkdownLinkValidationOptions;
}

export interface RepositoryQualityChecks {
  readonly duplicateDetection: ReturnType<typeof duplicateDetection>;
  readonly fileMetrics: ReturnType<typeof fileMetrics>;
  readonly functionMetrics: ReturnType<typeof functionMetrics>;
  readonly markdownLinkValidation: ReturnType<typeof markdownLinkValidation>;
}

export interface RepositoryQualityScannerCommands {
  readonly lizard: string;
  readonly scc: string;
}

/** Resolves Gate-owned scanner commands without admitting ambient PATH fallbacks. */
export function repositoryQualityScannerCommands(
  environment: NodeJS.ProcessEnv = process.env
): RepositoryQualityScannerCommands {
  return Object.freeze({
    lizard: absoluteScannerCommand(environment[MISE_LIZARD_COMMAND_ENV], MISE_LIZARD_COMMAND_ENV),
    scc: absoluteScannerCommand(environment[MISE_SCC_COMMAND_ENV], MISE_SCC_COMMAND_ENV)
  });
}

/** Binds the root Definition's repository policy to the four package Check constructors. */
export function createRepositoryQualityChecks(
  options: RepositoryQualityCheckOptions,
  scanners: RepositoryQualityScannerCommands = repositoryQualityScannerCommands()
): RepositoryQualityChecks {
  return Object.freeze({
    duplicateDetection: duplicateDetection(options.duplicateDetection),
    fileMetrics: fileMetrics({
      ...options.fileMetrics,
      scanner: { executable: absoluteScannerCommand(scanners.scc, MISE_SCC_COMMAND_ENV) }
    }),
    functionMetrics: functionMetrics({
      ...options.functionMetrics,
      scanner: { executable: absoluteScannerCommand(scanners.lizard, MISE_LIZARD_COMMAND_ENV) }
    }),
    markdownLinkValidation: markdownLinkValidation(options.markdownLinkValidation)
  });
}

function absoluteScannerCommand(value: string | undefined, name: string): string {
  if (value !== undefined && isAbsolute(value)) return value;
  return resolve(unavailableScannerDirectory, name);
}
