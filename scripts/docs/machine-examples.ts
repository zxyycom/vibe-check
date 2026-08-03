#!/usr/bin/env bun

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  projectMachineMetricsV1,
  serializeMachineArtifactCandidatesV1,
  validateMachineArtifactSetV1
} from "../../src/product/machine-output.ts";

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);
const examplesRoot = "docs/examples/artifacts";
const regenerateCommand = "bun run generate:machine-examples";
const encoder = new TextEncoder();
const outcomeNames = [
  "complete-passed",
  "complete-warning",
  "legitimate-empty",
  "gate-failed",
  "scan-incomplete"
] as const;
const artifactFileNames = [
  "README.md",
  "metrics.json",
  "warnings-all.ndjson",
  "warnings.ndjson"
] as const;

const FIXED_INPUT = {
  baselineCommitDate: "2026-07-31T12:00:00.000Z",
  baselineCommitSha: "89abcdef0123456789abcdef0123456789abcdef",
  commitDate: "2026-08-02T12:00:00.000Z",
  commitSha: "0123456789abcdef0123456789abcdef01234567",
  configVersion: "canonical-config-v1",
  paths: ["src/example.ts", "src/generated.ts"] as const,
  repository: "/workspace/vibe-check-fixtures/canonical-project",
  timestamp: "2026-08-03T00:00:00.000Z",
  tools: [
    { name: "scc", source: "configured", version: "3.6.0" },
    { name: "lizard", source: "configured", version: "1.17.31" },
    { name: "jscpd", source: "configured", version: "5.0.11" }
  ]
} as const;

type CoreMetricsFixture = Parameters<typeof projectMachineMetricsV1>[0];
type CoreWarningFixture = CoreMetricsFixture["warnings"]["all"][number];
type OutcomeName = typeof outcomeNames[number];

interface CanonicalExample {
  readonly contractReason: string;
  readonly expectedExit: 0 | 1 | 2;
  readonly expectedProcessOutcome: "failed" | "gate-failed" | "success";
  readonly fixedInput: {
    readonly paths: readonly string[];
    readonly summary: string;
  };
  readonly gateRequest: string;
  readonly metrics: CoreMetricsFixture;
  readonly outcome: OutcomeName;
  readonly title: string;
}

interface GeneratedFile {
  readonly contents: string;
  readonly relativePath: string;
}

export function generatePublishedMachineExamples(): void {
  const files = generatedFiles();
  cleanCurrentExampleRoot();
  for (const file of files) {
    const absolutePath = resolvePublishedPath(file.relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, file.contents, "utf8");
  }
}

export function checkPublishedMachineExamples(): void {
  const files = generatedFiles();
  checkCurrentExampleInventory();
  for (const file of files) {
    const expected = encoder.encode(file.contents);
    let actual: Buffer;
    try {
      actual = fs.readFileSync(resolvePublishedPath(file.relativePath));
    } catch {
      throw new Error(
        `published machine example is missing: ${file.relativePath}; regenerate with ${regenerateCommand}`
      );
    }
    if (!actual.equals(expected)) {
      throw new Error(
        `published machine example drift: ${file.relativePath}; regenerate with ${regenerateCommand}`
      );
    }
  }
}

