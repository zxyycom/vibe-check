export interface PackageCheckGuide {
  readonly checkId: string;
  readonly constructorName: string;
  readonly sourcePath: string;
}

/** Every package-provided ordinary Check has exactly one hand-written package guide. */
export const PACKAGE_CHECK_GUIDES = Object.freeze([
  Object.freeze({
    checkId: "duplicate-detection",
    constructorName: "duplicateDetection",
    sourcePath: "docs/checks/duplicate-detection.md"
  }),
  Object.freeze({
    checkId: "file-metrics",
    constructorName: "fileMetrics",
    sourcePath: "docs/checks/file-metrics.md"
  }),
  Object.freeze({
    checkId: "function-metrics",
    constructorName: "functionMetrics",
    sourcePath: "docs/checks/function-metrics.md"
  }),
  Object.freeze({
    checkId: "json-validation",
    constructorName: "jsonValidation",
    sourcePath: "docs/checks/json-validation.md"
  }),
  Object.freeze({
    checkId: "json-schema-validation",
    constructorName: "jsonSchemaValidation",
    sourcePath: "docs/checks/json-schema-validation.md"
  }),
  Object.freeze({
    checkId: "markdown-link-validation",
    constructorName: "markdownLinkValidation",
    sourcePath: "docs/checks/markdown-link-validation.md"
  }),
  Object.freeze({
    checkId: "maintenance-reminders",
    constructorName: "maintenanceReminders",
    sourcePath: "docs/checks/maintenance-reminders.md"
  })
] satisfies readonly PackageCheckGuide[]);

export const PACKAGE_CHECK_GUIDE_INDEX_PATH = "docs/checks/index.md";
