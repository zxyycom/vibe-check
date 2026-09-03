import type { CheckExecutionContext, CheckMessage, CheckResult } from "../../check/check.ts";
import { appendCheckMessages } from "../../check/finding-presentation.ts";
import { reconcileFindingWaivers } from "../../finding-waivers/reconciliation.ts";
import { reportFindingWaiverAudits } from "../code-quality-findings/finding-waiver-evidence.ts";
import { collectProjectFiles } from "../project-files/collection.ts";
import type { SecretDetectionFinalData } from "./final-data.ts";
import {
  prepareSecretDetectionInputs,
  type ApprovedTextInput,
  type SecretCoverageGap
} from "./input-preparation.ts";
import type { ResolvedSecretDetectionOptions } from "./options.ts";
import {
  secretCoverageGapRecordId,
  secretDetectionWaiverAuditRecord,
  secretFindingIdentity,
  secretFindingRecordId,
  type SecretDetectionCoverageGapRecordData,
  type SecretDetectionFindingRecordData
} from "./records.ts";
import { detectSecretlintIssues, type SecretDetectionIssue } from "./secretlint/adapter.ts";
import { validSecretDetectionOptions } from "./options-validation.ts";

export const SECRET_DETECTION_CHECK_DEFINITION = {
  checkId: "secret-detection",
  displayName: "Secret detection"
} as const;

/** `secretDetection` 的 whole-Check unavailable reason；不携带 detector 或 file-system 原始详情。 */
export type SecretDetectionUnavailableReasonCode =
  | "detector-protocol-failed"
  | "detector-unavailable"
  | "execution-cancelled"
  | "invalid-options"
  | "scan-input-unavailable"
  | "source-unavailable";

/** Executes the fixed in-process detector only for this Check's exact explicit input selection. */
export async function executeSecretDetection(
  context: CheckExecutionContext<ResolvedSecretDetectionOptions>
): Promise<CheckResult<SecretDetectionFinalData>> {
  if (!validSecretDetectionOptions(context.options)) return unavailable("invalid-options");
  if (context.signal.aborted) return unavailable("execution-cancelled");

  let selectedPaths: readonly string[];
  try {
    selectedPaths = collectProjectFiles(context.project.root, context.options.files);
  } catch {
    return unavailable("scan-input-unavailable");
  }
  if (context.signal.aborted) return unavailable("execution-cancelled");
  if (selectedPaths.length === 0)
    return settleSecretDetectionFindings(context, selectedPaths.length, [], []);

  const prepared = prepareSecretDetectionInputs(context, selectedPaths);
  if (prepared.kind === "unavailable") return unavailable("source-unavailable");
  if (prepared.kind === "cancelled") return unavailable("execution-cancelled");

  const detected = await detectApprovedInputs(context, prepared.inputs);
  if (detected.kind === "unavailable") return unavailable(detected.code);
  return settleSecretDetectionFindings(
    context,
    selectedPaths.length,
    detected.issues,
    prepared.coverageGaps
  );
}

type DetectedIssues = Readonly<
  | { readonly code: SecretDetectionUnavailableReasonCode; readonly kind: "unavailable" }
  | { readonly issues: readonly SecretDetectionIssue[]; readonly kind: "complete" }
>;

async function detectApprovedInputs(
  context: CheckExecutionContext<ResolvedSecretDetectionOptions>,
  inputs: readonly ApprovedTextInput[]
): Promise<DetectedIssues> {
  const issues: SecretDetectionIssue[] = [];
  for (const input of inputs) {
    if (context.signal.aborted)
      return Object.freeze({ code: "execution-cancelled", kind: "unavailable" });
    const detected = await detectSecretlintIssues(input.content, input.path);
    if (context.signal.aborted)
      return Object.freeze({ code: "execution-cancelled", kind: "unavailable" });
    if (detected.kind === "unavailable") {
      return Object.freeze({ code: "detector-unavailable", kind: "unavailable" });
    }
    if (detected.kind === "protocol-failed") {
      return Object.freeze({ code: "detector-protocol-failed", kind: "unavailable" });
    }
    issues.push(...detected.issues);
  }
  return Object.freeze({ issues: Object.freeze(issues), kind: "complete" });
}

