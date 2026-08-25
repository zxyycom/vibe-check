/**
 * Vibe Check 是由项目在 Bun runtime 中显式调用的 TypeScript API，用于定义并执行项目质量 Check。
 * 使用 package `README.md` 了解当前可用性和 consumer authoring 路径；本 package 不提供 public CLI、
 * Node.js host、plugin API 或 subpath exports。
 *
 * @packageDocumentation
 */
export {
  defineCheck,
  defineConfig,
  duplicateDetection,
  fileMetrics,
  functionMetrics,
  inherit,
  jsonSchemaValidation,
  jsonValidation
} from "./definition/project-definition.ts";
export type {
  Check,
  CheckAggregate,
  CheckAggregation,
  CheckExecution,
  CheckExecutionContext,
  CheckOutcome,
  CheckResult,
  CheckUnavailableReason,
  DuplicateDetectionOptions,
  FileMetricsOptions,
  FunctionMetricsOptions,
  InheritableCheckCollection,
  JsonSchemaValidationOptions,
  JsonValidationOptions,
  ProjectEffects,
  ProjectDefinition,
  ProjectQualityConfiguration,
  RunControls,
  SchedulerPolicy
} from "./definition/project-definition.ts";
export { run } from "./run/run.ts";
export type { RunResult } from "./run/run-result.ts";
