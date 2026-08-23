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
  inherit
} from "../../src/product/definition/project.ts";
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
  ProjectEffects,
  ProjectDefinition,
  ProjectQualityConfiguration,
  RunControls,
  SchedulerPolicy
} from "../../src/product/definition/project.ts";
export { run } from "../../src/product/run/index.ts";
export type { RunResult } from "../../src/product/run/result.ts";
