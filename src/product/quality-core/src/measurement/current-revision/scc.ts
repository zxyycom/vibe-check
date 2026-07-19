import { join } from "node:path";

import { writeQualityJsonArtifact } from "../../output/artifacts.ts";
import { scanWithScc } from "../scanners/scc.ts";
import { isToolAvailable, normalizeFileMetrics } from "../metrics.ts";
import type {
  CapabilityFailureKind,
  CapabilityResult
} from "../../model/scan-completeness.ts";
import type { ScanContext } from "./scan-context.ts";

export function runSccScan(context: ScanContext, scanFiles: string[]): CapabilityResult {
  const { metrics, toolResults, rawDir, root, config } = context;
  if (scanFiles.length === 0) {
    return { capabilityId: "file-metrics", status: "no-input" };
  }
  if (!isToolAvailable(toolResults, "scc")) {
    const availability = toolResults.find((tool) => tool.name === "scc");
    return {
      capabilityId: "file-metrics",
      status: "failed",
      diagnostic: {
        kind: "unavailable",
        message: availability?.error || "scc is unavailable",
        action: "Configure an available scc command, then rerun the scan."
      }
    };
  }

  console.log("Running scc...");

  const sccResult = scanWithScc({
    cwd: root,
    includePaths: scanFiles,
    excludeDirs: config.excludeDirs,
    toolConfig: config.tools.scc
  });

  if (!sccResult.ok) {
    console.log(`  ❌ scc execution/config/schema error: ${sccResult.error}`);
    return failedSccResult(
      sccResult.error,
      sccResult.reason
    );
  }
  if (!Array.isArray(sccResult.files) || !Array.isArray(sccResult.aggregates.byLanguage)) {
    return failedSccResult(
      "scc returned an invalid normalized result",
      "invalid-result"
    );
  }

  metrics.fileMetrics = normalizeFileMetrics(sccResult.files, {
    changedFiles: context.changedFiles,
    config
  });
  metrics.aggregates.byLanguage = sccResult.aggregates.byLanguage;
  console.log(`  scc: ${metrics.fileMetrics.length} files, ${metrics.aggregates.byLanguage.length} languages`);
  writeQualityJsonArtifact(join(rawDir, "scc-output.json"), metrics.fileMetrics);
  return { capabilityId: "file-metrics", status: "succeeded" };
}

function failedSccResult(
  message: string,
  kind: CapabilityFailureKind
): CapabilityResult {
  return {
    capabilityId: "file-metrics",
    status: "failed",
    diagnostic: {
      kind,
      message,
      action: "Review the scc command and output, then rerun the scan."
    }
  };
}
