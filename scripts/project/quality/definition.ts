import {
  defineConfig,
  duplicateDetection,
  fileMetrics,
  functionMetrics,
  markdownLinkValidation
} from "vibe-check";

const repositoryFiles = {
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
    "src/**/*.ts",
    "scripts/docs/**/*.ts",
    "scripts/project/quality/**/*.ts",
    "scripts/foundation/**/*.ts",
    "scripts/validation/**/*.ts",
    "scripts/project/gate/**/*.ts",
    "docs/**/*.md",
    "changes/**/*.md"
  ]
} as const;

const metricCodeAreas = {
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
    globs: ["src/**/*.ts"],
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
      "scripts/project/quality/**/*.ts",
      "scripts/foundation/**/*.ts",
      "scripts/validation/**/*.ts",
      "scripts/project/gate/**/*.ts"
    ],
    warningPolicy: "moderate"
  }
} as const;

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
            codeAreas: metricCodeAreas,
            defaultMinimumTokens: 100,
            files: repositoryFiles,
            minimumTokensByCodeArea: {
              "docs-specs": 150,
              generated: 200,
              "product-source": 75,
              "schemas-examples": 150,
              "script-tooling": 75
            }
          }
        },
        {
          ...fileMetrics,
          maxParallel: 1,
          options: { ...fileMetrics.options, codeAreas: metricCodeAreas, files: repositoryFiles }
        },
        {
          ...functionMetrics,
          options: {
            ...functionMetrics.options,
            codeAreas: metricCodeAreas,
            files: repositoryFiles
          }
        },
        {
          ...markdownLinkValidation,
          options: { ...markdownLinkValidation.options, files: repositoryFiles }
        }
      ]
    }
  ],
  outputs: {
    machinePublication: { directory: "artifacts/vibe-check-quality", enabled: true },
    progressRendering: { enabled: false }
  },
  scheduler: { maxParallel: 4 }
});
