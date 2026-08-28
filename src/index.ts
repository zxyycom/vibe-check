/**
 * Vibe Check 是由项目在 Bun runtime 中调用的 TypeScript API，用于定义并执行项目质量 Check。
 * 所有公开能力从 package root 导入；package `README.md` 说明 consumer authoring、结果读取和分发范围。
 *
 * @packageDocumentation
 */
export { duplicateDetection } from "./package-checks/duplicate-detection/default-check.ts";
export type { DuplicateDetectionOptions } from "./package-checks/duplicate-detection/options.ts";
export { fileMetrics } from "./package-checks/file-metrics/constructor.ts";
export type { FileMetricsOptions } from "./package-checks/file-metrics/options.ts";
export { functionMetrics } from "./package-checks/function-metrics/default-check.ts";
export type { FunctionMetricsOptions } from "./package-checks/function-metrics/options.ts";
export { jsonSchemaValidation } from "./package-checks/json-schema-validation/default-check.ts";
export type { JsonSchemaValidationOptions } from "./package-checks/json-schema-validation/options.ts";
export { jsonValidation } from "./package-checks/json-validation/default-check.ts";
export type { JsonValidationOptions } from "./package-checks/json-validation/options.ts";
export { maintenanceReminders } from "./package-checks/maintenance-reminders/maintenance-reminders.ts";
export type {
  MaintenanceReminder,
  MaintenanceReminderOptions
} from "./package-checks/maintenance-reminders/maintenance-reminders.ts";
export { markdownLinkValidation } from "./package-checks/markdown-link-validation/default-check.ts";
export type { MarkdownLinkValidationOptions } from "./package-checks/markdown-link-validation/options.ts";
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
export { defineConfig } from "./project-definition/project-definition.ts";
export type {
  ProjectOutputs,
  ProjectDefinition,
  SchedulerPolicy
} from "./project-definition/project-definition.ts";
export type {
  CheckAggregate,
  CheckAggregation,
  RunControls
} from "./project-run/controls/contract.ts";
export { run } from "./project-run/run.ts";
export type { RunResult } from "./project-run/result.ts";
