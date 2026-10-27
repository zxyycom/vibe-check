import {
  PROJECT_GATE_KNOWN_PRODUCT_TEST_DIRECTORIES,
  PROJECT_GATE_PRODUCT_TEST_REGIONS
} from "./product-test-regions.ts";

export const PROJECT_GATE_UNCLASSIFIED_INPUT_REGION = "unclassified-input";

// These script lanes consume Product implementation, not known owners' test bodies.
// Keep helpers, fixtures and unclassified paths as conservative shared inputs.
const unrelatedProductTestBodies = PROJECT_GATE_KNOWN_PRODUCT_TEST_DIRECTORIES.map(
  (directory) => `!${directory}/**/*.test.ts`
);

/** Shared implementation that can change the selected package Checks' input or settlement. */
const sharedPackageCheckInputs = [
  "src/check/**",
  "src/data-boundary/**",
  "src/package-checks/check-authoring.ts",
  "src/package-checks/final-data-parsing.ts",
  "src/package-checks/host-environment/**",
  "src/package-checks/project-files/**",
  "src/package-tools/finding-presentation/**",
  "src/check-settlement/**",
  "src/project-definition/**",
  "src/project-run/**"
] as const;
const sharedMaterialProviderInputs = [
  "scripts/canonical-json.ts",
  "scripts/diagnostic-safety.ts",
  "scripts/error-message.ts",
  "scripts/process-execution/**",
  "scripts/repository-files/**",
  "scripts/validation/repository-scan-policy.ts",
  "scripts/value-guards.ts"
] as const;
/** Gate-owned inputs shared by Git change mapping and explicit routine scopes. */
export const PROJECT_GATE_INCREMENTAL_CHANGE_REGIONS = Object.freeze({
  // Only these owned input families have reviewed narrower obligations. Any other
  // root path conservatively activates every changed Check, including acceptance.
  [PROJECT_GATE_UNCLASSIFIED_INPUT_REGION]: {
    patterns: [
      "**/*",
      ".*",
      "**/.*",
      "**/.*/**",
      "!src/**",
      "!scripts/**",
      "!docs/**",
      "!changes/**",
      "!licenses/**",
      "!README.md",
      "!LICENSE",
      "!package.json",
      "!pnpm-lock.yaml",
      "!pnpm-workspace.yaml",
      "!tsconfig.json",
      "!tsconfig.product.json",
      "!.oxlintrc.json",
      "!.oxfmtrc.json",
      "!bunfig.toml",
      "!mise.toml",
      "!mise.lock",
      "!vibe-check.code-workspace"
    ]
  },
  "any-change": { patterns: ["**/*", ".*", "**/.*", "**/.*/**"] },
  "decision-input": { patterns: ["docs/decisions/**", "scripts/decision-records/**"] },
  "duplicate-input": {
    patterns: [
      "src/**/*.ts",
      "scripts/**/*.ts",
      "docs/schemas/**",
      "docs/examples/**",
      "package.json",
      "pnpm-lock.yaml"
    ]
  },
  "file-metrics-input": {
    patterns: [
      "src/**/*.ts",
      "scripts/**/*.ts",
      "docs/**/*.md",
      "changes/**/*.md",
      "docs/schemas/**",
      "docs/examples/**",
      "package.json",
      "pnpm-lock.yaml",
      "!scripts/**/*.test.ts"
    ]
  },
  "format-input": {
    patterns: [
      "src/**",
      "scripts/**",
      ".codex/config.toml",
      "package.json",
      "tsconfig*.json",
      ".ox*.json",
      "mise.toml",
      "pnpm-workspace.yaml",
      "vibe-check.code-workspace"
    ]
  },
  "package-tests": {
    patterns: [
      "scripts/package/**",
      "scripts/docs/**",
      "scripts/development/typecheck.ts",
      "scripts/error-message.ts",
      "scripts/process-execution/**",
      "scripts/repository-files/**",
      "scripts/value-guards.ts",
      "src/**",
      ...unrelatedProductTestBodies,
      "README.md",
      "LICENSE",
      "licenses/**",
      "docs/package-documents.json",
      "docs/api-mechanics.md",
      "docs/changelog.md",
      "docs/output.md",
      "docs/checks/**",
      "docs/guides/**",
      "docs/schemas/**",
      "docs/examples/artifacts/**",
      "docs/examples/package-api/**",
      "docs/examples/package-api-support/**",
      "package.json",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "tsconfig*.json"
    ]
  },
  "product-source": {
    patterns: [
      "src/**",
      "tsconfig.json",
      "tsconfig.product.json",
      "package.json",
      "pnpm-lock.yaml",
      ".oxlintrc.json"
    ]
  },
  ...PROJECT_GATE_PRODUCT_TEST_REGIONS,
  "project-tests": {
    patterns: [
      "scripts/project/gate/**",
      "scripts/package/**",
      "scripts/development/**",
      "scripts/validation/repository-material/**",
      "scripts/validation/repository-scan-policy.ts",
      "scripts/test-evidence/**",
      "scripts/process-execution/**",
      "scripts/repository-files/**",
      "scripts/value-guards.ts",
      "src/**",
      ...unrelatedProductTestBodies,
      "tsconfig*.json",
      ".oxlintrc.json",
      ".oxfmtrc.json",
      "mise.toml",
      "package.json",
      "pnpm-lock.yaml",
      "!scripts/project/gate/runtime/eligibility.test.ts",
      "!scripts/validation/repository-material/**/*.test.ts"
    ]
  },
  "project-selection-tests": {
    patterns: [
      "scripts/project/gate/runtime/eligibility.ts",
      "scripts/project/gate/runtime/change-regions.ts",
      "scripts/project/gate/runtime/eligibility.test.ts",
      "scripts/project/gate/runtime/product-test-regions.ts",
      "scripts/project/gate/runtime/controls.ts",
      "scripts/project/gate/runtime/catalog.ts",
      "scripts/project/gate/runtime/performance-policy.ts",
      "scripts/project/gate/runtime/entries.ts",
      "scripts/project/gate/definition.ts",
      "scripts/project/gate/checks/test-execution/lanes.ts",
      "scripts/project/gate/checks/test-execution/checks.ts",
      "scripts/project/gate/checks/test-execution/entries.ts",
      "scripts/test-evidence/discovery/**",
      "scripts/test-evidence/profile.ts",
      "docs/package-documents.json",
      "docs/testing/cases/**",
      "src/project-definition/**",
      "src/project-run/**",
      "src/check-settlement/**",
      "src/check/**",
      "src/data-boundary/**",
      "package.json",
      "pnpm-lock.yaml",
      "!src/**/*.test.ts",
      "!src/**/*.test-support.ts"
    ]
  },
  "function-input": {
    patterns: [
      "src/**/*.ts",
      "scripts/**/*.ts",
      "package.json",
      "pnpm-lock.yaml",
      "!src/**/*.test.ts",
      "!src/**/*.test-support.ts",
      "!scripts/**/*.test.ts"
    ]
  },
  "markdown-lint-input": {
    patterns: [
      "docs/**/*.md",
      "changes/**/*.md",
      "src/package-checks/markdown-lint/**",
      "src/package-checks/code-quality-findings/**",
      "src/package-checks/markdown-link-validation/filesystem-probes.ts",
      "src/package-checks/markdown-link-validation/local-resolution.ts",
      ...sharedPackageCheckInputs,
      "scripts/project/gate/checks/repository-quality.ts",
      "package.json",
      "pnpm-lock.yaml",
      "!src/**/*.test.ts",
      "!src/**/*.test-support.ts"
    ]
  },
  "material-json-input": {
    patterns: [
      "docs/**/*.json",
      "src/package-checks/json-validation/**",
      "src/package-checks/json-document/**",
      ...sharedPackageCheckInputs,
      "scripts/project/gate/definition.ts",
      "scripts/validation/repository-material/task-contract.ts",
      "scripts/validation/repository-scan-policy.ts",
      "package.json",
      "pnpm-lock.yaml",
      "!src/**/*.test.ts",
      "!src/**/*.test-support.ts"
    ]
  },
  "material-schema-input": {
    patterns: [
      "docs/schemas/**",
      "docs/examples/historical/v1/*-report.json",
      "src/package-checks/json-schema-validation/**",
      "src/package-checks/json-document/**",
      ...sharedPackageCheckInputs,
      "scripts/project/gate/definition.ts",
      "scripts/validation/repository-material/task-contract.ts",
      "scripts/validation/repository-scan-policy.ts",
      "package.json",
      "pnpm-lock.yaml",
      "!src/**/*.test.ts",
      "!src/**/*.test-support.ts"
    ]
  },
  "material-schema-publication-input": {
    patterns: [
      "docs/schemas/**",
      "src/machine-output/v4/schema*.ts",
      "scripts/docs/machine-artifacts/schemas.ts",
      "scripts/validation/repository-material/**",
      ...sharedMaterialProviderInputs,
      "package.json",
      "pnpm-lock.yaml",
      "!src/**/*.test.ts",
      "!src/**/*.test-support.ts",
      "!scripts/**/*.test.ts",
      "!scripts/**/*.test-support.ts"
    ]
  },
  "material-examples-input": {
    patterns: [
      "docs/examples/artifacts/**",
      "docs/schemas/**",
      "src/**",
      "scripts/docs/machine-artifacts/examples/**",
      "scripts/validation/repository-material/**",
      ...sharedMaterialProviderInputs,
      "package.json",
      "pnpm-lock.yaml",
      "!src/**/*.test.ts",
      "!src/**/*.test-support.ts",
      "!scripts/**/*.test.ts",
      "!scripts/**/*.test-support.ts"
    ]
  },
  "script-source": {
    patterns: [
      "scripts/**",
      "src/**",
      "tsconfig.json",
      "package.json",
      "pnpm-lock.yaml",
      ".oxlintrc.json"
    ]
  },
  "script-tooling-tests": {
    patterns: [
      "scripts/**",
      "src/**",
      ...unrelatedProductTestBodies,
      "tsconfig*.json",
      ".oxlintrc.json",
      ".oxfmtrc.json",
      "package.json",
      "pnpm-lock.yaml",
      "!scripts/project/gate/**",
      "!scripts/project/admission-workbench/**",
      "!scripts/package/**",
      "!scripts/test-evidence/**",
      "!scripts/validation/**"
    ]
  },
  "layout-tests": {
    patterns: ["scripts/**", "src/**", "tsconfig.json", "package.json", "pnpm-lock.yaml"]
  },
  "machine-artifact-tests": {
    patterns: [
      "scripts/validation/repository-material/machine-artifacts/**",
      "scripts/validation/repository-material/diagnostics.ts",
      "scripts/validation/repository-material/repository-files.ts",
      "scripts/validation/repository-material/repository-paths.ts",
      "scripts/validation/repository-material/task-contract.ts",
      "scripts/validation/repository-scan-policy.ts",
      "scripts/validation/repository-material/json/**",
      "scripts/validation/repository-material/schema/**",
      "scripts/docs/machine-artifacts/**",
      "scripts/process-execution/**",
      "scripts/repository-files/**",
      "scripts/canonical-json.ts",
      "scripts/diagnostic-safety.ts",
      "scripts/error-message.ts",
      "scripts/value-guards.ts",
      "docs/schemas/**",
      "docs/examples/artifacts/**",
      "src/**",
      "package.json",
      "pnpm-lock.yaml",
      "!scripts/validation/repository-material/schema/**/*.test.ts",
      "!scripts/validation/repository-material/json/**/*.test.ts",
      "!scripts/docs/machine-artifacts/**/*.test.ts",
      "!scripts/process-execution/**/*.test.ts",
      "!src/**/*.test.ts",
      "!src/**/*.test-support.ts"
    ]
  },
  "package-tools-boundary-tests": {
    patterns: [
      "scripts/validation/repository-layout.ts",
      "scripts/validation/repository-layout.test-support.ts",
      "scripts/validation/package-tools-core-closure.test.ts",
      "scripts/validation/package-tools-module-graph.test.ts",
      "scripts/validation/package-tools-boundary.ts",
      "scripts/validation/package-tools-core-closure.ts",
      "scripts/validation/package-tools-module-graph.ts",
      "scripts/validation/function-metrics-analyzer-boundary.ts",
      "scripts/validation/import-boundaries.ts",
      "scripts/validation/repository-material/task-contract.ts",
      "scripts/validation/repository-scan-policy.ts",
      "scripts/repository-files/**",
      "tsconfig*.json",
      "package.json",
      "pnpm-lock.yaml"
    ]
  },
  "test-evidence-tests": {
    patterns: [
      "scripts/test-evidence/**",
      "docs/testing/cases/**",
      "package.json",
      "pnpm-lock.yaml"
    ]
  },
  "test-surface": {
    patterns: [
      "src/**",
      "scripts/**",
      "docs/testing/cases/**",
      "docs/*.md",
      "docs/checks/**",
      "docs/development/**",
      "docs/guides/**",
      "docs/testing/*.md",
      "docs/tooling/**"
    ]
  },
  "validation-tests": {
    patterns: [
      "scripts/validation/**",
      "scripts/docs/**",
      "scripts/repository-files/**",
      "scripts/value-guards.ts",
      "src/machine-output/**",
      "package.json",
      "pnpm-lock.yaml",
      "!scripts/validation/repository-layout.test.ts",
      "!scripts/validation/package-tools-core-closure.test.ts",
      "!scripts/validation/package-tools-module-graph.test.ts",
      "!scripts/validation/repository-material/machine-artifacts/validation.test.ts"
    ]
  },
  "test-evidence-rule-input": {
    patterns: [
      "scripts/test-evidence/ast-grep/**",
      "scripts/project/gate/checks/test-evidence/ast-grep-rule-tests-check.ts",
      "scripts/project/gate/checks/process/**",
      "scripts/process-execution/**",
      "scripts/repository-files/**",
      "scripts/error-message.ts",
      "mise.toml",
      "mise.lock",
      "package.json",
      "pnpm-lock.yaml",
      "!scripts/**/*.test.ts",
      "!scripts/**/*.test-support.ts"
    ]
  }
});

/** Explicit scopes reuse affected-input names, excluding the automatic fallback sentinel. */
export type ProjectGateScope = Exclude<
  keyof typeof PROJECT_GATE_INCREMENTAL_CHANGE_REGIONS,
  typeof PROJECT_GATE_UNCLASSIFIED_INPUT_REGION
>;

export function isProjectGateScope(value: unknown): value is ProjectGateScope {
  return (
    typeof value === "string" &&
    value !== PROJECT_GATE_UNCLASSIFIED_INPUT_REGION &&
    Object.hasOwn(PROJECT_GATE_INCREMENTAL_CHANGE_REGIONS, value)
  );
}

export const PROJECT_GATE_SCOPES = Object.freeze(
  Object.keys(PROJECT_GATE_INCREMENTAL_CHANGE_REGIONS).filter(isProjectGateScope).sort()
);
