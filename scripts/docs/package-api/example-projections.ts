export type PackageApiExampleEvidence = "runtime" | "typecheck";

export interface PackageApiMarkdownDocument {
  readonly id: string;
  readonly outputPath: string;
  readonly templatePath: string;
}

export type PackageApiExampleTarget =
  | Readonly<{
      readonly documentId: string;
      readonly kind: "markdown";
      readonly placeholderId: string;
    }>
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

/** The README plus the only allowed deeper package API guide. */
export const PACKAGE_API_MARKDOWN_DOCUMENTS = Object.freeze([
  Object.freeze({
    id: "readme",
    outputPath: "README.md",
    templatePath: "docs/package-readme.template.md"
  }),
  Object.freeze({
    id: "api-mechanics",
    outputPath: "docs/api-mechanics.md",
    templatePath: "docs/api-mechanics.template.md"
  })
] satisfies readonly PackageApiMarkdownDocument[]);

export const PACKAGE_API_EXAMPLE_PROJECTIONS = Object.freeze([
  Object.freeze({
    evidence: "runtime",
    id: "quick-start",
    regionId: "quick-start",
    sourcePath: "docs/examples/package-api/quick-start.ts",
    targets: Object.freeze([
      Object.freeze({
        documentId: "readme",
        kind: "markdown",
        placeholderId: "quick-start"
      })
    ]),
    title: "最小 Project Definition 与 Run"
  }),
  Object.freeze({
    evidence: "runtime",
    id: "markdown-link-validation",
    regionId: "markdown-link-validation",
    sourcePath: "docs/examples/package-api/markdown-link-validation.ts",
    targets: Object.freeze([
      Object.freeze({
        declarationName: "markdownLinkValidation",
        kind: "jsdoc",
        sourcePath: "src/package-checks/markdown-link-validation/default-check.ts"
      })
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
        sourcePath: "src/check/check.ts"
      })
    ]),
    title: "定义带 options、Records 与 messages 的自定义 Check"
  }),
  Object.freeze({
    evidence: "runtime",
    id: "custom-check-run",
    regionId: "custom-check-run",
    sourcePath: "docs/examples/package-api/custom-check.ts",
    targets: Object.freeze([
      Object.freeze({
        documentId: "api-mechanics",
        kind: "markdown",
        placeholderId: "custom-check"
      })
    ]),
    title: "运行自定义 Check"
  }),
  Object.freeze({
    evidence: "runtime",
    id: "maintenance-reminders",
    regionId: "maintenance-reminders",
    sourcePath: "docs/examples/package-api/maintenance-reminders.ts",
    targets: Object.freeze([
      Object.freeze({
        declarationName: "maintenanceReminders",
        kind: "jsdoc",
        sourcePath: "src/package-checks/maintenance-reminders/maintenance-reminders.ts"
      })
    ]),
    title: "创建一个单一 Check 的维护提醒"
  }),
  Object.freeze({
    evidence: "runtime",
    id: "typed-dependency",
    regionId: "typed-dependency",
    sourcePath: "docs/examples/package-api/typed-dependency.ts",
    targets: Object.freeze([
      Object.freeze({
        documentId: "api-mechanics",
        kind: "markdown",
        placeholderId: "typed-dependency"
      })
    ]),
    title: "读取 typed dependency final data"
  })
] satisfies readonly PackageApiExampleProjection[]);
