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
  CheckExecution,
  CheckExecutionContext,
  CheckOutcome,
  CheckResult,
  CheckUnavailableReason,
  DecisionPolicy,
  DuplicateDetectionOptions,
  FileMetricsOptions,
  FunctionMetricsOptions,
  InheritableCheckCollection,
  ProjectEffects,
  ProjectDefinition,
  ProjectQualityConfiguration,
  QualityRecordCandidate,
  RecordTypeDefinition,
  RunControls,
  SchedulerPolicy
} from "../../src/product/definition/project.ts";
export { run } from "../../src/product/run/index.ts";
export type { RunResult } from "../../src/product/run/result.ts";
