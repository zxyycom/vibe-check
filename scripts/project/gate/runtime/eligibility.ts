import { all, any, changeFlag, type Check, type CheckFlagEnablement } from "@zxyycom/vibe-check";

import {
  PROJECT_GATE_ALL_FLAG,
  PROJECT_GATE_REQUIRED_FLAG,
  projectGatePresetFlag
} from "./controls.ts";
import type { ProjectGateEntry } from "./entries.ts";
import { PROJECT_GATE_PRODUCT_TEST_REGIONS } from "./product-test-regions.ts";

const PROJECT_GATE_PRODUCT_RUNTIME_TEST_CHECK_ID = "tests-product-runtime";
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
  "scripts/value-guards.ts"
] as const;
const REQUIRED_CHANGE_FLAGS_BY_CHECK_ID: Readonly<Record<string, string>> = Object.freeze({
  "typecheck-product": "product-source",
  "lint-product": "product-source",
  "typecheck-scripts": "script-source",
  "lint-scripts": "script-source",
  "format-check": "format-input",
  "tests-package-supporting": "package-tests",
  "tests-product-duplicate-detection": "product-duplicate-detection-tests",
  "tests-product-file-metrics": "product-file-metrics-tests",
  "tests-product-function-metrics": "product-function-metrics-tests",
  "tests-product-json": "product-json-tests",
  "tests-product-markdown-links": "product-markdown-tests",
  "tests-product-secret-detection": "product-secret-detection-tests",
  "tests-product-supporting-checks": "product-supporting-check-tests",
  "tests-scripts-project": "project-tests",
  "tests-scripts-project-selection": "project-selection-tests",
  "tests-scripts-admission-workbench": "admission-workbench-tests",
  "tests-scripts-layout": "layout-tests",
  "tests-scripts-machine-artifacts": "machine-artifact-tests",
  "tests-scripts-package-tools-boundary": "package-tools-boundary-tests",
  "tests-scripts-test-evidence": "test-evidence-tests",
  "tests-scripts-validation": "validation-tests",
  "tests-scripts-tooling": "script-tooling-tests",
  "duplicate-detection": "duplicate-input",
  "file-metrics": "file-metrics-input",
  "function-metrics": "function-input",
  "markdown-lint": "markdown-lint-input",
  "markdown-link-validation": "any-change",
  "materials-json-validator": "material-json-input",
  "materials-schema-validator": "material-schema-input",
  "materials-schema-publication-validator": "material-schema-publication-input",
  "materials-examples-validator": "material-examples-input",
  "decision-records": "decision-input",
  "test-evidence": "test-surface",
  "test-evidence-rule-tests": "test-evidence-rule-input"
});

