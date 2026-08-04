import { join } from "node:path";

import { writeQualityJsonArtifact } from "../../output/artifacts.ts";
import { scanWithLizard } from "../scanners/lizard.ts";
import {
  isToolAvailable,
  normalizeFunctionMetrics
} from "../metrics.ts";
import type {
  CapabilityFailureKind,
  CapabilityResult
} from "../../model/scan-completeness.ts";
import type { ScanContext } from "./scan-context.ts";

export function runLizardScan(
  context: ScanContext,
  targetFiles: string[]
): CapabilityResult {
  const { metrics, toolResults, rawDir, root, config, dependencies } = context;
  if (targetFiles.length === 0) {
    return { capabilityId: "function-metrics", status: "no-input" };
  }
  if (!isToolAvailable(toolResults, "lizard")) {
    const availability = toolResults.find((tool) => tool.name === "lizard");
    return {
      capabilityId: "function-metrics",
      status: "failed",
      diagnostic: {
        kind: "unavailable",
        message: availability?.error || "Lizard is unavailable",
        action: "Configure an available Lizard command, then rerun the scan."
      }
    };
  }

  console.log("Running Lizard...");
  console.log(`  Lizard targets: ${targetFiles.length} files`);

  const lizardResult = scanWithLizard({
    files: targetFiles,
    cwd: root,
    dependency: dependencies.function
  });

  if (!lizardResult.ok) {
    console.log(`  ❌ Lizard execution/config/schema error: ${lizardResult.error}`);
    return failedLizardResult(
      lizardResult.error,
      lizardResult.reason
    );
  }
  if (!Array.isArray(lizardResult.functions)) {
    return failedLizardResult(
      "Lizard returned an invalid normalized result",
      "invalid-result"
    );
  }

  metrics.functionMetrics = normalizeFunctionMetrics(lizardResult.functions, {
    changedFiles: context.changedFiles,
    config
  });

  console.log(`  Lizard: ${metrics.functionMetrics.length} functions`);

  writeQualityJsonArtifact(join(rawDir, "lizard-functions.json"), metrics.functionMetrics);
  return { capabilityId: "function-metrics", status: "succeeded" };
}

function failedLizardResult(
  message: string,
  kind: CapabilityFailureKind
): CapabilityResult {
  return {
    capabilityId: "function-metrics",
    status: "failed",
    diagnostic: {
      kind,
      message,
      action: "Review the Lizard command and output, then rerun the scan."
    }
  };
}
