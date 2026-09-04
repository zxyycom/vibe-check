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

const MISE_SCC_COMMAND_ENV = "VIBE_CHECK_SCC_CMD";
const unavailableScannerDirectory = resolve(
  ".cache",
  "vibe-check",
  "unavailable-repository-quality-scanner"
);
const repositoryFileDefaults = {
  exclude: [
    "**/.git",
    "**/.git/**",
    "**/archive/**",
    "**/target/**",
    "**/node_modules/**",
    "**/.venv/**",
    "**/.uv-cache/**",
    "**/.ruff_cache/**",
    "**/dist/**",
    "**/build/**",
    "**/vendor/**",
    "**/generated/**",
    "**/fixtures/**",
    "**/.cache/**",
    "**/cache/**",
    "**/artifacts/**",
    "**/.tmp/**",
    "**/.log/**"
  ],
  source: "filesystem"
} as const;
const areaFileDefaults = {
  exclude: repositoryFileDefaults.exclude,
  source: repositoryFileDefaults.source
} as const;
const repositoryFileCodeLines = {
  lowDecisionTokenAllowance: { maximumCodeLines: 500, maximumDecisionTokens: 10 },
  maximum: 300
} as const;
const repositoryFunctionLimits = {
  codeLines: {
    lowComplexityAllowance: { cyclomaticComplexityBelow: 5, maximum: 150 },
    maximum: 50
  },
  cyclomaticComplexity: { maximum: 10 },
  nestingDepth: { maximum: 7 },
  parameters: { maximum: 5 }
} as const;
const lizardPortQualityExclusion = "src/package-checks/function-metrics/analyzer/**";
const productFunctionMetricTestExclusions = [
  "src/**/*.test.ts",
  "src/**/*.test-support.ts"
] as const;

export interface RepositoryQualityCheckOptions {
  readonly duplicateDetection: DuplicateDetectionOptions;
  readonly fileMetrics: Omit<FileMetricsOptions, "scanner">;
  readonly functionMetrics: FunctionMetricsOptions;
  readonly markdownLinkValidation: MarkdownLinkValidationOptions;
}

export interface RepositoryQualityChecks {
  readonly duplicateDetection: ReturnType<typeof duplicateDetection>;
  readonly fileMetrics: ReturnType<typeof fileMetrics>;
  readonly functionMetrics: ReturnType<typeof functionMetrics>;
  readonly markdownLinkValidation: ReturnType<typeof markdownLinkValidation>;
}

export interface RepositoryQualityScannerCommands {
  readonly scc: string;
}

/** Complete repository-private policy owned by the repository-quality Check group. */
export const PROJECT_GATE_REPOSITORY_QUALITY_OPTIONS = {
  duplicateDetection: {
    codeAreas: {
      "product-source": {
        files: {
          ...areaFileDefaults,
          exclude: [...areaFileDefaults.exclude, lizardPortQualityExclusion],
          include: ["src/**/*.ts"]
        },
        minimumLines: 3,
        minimumTokens: 75
      },
      "schemas-examples": {
        files: {
          ...areaFileDefaults,
          exclude: [...areaFileDefaults.exclude, "docs/schemas/historical/**"],
          include: ["docs/schemas/**", "docs/examples/**"]
        },
        minimumLines: 3,
        minimumTokens: 150
      },
      "script-tests": {
        files: { ...areaFileDefaults, include: ["scripts/**/*.test.ts"] },
        minimumLines: 3,
        minimumTokens: 100
      },
      "script-tooling": {
        files: {
          ...areaFileDefaults,
          exclude: [...areaFileDefaults.exclude, "scripts/**/*.test.ts"],
          include: ["scripts/**/*.ts"]
        },
        minimumLines: 3,
        minimumTokens: 75
      }
    },
    findingPolicy: "non-blocking"
  },
  fileMetrics: {
    codeAreas: {
      "docs-specs": {
        codeLines: repositoryFileCodeLines,
        files: {
          ...areaFileDefaults,
          exclude: [...areaFileDefaults.exclude, "docs/examples/**", "docs/schemas/**"],
          include: ["docs/**/*.md", "changes/**/*.md"]
        }
      },
      "product-source": {
        codeLines: repositoryFileCodeLines,
        files: {
          ...areaFileDefaults,
          exclude: [...areaFileDefaults.exclude, lizardPortQualityExclusion],
          include: ["src/**/*.ts"]
        }
      },
      "schemas-examples": {
        codeLines: repositoryFileCodeLines,
        files: {
          ...areaFileDefaults,
          exclude: [...areaFileDefaults.exclude, "docs/schemas/historical/**"],
          include: ["docs/schemas/**", "docs/examples/**"]
        }
      },
      "script-tooling": {
        codeLines: repositoryFileCodeLines,
        files: {
          ...areaFileDefaults,
          exclude: [...areaFileDefaults.exclude, "scripts/**/*.test.ts"],
          include: ["scripts/**/*.ts"]
        }
      }
    },
    findingPolicy: "non-blocking"
  },
  functionMetrics: {
    codeAreas: {
      "product-source": {
        files: {
          ...areaFileDefaults,
          exclude: [
            ...areaFileDefaults.exclude,
            lizardPortQualityExclusion,
            ...productFunctionMetricTestExclusions
          ],
          include: ["src/**/*.ts"]
        },
        limits: repositoryFunctionLimits
      },
      "script-tooling": {
        files: {
          ...areaFileDefaults,
          exclude: [...areaFileDefaults.exclude, "scripts/**/*.test.ts"],
          include: ["scripts/**/*.ts"]
        },
        limits: repositoryFunctionLimits
      }
    },
    findingPolicy: "non-blocking"
  },
  markdownLinkValidation: {
    files: {
      ...areaFileDefaults,
      include: ["docs/**/*.md", "changes/**/*.md"]
    },
    findingPolicy: "non-blocking"
  }
} as const satisfies RepositoryQualityCheckOptions;

/** Resolves Gate-owned scanner commands without admitting ambient PATH fallbacks. */
export function repositoryQualityScannerCommands(
  environment: NodeJS.ProcessEnv = process.env
): RepositoryQualityScannerCommands {
  return Object.freeze({
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
    functionMetrics: functionMetrics(options.functionMetrics),
    markdownLinkValidation: markdownLinkValidation(options.markdownLinkValidation)
  });
}

/** Creates the repository's configured quality Check object group. */
export function createProjectGateRepositoryQualityChecks(
  scanners: RepositoryQualityScannerCommands = repositoryQualityScannerCommands()
): RepositoryQualityChecks {
  return createRepositoryQualityChecks(PROJECT_GATE_REPOSITORY_QUALITY_OPTIONS, scanners);
}

function absoluteScannerCommand(value: string | undefined, name: string): string {
  if (value !== undefined && isAbsolute(value)) return value;
  return resolve(unavailableScannerDirectory, name);
}
