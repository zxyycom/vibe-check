export interface PackageCheckGuide {
  readonly checkId: string;
  readonly exportName: string;
  readonly sourcePath: string;
}

/** Every package-provided ordinary Check has exactly one hand-written package guide. */
export const PACKAGE_CHECK_GUIDES = Object.freeze([
  Object.freeze({
    checkId: "duplicate-detection",
    exportName: "duplicateDetection",
    sourcePath: "docs/checks/duplicate-detection.md"
  }),
  Object.freeze({
    checkId: "file-metrics",
    exportName: "fileMetrics",
    sourcePath: "docs/checks/file-metrics.md"
  }),
  Object.freeze({
    checkId: "function-metrics",
    exportName: "functionMetrics",
    sourcePath: "docs/checks/function-metrics.md"
  }),
  Object.freeze({
    checkId: "json-validation",
    exportName: "jsonValidation",
    sourcePath: "docs/checks/json-validation.md"
  }),
  Object.freeze({
    checkId: "json-schema-validation",
    exportName: "jsonSchemaValidation",
    sourcePath: "docs/checks/json-schema-validation.md"
  }),
  Object.freeze({
    checkId: "markdown-link-validation",
    exportName: "markdownLinkValidation",
    sourcePath: "docs/checks/markdown-link-validation.md"
  }),
  Object.freeze({
    checkId: "maintenance-reminders",
    exportName: "maintenanceReminders",
    sourcePath: "docs/checks/maintenance-reminders.md"
  }),
  Object.freeze({
    checkId: "secret-detection",
    exportName: "secretDetection",
    sourcePath: "docs/checks/secret-detection.md"
  })
] satisfies readonly PackageCheckGuide[]);
