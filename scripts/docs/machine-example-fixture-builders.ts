import {
  FIXED_MACHINE_EXAMPLE_INPUT,
  type CoreMetricsFixture,
  type CoreWarningFixture
} from "./machine-example-model.ts";

export function createMeasuredFixture(): CoreMetricsFixture {
  return {
    aggregates: {
      byCodeArea: [{
        codeArea: "src",
        codeLines: 72,
        cyclomaticComplexity: 6,
        duplicateFragments: 0,
        fileDecisionTokens: 5,
        files: 1,
        functionLines: 12,
        functions: 1,
        lines: 80,
        parameterCount: 2,
        warningPolicy: "strict"
      }],
      byLanguage: [{
        blankLines: 3,
        codeLines: 72,
        commentLines: 5,
        comments: 2,
        files: 1,
        language: "TypeScript",
        lines: 80
      }],
      overall: {
        totalCodeLines: 72,
        totalDuplicateFragments: 0,
        totalFileDecisionTokens: 5,
        totalFiles: 1,
        totalFunctionCyclomaticComplexity: 6,
        totalFunctionLines: 12,
        totalFunctionParameters: 2,
        totalFunctions: 1,
        totalLines: 80
      }
    },
    baseline: {
      commitDate: FIXED_MACHINE_EXAMPLE_INPUT.baselineCommitDate,
      commitSha: FIXED_MACHINE_EXAMPLE_INPUT.baselineCommitSha,
      metadata: {
        commitDate: FIXED_MACHINE_EXAMPLE_INPUT.baselineCommitDate,
        commitSha: FIXED_MACHINE_EXAMPLE_INPUT.baselineCommitSha,
        commitTitle: "Canonical baseline revision",
        configVersion: FIXED_MACHINE_EXAMPLE_INPUT.configVersion,
        selectionReason: "explicit",
        toolMetadata: fixedTools()
      },
      status: "generated"
    },
    baselineFingerprints: {
      src: {
        fileCount: 1,
        fileList: [FIXED_MACHINE_EXAMPLE_INPUT.paths[0]],
        fingerprint: "canonical-baseline-fingerprint"
      }
    },
    comparisonStatus: "compared",
    currentFingerprints: {
      src: {
        fileCount: 1,
        fileList: [FIXED_MACHINE_EXAMPLE_INPUT.paths[0]],
        fingerprint: "canonical-current-fingerprint"
      }
    },
    duplicateCode: [],
    fileMetrics: [{
      blankLines: 3,
      codeArea: "src",
      codeLines: 72,
      commentLines: 5,
      decisionTokens: { source: "scc", value: 5 },
      isChanged: true,
      language: "TypeScript",
      lines: 80,
      path: FIXED_MACHINE_EXAMPLE_INPUT.paths[0]
    }],
    functionMetrics: [{
      codeArea: "src",
      cyclomaticComplexity: { source: "lizard", value: 6 },
      endLine: 21,
      file: FIXED_MACHINE_EXAMPLE_INPUT.paths[0],
      isChanged: true,
      lines: 12,
      name: "canonicalExample",
      parameterCount: 2,
      startLine: 10
    }],
    gate: {
      policy: null,
      status: "disabled"
    },
    metadata: {
      commitDate: FIXED_MACHINE_EXAMPLE_INPUT.commitDate,
      commitSha: FIXED_MACHINE_EXAMPLE_INPUT.commitSha,
      commitTitle: "Canonical current revision",
      configVersion: FIXED_MACHINE_EXAMPLE_INPUT.configVersion,
      repository: FIXED_MACHINE_EXAMPLE_INPUT.repository,
      schemaVersion: "0.4.0",
      scope: {
        excludeDirs: ["dist", "node_modules"],
        generatedFiles: [FIXED_MACHINE_EXAMPLE_INPUT.paths[1]],
        include: ["src/**/*.ts"]
      },
      timestamp: FIXED_MACHINE_EXAMPLE_INPUT.timestamp,
      tools: fixedTools()
    },
    scanCompleteness: {
      capabilities: [{
        capabilityId: "file-metrics",
        status: "succeeded"
      }, {
        capabilityId: "function-metrics",
        status: "succeeded"
      }, {
        capabilityId: "duplicate-detection",
        status: "succeeded"
      }],
      overall: "complete"
    },
    trends: [{
      baseline: 5,
      current: 6,
      delta: 1,
      metric: "cyclomatic-complexity",
      percentChange: 20,
      unit: "count"
    }],
    warnings: {
      all: [],
      changed: [],
      regressions: []
    }
  };
}

interface CoreWarningOptions {
  readonly baselineValue?: number | null;
  readonly deltaValue?: number | null;
  readonly isChanged?: boolean;
  readonly message: string;
  readonly ruleId: string;
  readonly value: number;
}

export function coreWarning(options: CoreWarningOptions): CoreWarningFixture {
  const {
    baselineValue = null,
    deltaValue = null,
    isChanged = false,
    message,
    ruleId,
    value
  } = options;
  return {
    baselineValue,
    codeArea: "src",
    comparisonBasis: isChanged ? "baseline-delta" : "absolute",
    deltaValue,
    isChanged,
    level: "warning",
    line: 12,
    message,
    metric: "cyclomatic-complexity",
    path: FIXED_MACHINE_EXAMPLE_INPUT.paths[0],
    ruleId,
    sourceTool: "lizard",
    suggestion: "Split the function into smaller responsibilities.",
    value
  };
}

function fixedTools(): CoreMetricsFixture["metadata"]["tools"] {
  return FIXED_MACHINE_EXAMPLE_INPUT.tools.map((tool) => ({ ...tool }));
}
