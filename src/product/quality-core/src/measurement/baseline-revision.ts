/**
 * Baseline revision quality scan runner.
 */

import { scanWithLizard } from "./scanners/lizard.ts";
import { scanWithScc } from "./scanners/scc.ts";
import { scanJscpdAreasWithCache } from "./scanners/jscpd/area-scans.ts";
import { classifyFiles } from "../model/code-areas.ts";
import { buildAggregates } from "./aggregate.ts";
import { collectBaselineFiles, buildFingerprints } from "../input/files.ts";
import { resolveEligibleTools } from "./current-revision/index.ts";
import { selectJscpdTargetFileMap } from "./current-revision/jscpd.ts";
import {
  isToolAvailable,
  normalizeFileMetrics,
  normalizeFunctionMetrics,
  selectLizardTargetFiles
} from "./metrics.ts";
import type {
  BaselineSnapshot,
  CodeAreaFileMap,
  CodeAreaFingerprint,
  DuplicateCodeFragment,
  FileMetric,
  FunctionMetric,
  LanguageAggregate,
  ResolvedQualityConfig,
  ToolAvailability
} from "../model/schema.ts";
import type { ScannerDependencySnapshot } from "../../../scanner-dependencies.ts";

type BaselineScanOptions = {
  cacheRootDir?: string;
  commitSha?: string;
  inputs?: BaselineRevisionScanInputs;
};

type BaselineRevisionScanInputs = {
  baselineFiles: string[];
  fingerprints: Record<string, CodeAreaFingerprint>;
  jscpdTargetFileMap: CodeAreaFileMap;
  lizardTargetFiles: string[];
};

type PreparedBaselineRevisionScan = {
  inputs: BaselineRevisionScanInputs;
  toolResults: ToolAvailability[];
};

type BaselineScanContext = {
  cacheRootDir: string;
  commitSha: string;
  config: ResolvedQualityConfig;
  dependencies: ScannerDependencySnapshot;
  fingerprints: Record<string, CodeAreaFingerprint>;
  toolResults: ToolAvailability[];
  workDir: string;
};

/**
 * 在 materialized baseline 目录中运行当前工具扫描。
 *
 * 只收集 fingerprints 和 baseline 指标明细用于趋势与 warning delta；
 * 不生成 baseline warnings。
 */
export async function runBaselineRevisionScan(
  workDir: string,
  toolResults: ToolAvailability[],
  config: ResolvedQualityConfig,
  dependencies: ScannerDependencySnapshot,
  options: BaselineScanOptions = {}
): Promise<BaselineSnapshot> {
  const inputs = options.inputs ?? collectBaselineRevisionScanInputs(workDir, config);
  const context: BaselineScanContext = {
    workDir,
    toolResults,
    config,
    dependencies,
    fingerprints: inputs.fingerprints,
    cacheRootDir: options.cacheRootDir ?? workDir,
    commitSha: options.commitSha ?? "baseline"
  };

  let fileMetrics: FileMetric[] = [];
  let functionMetrics: FunctionMetric[] = [];
  let duplicateCode: DuplicateCodeFragment[] = [];
  let byLanguage: LanguageAggregate[] = [];

  if (isToolAvailable(toolResults, "scc")) {
    ({ fileMetrics, byLanguage } = scanBaselineScc({
      context,
      baselineFiles: inputs.baselineFiles
    }));
  }

  if (isToolAvailable(toolResults, "lizard")) {
    functionMetrics = scanBaselineLizard({
      context,
      targetFiles: inputs.lizardTargetFiles
    });
  }

  if (isToolAvailable(toolResults, "jscpd")) {
    duplicateCode = await scanBaselineJscpd({
      context,
      fileMap: inputs.jscpdTargetFileMap
    });
  }

  const aggregates = buildAggregates({
    fileMetrics,
    functionMetrics,
    duplicateCode,
    byLanguage,
    config
  });

  return {
    fingerprints: inputs.fingerprints,
    fileMetrics,
    functionMetrics,
    duplicateCode,
    aggregates
  };
}

export async function prepareBaselineRevisionScan(
  workDir: string,
  config: ResolvedQualityConfig,
  dependencies: ScannerDependencySnapshot
): Promise<PreparedBaselineRevisionScan> {
  const inputs = collectBaselineRevisionScanInputs(workDir, config);
  const toolResults = await resolveEligibleTools({
    dependencies,
    jscpdTargetFileMap: inputs.jscpdTargetFileMap,
    lizardTargetFiles: inputs.lizardTargetFiles,
    root: workDir,
    scanFiles: inputs.baselineFiles
  });
  return { inputs, toolResults };
}

function collectBaselineRevisionScanInputs(
  workDir: string,
  config: ResolvedQualityConfig
): BaselineRevisionScanInputs {
  const baselineFiles = collectBaselineFiles(workDir, config);
  const fileMap = classifyFiles(baselineFiles, config.codeAreas, config.generatedFiles);
  return {
    baselineFiles,
    fingerprints: buildFingerprints(fileMap, workDir),
    jscpdTargetFileMap: selectJscpdTargetFileMap(fileMap, config),
    lizardTargetFiles: selectLizardTargetFiles(baselineFiles, config)
  };
}

function scanBaselineScc({
  baselineFiles,
  context
}: {
  baselineFiles: string[];
  context: BaselineScanContext;
}): { byLanguage: LanguageAggregate[]; fileMetrics: FileMetric[] } {
  console.log("  Running baseline scc...");
  const sccResult = scanWithScc({
    cwd: context.workDir,
    dependency: context.dependencies.file,
    includePaths: baselineFiles,
    excludeDirs: context.config.excludeDirs
  });

  if (!sccResult.ok) {
    throw new Error(`baseline scc scan failed: ${sccResult.error}`);
  }

  const fileMetrics = normalizeFileMetrics(sccResult.files ?? [], { config: context.config });
  console.log(`    Baseline scc: ${fileMetrics.length} files`);
  return { fileMetrics, byLanguage: sccResult.aggregates?.byLanguage ?? [] };
}

function scanBaselineLizard({
  context,
  targetFiles
}: {
  context: BaselineScanContext;
  targetFiles: string[];
}): FunctionMetric[] {
  console.log("  Running baseline Lizard...");
  const lizardResult = scanWithLizard({
    files: targetFiles,
    cwd: context.workDir,
    dependency: context.dependencies.function
  });

  if (!lizardResult.ok) {
    throw new Error(`baseline lizard scan failed: ${lizardResult.error}`);
  }

  const functionMetrics = normalizeFunctionMetrics(lizardResult.functions ?? [], { config: context.config });
  console.log(`    Baseline Lizard: ${functionMetrics.length} functions`);
  return functionMetrics;
}

async function scanBaselineJscpd({
  context,
  fileMap
}: {
  context: BaselineScanContext;
  fileMap: CodeAreaFileMap;
}): Promise<DuplicateCodeFragment[]> {
  console.log("  Running baseline jscpd...");
  const fragments = await scanJscpdAreasWithCache({
    cacheRootDir: context.cacheRootDir,
    commitSha: context.commitSha,
    config: context.config,
    cwd: context.workDir,
    dependency: context.dependencies.duplication,
    fileMap,
    fingerprints: context.fingerprints,
    logPrefix: "    ",
    scanKind: "baseline",
    throwOnFailure: true,
    toolResults: context.toolResults
  });

  console.log(`    Baseline jscpd: ${fragments.length} duplicate fragments`);
  return fragments;
}