/** Gate-owned regions used only by required selection; focused and --all force their members. */
export const PROJECT_GATE_INCREMENTAL_CHANGE_REGIONS = Object.freeze({
  "admission-workbench-tests": {
    include: ["scripts/project/admission-workbench/**", "src/**", "package.json", "pnpm-lock.yaml"],
    exclude: []
  },
  "any-change": { include: ["**/*", ".*", "**/.*", "**/.*/**"], exclude: [] },
  "decision-input": { include: ["docs/decisions/**", "scripts/decision-records/**"], exclude: [] },
  "duplicate-input": {
    include: [
      "src/**/*.ts",
      "scripts/**/*.ts",
      "docs/schemas/**",
      "docs/examples/**",
      "package.json",
      "pnpm-lock.yaml"
    ],
    exclude: []
  },
  "file-metrics-input": {
    include: [
      "src/**/*.ts",
      "scripts/**/*.ts",
      "docs/**/*.md",
      "changes/**/*.md",
      "docs/schemas/**",
      "docs/examples/**",
      "package.json",
      "pnpm-lock.yaml"
    ],
    exclude: ["scripts/**/*.test.ts"]
  },
  "format-input": {
    include: [
      "src/**",
      "scripts/**",
      ".codex/config.toml",
      "package.json",
      "tsconfig*.json",
      ".ox*.json",
      "mise.toml",
      "pnpm-workspace.yaml",
      "vibe-check.code-workspace"
    ],
    exclude: []
  },
  "package-tests": {
    include: [
      "scripts/package/**",
      "scripts/docs/**",
      "src/**",
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
      "package.json",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "tsconfig*.json"
    ],
    exclude: []
  },
  "product-source": {
    include: [
      "src/**",
      "tsconfig.json",
      "tsconfig.product.json",
      "package.json",
      "pnpm-lock.yaml",
      ".oxlintrc.json"
    ],
    exclude: []
  },
  ...PROJECT_GATE_PRODUCT_TEST_REGIONS,
  "project-tests": {
    include: [
      "scripts/project/gate/**",
      "scripts/package/**",
      "scripts/development/**",
      "scripts/validation/repository-material/**",
      "scripts/test-evidence/**",
      "scripts/process-execution/**",
      "scripts/repository-files/**",
      "scripts/value-guards.ts",
      "src/**",
      "tsconfig*.json",
      ".oxlintrc.json",
      ".oxfmtrc.json",
      "mise.toml",
      "package.json",
      "pnpm-lock.yaml"
    ],
    exclude: [
      "scripts/project/gate/runtime/eligibility.test.ts",
      "scripts/validation/repository-material/**/*.test.ts"
    ]
  },
  "project-selection-tests": {
    include: [
      "scripts/project/gate/runtime/eligibility.ts",
      "scripts/project/gate/runtime/eligibility.test.ts",
      "scripts/project/gate/runtime/product-test-regions.ts",
      "scripts/project/gate/runtime/controls.ts",
      "scripts/project/gate/runtime/catalog.ts",
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
      "pnpm-lock.yaml"
    ],
    exclude: ["src/**/*.test.ts", "src/**/*.test-support.ts"]
  },
  "function-input": {
    include: ["src/**/*.ts", "scripts/**/*.ts", "package.json", "pnpm-lock.yaml"],
    exclude: ["src/**/*.test.ts", "src/**/*.test-support.ts", "scripts/**/*.test.ts"]
  },
  "markdown-lint-input": {
    include: [
      "docs/**/*.md",
      "changes/**/*.md",
      "src/package-checks/markdown-lint/**",
      "src/package-checks/code-quality-findings/**",
      "src/package-checks/markdown-link-validation/filesystem-probes.ts",
      "src/package-checks/markdown-link-validation/local-resolution.ts",
      ...sharedPackageCheckInputs,
      "scripts/project/gate/checks/repository-quality.ts",
      "package.json",
      "pnpm-lock.yaml"
    ],
    exclude: ["src/**/*.test.ts", "src/**/*.test-support.ts"]
  },
  "material-json-input": {
    include: [
      "docs/**/*.json",
      "src/package-checks/json-validation/**",
      "src/package-checks/json-document/**",
      ...sharedPackageCheckInputs,
      "scripts/project/gate/definition.ts",
      "scripts/validation/repository-material/task-contract.ts",
      "package.json",
      "pnpm-lock.yaml"
    ],
    exclude: ["src/**/*.test.ts", "src/**/*.test-support.ts"]
  },
  "material-schema-input": {
    include: [
      "docs/schemas/**",
      "docs/examples/json/*-report.json",
      "src/package-checks/json-schema-validation/**",
      "src/package-checks/json-document/**",
      ...sharedPackageCheckInputs,
      "scripts/project/gate/definition.ts",
      "scripts/validation/repository-material/task-contract.ts",
      "package.json",
      "pnpm-lock.yaml"
    ],
    exclude: ["src/**/*.test.ts", "src/**/*.test-support.ts"]
  },
  "material-schema-publication-input": {
    include: [
      "docs/schemas/**",
      "src/machine-output/v4/schema*.ts",
      "scripts/docs/machine-artifacts/schemas.ts",
      "scripts/validation/repository-material/**",
      ...sharedMaterialProviderInputs,
      "package.json",
      "pnpm-lock.yaml"
    ],
    exclude: [
      "src/**/*.test.ts",
      "src/**/*.test-support.ts",
      "scripts/**/*.test.ts",
      "scripts/**/*.test-support.ts"
    ]
  },
  "material-examples-input": {
    include: [
      "docs/examples/artifacts/**",
      "docs/schemas/**",
      "src/**",
      "scripts/docs/machine-artifacts/examples/**",
      "scripts/validation/repository-material/**",
      ...sharedMaterialProviderInputs,
      "package.json",
      "pnpm-lock.yaml"
    ],
    exclude: [
      "src/**/*.test.ts",
      "src/**/*.test-support.ts",
      "scripts/**/*.test.ts",
      "scripts/**/*.test-support.ts"
    ]
  },
  "script-source": {
    include: [
      "scripts/**",
      "src/**",
      "tsconfig.json",
      "package.json",
      "pnpm-lock.yaml",
      ".oxlintrc.json"
    ],
    exclude: []
  },
  "script-tooling-tests": {
    include: [
      "scripts/**",
      "src/**",
      "tsconfig*.json",
      ".oxlintrc.json",
      ".oxfmtrc.json",
      "package.json",
      "pnpm-lock.yaml"
    ],
    exclude: [
      "scripts/project/**",
      "scripts/package/**",
      "scripts/test-evidence/**",
      "scripts/validation/**"
    ]
  },
  "layout-tests": {
    include: ["scripts/**", "src/**", "tsconfig.json", "package.json", "pnpm-lock.yaml"],
    exclude: []
  },
  "machine-artifact-tests": {
    include: [
      "scripts/validation/repository-material/machine-artifacts/**",
      "scripts/validation/repository-material/diagnostics.ts",
      "scripts/validation/repository-material/repository-files.ts",
      "scripts/validation/repository-material/repository-paths.ts",
      "scripts/validation/repository-material/task-contract.ts",
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
      "pnpm-lock.yaml"
    ],
    exclude: [
      "scripts/validation/repository-material/schema/**/*.test.ts",
      "scripts/validation/repository-material/json/**/*.test.ts",
      "scripts/docs/machine-artifacts/**/*.test.ts",
      "scripts/process-execution/**/*.test.ts",
      "src/**/*.test.ts",
      "src/**/*.test-support.ts"
    ]
  },
  "package-tools-boundary-tests": {
    include: [
      "scripts/validation/layout-characterization.ts",
      "scripts/validation/layout-characterization.test-support.ts",
      "scripts/validation/package-tools-core-closure.test.ts",
      "scripts/validation/package-tools-boundary.ts",
      "scripts/validation/package-tools-core-closure.ts",
      "scripts/validation/package-tools-module-graph.ts",
      "scripts/validation/function-metrics-analyzer-boundary.ts",
      "scripts/validation/import-boundaries.ts",
      "scripts/validation/project-gate-layout.ts",
      "scripts/validation/repository-material/task-contract.ts",
      "scripts/repository-files/**",
      "tsconfig*.json",
      "package.json",
      "pnpm-lock.yaml"
    ],
    exclude: []
  },
  "test-evidence-tests": {
    include: [
      "scripts/test-evidence/**",
      "docs/testing/cases/**",
      "package.json",
      "pnpm-lock.yaml"
    ],
    exclude: []
  },
  "test-surface": {
    include: [
      "src/**",
      "scripts/**",
      "docs/testing/cases/**",
      "docs/*.md",
      "docs/checks/**",
      "docs/development/**",
      "docs/guides/**",
      "docs/testing/*.md",
      "docs/tooling/**"
    ],
    exclude: []
  },
  "validation-tests": {
    include: [
      "scripts/validation/repository-material/**",
      "scripts/validation/workspace.ts",
      "scripts/validation/workspace.test.ts",
      "scripts/docs/**",
      "scripts/repository-files/**",
      "scripts/value-guards.ts",
      "src/machine-output/**",
      "package.json",
      "pnpm-lock.yaml"
    ],
    exclude: ["scripts/validation/repository-material/machine-artifacts/validation.test.ts"]
  },
  "test-evidence-rule-input": {
    include: [
      "scripts/test-evidence/ast-grep/**",
      "scripts/project/gate/checks/test-evidence/ast-grep-rule-tests-check.ts",
      "scripts/project/gate/checks/process/**",
      "scripts/process-execution/**",
      "scripts/repository-files/**",
      "scripts/error-message.ts",
      "mise.toml",
      "mise.lock",
      "package.json",
      "pnpm-lock.yaml"
    ],
    exclude: ["scripts/**/*.test.ts", "scripts/**/*.test-support.ts"]
  },
  "product-runtime": { include: ["src/**"], exclude: [] }
});
/**
 * Adds the Gate-owned native flag condition without mutating the owning Check
 * object. A selected Gate Check may activate its `dependsOn` prerequisites;
 * the Product still excludes `observes` from that propagation.
 */
