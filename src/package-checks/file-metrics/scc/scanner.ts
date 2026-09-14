/**
 * scc 文件级 code-line 指标 wrapper。
 *
 * 封装 adapter-owned CLI 调用，输出 exact-path code lines 与 decision-token count。
 */

import { errorMessage } from "../../host-environment/error-message.ts";
import { runProcessSync, type ProcessResult } from "../../host-environment/process.ts";
import { acceptExactInputMeasurements } from "../../project-files/exact-input-measurement.ts";
import type { ExactInputMeasurement } from "../../project-files/exact-input-measurement.ts";
import type { FileMetric } from "../measurement-model.ts";
import type { ResolvedFileMetricsScannerOptions } from "../options.ts";
import { planSccBatches } from "./batch-planner.ts";
import {
  beginSccLogicalScanResources,
  consumeSccProcessOutput,
  remainingSccBatchMaxBuffer,
  remainingSccBatchTimeoutMs,
  type SccLogicalScanResources
} from "./logical-scan-resources.ts";
import { parseSccCSV, type SccScanResult } from "./parser.ts";

const SCC_BY_FILE_ARGUMENTS = Object.freeze(["--no-config", "--by-file", "--format", "csv"]);
type SccMeasurement = ExactInputMeasurement<FileMetric>;

interface ScanWithSccOptions {
  readonly cwd: string;
  readonly includePaths: readonly string[];
  readonly scanner: ResolvedFileMetricsScannerOptions;
}

export function scanWithScc({ cwd, includePaths, scanner }: ScanWithSccOptions): SccScanResult {
  try {
    if (includePaths.length === 0) return { ok: true, measurements: [] };

    const batchPlan = planSccBatches(scanner.executable, SCC_BY_FILE_ARGUMENTS, includePaths);
    if (!batchPlan.ok) return { ok: false, error: batchPlan.error, reason: "execution" };

    const logicalScanResources = beginSccLogicalScanResources(process.hrtime.bigint());
    const measurements: SccMeasurement[] = [];

    for (const batch of batchPlan.batches) {
      const batchResult = scanSccBatch({ batch, cwd, logicalScanResources, scanner });
      if (!batchResult.ok) return batchResult;
      measurements.push(...batchResult.measurements);
    }

    return mergeSccBatchMeasurements(measurements);
  } catch (error: unknown) {
    return {
      ok: false,
      error: `scc adapter error: ${errorMessage(error)}`,
      reason: "execution"
    };
  }
}

function scanSccBatch({
  batch,
  cwd,
  logicalScanResources,
  scanner
}: {
  readonly batch: readonly string[];
  readonly cwd: string;
  readonly logicalScanResources: SccLogicalScanResources;
  readonly scanner: ResolvedFileMetricsScannerOptions;
}): SccScanResult {
  const remainingTimeoutMs = remainingSccBatchTimeoutMs(
    logicalScanResources,
    process.hrtime.bigint()
  );
  if (remainingTimeoutMs === null) return expiredSccDeadline();
  const remainingMaxBufferBytes = remainingSccBatchMaxBuffer(logicalScanResources);
  if (remainingMaxBufferBytes === null) return exhaustedSccOutputBudget();

  const commandResult = runProcessSync({
    args: [...SCC_BY_FILE_ARGUMENTS, ...batch],
    command: scanner.executable,
    cwd,
    maxBuffer: remainingMaxBufferBytes,
    timeout: remainingTimeoutMs
  });
  const processFailure = sccBatchProcessFailure(commandResult, logicalScanResources);
  if (processFailure !== null) return processFailure;
  return parseAcceptedSccBatch(commandResult.stdout, cwd, batch);
}

function expiredSccDeadline(): SccScanResult {
  return {
    ok: false,
    error: "scc logical scan exceeded its shared timeout before the next batch",
    reason: "execution"
  };
}

function exhaustedSccOutputBudget(): SccScanResult {
  return {
    ok: false,
    error: "scc logical scan exhausted its cumulative output budget before the next batch",
    reason: "execution"
  };
}

function sccBatchProcessFailure(
  commandResult: ProcessResult,
  logicalScanResources: SccLogicalScanResources
): SccScanResult | null {
  if (!consumeSccProcessOutput(logicalScanResources, commandResult.stdout, commandResult.stderr)) {
    return {
      ok: false,
      error: "scc logical scan exceeded its cumulative stdout or stderr output budget",
      reason: "execution"
    };
  }
  if (commandResult.error) {
    return {
      ok: false,
      error: `scc process error: ${commandResult.error.message}`,
      reason: "execution"
    };
  }
  if (commandResult.status === 0) return null;

  const output = commandResult.stderr.trim() || commandResult.stdout.trim() || "no output";
  const termination =
    commandResult.status === null
      ? `signal ${commandResult.signal ?? "unknown"}`
      : `exit ${commandResult.status}`;
  return { ok: false, error: `scc ${termination}: ${output}`, reason: "execution" };
}

function parseAcceptedSccBatch(
  stdout: string,
  cwd: string,
  batch: readonly string[]
): SccScanResult {
  const parsed = parseSccCSV(stdout, cwd);
  if (!parsed.ok) return parsed;
  const acceptedMeasurements = acceptExactInputMeasurements(parsed.measurements, batch);
  return acceptedMeasurements.ok
    ? parsed
    : { ok: false, error: acceptedMeasurements.error, reason: "invalid-result" };
}

function mergeSccBatchMeasurements(measurements: readonly SccMeasurement[]): SccScanResult {
  const measuredPaths = new Set<string>();
  for (const measurement of measurements) {
    if (measuredPaths.has(measurement.payload.path)) {
      return {
        ok: false,
        error: `scc returned duplicate measurement path ${JSON.stringify(measurement.payload.path)}`,
        reason: "invalid-result"
      };
    }
    measuredPaths.add(measurement.payload.path);
  }
  return {
    ok: true,
    measurements: [...measurements].sort((left, right) =>
      compareText(left.payload.path, right.payload.path)
    )
  };
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
