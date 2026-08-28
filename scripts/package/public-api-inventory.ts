/** Package-private inventory of the approved public package roots. */
export const CURRENT_PUBLIC_CONTRACT = Object.freeze({
  packageImport: "vibe-check",
  operations: Object.freeze({
    defineCheck: "defineCheck",
    defineConfig: "defineConfig",
    duplicateDetection: "duplicateDetection",
    fileMetrics: "fileMetrics",
    functionMetrics: "functionMetrics",
    inherit: "inherit",
    maintenanceReminders: "maintenanceReminders",
    run: "run"
  }),
  values: Object.freeze({
    jsonSchemaValidation: "jsonSchemaValidation",
    jsonValidation: "jsonValidation",
    markdownLinkValidation: "markdownLinkValidation"
  }),
  types: Object.freeze({
    check: "Check",
    checkAggregate: "CheckAggregate",
    checkAggregation: "CheckAggregation",
    checkExecution: "CheckExecution",
    checkExecutionContext: "CheckExecutionContext",
    checkPreflight: "CheckPreflight",
    checkPreflightResult: "CheckPreflightResult",
    checkOutcome: "CheckOutcome",
    checkResult: "CheckResult",
    checkUnavailableReason: "CheckUnavailableReason",
    duplicateDetectionOptions: "DuplicateDetectionOptions",
    fileMetricsOptions: "FileMetricsOptions",
    functionMetricsOptions: "FunctionMetricsOptions",
    maintenanceReminder: "MaintenanceReminder",
    maintenanceReminderOptions: "MaintenanceReminderOptions",
    markdownLinkValidationOptions: "MarkdownLinkValidationOptions",
    inheritableCheckCollection: "InheritableCheckCollection",
    jsonSchemaValidationOptions: "JsonSchemaValidationOptions",
    jsonValidationOptions: "JsonValidationOptions",
    projectOutputs: "ProjectOutputs",
    projectDefinition: "ProjectDefinition",
    runControls: "RunControls",
    runResult: "RunResult",
    schedulerPolicy: "SchedulerPolicy"
  })
} as const);
