import type { QualityMetrics } from "../../model/schema.ts";

export type RichCoreMetrics = QualityMetrics & {
  metadata: QualityMetrics["metadata"] & { privateMetadataState: string };
  privateMetricsState: string;
};

export const RICH_CORE_METRICS_TEMPLATE: RichCoreMetrics = {
  aggregates: {
    byCodeArea: [{
      codeArea: "src",
      codeLines: 89,
      cyclomaticComplexity: 7,
      duplicateFragments: 1,
      fileDecisionTokens: 7,
      files: 1,
      functionLines: 13,
      functions: 1,
      lines: 100,
      parameterCount: 2,
      warningPolicy: "strict"
    }],
    byLanguage: [{
      blankLines: 4,
      codeLines: 89,
      commentLines: 7,
      comments: 3,
      files: 1,
      language: "TypeScript",
      lines: 100
    }],
    overall: {
      totalCodeLines: 89,
      totalDuplicateFragments: 1,
      totalFileDecisionTokens: 7,
      totalFiles: 1,
      totalFunctionCyclomaticComplexity: 7,
      totalFunctionLines: 13,
      totalFunctionParameters: 2,
      totalFunctions: 1,
      totalLines: 100
    }
  },
  baseline: {
    commitDate: "2026-07-31T00:00:00.000Z",
    commitSha: "baseline-sha",
    metadata: {
      commitDate: "2026-07-31T00:00:00.000Z",
      commitSha: "baseline-sha",
      commitTitle: "Baseline title",
      configVersion: "test-config-v1",
      selectionReason: "merge-base",
      toolMetadata: [{
        name: "scc",
        source: "configured",
        version: "3.7.0"
      }]
    },
    status: "generated"
  },
  baselineFingerprints: {
    src: {
      fileCount: 1,
      fileList: ["src/example.ts"],
      fingerprint: "baseline-fingerprint"
    }
  },
  comparisonStatus: "compared",
  currentFingerprints: {
    src: {
      fileCount: 1,
      fileList: ["src/example.ts"],
      fingerprint: "current-fingerprint"
    }
  },
  duplicateCode: [{
    codeAreas: ["src", "tests"],
    hitsChangedScope: true,
    id: 4,
    lineCount: 6,
    locations: [{
      codeArea: "src",
      endLine: 15,
      path: "src/example.ts",
      startLine: 10
    }, {
      codeArea: "tests",
      endLine: 25,
      path: "tests/example.test.ts",
      startLine: 20
    }],
    tokenCount: 42
  }],
  fileMetrics: [{
    blankLines: 4,
    codeArea: "src",
    codeLines: 89,
    commentLines: 7,
    decisionTokens: { source: "scc", value: 7 },
    isChanged: true,
    language: "TypeScript",
    lines: 100,
    path: "src/example.ts"
  }],
  functionMetrics: [{
    codeArea: "src",
    cyclomaticComplexity: { source: "lizard", value: 7 },
    endLine: 22,
    file: "src/example.ts",
    isChanged: true,
    lines: 13,
    name: "example",
    parameterCount: 2,
    startLine: 10
  }],
  gate: {
    policy: null,
    status: "disabled"
  },
  metadata: {
    commitDate: "2026-08-01T00:00:00.000Z",
    commitSha: "current-sha",
    commitTitle: "Current title",
    configVersion: "test-config-v1",
    repository: "/workspace/example",
    schemaVersion: "0.4.0",
    scope: {
      excludeDirs: ["dist"],
      generatedFiles: ["src/generated.ts"],
      include: ["src/**/*.ts"]
    },
    timestamp: "2026-08-03T00:00:00.000Z",
    tools: [{
      name: "scc",
      source: "configured",
      version: "3.7.0"
    }],
    privateMetadataState: "must not cross the transport boundary"
  },
  privateMetricsState: "must not cross the transport boundary",
  scanCompleteness: {
    capabilities: [{
      capabilityId: "file-metrics",
      status: "succeeded"
    }, {
      capabilityId: "function-metrics",
      status: "no-input"
    }, {
      capabilityId: "duplicate-detection",
      diagnostic: {
        action: "Install jscpd.",
        kind: "unavailable",
        message: "jscpd is unavailable."
      },
      status: "failed"
    }],
    overall: "failed"
  },
  trends: [{
    baseline: 8,
    current: 13,
    delta: 5,
    metric: "cyclomatic-complexity",
    percentChange: 62.5,
    unit: "count"
  }],
  warnings: {
    all: [],
    changed: [],
    regressions: []
  }
};
