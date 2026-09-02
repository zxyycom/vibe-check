/**
 * Vibe Check 是由项目在 Bun runtime 中调用的 TypeScript API，用于定义并执行项目质量 Check。
 * 所有公开能力从 package root 导入；package `README.md` 说明 consumer authoring、结果读取和分发范围。
 *
 * @packageDocumentation
 */
export { cacheJsonByKey } from "./cache/cache-json-by-key.ts";
export type { CacheJsonByKeyOptions, CacheJsonByKeyResult } from "./cache/cache-json-by-key.ts";
export { duplicateDetection } from "./package-checks/duplicate-detection/default-check.ts";
export { parseDuplicateDetectionData } from "./package-checks/duplicate-detection/final-data.ts";
export type { DuplicateDetectionFinalData } from "./package-checks/duplicate-detection/final-data.ts";
export type {
  DuplicateDetectionOptions,
  ResolvedDuplicateDetectionOptions
} from "./package-checks/duplicate-detection/options.ts";
export type { DuplicateDetectionUnavailableReasonCode } from "./package-checks/duplicate-detection/execution.ts";
export type { DuplicateDetectionRecordData } from "./package-checks/duplicate-detection/records.ts";
export { fileMetrics } from "./package-checks/file-metrics/constructor.ts";
export { parseFileMetricsData } from "./package-checks/file-metrics/final-data.ts";
export type { FileMetricsFinalData } from "./package-checks/file-metrics/final-data.ts";
export type {
  FileMetricsFindingIdentity,
  FileMetricsFindingWaiver,
  FileMetricsOptions,
  ResolvedFileMetricsOptions
} from "./package-checks/file-metrics/options.ts";
export type { FileMetricsUnavailableReasonCode } from "./package-checks/file-metrics/execution.ts";
export type { FileMetricsRecordData } from "./package-checks/file-metrics/records.ts";
export { functionMetrics } from "./package-checks/function-metrics/constructor.ts";
export { parseFunctionMetricsData } from "./package-checks/function-metrics/final-data.ts";
export type { FunctionMetricsFinalData } from "./package-checks/function-metrics/final-data.ts";
export type {
  FunctionMetricsOptions,
  ResolvedFunctionMetricsOptions
} from "./package-checks/function-metrics/options.ts";
export type { FunctionMetricsUnavailableReasonCode } from "./package-checks/function-metrics/execution.ts";
export type { FunctionMetricsRecordData } from "./package-checks/function-metrics/records.ts";
export { jsonSchemaValidation } from "./package-checks/json-schema-validation/default-check.ts";
export { parseJsonSchemaValidationData } from "./package-checks/json-schema-validation/final-data.ts";
export type { JsonSchemaValidationFinalData } from "./package-checks/json-schema-validation/final-data.ts";
export type {
  JsonSchemaValidationOptions,
  ResolvedJsonSchemaValidationOptions
} from "./package-checks/json-schema-validation/options.ts";
export type {
  JsonSchemaDocumentReason,
  JsonSchemaValidationRecordData,
  JsonSchemaValidationRecordReason,
  JsonSchemaValidationUnavailableCode
} from "./package-checks/json-schema-validation/json-schema-validation.ts";
export { jsonValidation } from "./package-checks/json-validation/default-check.ts";
export { parseJsonValidationData } from "./package-checks/json-validation/final-data.ts";
export type { JsonValidationFinalData } from "./package-checks/json-validation/final-data.ts";
export type {
  JsonValidationOptions,
  ResolvedJsonValidationOptions
} from "./package-checks/json-validation/options.ts";
export type {
  JsonValidationRecordData,
  JsonValidationRecordReason,
  JsonValidationUnavailableCode
} from "./package-checks/json-validation/json-validation.ts";
export { maintenanceReminders } from "./package-checks/maintenance-reminders/maintenance-reminders.ts";
export type {
  MaintenanceReminder,
  MaintenanceReminderOptions,
  MaintenanceRemindersUnavailableCode
} from "./package-checks/maintenance-reminders/maintenance-reminders.ts";
export { parseMaintenanceRemindersData } from "./package-checks/maintenance-reminders/final-data.ts";
export type {
  MaintenanceReminderAssessment,
  MaintenanceReminderUnavailableReason,
  MaintenanceRemindersFinalData
} from "./package-checks/maintenance-reminders/final-data.ts";
export { markdownLinkValidation } from "./package-checks/markdown-link-validation/default-check.ts";
export { parseMarkdownLinkValidationData } from "./package-checks/markdown-link-validation/final-data.ts";
export type { MarkdownLinkValidationFinalData } from "./package-checks/markdown-link-validation/final-data.ts";
export type {
  MarkdownLinkValidationOptions,
  ResolvedMarkdownLinkValidationOptions
} from "./package-checks/markdown-link-validation/options.ts";
export type { MarkdownLinkValidationUnavailableReason } from "./package-checks/markdown-link-validation/execution.ts";
export type { MarkdownLinkValidationRecordData } from "./package-checks/markdown-link-validation/records.ts";
export type { MarkdownLinkFindingReason } from "./package-checks/markdown-link-validation/local-resolver.ts";
export type { FindingPolicy } from "./package-checks/code-quality-findings/policy.ts";
export { reconcileFindingWaivers } from "./finding-waivers/reconciliation.ts";
export { presentCheckFindings } from "./check/finding-presentation.ts";
export type {
  FindingWaiver,
  FindingWaiverAudit,
  FindingWaiverReconciliation,
  MaterializedFindingWaiver,
  ReconciledFinding,
  ReconcileFindingWaiversOptions
} from "./finding-waivers/reconciliation.ts";
export { defaultProjectFileSelection } from "./package-checks/project-files/configuration.ts";
export type {
  ProjectFileSelection,
  ProjectFileSelectionOptions,
  ProjectFileSource
} from "./package-checks/project-files/configuration.ts";
export { defineCheck, inherit } from "./check/check.ts";
export type {
  Check,
  CheckExecution,
  CheckExecutionContext,
  CheckPreflight,
  CheckPreflightResult,
  CheckOutcome,
  CheckResult,
  CheckUnavailableReason,
  InheritableCheckCollection
} from "./check/check.ts";
export { defineAdmissionPolicy, defineConfig } from "./project-definition/project-definition.ts";
export type {
  AdmissionPolicy,
  AdmissionPolicyContext,
  AdmissionPolicyMeasurement,
  AdmissionProposal,
  ProjectOutputs,
  ProjectDefinition,
  SchedulerDecisionMeasurementCumulative,
  SchedulerGraphSnapshot,
  SchedulerMeasurementContext,
  SchedulerMeasurementHook,
  SchedulerMeasurementIntervalContribution,
  SchedulerMeasurementActionObservationInterval,
  SchedulerMeasurementActionObservation,
  SchedulerMeasurementEffect,
  SchedulerRawMeasurement,
  SchedulerPolicy
} from "./project-definition/project-definition.ts";
export type {
  CheckAggregate,
  CheckAggregation,
  RunControls
} from "./project-run/controls/contract.ts";
export { run } from "./project-run/run.ts";
export type { RunResult } from "./project-run/result.ts";
