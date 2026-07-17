import { DEFAULT_CONFIG } from "./config.ts";
import { parseArgs } from "./args.ts";
import { runQualityScan } from "./quality-core/src/index.ts";
import type { QualityScanOptions } from "./quality-core/src/index.ts";

export type ScanStatus = Awaited<ReturnType<typeof runQualityScan>>;

export async function runScan(
  projectRoot: string,
  argv: readonly string[]
): Promise<ScanStatus> {
  const options = parseArgs([...argv]);
  return runQualityScan({
    banner: printBanner,
    config: DEFAULT_CONFIG,
    options,
    root: projectRoot,
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
