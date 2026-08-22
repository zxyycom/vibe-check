import { defineConfig, duplicateDetection, fileMetrics, functionMetrics } from "vibe-check";

/** Repository-owned Vibe Check policy. Product code never discovers this file. */
export default defineConfig({
  checks: [
    {
      checkId: "repository-quality",
      displayName: "Repository quality",
      maxParallel: 2,
      checks: [
        {
          ...duplicateDetection,
          options: {
            ...duplicateDetection.options,
            defaultMinimumTokens: 100,
            minimumTokensByCodeArea: {
              "docs-specs": 150,
              generated: 200,
              "product-source": 75,
              "schemas-examples": 150,
              "script-tooling": 75
            }
          }
        },
        { ...fileMetrics, maxParallel: 1 },
        functionMetrics
      ]
    }
  ],
  effects: {
    cache: { directory: ".cache/vibe-check/quality", enabled: true },
    output: { directory: "artifacts/vibe-check-quality", enabled: true },
    progress: { enabled: false }
  },
  scheduler: { maxParallel: 4 },
  quality: {
    codeAreas: {
      "docs-specs": {
        description: "Long-term docs and current Change Plan materials",
        excludeGlobs: ["docs/examples/**", "docs/schemas/**"],
        globs: ["docs/**/*.md", "changes/**/*.md"],
        warningPolicy: "watchlist-only"
      },
      generated: {
        description: "Generated files",
        excludeGlobs: [],
        globs: ["**/generated/**"],
        warningPolicy: "exclude-warnings"
      },
      "product-source": {
        description: "Vibe Check TypeScript product source",
        excludeGlobs: ["**/fixtures/**", "**/generated/**"],
        globs: ["src/product/**/*.ts"],
        warningPolicy: "moderate"
      },
      "schemas-examples": {
        description: "Schemas and example artifacts",
        excludeGlobs: ["**/generated/**"],
        globs: ["docs/schemas/**", "docs/examples/**"],
        warningPolicy: "watchlist-only"
      },
      "script-tooling": {
        description: "Vibe Check TypeScript quality tooling",
        excludeGlobs: ["scripts/**/*.test.ts", "**/fixtures/**", "**/generated/**"],
        globs: [
          "scripts/docs/**/*.ts",
          "scripts/quality/**/*.ts",
          "scripts/tools/*.ts",
          "scripts/tools/validators/**/*.ts",
          "scripts/project-gate/**/*.ts"
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
    generatedFiles: ["**/generated/**"],
    include: [
      "src/product/**/*.ts",
      "scripts/docs/**/*.ts",
      "scripts/quality/**/*.ts",
      "scripts/tools/*.ts",
      "scripts/tools/validators/**/*.ts",
      "scripts/project-gate/**/*.ts",
      "docs/**/*.md",
      "changes/**/*.md"
    ]
  }
});
