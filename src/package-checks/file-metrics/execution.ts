import type {
  DeepReadonly,
  CheckExecutionContext,
  CheckMessage,
  CheckResult
} from "../../check/check.ts";
import {
  createProjectFileRegionIndex,
  type ProjectFileRegionIndex
} from "../../data-boundary/project-file-region-index.ts";
import {
  reconcileFindingWaivers,
  type FindingWaiverReconciliation
} from "../../package-tools/finding-waivers/reconciliation.ts";
import { collectProjectFileSets, requireProjectFileSet } from "../project-files/collection.ts";
import { settleFindings } from "../code-quality-findings/policy.ts";
import {
  reportFindingWaiverAudits,
  reportReconciledCodeQualityFindingRecords
} from "../code-quality-findings/finding-waiver-evidence.ts";
import { appendCheckMessages } from "../../package-tools/finding-presentation/finding-presentation.ts";
import { fileMetricFindingMessages } from "./finding-messages.ts";
import { measureFileMetrics, type FileMeasurementResult } from "./measurement.ts";
import type { FileMetricsExactInputSet } from "./measurement-model.ts";
import type {
  FileMetricsFindingWaiver,
  ResolvedFileMetricsCodeAreaOptions,
  ResolvedFileMetricsOptions
} from "./options.ts";
import { isValidResolvedFileMetricsOptions } from "./options-validation.ts";
import {
  buildFileRecordCandidates,
  fileMetricsWaiverAuditRecord,
  fileMetricsWaiverIdentity,
  type FileRecordCandidate
} from "./records.ts";
import type { FileMetricsFinalData } from "./final-data.ts";

export const FILE_METRICS_CHECK_DEFINITION = {
  checkId: "file-metrics",
  displayName: "File metrics"
} as const;

/** `file-metrics` whole-Check unavailable outcome 的稳定 reason code。 */
export type FileMetricsUnavailableReasonCode =
  | "external-dependency-unavailable"
  | "external-execution-failed"
  | "external-result-invalid"
  | "invalid-options"
  | "source-unavailable";

interface CollectedFileMetricsScope extends FileMetricsExactInputSet {
  readonly membership: ProjectFileRegionIndex;
}

/** 使用 resolved area policy 和 scanner selection 执行一次完整的 file-metrics measurement。 */
export async function executeFileMetrics(
  options: DeepReadonly<ResolvedFileMetricsOptions>,
  context: Pick<CheckExecutionContext, "project" | "records">
): Promise<CheckResult<FileMetricsFinalData>> {
  if (!isValidResolvedFileMetricsOptions(options)) return unavailable("invalid-options");

  let collectedScope: CollectedFileMetricsScope;
  try {
    collectedScope = collectAreaScope(context.project.root, options.codeAreas);
  } catch {
    return unavailable("source-unavailable");
  }
  if (collectedScope.approvedExactPaths.length === 0) {
    return noEligibleInputResult(options, context);
  }
  const measurement = await measureFileMetrics(collectedScope, options.scanner);
  if (measurement.kind !== "complete") return measurementFailureResult(measurement);
  const candidates = buildFileRecordCandidates(measurement.metrics, {
    membership: collectedScope.membership,
    codeAreas: options.codeAreas
  });
  if (candidates === undefined) return unavailable("external-result-invalid");
  const reconciliation = reconcileFileMetricWaivers(candidates, options.findingWaivers);
  reportReconciledCodeQualityFindingRecords(context, reconciliation);
  reportWaiverAuditRecords(options, context, reconciliation);
  const settlement = settleFindings(
    reconciliation.findings.map(({ disposition, finding }) => ({
      actionable: disposition !== "waived",
      blocking: finding.data.blocking
    }))
  );
  const actionableFindings = reconciliation.findings
    .filter(({ disposition }) => disposition !== "waived")
    .map(({ finding }) => finding);
  return appendWaiverMessages(
    appendCheckMessages(settlement, fileMetricFindingMessages(actionableFindings)),
    reconciliation
  );
}

function noEligibleInputResult(
  options: DeepReadonly<ResolvedFileMetricsOptions>,
  context: Pick<CheckExecutionContext, "project" | "records">
): CheckResult<FileMetricsFinalData> {
  const reconciliation = reconcileFileMetricWaivers([], options.findingWaivers);
  reportWaiverAuditRecords(options, context, reconciliation);
  return appendWaiverMessages(
    Object.freeze({ status: "not-applicable", reason: { code: "no-eligible-input" } }),
    reconciliation
  );
}

