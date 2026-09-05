import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { it } from "node:test";

import { validateRepositoryLayout } from "./layout-characterization.ts";

const PRODUCT_OWNERS = [
  "cache",
  "check",
  "check-settlement",
  "data-boundary",
  "finding-waivers",
  "machine-output",
  "package-checks",
  "project-definition",
  "project-run"
];
const PRIVATE_PROCESS_IMPORT = ["../process-execution", "runner.ts"].join("/");
const PRIVATE_FUNCTION_METRICS_ANALYZER_IMPORT = [
  "../../src/package-checks/function-metrics/analyzer",
  "pipeline.ts"
].join("/");

it("characterizes repository layout and dependency boundaries", () => {
  assert.doesNotThrow(() => validateRepositoryLayout());
  const representativeLayout = createTargetLayout();
  try {
    assert.doesNotThrow(() => validateRepositoryLayout({ repositoryRoot: representativeLayout }));
  } finally {
    rmSync(representativeLayout, { force: true, recursive: true });
  }

  const violations: readonly Readonly<{
    readonly expected: string;
    readonly mutate: (root: string) => void;
  }>[] = [
    {
      expected: "retired-source-directory: scripts/tools",
      mutate: (root) => writeSource(root, "scripts/tools/legacy.ts", "export {};\n")
    },
    {
      expected: "retired-source-directory: scripts/process-execution/process",
      mutate: (root) =>
        writeSource(root, "scripts/process-execution/process/legacy.ts", "export {};\n")
    },
    {
      expected: "retired-source-directory: scripts/validation/documentation/repository",
      mutate: (root) =>
        writeSource(root, "scripts/validation/documentation/repository/legacy.ts", "export {};\n")
    },
    {
      expected: "project-gate-root-layout:",
      mutate: (root) => writeSource(root, "scripts/project/gate/extra.ts", "export {};\n")
    },
    {
      expected: "unapproved-index: src/project-definition/index.ts",
      mutate: (root) => writeSource(root, "src/project-definition/index.ts", "export {};\n")
    },
    {
      expected: "generic-basename: scripts/validation/model.test.ts (model)",
      mutate: (root) => writeSource(root, "scripts/validation/model.test.ts", "export {};\n")
    },
    {
      expected:
        "product-imports-scripts: src/project-definition/illegal.ts -> ../../scripts/repository-files/paths.ts",
      mutate: (root) =>
        writeSource(
          root,
          "src/project-definition/illegal.ts",
          'import { toSlashPath } from "../../scripts/repository-files/paths.ts";\nvoid toSlashPath;\n'
        )
    },
    {
      expected:
        "product-imports-scripts: src/project-definition/illegal.ts -> ../../scripts/repository-files/paths.ts",
      mutate: (root) =>
        writeSource(
          root,
          "src/project-definition/illegal.ts",
          'import "../../scripts/repository-files/paths.ts";\n'
        )
    },
    {
      expected:
        "project-deep-imports-product: scripts/project/gate/illegal.ts -> ../../../src/index.ts",
      mutate: (root) =>
        writeSource(
          root,
          "scripts/project/gate/illegal.ts",
          'import type { ProjectDefinition } from "../../../src/index.ts";\nexport type { ProjectDefinition };\n'
        )
    },
    {
      expected:
        "project-deep-imports-product: scripts/project/gate/illegal.ts -> ../../../src/index.ts",
      mutate: (root) =>
        writeSource(
          root,
          "scripts/project/gate/illegal.ts",
          'void import("../../../src/index.ts");\n'
        )
    },
    {
      expected:
        "package-imports-project: scripts/package/artifact/illegal.ts -> ../../project/gate/run.ts",
      mutate: (root) =>
        writeSource(
          root,
          "scripts/package/artifact/illegal.ts",
          'import type { GateRun } from "../../project/gate/run.ts";\nexport type { GateRun };\n'
        )
    },
    {
      expected:
        "script-deep-imports-process-execution: scripts/development/illegal.ts -> ../process-execution/runner.ts",
      mutate: (root) =>
        writeSource(
          root,
          "scripts/development/illegal.ts",
          `import { runProcess } from ${JSON.stringify(PRIVATE_PROCESS_IMPORT)};\nvoid runProcess;\n`
        )
    },
    {
      expected:
        "environment-imports-process-execution: scripts/environment/manage.ts -> ../process-execution/execution.ts",
      mutate: (root) =>
        writeSource(
          root,
          "scripts/environment/manage.ts",
          'import { runProcess } from "../process-execution/execution.ts";\nvoid runProcess;\n'
        )
    },
    {
      expected:
        "function-metrics-product-deep-imports-analyzer: src/package-checks/function-metrics/target-files.ts -> ./analyzer/pipeline.ts",
      mutate: (root) =>
        writeSource(
          root,
          "src/package-checks/function-metrics/target-files.ts",
          'import { analyzeSourceCode } from "./analyzer/pipeline.ts";\nvoid analyzeSourceCode;\n'
        )
    },
    {
      expected:
        "function-metrics-product-deep-imports-analyzer: src/package-checks/function-metrics/target-files.ts -> ./analyzer/pipeline.ts",
      mutate: (root) =>
        writeSource(
          root,
          "src/package-checks/function-metrics/target-files.ts",
          'void import(("./analyzer/pipeline.ts"));\n'
        )
    },
    {
      expected:
        "function-metrics-product-deep-imports-analyzer: src/package-checks/function-metrics/target-files.ts -> ./analyzer/pipeline.ts",
      mutate: (root) =>
        writeSource(
          root,
          "src/package-checks/function-metrics/target-files.ts",
          "void import(`./analyzer/pipeline.ts`);\n"
        )
    },
    {
      expected:
        "function-metrics-product-deep-imports-analyzer: src/package-checks/function-metrics/target-files.ts -> ./analyzer/pipeline.ts",
      mutate: (root) =>
        writeSource(
          root,
          "src/package-checks/function-metrics/target-files.ts",
          'void import((("./analyzer/pipeline.ts" as string) satisfies string));\n'
        )
    },
    {
      expected: "module-specifier-parse: src/project-definition/illegal.ts:",
      mutate: (root) => writeSource(root, "src/project-definition/illegal.ts", "const = ;\n")
    },
    {
      expected:
        "function-metrics-required-adapter-import: src/package-checks/function-metrics/analyzer-worker.ts must value-import src/package-checks/function-metrics/analyzer-adapter.ts",
      mutate: (root) =>
        writeSource(root, "src/package-checks/function-metrics/analyzer-worker.ts", "export {};\n")
    },
    {
      expected:
        "function-metrics-required-adapter-import: src/package-checks/function-metrics/analyzer-worker.ts must value-import src/package-checks/function-metrics/analyzer-adapter.ts",
      mutate: (root) =>
        writeSource(
          root,
          "src/package-checks/function-metrics/analyzer-worker.ts",
          [
            '// import { analyzeFunctionMetricsSources } from "./analyzer-adapter.ts";',
            "const disguisedImport = 'import { analyzeFunctionMetricsSources } from \"./analyzer-adapter.ts\";';",
            "export {};"
          ].join("\n")
        )
    },
    {
      expected:
        "function-metrics-required-adapter-import: src/package-checks/function-metrics/target-files.ts must value-import src/package-checks/function-metrics/analyzer-adapter.ts",
      mutate: (root) =>
        writeSource(root, "src/package-checks/function-metrics/target-files.ts", "export {};\n")
    },
    {
      expected:
        "function-metrics-adapter-deep-imports-analyzer: src/package-checks/function-metrics/analyzer-adapter.ts -> ./analyzer/pipeline.ts",
      mutate: (root) =>
        writeSource(
          root,
          "src/package-checks/function-metrics/analyzer-adapter.ts",
          [
            'import "./analyzer/port-facade.ts";',
            'import { analyzeSourceCode } from "./analyzer/pipeline.ts";',
            "void analyzeSourceCode;"
          ].join("\n")
        )
    },
    {
      expected:
        "function-metrics-analyzer-imports-product: src/package-checks/function-metrics/analyzer/port-facade.ts -> ../analyzer-adapter.ts",
      mutate: (root) =>
        writeSource(
          root,
          "src/package-checks/function-metrics/analyzer/port-facade.ts",
          'import "../analyzer-adapter.ts";\n'
        )
    },
    {
      expected:
        "function-metrics-test-deep-imports-analyzer: src/package-checks/function-metrics/target-files.test.ts -> ./analyzer/port-facade.ts",
      mutate: (root) =>
        writeSource(
          root,
          "src/package-checks/function-metrics/target-files.test.ts",
          'import type { LizardSourceAnalysis } from "./analyzer/port-facade.ts";\nexport type { LizardSourceAnalysis };\n'
        )
    },
    {
      expected:
        "function-metrics-nonproduct-imports-analyzer: scripts/validation/illegal.ts -> ../../src/package-checks/function-metrics/analyzer/pipeline.ts",
      mutate: (root) =>
        writeSource(
          root,
          "scripts/validation/illegal.ts",
          `import type { AnalyzerReader } from ${JSON.stringify(PRIVATE_FUNCTION_METRICS_ANALYZER_IMPORT)};\nexport type { AnalyzerReader};\n`
        )
    },
    {
      expected:
        "function-metrics-private-public-entry: src/index.ts -> ./package-checks/function-metrics/analyzer-adapter.ts",
      mutate: (root) =>
        writeSource(
          root,
          "src/index.ts",
          'export { analyzeFunctionMetricsSources } from "./package-checks/function-metrics/analyzer-adapter.ts";\n'
        )
    },
    {
      expected:
        "function-metrics-port-facade-consumers: expected only src/package-checks/function-metrics/analyzer-adapter.ts to import src/package-checks/function-metrics/analyzer/port-facade.ts; found none",
      mutate: (root) =>
        writeSource(root, "src/package-checks/function-metrics/analyzer-adapter.ts", "export {};\n")
    },
    {
      expected:
        "package-artifact-entry: expected exactly src/index.ts and src/package-checks/function-metrics/analyzer-worker.ts compiler roots",
      mutate: (root) =>
        writeSource(
          root,
          "scripts/package/artifact/build.ts",
          'const entry = join(repositoryRoot, "src/project-definition/project-definition.ts");\nvoid entry;\n'
        )
    },
    {
      expected:
        "package-artifact-entry: expected exactly src/index.ts and src/package-checks/function-metrics/analyzer-worker.ts compiler roots",
      mutate: (root) =>
        writeSource(
          root,
          "scripts/package/package-contract.ts",
          [
            'export const PACKAGE_FUNCTION_METRICS_WORKER_SOURCE_PATH = "src/package-checks/function-metrics/analyzer-worker.ts";',
            "export const PACKAGE_RUNTIME_COMPILER_SOURCE_PATHS = Object.freeze([",
            '  "src/index.ts",',
            "  PACKAGE_FUNCTION_METRICS_WORKER_SOURCE_PATH,",
            '  "src/package-checks/function-metrics/unapproved-worker.ts"',
            "]);"
          ].join("\n")
        )
    },
    {
      expected: "product-owner-directories:",
      mutate: (root) => mkdirSync(join(root, "src", "unexpected"), { recursive: true })
    }
  ];

  for (const violation of violations) {
    const root = createTargetLayout();
    try {
      violation.mutate(root);
      assert.throws(
        () => validateRepositoryLayout({ repositoryRoot: root }),
        new RegExp(escapeRegExp(violation.expected))
      );
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  }

  const root = createTargetLayout();
  try {
    writeSource(
      root,
      "src/package-checks/function-metrics/analyzer-worker.ts",
      ['import { analyzeFunctionMetricsSources } from "./analyzer-adapter.ts";', "const = ;"].join(
        "\n"
      )
    );
    assert.throws(
      () => validateRepositoryLayout({ repositoryRoot: root }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(
          error.message,
          /module-specifier-parse: src\/package-checks\/function-metrics\/analyzer-worker\.ts:/u
        );
        assert.doesNotMatch(error.message, /function-metrics-required-adapter-import:/u);
        return true;
      }
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

function createTargetLayout(): string {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-layout-characterization-"));
  writeSource(root, "src/index.ts", "export {};\n");
  for (const owner of PRODUCT_OWNERS) {
    writeSource(root, `src/${owner}/${owner}.ts`, "export {};\n");
  }
  writeSource(root, "src/package-checks/function-metrics/analyzer/pipeline.ts", "export {};\n");
  writeSource(
    root,
    "src/package-checks/function-metrics/analyzer/port-facade.ts",
    'import "./pipeline.ts";\nexport {};\n'
  );
  writeSource(
    root,
    "src/package-checks/function-metrics/analyzer/port-facade.test.ts",
    'import "./pipeline.ts";\nimport "./port-facade.ts";\nexport {};\n'
  );
  writeSource(
    root,
    "src/package-checks/function-metrics/analyzer-adapter.ts",
    'import "./analyzer/port-facade.ts";\nexport {};\n'
  );
  writeSource(
    root,
    "src/package-checks/function-metrics/analyzer-adapter.test.ts",
    'import "./analyzer-adapter.ts";\nexport {};\n'
  );
  writeSource(
    root,
    "src/package-checks/function-metrics/analyzer-worker.ts",
    'import { analyzeFunctionMetricsSources } from "./analyzer-adapter.ts";\nvoid analyzeFunctionMetricsSources;\n'
  );
  writeSource(
    root,
    "src/package-checks/function-metrics/target-files.ts",
    [
      'import { analyzeFunctionMetricsSources } from "./analyzer-adapter.ts";',
      '// import { analyzeSourceCode } from "./analyzer/pipeline.ts";',
      "void analyzeFunctionMetricsSources;"
    ].join("\n")
  );
  writeSource(
    root,
    "scripts/package/artifact/build.ts",
    [
      "const entries = PACKAGE_RUNTIME_COMPILER_SOURCE_PATHS.map((sourcePath) =>",
      "  join(repositoryRoot, sourcePath)",
      ");",
      "void entries;"
    ].join("\n")
  );
  writeSource(
    root,
    "scripts/package/package-contract.ts",
    [
      'export const PACKAGE_FUNCTION_METRICS_WORKER_SOURCE_PATH = "src/package-checks/function-metrics/analyzer-worker.ts";',
      "export const PACKAGE_RUNTIME_COMPILER_SOURCE_PATHS = Object.freeze([",
      '  "src/index.ts",',
      "  PACKAGE_FUNCTION_METRICS_WORKER_SOURCE_PATH",
      "]);"
    ].join("\n")
  );
  for (const path of [
    "scripts/project/gate/definition.test.ts",
    "scripts/project/gate/definition.ts",
    "scripts/project/gate/run.test.ts",
    "scripts/project/gate/run.ts",
    "scripts/project/gate/checks/process/process.ts",
    "scripts/project/gate/runtime/bound-run.ts"
  ]) {
    writeSource(root, path, "export {};\n");
  }
  writeSource(root, "scripts/package/candidate/prepare.ts", "export {};\n");
  return root;
}

function writeSource(root: string, relativePath: string, source: string): void {
  const path = join(root, relativePath);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, source, "utf8");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