function generatedFiles(): GeneratedFile[] {
  return canonicalExamples().flatMap((example) => {
    const metrics = projectMachineMetricsV1(example.metrics);
    const candidates = serializeMachineArtifactCandidatesV1(metrics);
    const bytes = {
      metricsJson: encoder.encode(candidates.metricsJson),
      warningsAllNdjson: encoder.encode(candidates.warningsAllNdjson),
      warningsNdjson: encoder.encode(candidates.warningsNdjson)
    };
    const validation = validateMachineArtifactSetV1(bytes);
    if (!validation.ok) {
      const diagnostic = validation.diagnostic;
      throw new Error(
        `generated ${example.outcome} example is invalid: ${diagnostic.logicalArtifact}: ${diagnostic.message}`
      );
    }
    assertZeroWarningStreams(example.outcome, metrics, bytes);

    const outcomeRoot = `${examplesRoot}/${example.outcome}`;
    return [
      {
        contents: candidates.metricsJson,
        relativePath: `${outcomeRoot}/metrics.json`
      },
      {
        contents: candidates.warningsNdjson,
        relativePath: `${outcomeRoot}/warnings.ndjson`
      },
      {
        contents: candidates.warningsAllNdjson,
        relativePath: `${outcomeRoot}/warnings-all.ndjson`
      },
      {
        contents: renderReadme(example),
        relativePath: `${outcomeRoot}/README.md`
      }
    ];
  });
}

function canonicalExamples(): CanonicalExample[] {
  return [
    {
      contractReason:
        "Every stable capability succeeded, so completeness reduces to `complete`; all warning channels and both streams are empty, and the closed disabled-gate shape is valid.",
      expectedExit: 0,
      expectedProcessOutcome: "success",
      fixedInput: {
        paths: [FIXED_INPUT.paths[0]],
        summary:
          "Measured TypeScript input with all three stable capabilities succeeded and no warnings."
      },
      gateRequest: "none (gate disabled)",
      metrics: createMeasuredFixture(),
      outcome: "complete-passed",
      title: "Complete scan without warnings"
    },
    {
      contractReason:
        "Completeness reduces to `complete`; `warnings.all` contains one warning while changed and regressions remain ordered empty subsequences, each stream exactly matches its owning channel, and the gate is disabled.",
      expectedExit: 0,
      expectedProcessOutcome: "success",
      fixedInput: {
        paths: [FIXED_INPUT.paths[0]],
        summary:
          "Measured TypeScript input with all three stable capabilities succeeded and one unchanged warning."
      },
      gateRequest: "none (gate disabled)",
      metrics: createCompleteWarningFixture(),
      outcome: "complete-warning",
      title: "Complete scan with a non-gating warning"
    },
    {
      contractReason:
        "All stable capabilities report `no-input`, so completeness reduces to the legitimate `empty` state; all warning channels and streams are empty, and the gate is disabled.",
      expectedExit: 0,
      expectedProcessOutcome: "success",
      fixedInput: {
        paths: [],
        summary:
          "An eligible project root with no supported input for any stable measurement capability."
      },
      gateRequest: "none (gate disabled)",
      metrics: createLegitimateEmptyFixture(),
      outcome: "legitimate-empty",
      title: "Legitimate empty scan"
    },
    {
      contractReason:
        "The same unaccepted warning appears in all, changed, and regressions in semantic order; the requested regressions gate evaluates one warning, reports that exact warning as blocking, and therefore has status `failed`.",
      expectedExit: 1,
      expectedProcessOutcome: "gate-failed",
      fixedInput: {
        paths: [FIXED_INPUT.paths[0]],
        summary:
          "Measured TypeScript input with all three stable capabilities succeeded and one changed regression warning."
      },
      gateRequest: "regressions",
      metrics: createGateFailedFixture(),
      outcome: "gate-failed",
      title: "Complete scan blocked by the requested gate"
    },
    {
      contractReason:
        "The fixed duplicate-detection diagnostic makes completeness reduce to `failed`; the requested all-warnings gate is explicitly not evaluated for `scan-incomplete`, while the warning channels and streams remain mutually consistent. This is a contract-valid domain failure, not an output-contract failure.",
      expectedExit: 2,
      expectedProcessOutcome: "failed",
      fixedInput: {
        paths: [FIXED_INPUT.paths[0]],
        summary:
          "Measured TypeScript input whose file and function capabilities succeeded but duplicate detection returned the fixed unavailable diagnostic."
      },
      gateRequest: "all (not evaluated: scan-incomplete)",
      metrics: createScanIncompleteFixture(),
      outcome: "scan-incomplete",
      title: "Incomplete scan with a fixed capability diagnostic"
    }
  ];
}

