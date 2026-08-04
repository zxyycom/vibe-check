import {
  parseSemanticProjectConfigV1,
  resolveQualityConfig,
  type QualityConfigCliOverrides,
  type SemanticProjectConfigV1
} from "./config-schema.ts";
import type { ResolvedQualityConfig } from "./quality-core/src/model/schema.ts";

export const NeutralProjectConfig: SemanticProjectConfigV1 =
  parseSemanticProjectConfigV1({
    acceptedWarnings: [],
    artifactDir: "artifacts/vibe-check",
    cacheDir: ".cache/vibe-check",
    checks: {
      duplication: {
        defaultMinimumTokens: 75,
        fragments: {
          changedDelta: 1
        },
        minimumTokensByCodeArea: {}
      },
      files: {
        codeLines: {
          absoluteFloor: 300,
          changedDelta: 80,
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
        cyclomaticComplexity: {
          absoluteFloor: 10,
          changedDelta: 5
        },
        parameterCount: {
          absoluteFloor: 5,
          changedDelta: 2
        }
      }
    },
    codeAreas: {
      project: {
        description: "This project",
        excludeGlobs: [],
        globs: ["**/*"],
        warningPolicy: "moderate"
      }
    },
    excludeDirs: [
      ".git",
      ".vibe-check",
      ".cache",
      ".venv",
      "artifacts",
      "build",
      "dist",
      "node_modules",
      "target",
      "vendor"
    ],
    generatedFiles: ["**/generated/**", "**/*.generated.*"],
    include: ["**/*"],
    report: {
      footerGeneratedBy: "Vibe Check",
      footerNotice: "Review findings for this project.",
      nonBlockingNotice:
        "This project scan is observational unless a gate is explicitly enabled.",
      showWatchlist: true,
      timeZone: "UTC",
      title: "This project quality report",
      topN: 20,
      watchlistMax: 50
    },
    version: "1"
  });

export const DEFAULT_CONFIG: ResolvedQualityConfig =
  resolveQualityConfig(NeutralProjectConfig);

export function createDefaultConfig(
  overrides: QualityConfigCliOverrides = {}
): ResolvedQualityConfig {
  return resolveQualityConfig(NeutralProjectConfig, overrides);
}
