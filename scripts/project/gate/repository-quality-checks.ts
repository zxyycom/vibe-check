import { isAbsolute, resolve } from "node:path";

import {
  duplicateDetection,
  fileMetrics,
  functionMetrics,
  markdownLinkValidation
} from "vibe-check";

const MISE_LIZARD_COMMAND_ENV = "VIBE_CHECK_LIZARD_CMD";
const MISE_SCC_COMMAND_ENV = "VIBE_CHECK_SCC_CMD";
const unavailableScannerDirectory = resolve(
  ".cache",
  "vibe-check",
  "unavailable-repository-quality-scanner"
);

const repositoryFiles = {
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
  include: ["src/**/*.ts", "scripts/**/*.ts", "docs/**/*.md", "changes/**/*.md"],
  source: "filesystem"
} as const;

const areaFileDefaults = {
  exclude: repositoryFiles.exclude,
  source: repositoryFiles.source
} as const;

const functionMetricCodeAreas = {
  "product-source": {
    files: { ...areaFileDefaults, include: ["src/**/*.ts"] }
  },
  "script-tooling": {
    files: {
      ...areaFileDefaults,
      exclude: [...areaFileDefaults.exclude, "scripts/**/*.test.ts"],
      include: ["scripts/**/*.ts"]
    }
  }
} as const;

const fileMetricCodeAreas = {
  "docs-specs": {
    files: {
      ...areaFileDefaults,
      exclude: [...areaFileDefaults.exclude, "docs/examples/**", "docs/schemas/**"],
      include: ["docs/**/*.md", "changes/**/*.md"]
    }
  },
  "product-source": {
    files: { ...areaFileDefaults, include: ["src/**/*.ts"] }
  },
  "schemas-examples": {
    files: {
      ...areaFileDefaults,
      include: ["docs/schemas/**", "docs/examples/**"]
    }
  },
  "script-tooling": {
    files: {
      ...areaFileDefaults,
      exclude: [...areaFileDefaults.exclude, "scripts/**/*.test.ts"],
      include: ["scripts/**/*.ts"]
    }
  }
} as const;

const duplicateCodeAreas = {
  "docs-specs": {
    files: {
      ...areaFileDefaults,
      exclude: [...areaFileDefaults.exclude, "docs/examples/**", "docs/schemas/**"],
      include: ["docs/**/*.md", "changes/**/*.md"]
    },
    minimumLines: 3,
    minimumTokens: 150
  },
  "product-source": {
    files: { ...areaFileDefaults, include: ["src/**/*.ts"] },
    minimumLines: 3,
    minimumTokens: 75
  },
  "schemas-examples": {
    files: {
      ...areaFileDefaults,
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
} as const;

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

/** Constructs the four raw repository scans consumed directly by the Project Gate. */
export function createRepositoryQualityChecks(
  scanners: RepositoryQualityScannerCommands = repositoryQualityScannerCommands()
): readonly [
  ReturnType<typeof duplicateDetection>,
  ReturnType<typeof fileMetrics>,
  ReturnType<typeof functionMetrics>,
  ReturnType<typeof markdownLinkValidation>
] {
  return Object.freeze([
    duplicateDetection({ codeAreas: duplicateCodeAreas, findingPolicy: "non-blocking" }),
    fileMetrics({
      codeAreas: fileMetricCodeAreas,
      findingPolicy: "non-blocking",
      scanner: { executable: absoluteScannerCommand(scanners.scc, MISE_SCC_COMMAND_ENV) }
    }),
    functionMetrics({
      codeAreas: functionMetricCodeAreas,
      findingPolicy: "non-blocking",
      scanner: { executable: absoluteScannerCommand(scanners.lizard, MISE_LIZARD_COMMAND_ENV) }
    }),
    markdownLinkValidation({ files: repositoryFiles, findingPolicy: "non-blocking" })
  ]);
}

function absoluteScannerCommand(value: string | undefined, name: string): string {
  if (value !== undefined && isAbsolute(value)) return value;
  return resolve(unavailableScannerDirectory, name);
}
