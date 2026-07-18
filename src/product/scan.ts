import { resolve } from "node:path";

import { parseArgs } from "./args.ts";
import { loadQualityConfig } from "./config-file.ts";
import { createDefaultConfig } from "./config.ts";
import { runQualityScan } from "./quality-core/src/index.ts";
import type { QualityScanOptions } from "./quality-core/src/index.ts";

export type ScanStatus = Awaited<ReturnType<typeof runQualityScan>>;

export async function runScan(
  projectRoot: string,
  argv: readonly string[]
): Promise<ScanStatus> {
  const root = resolve(projectRoot);
  const parsed = parseArgs([...argv]);
  const config = parsed.configFile === null
    ? createDefaultConfig()
    : await loadQualityConfig(resolve(root, parsed.configFile));
  const options: QualityScanOptions = {
    artifactDir: parsed.artifactDir ?? config.artifactDir,
    baseline: parsed.baseline,
    changedFiles: parsed.changedFiles,
    scanProfile: parsed.scanProfile,
    skipBaseline: parsed.skipBaseline,
    topN: parsed.topN ?? config.report.topN,
    verificationOutput: parsed.verificationOutput
  };

  return runQualityScan({
    banner: printBanner,
    config,
    options,
    root,
    timingsEnabled: process.env.VIBE_CHECK_QUALITY_TIMINGS === "1"
  });
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
