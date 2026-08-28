import {
  defineConfig,
  duplicateDetection,
  fileMetrics,
  functionMetrics,
  markdownLinkValidation
} from "vibe-check";

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

/** Repository-owned Vibe Check policy. Product code never discovers this file. */
export default defineConfig({
  checks: [
    {
      checkId: "repository-quality",
      displayName: "Repository quality",
      maxParallel: 2,
      checks: [
        duplicateDetection({ codeAreas: duplicateCodeAreas }),
        { ...fileMetrics({ codeAreas: fileMetricCodeAreas }), maxParallel: 1 },
        functionMetrics({
          codeAreas: functionMetricCodeAreas,
          findingPolicy: "non-blocking"
        }),
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