export function settleSecretDetectionFindings(
  context: CheckExecutionContext<ResolvedSecretDetectionOptions>,
  selectedFileCount: number,
  issues: readonly SecretDetectionIssue[],
  coverageGaps: readonly SecretCoverageGap[]
): CheckResult<SecretDetectionFinalData> {
  const reconciliation = reconcileFindingWaivers({
    findings: issues,
    identify: secretFindingIdentity,
    waivers: context.options.findingWaivers
  });
  const waivedFindingCount = reconciliation.findings.filter(
    (finding) => finding.disposition === "waived"
  ).length;
  for (const finding of reconciliation.findings) {
    const identity = secretFindingIdentity(finding.finding);
    const data: SecretDetectionFindingRecordData = Object.freeze({
      blocking: finding.disposition !== "waived",
      kind: "secret-finding",
      location: finding.finding.location,
      ordinal: identity.ordinal,
      path: identity.path,
      ruleId: identity.ruleId,
      structuralClass: identity.structuralClass,
      ...(finding.disposition === "waived"
        ? { waiver: Object.freeze({ reason: finding.waiver.reason }) }
        : {})
    });
    context.records.report({ id: secretFindingRecordId(identity) }, data);
  }
  for (const coverageGap of coverageGaps) {
    const data: SecretDetectionCoverageGapRecordData = Object.freeze({
      blocking: true,
      kind: "coverage-gap",
      path: coverageGap.path,
      reason: coverageGap.reason
    });
    context.records.report({ id: secretCoverageGapRecordId(coverageGap.path) }, data);
  }
  reportFindingWaiverAudits(context, reconciliation, secretDetectionWaiverAuditRecord);

  const data = Object.freeze({
    coverageGapCount: coverageGaps.length,
    findingCount: issues.length,
    scannedFileCount: selectedFileCount - coverageGaps.length,
    selectedFileCount,
    waivedFindingCount
  });
  if (selectedFileCount === 0) {
    return appendCheckMessages(
      Object.freeze({ status: "not-applicable", reason: { code: "no-eligible-input" } }),
      waiverMessages(reconciliation.waiverAudits)
    );
  }
  const actionableFindingCount = issues.length - waivedFindingCount;
  const result: CheckResult<SecretDetectionFinalData> = Object.freeze({
    data,
    status: coverageGaps.length > 0 || actionableFindingCount > 0 ? "failed" : "passed"
  });
  return appendCheckMessages(
    appendCheckMessages(result, findingMessages(actionableFindingCount, coverageGaps.length)),
    waiverMessages(reconciliation.waiverAudits)
  );
}

function findingMessages(
  actionableFindingCount: number,
  coverageGapCount: number
): readonly CheckMessage[] {
  const messages: CheckMessage[] = [];
  if (actionableFindingCount > 0) {
    messages.push(
      Object.freeze({
        code: "secret-findings",
        level: "error",
        message: `${actionableFindingCount} high-confidence secret finding(s) require attention; inspect this Check's safe Records, remove the material, or author an exact finding waiver.`
      })
    );
  }
  if (coverageGapCount > 0) {
    messages.push(
      Object.freeze({
        code: "incomplete-coverage",
        level: "error",
        message: `${coverageGapCount} selected input(s) could not receive bounded secret detection coverage; narrow files or increase this Check's explicit resource limits.`
      })
    );
  }
  return Object.freeze(messages);
}

function waiverMessages(
  audits: readonly Readonly<{
    readonly matchCount: number;
    readonly status: "applied" | "overmatched" | "unused";
    readonly waiver: Readonly<{ readonly reason: string }>;
  }>[]
): readonly CheckMessage[] {
  const messages: CheckMessage[] = [];
  for (const audit of audits) {
    if (audit.status === "applied") {
      messages.push(
        Object.freeze({
          code: "finding-waived",
          level: "info",
          message: `A secret finding was waived: ${audit.waiver.reason}`
        })
      );
      continue;
    }
    messages.push(
      Object.freeze({
        code: audit.status === "unused" ? "unused-finding-waiver" : "overmatched-finding-waiver",
        level: "warning",
        message:
          audit.status === "unused"
            ? `A configured secret finding waiver matched no finding; remove or update it. Reason: ${audit.waiver.reason}`
            : `A configured secret finding waiver matched ${audit.matchCount} findings and was not applied; narrow it. Reason: ${audit.waiver.reason}`
      })
    );
  }
  return Object.freeze(messages);
}

function unavailable(
  code: SecretDetectionUnavailableReasonCode
): CheckResult<SecretDetectionFinalData> {
  return Object.freeze({
    messages: Object.freeze([
      Object.freeze({ code, level: "error" as const, message: unavailableMessage(code) })
    ]),
    reason: { code },
    status: "unavailable"
  });
}

function unavailableMessage(code: SecretDetectionUnavailableReasonCode): string {
  switch (code) {
    case "invalid-options":
      return "secretDetection options are invalid; recreate the Check with its documented explicit files policy.";
    case "scan-input-unavailable":
      return "Secret detection could not collect its configured project files; check the project root, permissions, and selected file source.";
    case "source-unavailable":
      return "A selected secret detection input could not be read safely; check that it still exists, is readable, and was not replaced during the Run.";
    case "detector-unavailable":
      return "The private secret detector did not complete; retry after restoring the package runtime without treating this Run as clean.";
    case "detector-protocol-failed":
      return "The private secret detector returned an unsupported result shape; update the package dependency only with a reviewed adapter change.";
    case "execution-cancelled":
      return "Secret detection was cancelled before it could form a complete result; inspect the caller's cancellation reason and retry if appropriate.";
  }
}
