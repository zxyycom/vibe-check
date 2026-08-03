import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { validateMetrics } from "../model/schema.ts";
import { writeTextFile } from "../../../foundation/src/index.ts";
import { writeQualityJsonArtifact } from "../output/artifacts.ts";
import {
  cleanupMachineArtifactPublicationV1,
  projectMachineMetricsV1,
  publishMachineArtifactCandidatesV1,
  serializeMachineArtifactCandidatesV1
} from "../output/machine/index.ts";
import { generateMarkdownReport } from "../output/report/markdown-report.ts";
import type {
  BaselineSnapshot,
  CodeAreaFingerprint,
  FatalIssue,
  QualityMetrics,
  QualityConfig,
  WarningRecord
} from "../model/schema.ts";
import type { QualityScanProfile } from "./command-model.ts";

const WARNING_PREVIEW_LIMIT = 5;

export type QualityCheckStatus = "passed" | "warning" | "failed";

export function prepareArtifactDirs(artifactDir: string): { rawDir: string } {
  const rawDir = join(artifactDir, "raw");
  mkdirSync(artifactDir, { recursive: true });
  mkdirSync(rawDir, { recursive: true });
  return { rawDir };
}

export function writeBaselineRawOutputs(rawDir: string, baselineSnapshot: BaselineSnapshot): void {
  const baselineRawDir = join(rawDir, "baseline");
  mkdirSync(baselineRawDir, { recursive: true });
  writeQualityJsonArtifact(join(baselineRawDir, "baseline-fingerprints.json"), baselineSnapshot.fingerprints);

  if (baselineSnapshot.fileMetrics) {
    writeQualityJsonArtifact(join(baselineRawDir, "baseline-scc-files.json"), baselineSnapshot.fileMetrics);
  }
  if (baselineSnapshot.functionMetrics) {
    writeQualityJsonArtifact(join(baselineRawDir, "baseline-lizard-functions.json"), baselineSnapshot.functionMetrics);
  }
  if (baselineSnapshot.duplicateCode) {
    writeQualityJsonArtifact(join(baselineRawDir, "baseline-jscpd-fragments.json"), baselineSnapshot.duplicateCode);
  }
  if (baselineSnapshot.aggregates) {
    writeQualityJsonArtifact(join(baselineRawDir, "baseline-aggregates.json"), baselineSnapshot.aggregates);
  }
}

