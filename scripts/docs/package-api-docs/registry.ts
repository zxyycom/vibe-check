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
    id: "custom-check-definition",
    regionId: "custom-check-definition",
    sourcePath: "docs/examples/package-api/custom-check.ts",
    targets: Object.freeze([
      Object.freeze({
        declarationName: "defineCheck",
        kind: "jsdoc",
        sourcePath: "src/product/definition/custom-check.ts"
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
    id: "typed-dependency",
    regionId: "typed-dependency",
    sourcePath: "docs/examples/package-api/typed-dependency.ts",
    targets: Object.freeze([Object.freeze({ kind: "readme", placeholderId: "typed-dependency" })]),
    title: "读取 typed dependency final data"
  })
] satisfies readonly PackageApiExampleProjection[]);
