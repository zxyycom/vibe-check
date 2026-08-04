import { errorMessage } from "../../../foundation/src/index.ts";
import type {
  FatalIssue,
  QualityMetrics,
  ResolvedQualityConfig,
} from "../model/schema.ts";
import { cleanupMachineArtifactPublicationV1 } from "../output/machine/index.ts";
import type {
  QualityScanOptions,
  QualityScanProcessOutcome,
} from "../scan-command/index.ts";
import {
  formatFatalIssue,
  printGateStatus,
  printSummary,
  printWarningStatus,
  qualityCheckStatus,
  validateOutput,
  writeArtifacts,
  type Timings,
} from "../scan-command/index.ts";

export type ScanFinishRuntime = {
  config: ResolvedQualityConfig;
  fatalIssues: FatalIssue[];
  metrics: QualityMetrics;
  opts: QualityScanOptions;
};

export function finishScan({
  artifactDir,
  runtime,
  timings,
}: {
  artifactDir: string;
  runtime: ScanFinishRuntime;
  timings: Timings;
}): QualityScanProcessOutcome {
  const { fatalIssues, metrics, opts } = runtime;

  if (hasFatalValidationIssue({ artifactDir, fatalIssues, metrics, timings })) {
    return "failed";
  }
  if (!writeScanArtifacts({ artifactDir, runtime, timings })) {
    return "failed";
  }

  return finishPublishedScan({ artifactDir, metrics, opts, timings });
}

function hasFatalValidationIssue({
  artifactDir,
  fatalIssues,
  metrics,
  timings,
}: {
  artifactDir: string;
  fatalIssues: FatalIssue[];
  metrics: QualityMetrics;
  timings: Timings;
}): boolean {
  const validation = timings.measure("validate output", () =>
    validateOutput(metrics),
  );
  recordValidationIssues(fatalIssues, validation.errors);
  if (fatalIssues.length === 0) {
    return false;
  }

  cleanupMachineArtifactPublicationV1(artifactDir);
  finishFatalScan(artifactDir, fatalIssues);
  return true;
}

function writeScanArtifacts({
  artifactDir,
  runtime,
  timings,
}: {
  artifactDir: string;
  runtime: ScanFinishRuntime;
  timings: Timings;
}): boolean {
  try {
    timings.measure("write artifacts", () =>
      writeArtifacts({
        artifactDir,
        metrics: runtime.metrics,
        reportOptions: runtime.config.report,
        reportTimeZone: runtime.config.report.timeZone,
        topN: runtime.opts.topN,
      }),
    );
    return true;
  } catch (err: unknown) {
    runtime.fatalIssues.push({
      error: errorMessage(err),
      phase: "write",
      tool: "output",
    });
    finishFatalScan(artifactDir, runtime.fatalIssues);
    return false;
  }
}

function finishPublishedScan({
  artifactDir,
  metrics,
  opts,
  timings,
}: {
  artifactDir: string;
  metrics: QualityMetrics;
  opts: QualityScanOptions;
  timings: Timings;
}): QualityScanProcessOutcome {
  timings.measure("print summary", () => printSummary(metrics));
  timings.measure("print gate status", () =>
    printGateStatus({ metrics, scanProfile: opts.scanProfile }),
  );
  const status = qualityCheckStatus(metrics);
  if (status === "failed") {
    finishIncompleteScan(artifactDir, metrics);
    return "failed";
  }

  timings.measure("print warning status", () =>
    printWarningStatus({
      artifactDir,
      metrics,
      scanProfile: opts.scanProfile,
      verificationOutput: opts.verificationOutput,
    }),
  );
  printSuccessfulScanCompletion(status, artifactDir);

  timings.print();
  if (metrics.gate.status === "not-evaluated") {
    return "failed";
  }
  return metrics.gate.status === "failed" ? "gate-failed" : "success";
}

function finishIncompleteScan(
  artifactDir: string,
  metrics: QualityMetrics,
): void {
  console.log("");
  console.log("❌ Quality scan failed.");
  console.log(`Artifacts in: ${artifactDir}/`);
  console.error("Incomplete current measurements:");
  for (const result of metrics.scanCompleteness.capabilities) {
    if (result.status !== "failed") continue;
    console.error(
      `  - ${result.capabilityId}: ${result.diagnostic.message} ` +
        `Action: ${result.diagnostic.action}`,
    );
  }
}

function recordValidationIssues(
  fatalIssues: FatalIssue[],
  validationErrors: string[],
): void {
  if (validationErrors.length === 0) {
    return;
  }
  fatalIssues.push({
    tool: "metrics",
    phase: "validation",
    error: validationErrors.join("; "),
  });
}

function finishFatalScan(artifactDir: string, fatalIssues: FatalIssue[]): void {
  console.log("");
  console.log("❌ Quality scan failed.");
  console.log(`Artifacts in: ${artifactDir}/`);
  console.error("Fatal quality scan issues:");
  for (const issue of fatalIssues) {
    console.error(`  - ${formatFatalIssue(issue)}`);
  }
}

function printSuccessfulScanCompletion(
  status: "passed" | "warning",
  artifactDir: string,
): void {
  console.log("");
  console.log(
    status === "warning"
      ? "⚠️ Quality scan complete with warnings."
      : "✅ Quality scan complete.",
  );
  console.log(`Artifacts in: ${artifactDir}/`);
}