function createMeasuredFixture(): CoreMetricsFixture {
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
      commitDate: FIXED_INPUT.baselineCommitDate,
      commitSha: FIXED_INPUT.baselineCommitSha,
      metadata: {
        commitDate: FIXED_INPUT.baselineCommitDate,
        commitSha: FIXED_INPUT.baselineCommitSha,
        commitTitle: "Canonical baseline revision",
        configVersion: FIXED_INPUT.configVersion,
        selectionReason: "merge-base",
        toolMetadata: fixedTools()
      },
      status: "generated"
    },
    baselineFingerprints: {
      src: {
        fileCount: 1,
        fileList: [FIXED_INPUT.paths[0]],
        fingerprint: "canonical-baseline-fingerprint"
      }
    },
    comparisonStatus: "compared",
    currentFingerprints: {
      src: {
        fileCount: 1,
        fileList: [FIXED_INPUT.paths[0]],
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
      path: FIXED_INPUT.paths[0]
    }],
    functionMetrics: [{
      codeArea: "src",
      cyclomaticComplexity: { source: "lizard", value: 6 },
      endLine: 21,
      file: FIXED_INPUT.paths[0],
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
      commitDate: FIXED_INPUT.commitDate,
      commitSha: FIXED_INPUT.commitSha,
      commitTitle: "Canonical current revision",
      configVersion: FIXED_INPUT.configVersion,
      repository: FIXED_INPUT.repository,
      schemaVersion: "0.4.0",
      scope: {
        excludeDirs: ["dist", "node_modules"],
        generatedFiles: [FIXED_INPUT.paths[1]],
        include: ["src/**/*.ts"]
      },
      timestamp: FIXED_INPUT.timestamp,
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

function createCompleteWarningFixture(): CoreMetricsFixture {
  const metrics = createMeasuredFixture();
  metrics.warnings.all = [coreWarning({
    message: "Function exceeds the configured complexity floor.",
    ruleId: "function.cyclomatic-complexity",
    value: 6
  })];
  return metrics;
}

function createLegitimateEmptyFixture(): CoreMetricsFixture {
  return {
    aggregates: {
      byCodeArea: [],
      byLanguage: [],
      overall: {
        totalCodeLines: 0,
        totalFiles: 0,
        totalFunctions: 0,
        totalLines: 0
      }
    },
    baseline: {
      commitDate: null,
      commitSha: null,
      metadata: null,
      status: "history-unavailable"
    },
    comparisonStatus: "baseline-unavailable",
    currentFingerprints: {},
    duplicateCode: [],
    fileMetrics: [],
    functionMetrics: [],
    gate: {
      policy: null,
      status: "disabled"
    },
    metadata: {
      commitDate: FIXED_INPUT.commitDate,
      commitSha: FIXED_INPUT.commitSha,
      commitTitle: "Canonical current revision",
      configVersion: FIXED_INPUT.configVersion,
      repository: FIXED_INPUT.repository,
      schemaVersion: "0.4.0",
      scope: {
        excludeDirs: ["dist", "node_modules"],
        generatedFiles: [FIXED_INPUT.paths[1]],
        include: ["src/**/*.ts"]
      },
      timestamp: FIXED_INPUT.timestamp,
      tools: fixedTools()
    },
    scanCompleteness: {
      capabilities: [{
        capabilityId: "file-metrics",
        status: "no-input"
      }, {
        capabilityId: "function-metrics",
        status: "no-input"
      }, {
        capabilityId: "duplicate-detection",
        status: "no-input"
      }],
      overall: "empty"
    },
    trends: [],
    warnings: {
      all: [],
      changed: [],
      regressions: []
    }
  };
}

function createGateFailedFixture(): CoreMetricsFixture {
  const metrics = createMeasuredFixture();
  const warning = coreWarning({
    baselineValue: 5,
    deltaValue: 3,
    isChanged: true,
    message: "Function complexity regressed beyond the configured delta.",
    ruleId: "function.cyclomatic-complexity.regression",
    value: 8
  });
  metrics.warnings = {
    all: [warning],
    changed: [warning],
    regressions: [warning]
  };
  metrics.gate = {
    blockingWarningCount: 1,
    blockingWarnings: [warning],
    evaluatedChannel: "regressions",
    evaluatedWarningCount: 1,
    policy: "regressions",
    status: "failed"
  };
  return metrics;
}

function createScanIncompleteFixture(): CoreMetricsFixture {
  const metrics = createMeasuredFixture();
  metrics.scanCompleteness = {
    capabilities: [{
      capabilityId: "file-metrics",
      status: "succeeded"
    }, {
      capabilityId: "function-metrics",
      status: "succeeded"
    }, {
      capabilityId: "duplicate-detection",
      diagnostic: {
        action: "Install jscpd 5.0.11 and rerun the scan.",
        kind: "unavailable",
        message: "Configured jscpd executable was not available."
      },
      status: "failed"
    }],
    overall: "failed"
  };
  metrics.gate = {
    policy: "all",
    reasonCode: "scan-incomplete",
    status: "not-evaluated"
  };
  return metrics;
}

function coreWarning({
  baselineValue = null,
  deltaValue = null,
  isChanged = false,
  message,
  ruleId,
  value
}: {
  baselineValue?: number | null;
  deltaValue?: number | null;
  isChanged?: boolean;
  message: string;
  ruleId: string;
  value: number;
}): CoreWarningFixture {
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
    path: FIXED_INPUT.paths[0],
    ruleId,
    sourceTool: "lizard",
    suggestion: "Split the function into smaller responsibilities.",
    value
  };
}

function fixedTools(): CoreMetricsFixture["metadata"]["tools"] {
  return FIXED_INPUT.tools.map((tool) => ({ ...tool }));
}

function renderReadme(example: CanonicalExample): string {
  const metadata = example.metrics.metadata;
  const toolSummary = metadata.tools
    .map((tool) => `${tool.name} ${tool.version} (${tool.source})`)
    .join("; ");
  const currentCommitDate = metadata.commitDate === undefined
    ? ""
    : ` at \`${metadata.commitDate}\``;
  const baseline = example.metrics.baseline;
  const baselineLine = baseline.commitSha === null
    ? `- Baseline input: none (\`${baseline.status}\`)`
    : `- Baseline commit: \`${baseline.commitSha}\`${
      baseline.commitDate === null ? "" : ` at \`${baseline.commitDate}\``
    }`;
  return `# ${example.title}

This directory is a deterministic current-product artifact example. Regenerate it with
\`${regenerateCommand}\`.

## Fixed input

- Scenario: ${example.fixedInput.summary}
- Project-relative input paths: ${renderCodeValues(example.fixedInput.paths)}
- Repository root: \`${metadata.repository}\`
- Timestamp: \`${metadata.timestamp}\`
- Current commit: \`${metadata.commitSha}\`${currentCommitDate}
${baselineLine}
- Config version: \`${metadata.configVersion}\`
- Tool metadata: ${toolSummary}
- Configured include globs: ${renderCodeValues(metadata.scope.include)}
- Configured exclude directories: ${renderCodeValues(metadata.scope.excludeDirs)}
- Configured generated-file paths: ${renderCodeValues(metadata.scope.generatedFiles)}

## Requested gate and process result

- Gate request: ${example.gateRequest}
- Expected process outcome: \`${example.expectedProcessOutcome}\`
- Expected exit code: \`${example.expectedExit}\`

## Why this set is contract-valid

${example.contractReason}

The three artifact files are produced from fixed core values through the production mapper and
serializers, then accepted by the production artifact-set validator. The process outcome and exit
code above are scenario metadata; they cannot be inferred from the files alone.
`;
}

