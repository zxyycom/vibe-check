export type PackageApiExampleEvidence = "runtime" | "typecheck";

export interface PackageApiMarkdownDocument {
  readonly id: string;
  /** The checked-in authoring source and exact path published in the package. */
  readonly packagePath: string;
}

export type PackageApiExampleTarget =
  | Readonly<{
      readonly documentId: string;
      /** Natural ATX H2-H6 path whose section owns exactly one fenced TypeScript example. */
      readonly headingPath: readonly string[];
      readonly kind: "markdown";
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
    packagePath: "README.md"
  }),
  Object.freeze({
    id: "api-mechanics",
    packagePath: "docs/api-mechanics.md"
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
        headingPath: Object.freeze(["自定义 Check 快速开始"]),
        kind: "markdown"
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
        headingPath: Object.freeze(["类型化依赖数据", "完整运行示例"]),
        kind: "markdown"
      })
    ]),
    title: "读取 typed dependency final data"
  })
] satisfies readonly PackageApiExampleProjection[]);
