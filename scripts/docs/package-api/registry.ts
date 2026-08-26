export type PackageApiExampleEvidence = "runtime" | "typecheck";

export type PackageApiExampleTarget =
  | Readonly<{ readonly kind: "readme"; readonly placeholderId: string }>
  | Readonly<{
      readonly declarationName: string;
      readonly kind: "jsdoc";
      readonly sourcePath: string;
    }>;

export interface PackageApiExampleProjection {
  readonly evidence: PackageApiExampleEvidence;
  readonly id: string;
  readonly regionId?: string;
  readonly sourcePath: string;
  readonly targets: readonly PackageApiExampleTarget[];
  readonly title: string;
}

export const PACKAGE_API_EXAMPLE_PROJECTIONS = Object.freeze([
  Object.freeze({
    evidence: "runtime",
    id: "quick-start",
    regionId: "quick-start",
    sourcePath: "docs/examples/package-api/quick-start.ts",
    targets: Object.freeze([Object.freeze({ kind: "readme", placeholderId: "quick-start" })]),
    title: "最小 Project Definition 与 Run"
  }),
  Object.freeze({
    evidence: "runtime",
    id: "markdown-link-validation",
    regionId: "markdown-link-validation",
    sourcePath: "docs/examples/package-api/markdown-link-validation.ts",
    targets: Object.freeze([
      Object.freeze({ kind: "readme", placeholderId: "markdown-link-validation" })
    ]),
    title: "离线 Markdown 本地链接完整性"
  }),
  Object.freeze({
    evidence: "runtime",
    id: "custom-check-definition",
    regionId: "custom-check-definition",
    sourcePath: "docs/examples/package-api/custom-check.ts",
    targets: Object.freeze([
      Object.freeze({
        declarationName: "defineCheck",
        kind: "jsdoc",
        sourcePath: "src/definition/custom-check.ts"
      })
    ]),
    title: "定义带 options、Records 与 messages 的自定义 Check"
  }),
  Object.freeze({
    evidence: "runtime",
    id: "custom-check-run",
    regionId: "custom-check-run",
    sourcePath: "docs/examples/package-api/custom-check.ts",
    targets: Object.freeze([Object.freeze({ kind: "readme", placeholderId: "custom-check" })]),
    title: "运行自定义 Check"
  }),
  Object.freeze({
    evidence: "runtime",
    id: "maintenance-reminders",
    regionId: "maintenance-reminders",
    sourcePath: "docs/examples/package-api/maintenance-reminders.ts",
    targets: Object.freeze([
      Object.freeze({ kind: "readme", placeholderId: "maintenance-reminders" }),
      Object.freeze({
        declarationName: "maintenanceReminders",
        kind: "jsdoc",
        sourcePath: "src/checks/maintenance-reminders/maintenance-reminders.ts"
      })
    ]),
    title: "创建一个单一 Check 的维护提醒"
  }),
  Object.freeze({
    evidence: "runtime",
    id: "typed-dependency",
    regionId: "typed-dependency",
    sourcePath: "docs/examples/package-api/typed-dependency.ts",
    targets: Object.freeze([Object.freeze({ kind: "readme", placeholderId: "typed-dependency" })]),
    title: "读取 typed dependency final data"
  })
] satisfies readonly PackageApiExampleProjection[]);

export interface PackageCheckGuide {
  readonly checkId: string;
  readonly constructorName: string;
  readonly sourcePath: string;
}

/** Every public builtin/constructor has exactly one hand-written package guide. */
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