export function writeArtifacts({
  artifactDir,
  metrics,
  reportTimeZone,
  reportOptions,
  topN
}: {
  artifactDir: string;
  metrics: QualityMetrics;
  reportOptions: QualityConfig["report"];
  reportTimeZone: string;
  topN: number;
}): void {
  console.log("Writing artifacts...");

  const machineMetrics = projectMachineMetricsV1(metrics);
  const candidates = serializeMachineArtifactCandidatesV1(machineMetrics);
  const machinePaths = publishMachineArtifactCandidatesV1(
    artifactDir,
    candidates
  );

  const reportPath = join(artifactDir, "report.md");
  try {
    writeTextFile(
      reportPath,
      generateMarkdownReport(metrics, topN, {
        ...reportOptions,
        timeZone: reportTimeZone
      })
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

export function qualityCheckStatus(metrics: QualityMetrics): QualityCheckStatus {
  if (metrics.scanCompleteness.overall === "failed") {
    return "failed";
  }
  return metrics.scanCompleteness.overall === "empty" || metrics.warnings.all.length > 0
    ? "warning"
    : "passed";
}

export function qualityVerificationStatus(metrics: QualityMetrics): QualityCheckStatus {
  if (metrics.scanCompleteness.overall === "failed") {
    return "failed";
  }
  return metrics.scanCompleteness.overall === "empty" ||
    warningsWithoutAcceptedReason(metrics.warnings.all).length > 0
    ? "warning"
    : "passed";
}

export function printWarningStatus({
  artifactDir,
  metrics,
  scanProfile,
  verificationOutput
}: {
  artifactDir: string;
  metrics: QualityMetrics;
  scanProfile: QualityScanProfile;
  verificationOutput: boolean;
}): void {
  const warnings = metrics.warnings.all;
  const status = qualityCheckStatus(metrics);

  console.log("");
  if (metrics.scanCompleteness.overall === "empty") {
    const statusLabel = verificationOutput
      ? "Quality verification status"
      : "Quality check status";
    console.log(`${statusLabel}: warning`);
    console.log(
      "⚠️ Quality was not evaluated because no capability had eligible measurement input."
    );
    return;
  }
  if (verificationOutput) {
    printVerificationWarningStatus({ artifactDir, metrics });
    return;
  }

  console.log(`Quality check status: ${status}`);

  if (warnings.length === 0) {
    return;
  }

  console.log(
    `Warnings: ${warnings.length} total ` +
    `(${metrics.warnings.changed.length} changed, ${metrics.warnings.regressions.length} regressions)`
  );
  if (scanProfile === "quick") {
    console.log("This is a quick quality check, not a full quality scan.");
  }
  printWarningPreviewList(warnings, "warnings");
  console.log(`Detailed report: ${join(artifactDir, "report.md")}`);
  console.log(`Warning records: ${join(artifactDir, "warnings-all.ndjson")}`);
}

export function printGateStatus({
  metrics,
  scanProfile
}: {
  metrics: QualityMetrics;
  scanProfile: QualityScanProfile;
}): void {
  const gate = metrics.gate;
  if (gate.status === "disabled") {
    return;
  }

  if (gate.status === "not-evaluated") {
    const profileQualifier =
      gate.policy === "all" ? ` for the resolved ${scanProfile} profile` : "";
    console.error(`❌ Quality gate was not evaluated${profileQualifier}.`);
    console.error(`  Policy: ${gate.policy}`);
    console.error(`  Status: ${gate.status}`);
    console.error(`  Reason code: ${gate.reasonCode}`);

    if (gate.reasonCode === "scan-incomplete") {
      for (const result of metrics.scanCompleteness.capabilities) {
        if (result.status !== "failed") continue;
        console.error(`  Action (${result.capabilityId}): ${result.diagnostic.action}`);
      }
      return;
    }
    if (gate.reasonCode === "no-eligible-input") {
      const includeScope = metrics.metadata.scope.include.join(", ") || "<empty>";
      console.error(
        `  Action: Adjust the resolved ${scanProfile} profile or configured include scope ` +
        `(${includeScope}) so at least one requested capability has eligible input.`
      );
      return;
    }
    console.error(
      `  Action: Resolve baseline status ${metrics.baseline.status} so comparison evidence ` +
      "is available, then retry."
    );
    return;
  }

  const profileQualifier =
    gate.policy === "all" ? ` for the resolved ${scanProfile} profile` : "";
  const icon = gate.status === "passed" ? "✅" : "❌";
  console.log(`${icon} Quality gate ${gate.status}${profileQualifier}.`);
  console.log(`  Policy: ${gate.policy}`);
  console.log(`  Status: ${gate.status}`);
  console.log(`  Evaluated channel: ${gate.evaluatedChannel}`);
  console.log(`  Evaluated warnings: ${gate.evaluatedWarningCount}`);
  console.log(`  Blocking warnings: ${gate.blockingWarningCount}`);
}

function printVerificationWarningStatus({
  artifactDir,
  metrics
}: {
  artifactDir: string;
  metrics: QualityMetrics;
}): void {
  const status = qualityVerificationStatus(metrics);

  console.log(`Quality verification status: ${status}`);
  if (status === "passed") {
    return;
  }

  const warnings = warningsWithoutAcceptedReason(metrics.warnings.all);
  const changedWarnings = warningsWithoutAcceptedReason(metrics.warnings.changed);
  const regressionWarnings = warningsWithoutAcceptedReason(metrics.warnings.regressions);
  console.log(
    `Warnings without accepted reason: ${warnings.length} total ` +
    `(${changedWarnings.length} changed, ${regressionWarnings.length} regressions)`
  );
  printWarningPreviewList(warnings, "warnings without accepted reason");
  console.log(`Detailed report: ${join(artifactDir, "report.md")}`);
  console.log(`Warning records: ${join(artifactDir, "warnings-all.ndjson")}`);
}

function printWarningPreviewList(warnings: readonly WarningRecord[], label: string): void {
  console.log(`Showing first ${Math.min(WARNING_PREVIEW_LIMIT, warnings.length)} ${label}:`);
  for (const [index, warning] of warnings.slice(0, WARNING_PREVIEW_LIMIT).entries()) {
    console.log(`  ${index + 1}. ${formatWarningPreview(warning)}`);
    if (warning.acceptedReason) {
      console.log(`     Accepted reason: ${warning.acceptedReason}`);
    }
  }
  if (warnings.length > WARNING_PREVIEW_LIMIT) {
    console.log(`  ... and ${warnings.length - WARNING_PREVIEW_LIMIT} more ${label}`);
  }
}

function formatWarningPreview(warning: WarningRecord): string {
  const location = warning.line === null ? warning.path : `${warning.path}:${warning.line}`;
  return `[${warning.level}/${warning.ruleId}] ${location} - ${warning.message}`;
}

function warningsWithoutAcceptedReason(warnings: readonly WarningRecord[]): WarningRecord[] {
  return warnings.filter((warning) => !warning.acceptedReason);
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

export function logFingerprints(fingerprints: Record<string, CodeAreaFingerprint>): void {
  console.log("  Input fingerprints:");
  for (const [area, fingerprint] of Object.entries(fingerprints)) {
    console.log(`    ${area}: ${fingerprint.fileCount} files, ${fingerprint.fingerprint}`);
  }
}

export function formatFatalIssue(issue: FatalIssue): string {
  return `${issue.tool} ${issue.phase}: ${issue.error}`;
}
