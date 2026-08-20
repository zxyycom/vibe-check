import type { ResolvedQualityConfig } from "../model/schema.ts";
import type {
  DuplicationScannerDependency,
  FileScannerDependency,
  FunctionScannerDependency
} from "../../scanner-dependencies/index.ts";
import { DEFAULT_JSCPD_COMMAND } from "../measurement/scanners/jscpd/default-command.ts";

export const TEST_QUALITY_CONFIG: ResolvedQualityConfig = {
  checks: {
    duplication: {
      defaultMinimumTokens: 100,
      fragments: { changedDelta: 0 },
      minimumTokensByCodeArea: {
        "typescript-production-scripts": 75,
        "typescript-validation-smoke": 100
      }
    },
    files: {
      codeLines: {
        absoluteFloor: 300,
        changedDelta: 100,
        lowDecisionTokenAllowance: {
          codeLineFloor: 500,
          maxDecisionTokens: 10
        }
      }
    },
    functions: {
      codeLines: {
        absoluteFloor: 50,
        changedDelta: 20,
        lowComplexityAllowance: {
          codeLineFloor: 150,
          maxCyclomaticComplexityExclusive: 5
        }
      },
      cyclomaticComplexity: { absoluteFloor: 10, changedDelta: 5 },
      parameterCount: { absoluteFloor: 5, changedDelta: 2 }
    }
  },
  codeAreas: {
    "typescript-production-scripts": {
      description: "TypeScript production scripts",
      globs: ["scripts/**/*.ts"],
      excludeGlobs: ["scripts/**/*.test.ts"],
      warningPolicy: "moderate"
    },
    "typescript-validation-smoke": {
      description: "TypeScript validation and smoke tests",
      globs: ["test/**/*.ts"],
      excludeGlobs: [],
      warningPolicy: "relaxed"
    }
  },
  excludeDirs: [".git", "node_modules"],
  generatedFiles: ["**/generated/**"],
  include: ["scripts/**/*.ts", "test/**/*.ts"],
  report: {
    title: "Test Code Quality Snapshot",
    nonBlockingNotice: "Test quality metrics are observational.",
    footerGeneratedBy: "quality-core test fixture",
    footerNotice: "Test quality metrics are observational.",
    showWatchlist: true,
    timeZone: "UTC",
    topN: 5,
    watchlistMax: 10
  }
};

export const TEST_SCANNER_DEPENDENCIES: Readonly<{
  readonly duplication: DuplicationScannerDependency;
  readonly file: FileScannerDependency;
  readonly function: FunctionScannerDependency;
}> = {
  duplication: {
    ...DEFAULT_JSCPD_COMMAND,
    maxConcurrency: 2
  },
  file: {
    args: [],
    availabilityArgs: ["--version"],
    executable: "scc"
  },
  function: {
    args: [],
    availabilityArgs: ["--version"],
    executable: "lizard"
  }
};
