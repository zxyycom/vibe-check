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
