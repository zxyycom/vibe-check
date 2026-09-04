import {
  defineProjectGateTestChecks,
  type PreparedCandidateProcessInput,
  type ProjectGateTestCheckDefinition
} from "./entries.ts";
import type { ProjectGateTestLaneName } from "./lanes.ts";

interface RoutineTestDefinition {
  readonly checkId: string;
  readonly displayName: string;
  readonly lane: ProjectGateTestLaneName;
}

interface PackageTestDefinition extends RoutineTestDefinition {
  readonly candidateInput: PreparedCandidateProcessInput;
  readonly timeoutMs: number;
}

/** Creates the complete test-lane Check descriptor group with Gate-owned overrides. */
export function createProjectGateTestCheckDefinitions(
  input: Readonly<{
    readonly documentationMaterialsMutex: readonly string[];
    readonly packageAcceptanceTimeoutMs: number;
  }>
): readonly ProjectGateTestCheckDefinition[] {
  return defineProjectGateTestChecks([
    routineTest({
      checkId: "tests-package-supporting",
      displayName: "Bun package calculation and material tests",
      lane: "packageSupporting"
    }),
    packageTest({
      candidateInput: "artifact",
      checkId: "tests-package-artifact",
      displayName: "Bun package artifact acceptance",
      lane: "packageArtifact",
      timeoutMs: input.packageAcceptanceTimeoutMs
    }),
    packageTest({
      candidateInput: "external-consumer",
      checkId: "tests-package-consumer-types",
      displayName: "Bun external package consumer type acceptance",
      lane: "packageConsumerTypes",
      timeoutMs: input.packageAcceptanceTimeoutMs
    }),
    packageTest({
      candidateInput: "external-consumer",
      checkId: "tests-package-consumer-docs",
      displayName: "Bun external package consumer documentation acceptance",
      lane: "packageConsumerDocs",
      timeoutMs: input.packageAcceptanceTimeoutMs
    }),
    packageTest({
      candidateInput: "external-consumer",
      checkId: "tests-package-consumer-runtime",
      displayName: "Bun external package consumer runtime acceptance",
      lane: "packageConsumerRuntime",
      timeoutMs: input.packageAcceptanceTimeoutMs
    }),
    routineTest({
      checkId: "tests-product-duplicate-detection",
      displayName: "Bun Product duplicate detection tests",
      lane: "productDuplicateDetection"
    }),
    routineTest({
      checkId: "tests-product-file-metrics",
      displayName: "Bun Product file metrics tests",
      lane: "productFileMetrics"
    }),
    routineTest({
      checkId: "tests-product-function-metrics",
      displayName: "Bun Product function metrics tests",
      lane: "productFunctionMetrics"
    }),
    routineTest({
      checkId: "tests-product-json",
      displayName: "Bun Product JSON tests",
      lane: "productJsonChecks"
    }),
    routineTest({
      checkId: "tests-product-markdown-links",
      displayName: "Bun Product Markdown link tests",
      lane: "productMarkdownLinks"
    }),
    routineTest({
      checkId: "tests-product-secret-detection",
      displayName: "Bun Product secret detection tests",
      lane: "productSecretDetection"
    }),
    routineTest({
      checkId: "tests-product-supporting-checks",
      displayName: "Bun Product supporting Check tests",
      lane: "productSupportingChecks"
    }),
    routineTest({
      checkId: "tests-product-runtime",
      displayName: "Bun Product runtime tests",
      lane: "productRuntime"
    }),
    routineTest({
      checkId: "tests-scripts-project",
      displayName: "Bun Project tooling tests",
      lane: "scriptsProject"
    }),
    routineTest({
      checkId: "tests-scripts-test-evidence",
      displayName: "Bun Test Evidence tooling tests",
      lane: "scriptsTestEvidence"
    }),
    {
      ...routineTest({
        checkId: "tests-scripts-validation",
        displayName: "Bun validation tooling tests",
        lane: "scriptsValidation"
      }),
      mutex: input.documentationMaterialsMutex
    },
    routineTest({
      checkId: "tests-scripts-tooling",
      displayName: "Bun ordinary script tooling tests",
      lane: "scriptsTooling"
    })
  ]);
}

function routineTest(input: RoutineTestDefinition): ProjectGateTestCheckDefinition {
  return Object.freeze({
    ...input,
    presets: Object.freeze(["test"] as const),
    required: true
  });
}

function packageTest(input: PackageTestDefinition): ProjectGateTestCheckDefinition {
  return Object.freeze({
    ...input,
    presets: Object.freeze([]),
    required: false
  });
}
