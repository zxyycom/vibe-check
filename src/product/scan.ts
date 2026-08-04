import { resolve } from "node:path";

import { parseArgs } from "./args.ts";
import { loadSemanticProjectConfig } from "./config-file.ts";
import { resolveQualityConfig } from "./config-schema.ts";
import { createDefaultConfig } from "./config.ts";
import { runQualityScan } from "./quality-core/src/index.ts";
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
  const cliOverrides = {
    ...(parsed.artifactDir === null ? {} : { artifactDir: parsed.artifactDir }),
    ...(parsed.topN === null ? {} : { topN: parsed.topN })
  };
  const config = parsed.configFile === null
    ? createDefaultConfig(cliOverrides)
    : resolveQualityConfig(
        await loadSemanticProjectConfig(resolve(root, parsed.configFile)),
        cliOverrides
      );
  const dependencies = resolveScannerDependencySnapshot(
    process.env,
    process.platform
  );
  const options: QualityScanOptions = {
    artifactDir: config.artifactDir,
    baseline: parsed.baseline,
    changedFiles: parsed.changedFiles,
    gatePolicy: parsed.gatePolicy,
    scanProfile: parsed.scanProfile,
    skipBaseline: parsed.skipBaseline,
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

function printBanner(scanProfile: QualityScanOptions["scanProfile"]): void {
  console.log("Vibe Check Quality Observability");
  console.log(`Profile: ${scanProfile}`);
  if (scanProfile === "quick") {
    console.log("Quick check: skips baseline comparison and jscpd duplicate detection.");
  } else {
    console.log("Full check: runs all configured scanners; baseline comparison is opt-in.");
  }
  console.log("");
}
