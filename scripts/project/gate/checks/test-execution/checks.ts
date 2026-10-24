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
      checkId: "tests-package-tooling",
      displayName: "Bun package tooling tests",
      lane: "packageTooling",
      presets: ["test"],
      fast: false,
      changeRegion: "package-tests"
    },
    {
      candidateInput: "artifact",
      checkId: "acceptance-package-artifact",
      displayName: "Bun package artifact acceptance",
      lane: "packageArtifact",
      presets: [],
      fast: false,
      changeRegion: "package-tests",
      timeoutMs: input.packageAcceptanceTimeoutMs
    },
    {
      candidateInput: "external-consumer",
      checkId: "acceptance-installed-package-types",
      displayName: "Installed package consumer type acceptance",
      lane: "packageConsumerTypes",
      presets: ["consumer-types"],
      fast: false,
      selectionPolicy: "release-only",
      timeoutMs: input.packageAcceptanceTimeoutMs
    },
    {
      candidateInput: "external-consumer",
      checkId: "acceptance-installed-package-docs",
      displayName: "Installed package consumer documentation acceptance",
      lane: "packageConsumerDocs",
      presets: [],
      fast: false,
      changeRegion: "package-tests",
      timeoutMs: input.packageAcceptanceTimeoutMs
    },
    {
      candidateInput: "external-consumer",
      checkId: "acceptance-installed-package-runtime",
      displayName: "Installed package consumer runtime acceptance",
      lane: "packageConsumerRuntime",
      presets: [],
      fast: false,
      changeRegion: "package-tests",
      timeoutMs: input.packageAcceptanceTimeoutMs
    },
    {
      checkId: "tests-product-duplicate-detection",
      displayName: "Bun Product duplicate detection tests",
      lane: "productDuplicateDetection",
      presets: ["test"],
      fast: false,
      changeRegion: "product-duplicate-detection-tests"
    },
    {
      checkId: "tests-product-file-metrics",
      displayName: "Bun Product file metrics tests",
      lane: "productFileMetrics",
      presets: ["test"],
      fast: false,
      changeRegion: "product-file-metrics-tests"
    },
    {
      checkId: "tests-product-function-metrics",
      displayName: "Bun Product function metrics tests",
      lane: "productFunctionMetrics",
      presets: ["test"],
      fast: false,
      changeRegion: "product-function-metrics-tests"
    },
    {
      checkId: "tests-product-json",
      displayName: "Bun Product JSON tests",
      lane: "productJsonChecks",
      presets: ["test"],
      fast: false,
      changeRegion: "product-json-tests"
    },
    {
      checkId: "tests-product-markdown",
      displayName: "Bun Product Markdown lint and link tests",
      lane: "productMarkdown",
      presets: ["test"],
      fast: false,
      changeRegion: "product-markdown-tests"
    },
    {
      checkId: "tests-product-secret-detection",
      displayName: "Bun Product secret detection tests",
      lane: "productSecretDetection",
      presets: ["test"],
      fast: false,
      changeRegion: "product-secret-detection-tests"
    },
    {
      checkId: "tests-product-supporting-checks",
      displayName: "Bun Product supporting Check tests",
      lane: "productSupportingChecks",
      presets: ["test"],
      fast: false,
      changeRegion: "product-supporting-check-tests"
    },
    {
      checkId: "tests-product-core-and-tools",
      displayName: "Bun Product Core and package-tool tests",
      lane: "productCoreAndTools",
      presets: ["test"],
      fast: false,
      changeRegion: "product-core-and-tools"
    },
    ...scriptTestChecks(input.repositoryMaterialsMutex)
  ]);
}

function scriptTestChecks(
  repositoryMaterialsMutex: readonly string[]
): readonly ProjectGateTestCheckDefinition[] {
  return [
    {
      checkId: "tests-scripts-admission-workbench",
      displayName: "Bun admission workbench tests",
      lane: "scriptsAdmissionWorkbench",
      presets: ["admission-workbench"],
      fast: false,
      selectionPolicy: "explicit-only"
    },
    {
      checkId: "tests-scripts-project",
      displayName: "Bun Project Gate tooling tests",
      lane: "scriptsProject",
      presets: ["test"],
      fast: false,
      changeRegion: "project-tests",
      testTimeoutMs: 15_000
    },
    {
      checkId: "tests-scripts-project-selection",
      displayName: "Bun Project Gate change selection tests",
      lane: "scriptsProjectSelection",
      presets: ["test"],
      fast: true,
      changeRegion: "project-selection-tests",
      testTimeoutMs: 15_000
    },
    {
      checkId: "tests-scripts-test-evidence",
      displayName: "Bun Test Evidence tooling tests",
      lane: "scriptsTestEvidence",
      presets: ["test"],
      fast: false,
      changeRegion: "test-evidence-tests"
    },
    {
      checkId: "tests-scripts-layout",
      displayName: "Bun repository layout tests",
      lane: "scriptsLayout",
      presets: ["test"],
      fast: false,
      changeRegion: "layout-tests"
    },
    {
      checkId: "tests-scripts-machine-artifacts",
      displayName: "Bun machine artifact validation tests",
      lane: "scriptsMachineArtifacts",
      mutex: repositoryMaterialsMutex,
      presets: ["test"],
      fast: false,
      changeRegion: "machine-artifact-tests"
    },
    {
      checkId: "tests-scripts-package-tools-boundary",
      displayName: "Bun package-tools boundary tests",
      lane: "scriptsPackageToolsBoundary",
      presets: ["test"],
      fast: true,
      changeRegion: "package-tools-boundary-tests"
    },
    {
      checkId: "tests-scripts-validation",
      displayName: "Bun repository material validation tests",
      lane: "scriptsValidation",
      mutex: repositoryMaterialsMutex,
      presets: ["test"],
      fast: false,
      changeRegion: "validation-tests"
    },
    {
      checkId: "tests-scripts-tooling",
      displayName: "Bun ordinary script tooling tests",
      lane: "scriptsTooling",
      presets: ["test"],
      fast: false,
      changeRegion: "script-tooling-tests"
    }
  ];
}
