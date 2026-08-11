import { join } from "node:path";

import { writeQualityJsonArtifact } from "../../output/artifacts.ts";
import { scanWithScc } from "../scanners/scc.ts";
import { isToolAvailable, normalizeFileMetrics } from "../metrics.ts";
import { acceptScopedMeasurements } from "../scoped-measurement.ts";
import type {
  CapabilityFailureKind,
  CapabilityResult,
  FailedCapabilityResult
} from "../../model/scan-completeness.ts";
import type { FileMetric, LanguageAggregate } from "../../model/schema.ts";
import type { ScanContext } from "./scan-context.ts";

type SccExactInputResult =
  | {
      readonly byLanguage: readonly LanguageAggregate[];
      readonly ok: true;
      readonly payloads: readonly FileMetric[];
    }
  | { readonly failure: FailedCapabilityResult; readonly ok: false };

export function runSccScan(
  context: ScanContext,
  scanFiles: readonly string[]
): CapabilityResult {
  const { metrics, toolResults, rawDir, config } = context;
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
  const exactInputResult = measureSccExactInputs(context, scanFiles);
  if (!exactInputResult.ok) return exactInputResult.failure;

  metrics.fileMetrics = normalizeFileMetrics(exactInputResult.payloads, {
    changedFiles: context.changedFiles,
    config
  });
  metrics.aggregates.byLanguage = [...exactInputResult.byLanguage];
  console.log(`  scc: ${metrics.fileMetrics.length} files, ${metrics.aggregates.byLanguage.length} languages`);
  writeQualityJsonArtifact(join(rawDir, "scc-output.json"), metrics.fileMetrics);
  return { capabilityId: "file-metrics", status: "succeeded" };
}

function measureSccExactInputs(
  context: ScanContext,
  scanFiles: readonly string[]
): SccExactInputResult {
  const scannerResult = scanWithScc({
    cwd: context.root,
    dependency: context.dependencies.file,
    includePaths: scanFiles,
    excludeDirs: context.config.excludeDirs
  });
  if (!scannerResult.ok) {
    console.log(`  ❌ scc execution/config/schema error: ${scannerResult.error}`);
    return {
      failure: failedSccResult(scannerResult.error, scannerResult.reason),
      ok: false
    };
  }

  const scopeAcceptance = acceptScopedMeasurements(
    scannerResult.measurements,
    scanFiles
  );
  if (!scopeAcceptance.ok) {
    return {
      failure: failedSccResult(scopeAcceptance.error, "invalid-result"),
      ok: false
    };
  }

  return {
    byLanguage: scannerResult.aggregates.byLanguage,
    ok: true,
    payloads: scopeAcceptance.payloads
  };
}

function failedSccResult(
  message: string,
  kind: CapabilityFailureKind
): FailedCapabilityResult {
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
