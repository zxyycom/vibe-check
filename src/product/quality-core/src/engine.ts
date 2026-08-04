import { resolve } from "node:path";

import { errorMessage } from "../../foundation/src/index.ts";
import type { ScannerDependencySnapshot } from "../../scanner-dependencies.ts";
import { classifyFiles } from "./model/code-areas.ts";
import { evaluateGate } from "./model/gate-evaluator.ts";
import { reduceScanCompleteness } from "./model/scan-completeness.ts";
import { createEmptyMetrics } from "./model/schema.ts";
import type {
  CodeAreaFileMap,
  CodeAreaFingerprint,
  FatalIssue,
  ResolvedQualityConfig,
  QualityMetrics,
  ToolAvailability,
} from "./model/schema.ts";
import { generateScanWarnings } from "./engine/warnings.ts";
import { finishScan } from "./engine/scan-finisher.ts";
import { detectScanInputChange } from "./input/revisions.ts";
import { buildFingerprints, collectScanFiles } from "./input/files.ts";
import { runCurrentRevisionScan } from "./measurement/current-revision/index.ts";
import type {
  ChangeScope,
  QualityScanOptions,
  QualityScanProcessOutcome,
} from "./scan-command/index.ts";
import {
  collectToolMetadata,
  configureBaseline,
  createTimings,
  getGitCommitTitle,
  getGitSha,
  logFingerprints,
  maybeScanBaselineRevision,
  prepareArtifactDirs,
  resolveChangedFilesForScan,
  setComparisonStatus,
  type Timings,
} from "./scan-command/index.ts";

export type QualityScanRuntimeOptions = {
  config: ResolvedQualityConfig;
  dependencies: ScannerDependencySnapshot;
  root: string;
  options: QualityScanOptions;
  banner?: (scanProfile: QualityScanOptions["scanProfile"]) => void;
  timingsEnabled?: boolean;
};

type ScanInputs = {
  fileMap: CodeAreaFileMap;
  fingerprints: Record<string, CodeAreaFingerprint>;
  scanFiles: string[];
};

type ChangedInputScope = {
  changedFiles: string[];
  inputScope: ChangeScope;
};

type RuntimeContext = {
  config: ResolvedQualityConfig;
  dependencies: ScannerDependencySnapshot;
  fatalIssues: FatalIssue[];
  metrics: QualityMetrics;
  opts: QualityScanOptions;
  rawDir: string;
  root: string;
  toolResults: ToolAvailability[];
};

type RuntimeContextParameters = {
  config: ResolvedQualityConfig;
  dependencies: ScannerDependencySnapshot;
  opts: QualityScanOptions;
  rawDir: string;
  root: string;
  timings: Timings;
};

export async function runQualityScan(
  runtimeOptions: QualityScanRuntimeOptions,
): Promise<QualityScanProcessOutcome> {
  const { banner, config, dependencies, options, root, timingsEnabled } =
    runtimeOptions;
  const timings = createTimings(timingsEnabled);
  const opts = options;

  banner?.(opts.scanProfile);

  const artifactDir = resolve(root, opts.artifactDir);
  const { rawDir } = timings.measure("prepare artifact dirs", () =>
    prepareArtifactDirs(artifactDir),
  );
  const runtime = prepareRuntimeContext({
    config,
    dependencies,
    opts,
    rawDir,
    root,
    timings,
  });
  const inputs = collectScanInputs({ config, root, timings });
  attachFingerprints(runtime.metrics, inputs.fingerprints);

  timings.measure("configure baseline", () =>
    configureBaseline({
      config,
      metrics: runtime.metrics,
      opts,
      tools: runtime.metrics.metadata.tools,
      root,
    }),
  );

  const changedInput = detectChangedInputScope({
    config,
    metrics: runtime.metrics,
    opts,
    root,
    timings,
  });
  await scanCurrentRevision(
    runtime,
    inputs,
    changedInput.changedFiles,
    timings,
  );
  timings.measure("set comparison status", () =>
    setComparisonStatus(runtime.metrics, changedInput.inputScope),
  );

  const baselineSnapshot = await timings.measureAsync("baseline snapshot", () =>
    maybeScanBaselineRevision({ config, root, runtime }),
  );
  if (runtime.metrics.scanCompleteness.overall === "complete") {
    generateScanWarnings({
      baselineSnapshot,
      config,
      metrics: runtime.metrics,
      scanProfile: opts.scanProfile,
      scope: changedInput.inputScope,
      timings,
    });
  }
  runtime.metrics.gate = evaluateGate(
    opts.gatePolicy,
    runtime.metrics.scanCompleteness.overall,
    runtime.metrics.comparisonStatus,
    runtime.metrics.warnings,
  );
  return finishScan({ artifactDir, runtime, timings });
}