function renderCodeValues(values: readonly string[]): string {
  return values.length === 0
    ? "none"
    : values.map((value) => `\`${value}\``).join(", ");
}

function assertZeroWarningStreams(
  outcome: string,
  metrics: ReturnType<typeof projectMachineMetricsV1>,
  bytes: {
    readonly warningsAllNdjson: Uint8Array;
    readonly warningsNdjson: Uint8Array;
  }
): void {
  if (
    metrics.warnings.changed.length === 0 &&
    bytes.warningsNdjson.byteLength !== 0
  ) {
    throw new Error(`${outcome} warnings.ndjson must be zero bytes`);
  }
  if (
    metrics.warnings.all.length === 0 &&
    bytes.warningsAllNdjson.byteLength !== 0
  ) {
    throw new Error(`${outcome} warnings-all.ndjson must be zero bytes`);
  }
}

function resolvePublishedPath(relativePath: string): string {
  return path.join(workspaceRoot, relativePath);
}

function cleanCurrentExampleRoot(): void {
  fs.rmSync(resolveCurrentExampleRoot(), { force: true, recursive: true });
}

function checkCurrentExampleInventory(): void {
  const rootEntries = readPublishedDirectory(examplesRoot);
  const expectedOutcomes = new Set<string>(outcomeNames);
  for (const entry of rootEntries) {
    if (!entry.isDirectory() || !expectedOutcomes.has(entry.name)) {
      throw inventoryDrift(`${examplesRoot}/${entry.name}`);
    }
  }

  const expectedFiles = new Set<string>(artifactFileNames);
  for (const outcome of outcomeNames) {
    const outcomeEntry = rootEntries.find((entry) => entry.name === outcome);
    if (!outcomeEntry?.isDirectory()) {
      throw new Error(
        `published machine example is missing: ${examplesRoot}/${outcome}; regenerate with ${regenerateCommand}`
      );
    }

    const outcomeRoot = `${examplesRoot}/${outcome}`;
    const entries = readPublishedDirectory(outcomeRoot);
    for (const entry of entries) {
      if (!entry.isFile() || !expectedFiles.has(entry.name)) {
        throw inventoryDrift(`${outcomeRoot}/${entry.name}`);
      }
    }
    for (const fileName of artifactFileNames) {
      if (!entries.some((entry) => entry.isFile() && entry.name === fileName)) {
        throw new Error(
          `published machine example is missing: ${outcomeRoot}/${fileName}; regenerate with ${regenerateCommand}`
        );
      }
    }
  }
}

