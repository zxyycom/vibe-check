/**
 * The single definition-facing owner for values that a project imports or
 * observes before invoking Package Run. This is deliberately package-private:
 * Product modules consume these literals directly rather than maintaining a
 * second list of public names and defaults.
 */
export const CURRENT_PUBLIC_CONTRACT = Object.freeze({
  packageImport: "vibe-check",
  operations: Object.freeze({
    defineCheck: "defineCheck",
    defineConfig: "defineConfig",
    inherit: "inherit",
    run: "run"
  }),
  values: Object.freeze({
    duplicateDetection: "duplicateDetection",
    fileMetrics: "fileMetrics",
    functionMetrics: "functionMetrics"
  }),
  types: Object.freeze({
    check: "Check",
    checkAggregate: "CheckAggregate",
    checkAggregation: "CheckAggregation",
    checkExecution: "CheckExecution",
    checkExecutionContext: "CheckExecutionContext",
    checkOutcome: "CheckOutcome",
    checkResult: "CheckResult",
    checkUnavailableReason: "CheckUnavailableReason",
    duplicateDetectionOptions: "DuplicateDetectionOptions",
    fileMetricsOptions: "FileMetricsOptions",
    functionMetricsOptions: "FunctionMetricsOptions",
    inheritableCheckCollection: "InheritableCheckCollection",
    projectEffects: "ProjectEffects",
    projectDefinition: "ProjectDefinition",
    projectQualityConfiguration: "ProjectQualityConfiguration",
    runControls: "RunControls",
    runResult: "RunResult",
    schedulerPolicy: "SchedulerPolicy"
  }),
  effectDefaults: Object.freeze({
    cache: Object.freeze({
      directory: ".cache/vibe-check",
      enabled: true
    }),
    output: Object.freeze({
      directory: "artifacts/vibe-check",
      enabled: true
    }),
    progress: Object.freeze({ enabled: true })
  })
} as const);
