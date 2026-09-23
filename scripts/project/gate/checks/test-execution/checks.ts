import { defineProjectGateTestChecks, type ProjectGateTestCheckDefinition } from "./entries.ts";

/** Declares the closed test-lane group and its Gate selection metadata. */
export function createProjectGateTestCheckDefinitions(
  input: Readonly<{
    readonly repositoryMaterialsMutex: readonly string[];
    readonly packageAcceptanceTimeoutMs: number;
  }>
): readonly ProjectGateTestCheckDefinition[] {
  return defineProjectGateTestChecks([
    {
      checkId: "tests-package-supporting",
      displayName: "Bun package calculation and material tests",
      lane: "packageSupporting",
      presets: ["test"],
      required: true
    },
    {
      candidateInput: "artifact",
      checkId: "tests-package-artifact",
      displayName: "Bun package artifact acceptance",
      lane: "packageArtifact",
      presets: [],
      required: false,
      timeoutMs: input.packageAcceptanceTimeoutMs
    },
    {
      candidateInput: "external-consumer",
      checkId: "tests-package-consumer-types",
      displayName: "Bun external package consumer type acceptance",
      lane: "packageConsumerTypes",
      presets: [],
      required: false,
      timeoutMs: input.packageAcceptanceTimeoutMs
    },
    {
      candidateInput: "external-consumer",
      checkId: "tests-package-consumer-docs",
      displayName: "Bun external package consumer documentation acceptance",
      lane: "packageConsumerDocs",
      presets: [],
      required: false,
      timeoutMs: input.packageAcceptanceTimeoutMs
    },
    {
      candidateInput: "external-consumer",
      checkId: "tests-package-consumer-runtime",
      displayName: "Bun external package consumer runtime acceptance",
      lane: "packageConsumerRuntime",
      presets: [],
      required: false,
      timeoutMs: input.packageAcceptanceTimeoutMs
    },
    {
      checkId: "tests-product-duplicate-detection",
      displayName: "Bun Product duplicate detection tests",
      lane: "productDuplicateDetection",
      presets: ["test"],
      required: true
    },
    {
      checkId: "tests-product-file-metrics",
      displayName: "Bun Product file metrics tests",
      lane: "productFileMetrics",
      presets: ["test"],
      required: true
    },
    {
      checkId: "tests-product-function-metrics",
      displayName: "Bun Product function metrics tests",
      lane: "productFunctionMetrics",
      presets: ["test"],
      required: true
    },
    {
      checkId: "tests-product-json",
      displayName: "Bun Product JSON tests",
      lane: "productJsonChecks",
      presets: ["test"],
      required: true
    },
    {
      checkId: "tests-product-markdown-links",
      displayName: "Bun Product Markdown link tests",
      lane: "productMarkdownLinks",
      presets: ["test"],
      required: true
    },
    {
      checkId: "tests-product-secret-detection",
      displayName: "Bun Product secret detection tests",
      lane: "productSecretDetection",
      presets: ["test"],
      required: true
    },
    {
      checkId: "tests-product-supporting-checks",
      displayName: "Bun Product supporting Check tests",
      lane: "productSupportingChecks",
      presets: ["test"],
      required: true
    },
    {
      checkId: "tests-product-runtime",
      displayName: "Bun Product runtime tests",
      lane: "productRuntime",
      presets: ["test"],
      required: true
    },
    {
      checkId: "tests-scripts-project",
      displayName: "Bun Project tooling tests",
      lane: "scriptsProject",
      presets: ["test"],
      required: true
    },
    {
      checkId: "tests-scripts-test-evidence",
      displayName: "Bun Test Evidence tooling tests",
      lane: "scriptsTestEvidence",
      presets: ["test"],
      required: true
    },
    {
      checkId: "tests-scripts-validation",
      displayName: "Bun validation tooling tests",
      lane: "scriptsValidation",
      mutex: input.repositoryMaterialsMutex,
      presets: ["test"],
      required: true
    },
    {
      checkId: "tests-scripts-tooling",
      displayName: "Bun ordinary script tooling tests",
      lane: "scriptsTooling",
      presets: ["test"],
      required: true
    }
  ]);
}
