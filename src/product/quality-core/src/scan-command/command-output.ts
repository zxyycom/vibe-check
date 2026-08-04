import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { validateMetrics } from "../model/schema.ts";
import { writeTextFile } from "../../../foundation/src/index.ts";
import { writeQualityJsonArtifact } from "../output/artifacts.ts";
import {
  cleanupMachineArtifactPublicationV1,
  projectMachineMetricsV1,
  publishMachineArtifactCandidatesV1,
  serializeMachineArtifactCandidatesV1,
} from "../output/machine/index.ts";
import { generateMarkdownReport } from "../output/report/markdown-report.ts";
import type {
  BaselineSnapshot,
  CodeAreaFingerprint,
  FatalIssue,
  QualityMetrics,
  ResolvedQualityConfig,
} from "../model/schema.ts";
export {
  printGateStatus,
  printWarningStatus,
  qualityCheckStatus,
  qualityVerificationStatus,
  type QualityCheckStatus,
} from "./command-output-status.ts";

export function prepareArtifactDirs(artifactDir: string): { rawDir: string } {
  const rawDir = join(artifactDir, "raw");
  mkdirSync(artifactDir, { recursive: true });
  mkdirSync(rawDir, { recursive: true });
  return { rawDir };
}

export function writeBaselineRawOutputs(
  rawDir: string,
  baselineSnapshot: BaselineSnapshot,
): void {
  const baselineRawDir = join(rawDir, "baseline");
  mkdirSync(baselineRawDir, { recursive: true });
  writeQualityJsonArtifact(
    join(baselineRawDir, "baseline-fingerprints.json"),
    baselineSnapshot.fingerprints,
  );

  if (baselineSnapshot.fileMetrics) {
    writeQualityJsonArtifact(
      join(baselineRawDir, "baseline-scc-files.json"),
      baselineSnapshot.fileMetrics,
    );
  }
  if (baselineSnapshot.functionMetrics) {
    writeQualityJsonArtifact(
      join(baselineRawDir, "baseline-lizard-functions.json"),
      baselineSnapshot.functionMetrics,
    );
  }
  if (baselineSnapshot.duplicateCode) {
    writeQualityJsonArtifact(
      join(baselineRawDir, "baseline-jscpd-fragments.json"),
      baselineSnapshot.duplicateCode,
    );
  }
  if (baselineSnapshot.aggregates) {
    writeQualityJsonArtifact(
      join(baselineRawDir, "baseline-aggregates.json"),
      baselineSnapshot.aggregates,
    );
  }
}

type WriteArtifactsOptions = {
  artifactDir: string;
  metrics: QualityMetrics;
  reportOptions: ResolvedQualityConfig["report"];
  reportTimeZone: string;
  topN: number;
};

export function writeArtifacts(options: WriteArtifactsOptions): void {
  const { artifactDir, metrics, reportTimeZone, reportOptions, topN } = options;
  console.log("Writing artifacts...");

  const machineMetrics = projectMachineMetricsV1(metrics);
  const candidates = serializeMachineArtifactCandidatesV1(machineMetrics);
  const machinePaths = publishMachineArtifactCandidatesV1(
    artifactDir,
    candidates,
  );

  const reportPath = join(artifactDir, "report.md");
  try {
    writeTextFile(
      reportPath,
      generateMarkdownReport(metrics, topN, {
        ...reportOptions,
        timeZone: reportTimeZone,
      }),
    );
  } catch (error: unknown) {
    cleanupMachineArtifactPublicationV1(artifactDir);
    throw error;
  }

  console.log(`  metrics.json → ${machinePaths.metricsPath}`);
  console.log(`  report.md → ${reportPath}`);
  console.log(`  warnings.ndjson → ${machinePaths.warningsPath}`);
  console.log(`  warnings-all.ndjson → ${machinePaths.warningsAllPath}`);
}

export function printSummary(metrics: QualityMetrics): void {
  console.log("");
  console.log("─".repeat(60));
  console.log("Summary:");
  console.log(`  Files: ${metrics.fileMetrics.length}`);
  console.log(`  Functions: ${metrics.functionMetrics.length}`);
  console.log(`  Duplicate fragments: ${metrics.duplicateCode.length}`);
  console.log(`  Warnings: ${metrics.warnings.all.length} all`);
  console.log(`  Changed warnings: ${metrics.warnings.changed.length}`);
  console.log(`  Regression warnings: ${metrics.warnings.regressions.length}`);
  console.log(`  Scan completeness: ${metrics.scanCompleteness.overall}`);
  for (const result of metrics.scanCompleteness.capabilities) {
    console.log(`    ${result.capabilityId}: ${result.status}`);
    if (result.status === "failed") {
      console.log(`      Reason: ${result.diagnostic.message}`);
      console.log(`      Action: ${result.diagnostic.action}`);
    }
  }
  console.log(`  Baseline status: ${metrics.baseline.status}`);
  console.log(`  Comparison status: ${metrics.comparisonStatus}`);
  console.log("─".repeat(60));
}

export function validateOutput(metrics: QualityMetrics) {
  const validation = validateMetrics(metrics);
  if (validation.valid) return validation;

  console.log("");
  console.log("❌ Metrics validation errors:");
  for (const err of validation.errors) {
    console.log(`  - ${err}`);
  }
  return validation;
}

export function logFingerprints(
  fingerprints: Record<string, CodeAreaFingerprint>,
): void {
  console.log("  Input fingerprints:");
  for (const [area, fingerprint] of Object.entries(fingerprints)) {
    console.log(
      `    ${area}: ${fingerprint.fileCount} files, ${fingerprint.fingerprint}`,
    );
  }
}

export function formatFatalIssue(issue: FatalIssue): string {
  return `${issue.tool} ${issue.phase}: ${issue.error}`;
}
