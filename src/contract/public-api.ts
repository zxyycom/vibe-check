/** Package-private inventory of the approved public package roots. */
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
    functionMetrics: "functionMetrics",
    jsonValidation: "jsonValidation"
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
    jsonValidationOptions: "JsonValidationOptions",
    projectEffects: "ProjectEffects",
    projectDefinition: "ProjectDefinition",
    projectQualityConfiguration: "ProjectQualityConfiguration",
    runControls: "RunControls",
    runResult: "RunResult",
    schedulerPolicy: "SchedulerPolicy"
  })
} as const);