function readPublishedDirectory(relativePath: string) {
  try {
    return fs.readdirSync(resolvePublishedPath(relativePath), {
      withFileTypes: true
    });
  } catch {
    throw new Error(
      `published machine example directory is missing or unreadable: ${relativePath}; regenerate with ${regenerateCommand}`
    );
  }
}

function inventoryDrift(relativePath: string): Error {
  return new Error(
    `published machine example inventory drift: unexpected ${relativePath}; expected exactly 5 outcome directories with 4 files each; regenerate with ${regenerateCommand}`
  );
}

function resolveCurrentExampleRoot(): string {
  const resolved = resolvePublishedPath(examplesRoot);
  const expected = path.join(workspaceRoot, "docs", "examples", "artifacts");
  if (resolved !== expected) {
    throw new Error(`refusing to clean unexpected machine example root: ${resolved}`);
  }
  return resolved;
}

function isMainModule(): boolean {
  return process.argv[1]
    ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
    : false;
}

if (isMainModule()) {
  const args = process.argv.slice(2);
  try {
    if (args.length === 0) {
      generatePublishedMachineExamples();
      console.log("generated machine examples: 5 artifact set(s)");
    } else if (args.length === 1 && args[0] === "--check") {
      checkPublishedMachineExamples();
      console.log("machine example generation current: 5 artifact set(s)");
    } else {
      throw new Error("usage: machine-examples.ts [--check]");
    }
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
