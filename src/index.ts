/**
 * Vibe Check 是由项目在 Bun runtime 中显式调用的 TypeScript API，用于定义并执行项目质量 Check。
 * 使用 package `README.md` 了解当前可用性和 consumer authoring 路径；本 package 不提供 public CLI、
 * Node.js host、plugin API 或 subpath exports。
 *
 * @packageDocumentation
 */
export { duplicateDetection } from "./checks/duplicate-detection/default-check.ts";
export type { DuplicateDetectionOptions } from "./checks/duplicate-detection/options.ts";
export { fileMetrics } from "./checks/file-metrics/default-check.ts";
export type { FileMetricsOptions } from "./checks/file-metrics/options.ts";
export { functionMetrics } from "./checks/function-metrics/default-check.ts";
export type { FunctionMetricsOptions } from "./checks/function-metrics/options.ts";
export { jsonSchemaValidation } from "./checks/json-schema-validation/default-check.ts";
export type { JsonSchemaValidationOptions } from "./checks/json-schema-validation/options.ts";
export { jsonValidation } from "./checks/json-validation/default-check.ts";
export type { JsonValidationOptions } from "./checks/json-validation/options.ts";
export { maintenanceReminders } from "./checks/maintenance-reminders/maintenance-reminders.ts";
export type {
  MaintenanceReminder,
  MaintenanceReminderOptions
} from "./checks/maintenance-reminders/maintenance-reminders.ts";
export { markdownLinkValidation } from "./checks/markdown-link-validation/default-check.ts";
export type { MarkdownLinkValidationOptions } from "./checks/markdown-link-validation/options.ts";
export { defineCheck, defineConfig, inherit } from "./definition/project-definition.ts";
export type {
  Check,
  CheckAggregate,
  CheckAggregation,
  CheckExecution,
  CheckExecutionContext,
  CheckPreflight,
  CheckPreflightResult,
  CheckOutcome,
  CheckResult,
  CheckUnavailableReason,
  InheritableCheckCollection,
  ProjectEffects,
  ProjectDefinition,
  RunControls,
  SchedulerPolicy
} from "./definition/project-definition.ts";
export { run } from "./run/run.ts";
export type { RunResult } from "./run/run-result.ts";
