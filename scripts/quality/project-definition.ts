import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "../../src/product/project-definition.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** Repository-owned Vibe Check policy. Product code never discovers this file. */
export default defineConfig({
  checks: {
    builtIn: ["duplicate-detection", "file-metrics", "function-metrics"],
    schedules: [
      { checkId: "duplicate-detection", requiresChecks: [] },
      { checkId: "file-metrics", requiresChecks: [] },
      { checkId: "function-metrics", requiresChecks: [] }
    ],
    selected: ["duplicate-detection", "file-metrics", "function-metrics"]
  },
  effects: {
    cache: { directory: ".cache/vibe-check/quality", enabled: true },
    logs: { enabled: true },
    output: { directory: "artifacts/vibe-check-quality", enabled: true },
    progress: { enabled: false }
  },
  operationalDependencies: {
    duplication: {
      executable: resolve(repositoryRoot, "node_modules/.bin/jscpd")
    }
  },
  scheduler: { maxParallel: 4 },
  quality: {
    checks: {
      duplication: {
        defaultMinimumTokens: 100,
        fragments: {
          changedDelta: 0
        },
        minimumTokensByCodeArea: {
          "docs-specs": 150,
          generated: 200,
          "product-source": 75,
          "schemas-examples": 150,
          "script-tooling": 75
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
      "docs-specs": {
        description: "Long-term docs and current Change Plan materials",
        excludeGlobs: [
          "docs/examples/**",
          "docs/schemas/**"
        ],
        globs: [
          "docs/**/*.md",
          "changes/**/*.md"
        ],
        warningPolicy: "watchlist-only"
      },
      generated: {
        description: "Generated files",
        excludeGlobs: [],
        globs: [
          "**/generated/**"
        ],
        warningPolicy: "exclude-warnings"
      },
      "product-source": {
        description: "Vibe Check TypeScript product source",
        excludeGlobs: [
          "**/fixtures/**",
          "**/generated/**"
        ],
        globs: [
          "src/product/**/*.ts"
        ],
        warningPolicy: "moderate"
      },
      "schemas-examples": {
        description: "Schemas and example artifacts",
        excludeGlobs: [
          "**/generated/**"
        ],
        globs: [
          "docs/schemas/**",
          "docs/examples/**"
        ],
        warningPolicy: "watchlist-only"
      },
      "script-tooling": {
        description: "Vibe Check TypeScript quality tooling",
        excludeGlobs: [
          "scripts/**/*.test.ts",
          "**/fixtures/**",
          "**/generated/**"
        ],
        globs: [
          "scripts/docs/**/*.ts",
          "scripts/quality/**/*.ts",
          "scripts/tools/*.ts",
          "scripts/tools/validators/**/*.ts",
          "scripts/vibe-check-workspace/**/*.ts"
        ],
        warningPolicy: "moderate"
      }
    },
    excludeDirs: [
      ".git",
      "archive",
      "target",
      "node_modules",
      ".venv",
      ".uv-cache",
      ".ruff_cache",
      "dist",
      "build",
      "vendor",
      "generated",
      "fixtures",
      ".cache",
      "cache",
      "artifacts",
      ".tmp",
      ".log"
    ],
    generatedFiles: [
      "**/generated/**"
    ],
    include: [
      "src/product/**/*.ts",
      "scripts/docs/**/*.ts",
      "scripts/quality/**/*.ts",
      "scripts/tools/*.ts",
      "scripts/tools/validators/**/*.ts",
      "scripts/vibe-check-workspace/**/*.ts",
      "docs/**/*.md",
      "changes/**/*.md"
    ],
    report: {
      footerGeneratedBy: "Vibe Check Quality Observability",
      footerNotice: "This report is a non-blocking development snapshot. Vibe Check Package Run, product tests, and contract validation define the release gates.",
      nonBlockingNotice: "Non-blocking development quality snapshot. Package Run, the report contract, and product tests define the release contract.",
      showWatchlist: true,
      timeZone: "Asia/Shanghai",
      title: "Vibe Check Quality Snapshot",
      topN: 10,
      watchlistMax: 20
    }
  }
});