export function projectGateFlagControlledCheck(entry: ProjectGateEntry): Check {
  const requiredChangeFlag = REQUIRED_CHANGE_FLAGS_BY_CHECK_ID[entry.check.checkId];
  if (requiredChangeFlag !== undefined && entry.required) {
    return Object.freeze({
      ...entry.check,
      enabledByFlags: Object.freeze({
        when: any(
          all(PROJECT_GATE_REQUIRED_FLAG, changeFlag(requiredChangeFlag)),
          ...entry.presets.map(projectGatePresetFlag),
          PROJECT_GATE_ALL_FLAG
        ),
        propagateDependsOn: true as const
      })
    });
  }
  const flags: [string, ...string[]] = [
    PROJECT_GATE_ALL_FLAG,
    ...(entry.required ? [PROJECT_GATE_REQUIRED_FLAG] : []),
    ...entry.presets.map(projectGatePresetFlag)
  ];
  return Object.freeze({
    ...entry.check,
    enabledByFlags:
      entry.check.checkId === PROJECT_GATE_PRODUCT_RUNTIME_TEST_CHECK_ID
        ? productRuntimeTestEnablement()
        : Object.freeze({
            when: any(...flags),
            propagateDependsOn: true
          })
  });
}

/** Keeps the incremental runtime lane explicit while focused and complete Gate selections remain force paths. */
function productRuntimeTestEnablement(): CheckFlagEnablement {
  return Object.freeze({
    when: any(
      all(PROJECT_GATE_REQUIRED_FLAG, changeFlag("product-runtime")),
      projectGatePresetFlag("test"),
      PROJECT_GATE_ALL_FLAG
    ),
    propagateDependsOn: true as const
  });
}
