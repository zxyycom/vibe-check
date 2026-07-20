import { resolve } from "node:path";

import { parseArgs } from "./args.ts";
import { loadQualityConfig } from "./config-file.ts";
import { createDefaultConfig } from "./config.ts";
import { runQualityScan } from "./quality-core/src/index.ts";
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
  const config = parsed.configFile === null
    ? createDefaultConfig()
    : await loadQualityConfig(resolve(root, parsed.configFile));
  const options: QualityScanOptions = {
    artifactDir: parsed.artifactDir ?? config.artifactDir,
    baseline: parsed.baseline,
    changedFiles: parsed.changedFiles,
    gatePolicy: parsed.gatePolicy,
    scanProfile: parsed.scanProfile,
    skipBaseline: parsed.skipBaseline,
    topN: parsed.topN ?? config.report.topN,
    verificationOutput: parsed.verificationOutput
  };

  const outcome = await runQualityScan({
    banner: printBanner,
    config,
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
