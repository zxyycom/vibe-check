import { rmSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { errorMessage } from "../../../../foundation/src/index.ts";
import { materializeBaselineRevision } from "../../input/revisions.ts";
import {
  prepareBaselineRevisionScan,
  runBaselineRevisionScan
} from "../../measurement/baseline-revision.ts";
import {
  createBaselineSnapshotCacheIdentity,
  loadBaselineSnapshotCacheEntry,
  writeBaselineSnapshotCacheEntry,
  type BaselineSnapshotCacheIdentity
} from "../../measurement/cache.ts";
import { generateTrends } from "../../output/trends.ts";
import type {
  BaselineSnapshot,
  QualityConfig,
  QualityMetrics,
  ToolAvailability
} from "../../model/schema.ts";
import { writeBaselineRawOutputs } from "../command-output.ts";
import { collectToolMetadata } from "../tool-metadata.ts";

export type BaselineScanRuntime = {
  metrics: QualityMetrics;
  rawDir: string;
  toolResults: ToolAvailability[];
};

type MaterializedBaselineScanOptions = {
  baselineCommitSha: string;
  baselineWorkDir: string;
  config: QualityConfig;
  metrics: QualityMetrics;
  rawDir: string;
  root: string;
};

type CachedBaselineReuseOptions = {
  baselineCommitSha: string;
  cacheIdentity: BaselineSnapshotCacheIdentity;
  config: QualityConfig;
  metrics: QualityMetrics;
  rawDir: string;
  root: string;
};

type TemporaryBaselineScanOptions = Omit<
  MaterializedBaselineScanOptions,
  "baselineWorkDir"
>;

export async function maybeScanBaselineRevision({
  config,
  root,
  runtime
}: {
  config: QualityConfig;
  root: string;
  runtime: BaselineScanRuntime;
}): Promise<BaselineSnapshot | null> {
  const { metrics, toolResults, rawDir } = runtime;
  const currentMeasurementBlocksBaseline = metrics.scanCompleteness.capabilities.some(
    (result) =>
      result.status === "failed" &&
      (
        result.diagnostic.kind === "execution" ||
        result.diagnostic.kind === "invalid-result"
      )
  );
  if (currentMeasurementBlocksBaseline) {
    console.log("Skipping baseline scan because current measurement failed.");
    return null;
  }

  const baselineCommitSha = metrics.baseline.commitSha;
  if (metrics.baseline.status !== "generated" || !baselineCommitSha) {
    return null;
  }

  const equivalentBaseline = reuseCurrentSnapshotForUnchangedInput(metrics, rawDir);
  if (equivalentBaseline) return equivalentBaseline;

  if (hasEveryBaselineToolResult(toolResults)) {
    const cachedBaseline = reuseCachedBaselineSnapshot({
      baselineCommitSha,
      cacheIdentity: createBaselineSnapshotCacheIdentity({
        commitSha: baselineCommitSha,
        config,
        toolResults
      }),
      config,
      metrics,
      rawDir,
      root
    });
    if (cachedBaseline) return cachedBaseline;
  }

  return scanTemporaryBaseline({
    baselineCommitSha,
    config,
    metrics,
    rawDir,
    root
  });
}

function hasEveryBaselineToolResult(toolResults: ToolAvailability[]): boolean {
  return ["scc", "lizard", "jscpd"].every((name) =>
    toolResults.some((tool) => tool.name === name)
  );
}

function reuseCurrentSnapshotForUnchangedInput(
  metrics: QualityMetrics,
  rawDir: string
): BaselineSnapshot | null {
  if (metrics.comparisonStatus !== "input-unchanged") {
    return null;
  }

  console.log("Skipping baseline scan because scan inputs are unchanged.");
  const baselineSnapshot = createEquivalentBaselineSnapshot(metrics);
  applyBaselineSnapshot({ metrics, rawDir, baselineSnapshot, message: "computed from equivalent inputs" });
  return baselineSnapshot;
}

function reuseCachedBaselineSnapshot(options: CachedBaselineReuseOptions): BaselineSnapshot | null {
  const { baselineCommitSha, cacheIdentity, config, metrics, rawDir, root } = options;
  const cachedBaseline = loadBaselineSnapshotCacheEntry({
    rootDir: join(root, config.cacheDir),
    identity: cacheIdentity
  });
  if (cachedBaseline.hit) {
    console.log(
      `Reusing baseline snapshot ${baselineCommitSha.slice(0, 7)} ` +
      `from cache ${cachedBaseline.cacheKey.slice(0, 12)}`
    );
    applyBaselineSnapshot({ metrics, rawDir, baselineSnapshot: cachedBaseline.snapshot, message: "computed from cache" });
    return cachedBaseline.snapshot;
  }

  if (cachedBaseline.reason !== "cache-miss") {
    console.log(`Ignoring baseline snapshot cache ${cachedBaseline.cacheKey.slice(0, 12)}: ${cachedBaseline.reason}`);
  }

  return null;
}

async function scanTemporaryBaseline(options: TemporaryBaselineScanOptions): Promise<BaselineSnapshot | null> {
  const baselineWorkDir = join(tmpdir(), `quality-baseline-${randomUUID()}`);
  console.log(`Materializing baseline ${options.baselineCommitSha.slice(0, 7)}...`);

  try {
    return await scanMaterializedBaseline({ ...options, baselineWorkDir });
  } finally {
    rmSync(baselineWorkDir, { recursive: true, force: true });
  }
}

async function scanMaterializedBaseline(options: MaterializedBaselineScanOptions): Promise<BaselineSnapshot | null> {
  const {
    baselineCommitSha,
    baselineWorkDir,
    config,
    metrics,
    rawDir,
    root
  } = options;

  const matResult = materializeBaselineRevision({
    commitSha: baselineCommitSha,
    cwd: root,
    baselineWorkDir
  });

  if (!matResult.ok) {
    console.log(`  ⚠️  Baseline materialization failed: ${matResult.error}`);
    metrics.baseline.status = "baseline-materialization-failed";
    metrics.comparisonStatus = "baseline-unavailable";
    return null;
  }

  console.log(`  Baseline materialized to ${matResult.workDir}`);

  try {
    const preparedScan = await prepareBaselineRevisionScan(matResult.workDir, config);
    if (metrics.baseline.metadata) {
      metrics.baseline.metadata.toolMetadata = collectToolMetadata(preparedScan.toolResults);
    }
    const cacheIdentity = createBaselineSnapshotCacheIdentity({
      commitSha: baselineCommitSha,
      config,
      toolResults: preparedScan.toolResults
    });
    const cachedBaseline = reuseCachedBaselineSnapshot({
      baselineCommitSha,
      cacheIdentity,
      config,
      metrics,
      rawDir,
      root
    });
    if (cachedBaseline) return cachedBaseline;

    const baselineSnapshot = await runBaselineRevisionScan(
      matResult.workDir,
      preparedScan.toolResults,
      config,
      {
        cacheRootDir: join(root, config.cacheDir),
        commitSha: baselineCommitSha,
        inputs: preparedScan.inputs
      }
    );
    const cacheEntry = writeBaselineSnapshotCacheEntry({
      rootDir: join(root, config.cacheDir),
      identity: cacheIdentity,
      snapshot: baselineSnapshot
    });
    console.log(`  Baseline snapshot cached: ${cacheEntry.cacheKey.slice(0, 12)}`);
    applyBaselineSnapshot({ metrics, rawDir, baselineSnapshot });
    return baselineSnapshot;
  } catch (err: unknown) {
    console.log(`  ⚠️  Baseline scan failed: ${errorMessage(err)}`);
    metrics.baseline.status = "baseline-scan-failed";
    metrics.comparisonStatus = "baseline-unavailable";
    return null;
  }
}

function applyBaselineSnapshot({
  metrics,
  rawDir,
  baselineSnapshot,
  message = "computed"
}: {
  baselineSnapshot: BaselineSnapshot;
  message?: string;
  metrics: QualityMetrics;
  rawDir: string;
}): void {
  metrics.baselineFingerprints = baselineSnapshot.fingerprints;
  metrics.trends = generateTrends(metrics, baselineSnapshot);
  console.log(`  Baseline deltas: ${metrics.trends.length} ${message}`);
  writeBaselineRawOutputs(rawDir, baselineSnapshot);
}

function createEquivalentBaselineSnapshot(metrics: QualityMetrics): BaselineSnapshot {
  return {
    fingerprints: cloneJson(metrics.currentFingerprints),
    fileMetrics: metrics.fileMetrics.map((file) => ({
      ...file,
      decisionTokens: { ...file.decisionTokens },
      isChanged: false
    })),
    functionMetrics: metrics.functionMetrics.map((func) => ({
      ...func,
      cyclomaticComplexity: { ...func.cyclomaticComplexity },
      isChanged: false
    })),
    duplicateCode: metrics.duplicateCode.map((fragment) => ({
      ...fragment,
      codeAreas: [...fragment.codeAreas],
      hitsChangedScope: false,
      locations: fragment.locations.map((location) => ({ ...location }))
    })),
    aggregates: cloneJson(metrics.aggregates)
  };
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
