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

/** Explicitly published API-document inventory; this is not a general Markdown traversal. */
export const PACKAGE_API_MARKDOWN_DOCUMENTS = Object.freeze([
  Object.freeze({
    id: "readme",
    packagePath: "README.md"
  }),
  Object.freeze({
    id: "api-mechanics",
    packagePath: "docs/api-mechanics.md"
  }),
  Object.freeze({
    id: "run-outputs",
    packagePath: "docs/guides/run-outputs.md"
  }),
  Object.freeze({
    id: "check-dependencies",
    packagePath: "docs/guides/check-dependencies.md"
  }),
  Object.freeze({
    id: "learned-scheduling",
    packagePath: "docs/guides/learned-scheduling.md"
  }),
  Object.freeze({
    id: "callbacks",
    packagePath: "docs/guides/callbacks.md"
  }),
  Object.freeze({
    id: "extending-check-lifecycle",
    packagePath: "docs/guides/extending-check-lifecycle.md"
  }),
  Object.freeze({
    id: "scheduling",
    packagePath: "docs/guides/scheduling.md"
  }),
  Object.freeze({
    id: "simulating-admission",
    packagePath: "docs/guides/simulating-admission.md"
  }),
  Object.freeze({
    id: "collecting-project-files",
    packagePath: "docs/guides/collecting-project-files.md"
  }),
  Object.freeze({
    id: "cache-results",
    packagePath: "docs/guides/cache-results.md"
  }),
  Object.freeze({
    id: "finding-waivers",
    packagePath: "docs/guides/finding-waivers.md"
  }),
  Object.freeze({
    id: "presenting-findings",
    packagePath: "docs/guides/presenting-findings.md"
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
    id: "collect-project-files",
    regionId: "collect-project-files",
    sourcePath: "docs/examples/package-api/collect-project-files.ts",
    targets: Object.freeze([
      Object.freeze({
        documentId: "collecting-project-files",
        headingPath: Object.freeze(["最小用法"]),
        kind: "markdown"
      })
    ]),
    title: "按完整 selection 收集冻结的 project-relative path 快照"
  }),
  Object.freeze({
    evidence: "runtime",
    id: "cache-json-by-key",
    regionId: "cache-json-by-key",
    sourcePath: "docs/examples/package-api/cache-json-by-key.ts",
    targets: Object.freeze([
      Object.freeze({
        documentId: "cache-results",
        headingPath: Object.freeze(["最小用法"]),
        kind: "markdown"
      })
    ]),
    title: "以完整 caller key 复用 canonical JSON object"
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
        documentId: "extending-check-lifecycle",
        headingPath: Object.freeze(["定义 Check"]),
        kind: "markdown"
      }),
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
    id: "custom-admission-policy",
    regionId: "custom-admission-policy",
    sourcePath: "docs/examples/package-api/custom-admission-policy.ts",
    targets: Object.freeze([
      Object.freeze({
        documentId: "scheduling",
        headingPath: Object.freeze(["自定义准入 policy"]),
        kind: "markdown"
      })
    ]),
    title: "从完整静态图提出 custom admission"
  }),
  Object.freeze({
    evidence: "runtime",
    id: "admission-graph",
    regionId: "admission-graph",
    sourcePath: "docs/examples/package-api/admission-graph.ts",
    targets: Object.freeze([
      Object.freeze({
        documentId: "simulating-admission",
        headingPath: Object.freeze(["模拟 AdmissionGraph"]),
        kind: "markdown"
      })
    ]),
    title: "从保留 predecessor 分支模拟 admission"
  }),
  Object.freeze({
    evidence: "runtime",
    id: "prepared-custom-admission-policy",
    regionId: "prepared-custom-admission-policy",
    sourcePath: "docs/examples/package-api/prepared-custom-admission-policy.ts",
    targets: Object.freeze([
      Object.freeze({
        documentId: "scheduling",
        headingPath: Object.freeze(["已准备的 custom strategy"]),
        kind: "markdown"
      })
    ]),
    title: "为一次 Run 准备 custom admission"
  }),
  Object.freeze({
    evidence: "runtime",
    id: "presenting-findings",
    regionId: "presenting-findings",
    sourcePath: "docs/examples/package-api/presenting-findings.ts",
    targets: Object.freeze([
      Object.freeze({
        documentId: "presenting-findings",
        headingPath: Object.freeze(["最小用法"]),
        kind: "markdown"
      })
    ]),
    title: "将完整 Finding 集合呈现为有界 terminal messages"
  }),
  Object.freeze({
    evidence: "runtime",
    id: "learned-critical-path",
    regionId: "learned-critical-path",
    sourcePath: "docs/examples/package-api/learned-critical-path.ts",
    targets: Object.freeze([
      Object.freeze({
        documentId: "learned-scheduling",
        headingPath: Object.freeze(["learned critical-path strategy"]),
        kind: "markdown"
      })
    ]),
    title: "通过 public prepared strategy 复用本地时长 history"
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
        documentId: "check-dependencies",
        headingPath: Object.freeze(["完整运行示例"]),
        kind: "markdown"
      })
    ]),
    title: "读取 typed dependency final data"
  }),
  Object.freeze({
    evidence: "runtime",
    id: "progress-preview",
    regionId: "progress-preview",
    sourcePath: "docs/examples/package-api/progress-preview.ts",
    targets: Object.freeze([
      Object.freeze({
        documentId: "run-outputs",
        headingPath: Object.freeze(["Check messages 与受管 progress", "配置 preview 文本"]),
        kind: "markdown"
      })
    ]),
    title: "受管 progress 文本的前后片段预览"
  })
] satisfies readonly PackageApiExampleProjection[]);
