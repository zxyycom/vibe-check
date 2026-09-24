import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { minimatch } from "minimatch";

import { resolveProjectGateTestLanes } from "../checks/test-execution/lanes.ts";
import { PROJECT_GATE_INCREMENTAL_CHANGE_REGIONS } from "./eligibility.ts";

type RegionName = keyof typeof PROJECT_GATE_INCREMENTAL_CHANGE_REGIONS;

/** Product config-glob uses minimatch with dot paths enabled; test only slash paths here. */
function matchingRegions(path: string, names: readonly RegionName[]): readonly RegionName[] {
  return names.filter((name) => {
    const region = PROJECT_GATE_INCREMENTAL_CHANGE_REGIONS[name];
    return (
      region.include.some((pattern) => minimatch(path, pattern, { dot: true })) &&
      !region.exclude.some((pattern) => minimatch(path, pattern, { dot: true }))
    );
  });
}

describe("Project Gate change regions", () => {
  it("selects independent script test lanes from their changed inputs", () => {
    const lanes = [
      "admission-workbench-tests",
      "project-tests",
      "project-selection-tests",
      "layout-tests",
      "machine-artifact-tests",
      "package-tools-boundary-tests",
      "validation-tests",
      "script-tooling-tests",
      "product-runtime"
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
        path: "scripts/validation/repository-material/workflow.ts",
        selected: ["project-tests", "layout-tests", "validation-tests"]
      },
      {
        path: "scripts/validation/repository-material/machine-artifacts/validation.test.ts",
        selected: ["layout-tests", "machine-artifact-tests"]
      },
      {
        path: "scripts/validation/package-tools-boundary.ts",
        selected: ["layout-tests", "package-tools-boundary-tests"]
      },
      {
        path: "scripts/canonical-json.ts",
        selected: ["layout-tests", "machine-artifact-tests", "script-tooling-tests"]
      },
      {
        path: "src/machine-output/v4/schema.ts",
        selected: [
          "admission-workbench-tests",
          "project-tests",
          "layout-tests",
          "machine-artifact-tests",
          "validation-tests",
          "script-tooling-tests",
          "product-runtime"
        ]
      },
      { path: "docs/tooling/project-gate.md", selected: [] },
      { path: ".github/workflows/check.yml", selected: [] }
    ] as const;
    for (const { path, selected } of scenarios) {
      assert.deepEqual(matchingRegions(path, lanes), selected, path);
    }
  });

  it("keeps quality and material regions specific to their inputs", () => {
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
        path: "docs/examples/json/passing-report.json",
        selected: [
          "duplicate-input",
          "file-metrics-input",
          "material-json-input",
          "material-schema-input"
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

  it("keeps the product-runtime region complete for the lane resolver", () => {
    const lanes = resolveProjectGateTestLanes(process.cwd());
    const allProductRuntimeFiles = Object.values(lanes)
      .flat()
      .filter((file) => file.startsWith("src/") && !file.startsWith("src/package-checks/"));
    assert.deepEqual(lanes.productRuntime, allProductRuntimeFiles);
    assert.equal(
      lanes.productRuntime.every((file) =>
        matchingRegions(file, ["product-runtime"]).includes("product-runtime")
      ),
      true
    );
  });
});
