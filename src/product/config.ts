import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { errorMessage } from "./foundation/src/errors.ts";
import { isStringArray } from "./foundation/src/type-guards.ts";
import type { QualityConfig } from "./quality-core/src/model/schema.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const JSCPD_BIN_NAME = process.platform === "win32" ? "jscpd.cmd" : "jscpd";
const DEFAULT_JSCPD_COMMAND = resolve(REPO_ROOT, "node_modules", ".bin", JSCPD_BIN_NAME);

function readJsonStringArrayEnv(name: string): string[] {
  const raw = process.env[name];
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err: unknown) {
    throw new Error(`${name} must be a JSON array of strings: ${errorMessage(err)}`, { cause: err });
  }

  if (!isStringArray(parsed)) {
    throw new Error(`${name} must be a JSON array of strings`);
  }

  return parsed;
}

export const DEFAULT_CONFIG = Object.freeze({
  version: "0.2.0",

  // Keep Vibe Check-owned scripts explicit so fallback collection does not enter toolkit submodules.
  include: [
    "src/product/**/*.ts",
    "scripts/docs/**/*.ts",
    "scripts/quality/**/*.ts",
    "scripts/tools/*.ts",
    "scripts/tools/validators/**/*.ts",
    "scripts/vibe-check-workspace/**/*.ts",
    "docs/**/*.md",
    "docs/**/*.json",
    "openspec/**/*.md"
  ],

  excludeDirs: [
    ".git",
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

  codeAreas: Object.freeze({
    "product-source": {
      description: "Vibe Check TypeScript product source",
      globs: ["src/product/**/*.ts"],
      excludeGlobs: ["**/fixtures/**", "**/generated/**"],
      warningPolicy: "moderate"
    },
    "script-tooling": {
      description: "Vibe Check TypeScript quality tooling",
      globs: [
        "scripts/docs/**/*.ts",
        "scripts/quality/**/*.ts",
        "scripts/tools/*.ts",
        "scripts/tools/validators/**/*.ts",
        "scripts/vibe-check-workspace/**/*.ts"
      ],
      excludeGlobs: ["scripts/**/*.test.ts", "**/fixtures/**", "**/generated/**"],
      warningPolicy: "moderate"
    },
    "docs-specs": {
      description: "Long-term docs and OpenSpec change materials",
      globs: ["docs/**/*.md", "openspec/**/*.md"],
      excludeGlobs: ["docs/examples/**", "docs/schemas/**"],
      warningPolicy: "watchlist-only"
    },
    "schemas-examples": {
      description: "Schemas and example artifacts",
      globs: ["docs/schemas/**", "docs/examples/**"],
      excludeGlobs: ["**/generated/**"],
      warningPolicy: "watchlist-only"
    },
    "generated": {
      description: "Generated files",
      globs: ["**/generated/**"],
      excludeGlobs: [],
      warningPolicy: "exclude-warnings"
    }
  }),

  lizard: {
    cyclomaticComplexity: {
      absoluteFloor: 10,
      changedDelta: 5
    },
    functionCodeDensity: {
      absoluteFloor: 50,
      changedDelta: 20,
      lowComplexityAllowance: {
        maxCyclomaticComplexityExclusive: 5,
        codeLineFloor: 150
      }
    },
    parameterCount: {
      absoluteFloor: 5,
      changedDelta: 2
    }
  },

  scc: {
    fileCodeLines: {
      absoluteFloor: 300,
      changedDelta: 100,
      lowDecisionTokenAllowance: {
        maxDecisionTokens: 10,
        codeLineFloor: 500
      }
    }
  },

  jscpd: {
    maxParallelTasks: 4,
    minimumTokens: Object.freeze({
      "product-source": 75,
      "script-tooling": 75,
      "docs-specs": 150,
      "schemas-examples": 150,
      "generated": 200
    }),
    formatByCodeArea: Object.freeze({
      "product-source": "typescript",
      "script-tooling": "typescript",
      "docs-specs": null,
      "schemas-examples": null,
      "generated": null
    }),
    defaultMinimumTokens: 100,
    duplicateFragments: {
      changedDelta: 0
    }
  },

  acceptedWarnings: Object.freeze([]),

  report: {
    title: "Vibe Check Quality Snapshot",
    nonBlockingNotice:
      "Non-blocking development quality snapshot. The Vibe Check TypeScript/Bun product CLI, report contract, and product tests define the release contract.",
    footerGeneratedBy: "Vibe Check Quality Observability",
    footerNotice:
      "This report is a non-blocking development snapshot. Vibe Check TypeScript/Bun product tests and contract validation define the release gates.",
    topN: 10,
    timeZone: "Asia/Shanghai",
    showWatchlist: true,
    watchlistMax: 20
  },

  artifactDir: "artifacts/vibe-check-quality",
  cacheDir: ".cache/vibe-check/quality",

  tools: {
    lizard: {
      command: process.env.VIBE_CHECK_LIZARD_CMD || (process.platform === "win32" ? "python" : "python3"),
      args: ["-m", "lizard"]
    },
    scc: {
      command: process.env.VIBE_CHECK_SCC_CMD || "scc",
      args: readJsonStringArrayEnv("VIBE_CHECK_SCC_ARGS")
    },
    jscpd: {
      command: process.env.VIBE_CHECK_JSCPD_CMD || DEFAULT_JSCPD_COMMAND,
      args: readJsonStringArrayEnv("VIBE_CHECK_JSCPD_ARGS")
    }
  }
}) satisfies QualityConfig;
