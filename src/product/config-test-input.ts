export function semanticConfigInput(): Record<string, unknown> {
  return {
    acceptedWarnings: [{
      checkId: "function-cyclomatic-complexity",
      codeArea: "app",
      messageIncludes: ["complexity"],
      metric: "cyclomaticComplexity",
      path: "src/app.ts",
      reason: "Reviewed complexity",
      suggestionIncludes: ["simplify"],
      value: -0.5
    }],
    artifactDir: "artifacts/quality",
    cacheDir: ".cache/quality",
    checks: {
      duplication: {
        defaultMinimumTokens: 75.5,
        fragments: {
          changedDelta: -1
        },
        minimumTokensByCodeArea: {
          app: 80.25
        }
      },
      files: {
        codeLines: {
          absoluteFloor: -1.5,
          changedDelta: 0.5,
          lowDecisionTokenAllowance: {
            codeLineFloor: 500.5,
            maxDecisionTokens: -2
          }
        }
      },
      functions: {
        codeLines: {
          absoluteFloor: 50.5,
          changedDelta: -20,
          lowComplexityAllowance: {
            codeLineFloor: 150.25,
            maxCyclomaticComplexityExclusive: 5.5
          }
        },
        cyclomaticComplexity: {
          absoluteFloor: 10.5,
          changedDelta: -5
        },
        parameterCount: {
          absoluteFloor: 5.25,
          changedDelta: -2
        }
      }
    },
    codeAreas: {
      app: {
        description: "Application source",
        excludeGlobs: ["**/*.generated.ts"],
        globs: ["src/**/*.ts"],
        warningPolicy: "moderate"
      }
    },
    excludeDirs: ["vendor"],
    generatedFiles: ["**/generated/**"],
    include: ["src/**/*.ts"],
    report: {
      footerGeneratedBy: "Vibe Check",
      footerNotice: "Review the generated report.",
      nonBlockingNotice: "Development snapshot.",
      showWatchlist: true,
      timeZone: "UTC",
      title: "Quality Snapshot",
      topN: 10.5,
      watchlistMax: 20.25
    },
    version: "1"
  };
}
