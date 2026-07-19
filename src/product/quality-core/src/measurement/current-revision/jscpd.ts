import { join } from "node:path";

import { isExcluded } from "../../model/code-areas.ts";
import { writeQualityJsonArtifact } from "../../output/artifacts.ts";
import {
  planJscpdAreaScanTasks,
  scanJscpdAreasWithCache,
  type JscpdAreaScanFailure
} from "../scanners/jscpd/area-scans.ts";
import type { JscpdScanFailureReason } from "../scanners/jscpd/types.ts";
import { isToolAvailable } from "../metrics.ts";
import type {
  CapabilityFailureKind,
  CapabilityResult
} from "../../model/scan-completeness.ts";
import type { ScanContext } from "./scan-context.ts";
import type {
  CodeAreaFileMap,
  QualityConfig
} from "../../model/schema.ts";

export async function runJscpdScan(
  context: ScanContext,
  fileMap: CodeAreaFileMap
): Promise<CapabilityResult> {
  const { metrics, toolResults, changedFiles, rawDir, root, cacheRootDir, config } = context;
  if (fileMap.size === 0) {
    return { capabilityId: "duplicate-detection", status: "no-input" };
  }
  if (!isToolAvailable(toolResults, "jscpd")) {
    const availability = toolResults.find((tool) => tool.name === "jscpd");
    return {
      capabilityId: "duplicate-detection",
      status: "failed",
      diagnostic: {
        kind: "unavailable",
        message: availability?.error || "jscpd is unavailable",
        action: "Configure an available jscpd command, then rerun the scan."
      }
    };
  }

  console.log("Running jscpd...");

  const scannerFailures: JscpdAreaScanFailure[] = [];
  const allFragments = await scanJscpdAreasWithCache({
    cacheRootDir,
    changedFiles,
    commitSha: metrics.metadata.commitSha,
    config,
    cwd: root,
    fileMap,
    fingerprints: context.fingerprints,
    logPrefix: "  ",
    scanKind: "current",
    scannerFailures,
    throwOnFailure: false,
    toolResults
  });

  if (scannerFailures.length > 0) {
    const message = scannerFailures.map((failure) => failure.error).join("; ");
    return failedJscpdResult(
      message,
      jscpdFailureKind(scannerFailures[0]!.reason)
    );
  }

  metrics.duplicateCode = allFragments;

  console.log(`  jscpd total: ${allFragments.length} duplicate fragments`);

  writeQualityJsonArtifact(join(rawDir, "jscpd-fragments.json"), metrics.duplicateCode);
  return { capabilityId: "duplicate-detection", status: "succeeded" };
}

export function selectJscpdTargetFileMap(
  fileMap: CodeAreaFileMap,
  config: QualityConfig
): CodeAreaFileMap {
  const tasks = planJscpdAreaScanTasks(
    Array.from(fileMap, ([area, areaFiles]) => ({
      area,
      files: areaFiles.filter(
        (file) => !isExcluded(file, config.excludeDirs, config.generatedFiles)
      ),
      minimumTokens: config.jscpd.minimumTokens[area] ??
        config.jscpd.defaultMinimumTokens
    }))
  );
  return new Map(tasks.map((task) => [task.area, task.files]));
}

function failedJscpdResult(
  message: string,
  kind: CapabilityFailureKind
): CapabilityResult {
  return {
    capabilityId: "duplicate-detection",
    status: "failed",
    diagnostic: {
      kind,
      message,
      action: "Review the jscpd command and report output, then rerun the scan."
    }
  };
}

function jscpdFailureKind(reason: JscpdScanFailureReason): CapabilityFailureKind {
  switch (reason) {
    case "jscpd-execution-error":
      return "execution";
    case "jscpd-report-failure":
    case "jscpd-parse-failure":
      return "invalid-result";
  }
}
