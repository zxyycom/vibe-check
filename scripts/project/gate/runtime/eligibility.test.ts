import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import micromatch from "micromatch";

import { loadPackageDocuments } from "../../../docs/package-documents.ts";
import { PACKAGE_API_EXAMPLE_SUPPORT_SOURCE_PATHS } from "../../../docs/package-api/example-projections.ts";
import { resolveProjectGateTestLanes } from "../checks/test-execution/lanes.ts";
import { PROJECT_GATE_INCREMENTAL_CHANGE_REGIONS } from "./change-regions.ts";

type RegionName = keyof typeof PROJECT_GATE_INCREMENTAL_CHANGE_REGIONS;

/** Exercise Gate-owned native pattern policy over explicit slash paths. */
function matchingRegions(path: string, names: readonly RegionName[]): readonly RegionName[] {
  return names.filter((name) => {
    const region = PROJECT_GATE_INCREMENTAL_CHANGE_REGIONS[name];
    return (
      micromatch([path], region.patterns, { dot: true, posix: true, strictSlashes: false }).length >
      0
    );
  });
}

describe("Project Gate change regions", () => {
  it("selects Product Check test lanes without losing shared or cross-owner inputs", () => {
    const regions = [
      "product-duplicate-detection-tests",
      "product-file-metrics-tests",
      "product-function-metrics-tests",
      "product-json-tests",
      "product-markdown-tests",
      "product-secret-detection-tests",
      "product-supporting-check-tests"
    ] as const;
    const functionRegion = "product-function-metrics-tests";
    const privateInputs = [
      ["duplicate-detection", ["product-duplicate-detection-tests", functionRegion]],
      ["file-metrics", ["product-file-metrics-tests", functionRegion]],
      ["function-metrics", [functionRegion]],
      ["json-document", ["product-file-metrics-tests", functionRegion, "product-json-tests"]],
      ["json-validation", ["product-file-metrics-tests", functionRegion, "product-json-tests"]],
      ["json-schema-validation", [functionRegion, "product-json-tests"]],
      ["markdown-lint", [functionRegion, "product-markdown-tests"]],
      ["markdown-link-validation", [functionRegion, "product-markdown-tests"]],
      ["secret-detection", [functionRegion, "product-secret-detection-tests"]],
      ["command-check", [functionRegion, "product-supporting-check-tests"]],
      ["maintenance-reminders", [functionRegion, "product-supporting-check-tests"]]
    ] as const;
    // Include test-only edits and paths that need not still exist after rename/deletion.
    for (const [directory, selected] of privateInputs) {
      for (const file of [
        "default-check.ts",
        "fixture.test-support.ts",
        "fixtures/removed/input.json"
      ]) {
        const path = `src/package-checks/${directory}/${file}`;
        assert.deepEqual(matchingRegions(path, regions), selected, path);
      }
      const path = `src/package-checks/${directory}/removed/regression.test.ts`;
      const selectedForTest =
        directory === "json-document" || directory === "json-validation"
          ? selected.filter((region) => region !== "product-file-metrics-tests")
          : selected;
      assert.deepEqual(matchingRegions(path, regions), selectedForTest, path);
    }
    for (const directory of ["host-environment", "project-files"]) {
      const path = `src/package-checks/${directory}/removed/regression.test.ts`;
      assert.deepEqual(
        matchingRegions(path, regions),
        [functionRegion, "product-supporting-check-tests"],
        path
      );
    }
    for (const directory of [
      "check",
      "check-settlement",
      "data-boundary",
      "machine-output",
      "package-tools",
      "project-definition",
      "project-run"
    ]) {
      const path = `src/${directory}/removed/regression.test.ts`;
      assert.deepEqual(matchingRegions(path, regions), [functionRegion], path);
    }

    const sharedInputs = [
      "src/index.ts",
      "src/check/check.ts",
      "src/check-settlement/check-result.ts",
      "src/project-definition/project-definition.ts",
      "src/project-run/project-run.ts",
      "src/machine-output/v4/schema.ts",
      "src/data-boundary/json.ts",
      "src/package-tools/cache/cache.ts",
      "src/package-tools/finding-waivers/reconcile.ts",
      "src/package-checks/check-authoring.ts",
      "src/package-checks/check-execution.test-support.ts",
      "src/package-checks/code-quality-findings/findings.ts",
      "src/package-checks/host-environment/environment.ts",
      "src/package-checks/host-environment/process/fixture.test-support.ts",
      "src/package-checks/project-files/selection.ts",
      "src/package-checks/project-files/fixture.test-support.ts",
      "src/package-checks/new-check/default-check.ts",
      "src/package-checks/new-check/regression.test.ts",
      "src/package-checks/file-metrics-extra/input.ts",
      "src/package-checks/file-metrics-extra/regression.test.ts",
      "src/new-runtime-owner/implementation.ts",
      "src/new-runtime-owner/regression.test.ts",
      "scripts/project/gate/checks/test-execution/lanes.ts",
      "scripts/test-evidence/discovery/bun-files.ts",
      "scripts/test-evidence/profile.ts",
      "scripts/test-evidence/relative-path.ts",
      "scripts/test-evidence/supported-runner-profile.json",
      "scripts/value-guards.ts",
      "package.json",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "tsconfig.product.json",
      "bunfig.toml",
      "mise.toml",
      "mise.lock"
    ];
    for (const path of sharedInputs) {
      assert.deepEqual(matchingRegions(path, regions), [...regions], path);
    }
    assert.deepEqual(matchingRegions("licenses/lizard-1.24.1-provenance.json", regions), [
      functionRegion
    ]);
    for (const path of ["README.md", "docs/tooling/project-gate.md", "scripts/unrelated.ts"]) {
      assert.deepEqual(matchingRegions(path, regions), [], path);
    }
  });

  it("covers every routine execution lane test file with its owning change region", () => {
    const lanes = resolveProjectGateTestLanes(process.cwd());
    const laneRegions = [
      ["packageArtifact", "package-tests"],
      ["packageConsumerDocs", "package-tests"],
      ["packageConsumerRuntime", "package-tests"],
      ["packageTooling", "package-tests"],
      ["scriptsLayout", "layout-tests"],
      ["scriptsMachineArtifacts", "machine-artifact-tests"],
      ["scriptsPackageToolsBoundary", "package-tools-boundary-tests"],
      ["scriptsProject", "project-tests"],
      ["scriptsProjectSelection", "project-selection-tests"],
      ["scriptsTestEvidence", "test-evidence-tests"],
      ["scriptsTooling", "script-tooling-tests"],
      ["scriptsValidation", "validation-tests"],
      ["productDuplicateDetection", "product-duplicate-detection-tests"],
      ["productFileMetrics", "product-file-metrics-tests"],
      ["productFunctionMetrics", "product-function-metrics-tests"],
      ["productJsonChecks", "product-json-tests"],
      ["productMarkdown", "product-markdown-tests"],
      ["productSecretDetection", "product-secret-detection-tests"],
      ["productSupportingChecks", "product-supporting-check-tests"],
      ["productCoreAndTools", "product-core-and-tools"]
    ] as const;
    for (const [lane, region] of laneRegions) {
      assert.ok(lanes[lane].length > 0, lane);
      for (const path of lanes[lane]) {
        assert.deepEqual(matchingRegions(path, [region]), [region], path);
      }
    }
  });

  it("selects independent script test lanes from their changed inputs", () => {
    const lanes = [
      "project-tests",
      "project-selection-tests",
      "layout-tests",
      "machine-artifact-tests",
      "package-tools-boundary-tests",
      "validation-tests",
      "script-tooling-tests",
      "product-core-and-tools"
    ] as const;
    const scenarios = [
      {
        path: "scripts/project/gate/definition.ts",
        selected: ["project-tests", "project-selection-tests", "layout-tests"]
      },
      {
        path: "scripts/project/gate/runtime/eligibility.test.ts",
        selected: ["project-selection-tests", "layout-tests"]
      },
      {
        path: "scripts/project/gate/runtime/product-test-regions.ts",
        selected: ["project-tests", "project-selection-tests", "layout-tests"]
      },
      {
        path: "scripts/project/gate/runtime/performance-policy.ts",
        selected: ["project-tests", "project-selection-tests", "layout-tests"]
      },
      {
        path: "scripts/project/new-owner/regression.test.ts",
        selected: ["layout-tests", "script-tooling-tests"]
      },
      {
        path: "scripts/project/gate-extra/regression.test.ts",
        selected: ["layout-tests", "script-tooling-tests"]
      },
      { path: "docs/package-documents.json", selected: ["project-selection-tests"] },
      { path: "docs/testing/cases/repository-tooling.md", selected: ["project-selection-tests"] },
      {
        path: "scripts/validation/repository-material/workflow.ts",
        selected: ["project-tests", "layout-tests", "validation-tests"]
      },
      {
        path: "scripts/validation/repository-scan-policy.ts",
        selected: [
          "project-tests",
          "layout-tests",
          "machine-artifact-tests",
          "package-tools-boundary-tests",
          "validation-tests"
        ]
      },
      {
        path: "scripts/value-guards.ts",
        selected: [
          "project-tests",
          "layout-tests",
          "machine-artifact-tests",
          "validation-tests",
          "script-tooling-tests"
        ]
      },
      {
        path: "scripts/validation/repository-material/machine-artifacts/validation.test.ts",
        selected: ["layout-tests", "machine-artifact-tests"]
      },
      {
        path: "scripts/validation/package-tools-boundary.ts",
        selected: ["layout-tests", "package-tools-boundary-tests", "validation-tests"]
      },
      {
        path: "scripts/validation/new-owner/regression.test.ts",
        selected: ["layout-tests", "validation-tests"]
      },
      {
        path: "scripts/validation/new-owner/implementation.ts",
        selected: ["layout-tests", "validation-tests"]
      },
      {
        path: "scripts/validation/new-owner/fixture.test-support.ts",
        selected: ["layout-tests", "validation-tests"]
      },
      {
        path: "scripts/validation/repository-layout.test.ts",
        selected: ["layout-tests"]
      },
      {
        path: "scripts/validation/package-tools-core-closure.test.ts",
        selected: ["layout-tests", "package-tools-boundary-tests"]
      },
      {
        path: "scripts/validation/package-tools-module-graph.test.ts",
        selected: ["layout-tests", "package-tools-boundary-tests"]
      },
      {
        path: "scripts/canonical-json.ts",
        selected: ["layout-tests", "machine-artifact-tests", "script-tooling-tests"]
      },
      {
        path: "src/machine-output/v4/schema.ts",
        selected: [
          "project-tests",
          "layout-tests",
          "machine-artifact-tests",
          "validation-tests",
          "script-tooling-tests",
          "product-core-and-tools"
        ]
      },
      {
        path: "src/package-checks/host-environment/process/runner.test.ts",
        selected: ["layout-tests"]
      },
      {
        path: "src/package-checks/new-check/regression.test.ts",
        selected: [
          "project-tests",
          "layout-tests",
          "script-tooling-tests",
          "product-core-and-tools"
        ]
      },
      { path: "docs/tooling/project-gate.md", selected: [] },
      { path: ".github/workflows/check.yml", selected: [] }
    ] as const;
    for (const { path, selected } of scenarios) {
      assert.deepEqual(matchingRegions(path, lanes), selected, path);
    }

    const independentRegions = ["package-tests", "project-tests", "script-tooling-tests"] as const;
    // Independent expected owners; do not derive exclusions from the policy under test.
    const knownOwners = [
      "package-checks/command-check",
      "package-checks/duplicate-detection",
      "package-checks/file-metrics",
      "package-checks/function-metrics",
      "package-checks/json-document",
      "package-checks/json-schema-validation",
      "package-checks/json-validation",
      "package-checks/maintenance-reminders",
      "package-checks/markdown-link-validation",
      "package-checks/markdown-lint",
      "package-checks/secret-detection",
      "package-checks/host-environment",
      "package-checks/project-files",
      "check",
      "check-settlement",
      "data-boundary",
      "machine-output",
      "package-tools",
      "project-definition",
      "project-run"
    ];
    for (const owner of knownOwners) {
      const test = `src/${owner}/removed/regression.test.ts`;
      assert.deepEqual(matchingRegions(test, independentRegions), [], test);
      for (const file of ["implementation.ts", "fixture.test-support.ts", "fixtures/input.json"]) {
        const path = `src/${owner}/${file}`;
        assert.deepEqual(matchingRegions(path, independentRegions), independentRegions, path);
      }
    }
    for (const path of [
      "src/index.ts",
      "src/new-owner/regression.test.ts",
      "src/package-checks/new-check/regression.test.ts",
      "src/package-checks/file-metrics-extra/regression.test.ts"
    ]) {
      assert.deepEqual(matchingRegions(path, independentRegions), independentRegions, path);
    }
  });

  it("keeps quality and material regions specific to their inputs", () => {
    assert.deepEqual(
      matchingRegions("scripts/project/gate/runtime/performance-policy.ts", [
        "script-source",
        "format-input",
        "project-selection-tests"
      ]),
      ["script-source", "format-input", "project-selection-tests"]
    );
    for (const path of [
      "unknown-root.txt",
      ".github/workflows/new-gate.yml",
      "new-owner/removed.test.ts",
      ".codex/config.toml",
      "tsconfig.new-owner.json",
      ".oxnew-owner.json"
    ]) {
      assert.deepEqual(matchingRegions(path, ["unclassified-input"]), ["unclassified-input"], path);
    }
    for (const path of [
      "src/index.ts",
      "scripts/project/gate/definition.ts",
      "docs/tooling/project-gate.md",
      "package.json",
      "tsconfig.product.json"
    ]) {
      assert.deepEqual(matchingRegions(path, ["unclassified-input"]), [], path);
    }
    const regions = [
      "duplicate-input",
      "file-metrics-input",
      "function-input",
      "markdown-lint-input",
      "material-json-input",
      "material-schema-input",
      "material-schema-publication-input",
      "material-examples-input",
      "test-evidence-rule-input",
      "test-surface"
    ] as const;
    const scenarios = [
      {
        path: "docs/tooling/project-gate.md",
        selected: ["file-metrics-input", "markdown-lint-input", "test-surface"]
      },
      {
        path: "docs/schemas/vibe-check-run.schema.json",
        selected: [
          "duplicate-input",
          "file-metrics-input",
          "material-json-input",
          "material-schema-input",
          "material-schema-publication-input",
          "material-examples-input"
        ]
      },
      {
        path: "docs/examples/historical/v1/passing-report.json",
        selected: [
          "duplicate-input",
          "file-metrics-input",
          "material-json-input",
          "material-schema-input"
        ]
      },
      {
        path: "scripts/validation/repository-scan-policy.ts",
        selected: [
          "duplicate-input",
          "file-metrics-input",
          "function-input",
          "material-json-input",
          "material-schema-input",
          "material-schema-publication-input",
          "material-examples-input",
          "test-surface"
        ]
      },
      {
        path: "src/runtime.test.ts",
        selected: ["duplicate-input", "file-metrics-input", "test-surface"]
      },
      {
        path: "src/runtime.ts",
        selected: [
          "duplicate-input",
          "file-metrics-input",
          "function-input",
          "material-examples-input",
          "test-surface"
        ]
      },
      {
        path: "scripts/test-evidence/ast-grep/rules/bun-native-test.yml",
        selected: ["test-evidence-rule-input", "test-surface"]
      },
      {
        path: "scripts/project/gate/checks/process/transcript.ts",
        selected: [
          "duplicate-input",
          "file-metrics-input",
          "function-input",
          "test-evidence-rule-input",
          "test-surface"
        ]
      },
      { path: "README.md", selected: [] }
    ] as const;
    for (const { path, selected } of scenarios) {
      assert.deepEqual(matchingRegions(path, regions), selected, path);
    }
  });

  it("keeps the product Core-and-tools region complete for the lane resolver", () => {
    const lanes = resolveProjectGateTestLanes(process.cwd());
    const allProductRuntimeFiles = Object.values(lanes)
      .flat()
      .filter((file) => file.startsWith("src/") && !file.startsWith("src/package-checks/"));
    assert.deepEqual(lanes.productCoreAndTools, allProductRuntimeFiles);
    assert.equal(
      lanes.productCoreAndTools.every((file) =>
        matchingRegions(file, ["product-core-and-tools"]).includes("product-core-and-tools")
      ),
      true
    );
  });

  it("selects package and Case checks only for their documented source boundaries", () => {
    const regions = ["package-tests", "test-surface"] as const;
    const scenarios = [
      { path: "docs/investigations/performance.md", selected: [] },
      { path: "docs/decisions/select-gate-check-specific-change-regions.md", selected: [] },
      { path: "docs/tooling/project-gate.md", selected: ["test-surface"] },
      { path: "docs/checks/markdown-lint.md", selected: [...regions] },
      { path: "docs/package-documents.json", selected: ["package-tests"] },
      { path: "scripts/development/typecheck.ts", selected: [...regions] },
      { path: "scripts/error-message.ts", selected: [...regions] },
      { path: "scripts/process-execution/runner.ts", selected: [...regions] },
      { path: "scripts/repository-files/paths.ts", selected: [...regions] },
      { path: "scripts/value-guards.ts", selected: [...regions] },
      { path: "docs/examples/package-api/basic.ts", selected: ["package-tests"] },
      {
        path: "docs/examples/package-api-support/gate-example-acceptance.ts",
        selected: ["package-tests"]
      },
      { path: "README.md", selected: ["package-tests"] },
      { path: "LICENSE", selected: ["package-tests"] }
    ] as const;
    for (const { path, selected } of scenarios) {
      assert.deepEqual(matchingRegions(path, regions), selected, path);
    }
  });

  it("covers every registered package source and current Case owner", () => {
    const root = process.cwd();
    const documents = loadPackageDocuments(root);
    const packageSources = [
      ...[
        ...documents.markdownDocuments,
        ...documents.checkGuides,
        ...documents.machineMaterials
      ].map(({ sourcePath }) => sourcePath),
      ...PACKAGE_API_EXAMPLE_SUPPORT_SOURCE_PATHS
    ];
    assert.equal(packageSources.length > 0, true);
    for (const path of packageSources) {
      assert.deepEqual(matchingRegions(path, ["package-tests"]), ["package-tests"], path);
    }

    const casesDirectory = join(root, "docs/testing/cases");
    const ownerPaths = readdirSync(casesDirectory)
      .filter((name) => name.endsWith(".md"))
      .flatMap((name) =>
        [
          ...readFileSync(join(casesDirectory, name), "utf8").matchAll(
            /^Owner: `([^#`]+)#[^`]+`$/gmu
          )
        ].map((match) => match[1])
      );
    assert.equal(ownerPaths.length > 0, true);
    for (const path of ownerPaths) {
      assert.ok(path !== undefined);
      assert.deepEqual(matchingRegions(path, ["test-surface"]), ["test-surface"], path);
    }
  });
});