function reconcileFileMetricWaivers(
  candidates: readonly FileRecordCandidate[],
  waivers: readonly FileMetricsFindingWaiver[]
): FindingWaiverReconciliation<FileRecordCandidate> {
  return reconcileFindingWaivers({
    findings: candidates,
    identify: ({ data }) => ({ metric: data.metric, path: data.path }),
    waivers
  });
}

function reportWaiverAuditRecords(
  options: DeepReadonly<ResolvedFileMetricsOptions>,
  context: Pick<CheckExecutionContext, "project" | "records">,
  reconciliation: FindingWaiverReconciliation<FileRecordCandidate>
): void {
  reportFindingWaiverAudits(context, reconciliation, fileMetricsWaiverAuditRecord);
}

function appendWaiverMessages(
  settlement: CheckResult<FileMetricsFinalData>,
  reconciliation: FindingWaiverReconciliation<FileRecordCandidate>
): CheckResult<FileMetricsFinalData> {
  const waiverMessages: CheckMessage[] = [];
  for (const audit of reconciliation.waiverAudits) {
    const identity = fileMetricsWaiverIdentity(audit.waiver);
    switch (audit.status) {
      case "applied":
        waiverMessages.push(
          Object.freeze({
            code: "finding-waived",
            level: "info",
            message: `File metric finding for ${identity.path} was waived: ${audit.waiver.reason}`
          })
        );
        break;
      case "unused":
        waiverMessages.push(
          Object.freeze({
            code: "unused-finding-waiver",
            level: "warning",
            message: `Configured file-metrics finding waiver for ${identity.path} matched no finding; remove it or update its identity. Reason: ${audit.waiver.reason}`
          })
        );
        break;
      case "overmatched":
        waiverMessages.push(
          Object.freeze({
            code: "overmatched-finding-waiver",
            level: "warning",
            message: `Configured file-metrics finding waiver for ${identity.path} matched ${audit.matchCount} findings and was not applied; narrow its identity. Reason: ${audit.waiver.reason}`
          })
        );
        break;
    }
  }
  if (waiverMessages.length === 0) return settlement;
  return Object.freeze({
    ...settlement,
    messages: Object.freeze([...(settlement.messages ?? []), ...waiverMessages])
  });
}

function collectAreaScope(
  rootDir: string,
  codeAreas: Readonly<Record<string, ResolvedFileMetricsCodeAreaOptions>>
): CollectedFileMetricsScope {
  const filesByArea = collectProjectFileSets(
    rootDir,
    Object.fromEntries(Object.entries(codeAreas).map(([areaId, area]) => [areaId, area.files]))
  );
  const membership = createProjectFileRegionIndex({
    regionSources: [
      Object.keys(codeAreas).map((id) => ({
        files: requireProjectFileSet(filesByArea, id),
        id,
        kind: "members"
      }))
    ]
  });
  return Object.freeze({
    approvedExactPaths: membership.filePaths,
    membership,
    rootDir
  });
}

function measurementFailureResult(
  measurement: Exclude<FileMeasurementResult, { kind: "complete" }>
): CheckResult<FileMetricsFinalData> {
  switch (measurement.kind) {
    case "execution-failed":
      return unavailable("external-execution-failed");
    case "invalid-result":
      return unavailable("external-result-invalid");
    case "unavailable":
      return unavailable("external-dependency-unavailable");
  }
}

function unavailable(code: FileMetricsUnavailableReasonCode): CheckResult<FileMetricsFinalData> {
  return Object.freeze({
    status: "unavailable",
    reason: { code },
    messages: Object.freeze([
      Object.freeze({ code, level: "error" as const, message: unavailableMessage(code) })
    ])
  });
}

function unavailableMessage(code: FileMetricsUnavailableReasonCode): string {
  switch (code) {
    case "invalid-options":
      return "fileMetrics options are invalid; recreate the Check with fileMetrics(options) or restore its complete resolved options.";
    case "source-unavailable":
      return "File metrics could not collect its configured project files; check the project root, file permissions, and selected file source.";
    case "external-dependency-unavailable":
      return "The configured SCC command is unavailable or incompatible; install SCC 4.0.0 or configure a compatible executable.";
    case "external-execution-failed":
      return "SCC did not complete successfully; run the configured command directly and inspect its environment.";
    case "external-result-invalid":
      return "SCC output could not form a trusted complete result; check the executable version and CSV compatibility.";
  }
}
