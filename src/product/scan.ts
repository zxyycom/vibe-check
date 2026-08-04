import { resolve } from "node:path";

import { parseArgs } from "./args.ts";
import { CliUsageError } from "./foundation/src/errors.ts";
import {
  selectProjectConfig,
  type SelectedConfig
} from "./config-selection.ts";
import { runQualityScan } from "./quality-core/src/index.ts";
import { resolveBaselineCommitSha } from "./quality-core/src/input/revisions.ts";
import { resolveScannerDependencySnapshot } from "./scanner-dependencies.ts";
import type {
  QualityScanOptions,
  QualityScanProcessOutcome
} from "./quality-core/src/index.ts";

export type ScanOutcome = QualityScanProcessOutcome;

export async function runScan(
  projectRoot: string,
  argv: readonly string[]
): Promise<ScanOutcome> {
  const root = resolve(projectRoot);
  const parsed = parseArgs([...argv]);
  const baselineCommitSha = resolveExplicitBaseline({
    revision: parsed.baselineRevision,
    root
  });
  const cliOverrides = {
    ...(parsed.artifactDir === null ? {} : { artifactDir: parsed.artifactDir }),
    ...(parsed.topN === null ? {} : { topN: parsed.topN })
  };
  const selectedConfig = await selectProjectConfig({
    cliOverrides,
    explicitConfigFile: parsed.configFile,
    gateRequested: parsed.gatePolicy !== null,
    projectRoot: root
  });
  printConfigProvenance(selectedConfig);
  const { config } = selectedConfig;
  const dependencies = resolveScannerDependencySnapshot(
    process.env,
    process.platform
  );
  const options: QualityScanOptions = {
    artifactDir: config.artifactDir,
    baselineCommitSha,
    changedFiles: parsed.changedFiles,
    gatePolicy: parsed.gatePolicy,
    scanProfile: parsed.scanProfile,
    topN: config.report.topN,
    verificationOutput: parsed.verificationOutput
  };

  const outcome = await runQualityScan({
    banner: printBanner,
    config,
    dependencies,
    options,
    root,
    timingsEnabled: process.env.VIBE_CHECK_QUALITY_TIMINGS === "1"
  });
  return outcome;
}

function resolveExplicitBaseline({
  revision,
  root
}: {
  revision: string | null;
  root: string;
}): string | null {
  if (revision === null) return null;

  const result = resolveBaselineCommitSha({ cwd: root, revision });
  if (result.ok) return result.commitSha;
  throw new CliUsageError(result.error);
}

function printConfigProvenance(selectedConfig: SelectedConfig): void {
  if (selectedConfig.source === "default") {
    console.log("Config: default (not persisted)");
    return;
  }
  console.log(`Config: ${selectedConfig.source} ${selectedConfig.path}`);
}

function printBanner(scanProfile: QualityScanOptions["scanProfile"]): void {
  console.log("Vibe Check Quality Observability");
  console.log(`Profile: ${scanProfile}`);
  if (scanProfile === "quick") {
    console.log("Quick check: skips baseline comparison and jscpd duplicate detection.");
  } else {
    console.log("Full check: runs all configured scanners; comparison requires explicit --baseline.");
  }
  console.log("");
}
