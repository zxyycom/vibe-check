import { join } from "node:path";

import { writeQualityJsonArtifact } from "../../output/artifacts.ts";
import { scanWithLizard } from "../scanners/lizard.ts";
import {
  isToolAvailable,
  normalizeFunctionMetrics
} from "../metrics.ts";
import { acceptScopedMeasurements } from "../scoped-measurement.ts";
import type {
  CapabilityFailureKind,
  CapabilityResult,
  FailedCapabilityResult
} from "../../model/scan-completeness.ts";
import type { FunctionMetric } from "../../model/schema.ts";
import type { ScanContext } from "./scan-context.ts";

type LizardExactInputResult =
  | { readonly ok: true; readonly payloads: readonly FunctionMetric[] }
  | { readonly failure: FailedCapabilityResult; readonly ok: false };

export function runLizardScan(
  context: ScanContext,
  targetFiles: readonly string[]
): CapabilityResult {
  const { metrics, toolResults, rawDir, config } = context;
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
  const exactInputResult = measureLizardExactInputs(context, targetFiles);
  if (!exactInputResult.ok) return exactInputResult.failure;

  metrics.functionMetrics = normalizeFunctionMetrics(exactInputResult.payloads, {
    changedFiles: context.changedFiles,
    config
  });

  console.log(`  Lizard: ${metrics.functionMetrics.length} functions`);

  writeQualityJsonArtifact(join(rawDir, "lizard-functions.json"), metrics.functionMetrics);
  return { capabilityId: "function-metrics", status: "succeeded" };
}

function measureLizardExactInputs(
  context: ScanContext,
  targetFiles: readonly string[]
): LizardExactInputResult {
  const scannerResult = scanWithLizard({
    files: targetFiles,
    cwd: context.root,
    dependency: context.dependencies.function
  });
  if (!scannerResult.ok) {
    console.log(`  ❌ Lizard execution/config/schema error: ${scannerResult.error}`);
    return {
      failure: failedLizardResult(scannerResult.error, scannerResult.reason),
      ok: false
    };
  }

  const scopeAcceptance = acceptScopedMeasurements(
    scannerResult.measurements,
    targetFiles
  );
  if (!scopeAcceptance.ok) {
    return {
      failure: failedLizardResult(scopeAcceptance.error, "invalid-result"),
      ok: false
    };
  }

  return { ok: true, payloads: scopeAcceptance.payloads };
}

function failedLizardResult(
  message: string,
  kind: CapabilityFailureKind
): FailedCapabilityResult {
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
