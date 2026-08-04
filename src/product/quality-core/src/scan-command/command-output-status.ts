import { join } from "node:path";

import type { QualityMetrics, WarningRecord } from "../model/schema.ts";
import type { QualityScanProfile } from "./command-model.ts";

const WARNING_PREVIEW_LIMIT = 5;

export type QualityCheckStatus = "passed" | "warning" | "failed";

export function qualityCheckStatus(
  metrics: QualityMetrics,
): QualityCheckStatus {
  if (metrics.scanCompleteness.overall === "failed") {
    return "failed";
  }
  return metrics.scanCompleteness.overall === "empty" ||
    metrics.warnings.all.length > 0
    ? "warning"
    : "passed";
}

export function qualityVerificationStatus(
  metrics: QualityMetrics,
): QualityCheckStatus {
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
  verificationOutput,
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
    printEmptyInputWarningStatus(verificationOutput);
    return;
  }
  if (verificationOutput) {
    printVerificationWarningStatus({ artifactDir, metrics });
    return;
  }

  printStandardWarningStatus({
    artifactDir,
    metrics,
    scanProfile,
    status,
    warnings,
  });
}

function printEmptyInputWarningStatus(verificationOutput: boolean): void {
  const statusLabel = verificationOutput
    ? "Quality verification status"
    : "Quality check status";
  console.log(`${statusLabel}: warning`);
  console.log(
    "⚠️ Quality was not evaluated because no capability had eligible measurement input.",
  );
}

function printStandardWarningStatus(options: {
  artifactDir: string;
  metrics: QualityMetrics;
  scanProfile: QualityScanProfile;
  status: QualityCheckStatus;
  warnings: readonly WarningRecord[];
}): void {
  const { artifactDir, metrics, scanProfile, status, warnings } = options;
  console.log(`Quality check status: ${status}`);
  if (warnings.length === 0) {
    return;
  }

  console.log(
    `Warnings: ${warnings.length} total ` +
      `(${metrics.warnings.changed.length} changed, ${metrics.warnings.regressions.length} regressions)`,
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
  scanProfile,
}: {
  metrics: QualityMetrics;
  scanProfile: QualityScanProfile;
}): void {
  const gate = metrics.gate;
  if (gate.status === "disabled") {
    return;
  }

  if (gate.status === "not-evaluated") {
    printNotEvaluatedGateStatus(metrics, scanProfile);
    return;
  }

  printEvaluatedGateStatus(metrics, scanProfile);
}

function printNotEvaluatedGateStatus(
  metrics: QualityMetrics,
  scanProfile: QualityScanProfile,
): void {
  const gate = metrics.gate;
  if (gate.status !== "not-evaluated") {
    return;
  }
  console.error(
    `❌ Quality gate was not evaluated${gateProfileQualifier(gate.policy, scanProfile)}.`,
  );
  console.error(`  Policy: ${gate.policy}`);
  console.error(`  Status: ${gate.status}`);
  console.error(`  Reason code: ${gate.reasonCode}`);
  printNotEvaluatedGateAction(metrics, scanProfile);
}

function printNotEvaluatedGateAction(
  metrics: QualityMetrics,
  scanProfile: QualityScanProfile,
): void {
  const gate = metrics.gate;
  if (gate.status !== "not-evaluated") {
    return;
  }
  if (gate.reasonCode === "scan-incomplete") {
    printIncompleteGateActions(metrics);
    return;
  }
  if (gate.reasonCode === "no-eligible-input") {
    const includeScope = metrics.metadata.scope.include.join(", ") || "<empty>";
    console.error(
      `  Action: Adjust the resolved ${scanProfile} profile or configured include scope ` +
        `(${includeScope}) so at least one requested capability has eligible input.`,
    );
    return;
  }
  console.error(
    `  Action: Resolve baseline status ${metrics.baseline.status} so comparison evidence ` +
      "is available, then retry.",
  );
}

function printIncompleteGateActions(metrics: QualityMetrics): void {
  for (const result of metrics.scanCompleteness.capabilities) {
    if (result.status !== "failed") continue;
    console.error(
      `  Action (${result.capabilityId}): ${result.diagnostic.action}`,
    );
  }
}

function printEvaluatedGateStatus(
  metrics: QualityMetrics,
  scanProfile: QualityScanProfile,
): void {
  const gate = metrics.gate;
  if (gate.status !== "passed" && gate.status !== "failed") {
    return;
  }
  const profileQualifier = gateProfileQualifier(gate.policy, scanProfile);
  const icon = gate.status === "passed" ? "✅" : "❌";
  console.log(`${icon} Quality gate ${gate.status}${profileQualifier}.`);
  console.log(`  Policy: ${gate.policy}`);
  console.log(`  Status: ${gate.status}`);
  console.log(`  Evaluated channel: ${gate.evaluatedChannel}`);
  console.log(`  Evaluated warnings: ${gate.evaluatedWarningCount}`);
  console.log(`  Blocking warnings: ${gate.blockingWarningCount}`);
}

function gateProfileQualifier(
  policy: QualityMetrics["gate"]["policy"],
  scanProfile: QualityScanProfile,
): string {
  return policy === "all" ? ` for the resolved ${scanProfile} profile` : "";
}

function printVerificationWarningStatus({
  artifactDir,
  metrics,
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
  const changedWarnings = warningsWithoutAcceptedReason(
    metrics.warnings.changed,
  );
  const regressionWarnings = warningsWithoutAcceptedReason(
    metrics.warnings.regressions,
  );
  console.log(
    `Warnings without accepted reason: ${warnings.length} total ` +
      `(${changedWarnings.length} changed, ${regressionWarnings.length} regressions)`,
  );
  printWarningPreviewList(warnings, "warnings without accepted reason");
  console.log(`Detailed report: ${join(artifactDir, "report.md")}`);
  console.log(`Warning records: ${join(artifactDir, "warnings-all.ndjson")}`);
}

function printWarningPreviewList(
  warnings: readonly WarningRecord[],
  label: string,
): void {
  console.log(
    `Showing first ${Math.min(WARNING_PREVIEW_LIMIT, warnings.length)} ${label}:`,
  );
  for (const [index, warning] of warnings
    .slice(0, WARNING_PREVIEW_LIMIT)
    .entries()) {
    console.log(`  ${index + 1}. ${formatWarningPreview(warning)}`);
    if (warning.acceptedReason) {
      console.log(`     Accepted reason: ${warning.acceptedReason}`);
    }
  }
  if (warnings.length > WARNING_PREVIEW_LIMIT) {
    console.log(
      `  ... and ${warnings.length - WARNING_PREVIEW_LIMIT} more ${label}`,
    );
  }
}

function formatWarningPreview(warning: WarningRecord): string {
  const location =
    warning.line === null ? warning.path : `${warning.path}:${warning.line}`;
  return `[${warning.level}/${warning.ruleId}] ${location} - ${warning.message}`;
}

function warningsWithoutAcceptedReason(
  warnings: readonly WarningRecord[],
): WarningRecord[] {
  return warnings.filter((warning) => !warning.acceptedReason);
}