function prepareRuntimeContext(
  parameters: RuntimeContextParameters,
): RuntimeContext {
  const { config, dependencies, opts, rawDir, root, timings } = parameters;
  const commitSha = timings.measure("git rev-parse HEAD", () =>
    getGitSha(root),
  );
  const commitTitle = timings.measure("git commit title", () =>
    getGitCommitTitle(commitSha, root),
  );
  const metrics = timings.measure("create metrics envelope", () =>
    createEmptyMetrics({
      repository: root,
      commitSha,
      commitTitle,
      configVersion: config.version,
      tools: [],
      scope: {
        include: [...config.include],
        excludeDirs: [...config.excludeDirs],
        generatedFiles: [...config.generatedFiles],
      },
    }),
  );

  return {
    config,
    dependencies,
    fatalIssues: [],
    metrics,
    opts,
    rawDir,
    root,
    toolResults: [],
  };
}

function collectScanInputs({
  config,
  root,
  timings,
}: {
  config: ResolvedQualityConfig;
  root: string;
  timings: Timings;
}): ScanInputs {
  console.log("Collecting scan inputs...");
  const scanFiles = timings.measure("collect scan files", () =>
    collectScanFiles(root, config),
  );
  console.log(`  Found ${scanFiles.length} files in scan scope`);

  const fileMap = timings.measure("classify scan files", () =>
    classifyFiles(scanFiles, config.codeAreas, config.generatedFiles),
  );
  const areaNames = Array.from(fileMap.keys());
  console.log(`  Code areas: ${areaNames.join(", ")}`);

  const fingerprints = timings.measure("build fingerprints", () =>
    buildFingerprints(fileMap, root),
  );
  logFingerprints(fingerprints);

  return { fileMap, fingerprints, scanFiles };
}

function attachFingerprints(
  metrics: QualityMetrics,
  fingerprints: Record<string, CodeAreaFingerprint>,
): void {
  metrics.currentFingerprints = fingerprints;
}

function detectChangedInputScope(options: {
  config: ResolvedQualityConfig;
  metrics: QualityMetrics;
  opts: QualityScanOptions;
  root: string;
  timings: Timings;
}): ChangedInputScope {
  const { config, metrics, opts, root, timings } = options;
  const inputScope = timings.measure("detect changed scan inputs", () =>
    detectScanInputChange({
      baselineSha: metrics.baseline.commitSha,
      cwd: root,
      scanInputPaths: [...config.include],
    }),
  );
  const changedFiles = timings.measure("resolve changed files", () =>
    resolveChangedFilesForScan({ config, opts, root, scope: inputScope }),
  );
  console.log(`  Changed files in scan scope: ${changedFiles.length}`);
  return { changedFiles, inputScope };
}

async function scanCurrentRevision(
  runtime: RuntimeContext,
  inputs: ScanInputs,
  changedFiles: string[],
  timings: Timings,
): Promise<void> {
  const capabilityResults = await timings.measureAsync(
    "scan current revision",
    () =>
      runCurrentRevisionScan({
        context: {
          metrics: runtime.metrics,
          toolResults: runtime.toolResults,
          changedFiles,
          rawDir: runtime.rawDir,
          root: runtime.root,
          cacheRootDir: resolve(runtime.root, runtime.config.cacheDir),
          config: runtime.config,
          dependencies: runtime.dependencies,
          fingerprints: inputs.fingerprints,
        },
        scanFiles: inputs.scanFiles,
        fileMap: inputs.fileMap,
        scanProfile: runtime.opts.scanProfile,
      }),
  );
  runtime.metrics.scanCompleteness = {
    capabilities: capabilityResults,
    overall: reduceScanCompleteness(capabilityResults),
  };
  const tools = timings.measure("tool metadata", () =>
    collectToolMetadata(runtime.toolResults),
  );
  runtime.metrics.metadata.tools = tools;
  if (runtime.metrics.baseline.metadata) {
    runtime.metrics.baseline.metadata.toolMetadata = tools;
  }
}

export function qualityScanErrorExitCode(err: unknown): 2 | 3 {
  const message = errorMessage(err);
  return (err instanceof Error && "code" in err && err.code === "ENOENT") ||
    message.includes("config")
    ? 3
    : 2;
}
