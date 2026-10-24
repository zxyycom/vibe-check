import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { it } from "node:test";

import { validateRepositoryLayout } from "./repository-layout.ts";
import { validateModuleImportBoundaries } from "./import-boundaries.ts";
import { validateFunctionMetricsAnalyzerModules } from "./function-metrics-analyzer-boundary.ts";
import {
  analyzeModuleSpecifiers,
  type ModuleSpecifierAnalysis
} from "./module-specifier-analysis.ts";
import {
  createTargetLayout,
  escapeRegExp,
  repositoryBoundarySources,
  writeSource
} from "./repository-layout.test-support.ts";

const PRIVATE_PROCESS_IMPORT = ["../process-execution", "runner.ts"].join("/");
const PRIVATE_FUNCTION_METRICS_ANALYZER_IMPORT = [
  "../../src/package-checks/function-metrics/analyzer",
  "pipeline.ts"
].join("/");

it("validates repository layout and dependency boundaries", { timeout: 60_000 }, () => {
  assert.doesNotThrow(() => {
    validateRepositoryLayout();
  });
  const root = createTargetLayout();
  try {
    assert.doesNotThrow(() => {
      validateRepositoryLayout({ repositoryRoot: root });
    });
    writeSource(root, "src/project-definition/illegal.ts", 'import "../../scripts/paths.ts";');
    assert.throws(() => {
      validateRepositoryLayout({ repositoryRoot: root });
    }, /product-imports-scripts: src\/project-definition\/illegal\.ts/u);
    writeSource(root, "src/project-definition/illegal.ts", "export {};");
    writeSource(root, "src/package-checks/function-metrics/analyzer-adapter.ts", "export {};");
    assert.throws(() => {
      validateRepositoryLayout({ repositoryRoot: root });
    }, /function-metrics-port-facade-consumers:/u);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

it("rejects forbidden dependencies from in-memory module analyses", () => {
  assert.deepEqual(boundaryViolations(repositoryBoundarySources()), []);
  const violations: readonly Readonly<{
    readonly expected: string;
    readonly mutate: (sources: Map<string, string>) => void;
  }>[] = [
    {
      expected:
        "product-imports-scripts: src/project-definition/illegal.ts -> ../../scripts/repository-files/paths.ts",
      mutate: (sources) => {
        sources.set(
          "src/project-definition/illegal.ts",
          'import { toSlashPath } from "../../scripts/repository-files/paths.ts";\nvoid toSlashPath;\n'
        );
      }
    },
    {
      expected:
        "product-imports-scripts: src/project-definition/illegal.ts -> ../../scripts/repository-files/paths.ts",
      mutate: (sources) => {
        sources.set(
          "src/project-definition/illegal.ts",
          'import "../../scripts/repository-files/paths.ts";\n'
        );
      }
    },
    {
      expected:
        "project-deep-imports-product: scripts/project/gate/illegal.ts -> ../../../src/index.ts",
      mutate: (sources) => {
        sources.set(
          "scripts/project/gate/illegal.ts",
          'import type { ProjectDefinition } from "../../../src/index.ts";\nexport type { ProjectDefinition };\n'
        );
      }
    },
    {
      expected:
        "project-deep-imports-product: scripts/project/gate/illegal.ts -> ../../../src/index.ts",
      mutate: (sources) => {
        sources.set("scripts/project/gate/illegal.ts", 'void import("../../../src/index.ts");\n');
      }
    },
    {
      expected:
        "package-imports-project: scripts/package/artifact/illegal.ts -> ../../project/gate/run.ts",
      mutate: (sources) => {
        sources.set(
          "scripts/package/artifact/illegal.ts",
          'import type { GateRun } from "../../project/gate/run.ts";\nexport type { GateRun };\n'
        );
      }
    },
    {
      expected:
        "script-deep-imports-process-execution: scripts/development/illegal.ts -> ../process-execution/runner.ts",
      mutate: (sources) => {
        sources.set(
          "scripts/development/illegal.ts",
          `import { runProcess } from ${JSON.stringify(PRIVATE_PROCESS_IMPORT)};\nvoid runProcess;\n`
        );
      }
    },
    {
      expected:
        "environment-imports-process-execution: scripts/environment/manage.ts -> ../process-execution/execution.ts",
      mutate: (sources) => {
        sources.set(
          "scripts/environment/manage.ts",
          'import { runProcess } from "../process-execution/execution.ts";\nvoid runProcess;\n'
        );
      }
    },
    {
      expected:
        "function-metrics-product-deep-imports-analyzer: src/package-checks/function-metrics/target-files.ts -> ./analyzer/pipeline.ts",
      mutate: (sources) => {
        sources.set(
          "src/package-checks/function-metrics/target-files.ts",
          'import { analyzeSourceCode } from "./analyzer/pipeline.ts";\nvoid analyzeSourceCode;\n'
        );
      }
    },
    {
      expected:
        "function-metrics-product-deep-imports-analyzer: src/package-checks/function-metrics/target-files.ts -> ./analyzer/pipeline.ts",
      mutate: (sources) => {
        sources.set(
          "src/package-checks/function-metrics/target-files.ts",
          'void import(("./analyzer/pipeline.ts"));\n'
        );
      }
    },
    {
      expected:
        "function-metrics-product-deep-imports-analyzer: src/package-checks/function-metrics/target-files.ts -> ./analyzer/pipeline.ts",
      mutate: (sources) => {
        sources.set(
          "src/package-checks/function-metrics/target-files.ts",
          "void import(`./analyzer/pipeline.ts`);\n"
        );
      }
    },
    {
      expected:
        "function-metrics-product-deep-imports-analyzer: src/package-checks/function-metrics/target-files.ts -> ./analyzer/pipeline.ts",
      mutate: (sources) => {
        sources.set(
          "src/package-checks/function-metrics/target-files.ts",
          'void import((("./analyzer/pipeline.ts" as string) satisfies string));\n'
        );
      }
    },
    {
      expected: "module-specifier-parse: src/project-definition/illegal.ts:",
      mutate: (sources) => {
        sources.set("src/project-definition/illegal.ts", "const = ;\n");
      }
    },
    {
      expected:
        "function-metrics-required-adapter-import: src/package-checks/function-metrics/analyzer-worker.ts must value-import src/package-checks/function-metrics/analyzer-adapter.ts",
      mutate: (sources) => {
        sources.set("src/package-checks/function-metrics/analyzer-worker.ts", "export {};\n");
      }
    },
    {
      expected:
        "function-metrics-required-adapter-import: src/package-checks/function-metrics/analyzer-worker.ts must value-import src/package-checks/function-metrics/analyzer-adapter.ts",
      mutate: (sources) => {
        sources.set(
          "src/package-checks/function-metrics/analyzer-worker.ts",
          [
            '// import { analyzeFunctionMetricsSources } from "./analyzer-adapter.ts";',
            "const disguisedImport = 'import { analyzeFunctionMetricsSources } from \"./analyzer-adapter.ts\";';",
            "export {};"
          ].join("\n")
        );
      }
    },
    {
      expected:
        "function-metrics-required-adapter-import: src/package-checks/function-metrics/target-files.ts must value-import src/package-checks/function-metrics/analyzer-adapter.ts",
      mutate: (sources) => {
        sources.set("src/package-checks/function-metrics/target-files.ts", "export {};\n");
      }
    },
    {
      expected:
        "function-metrics-adapter-deep-imports-analyzer: src/package-checks/function-metrics/analyzer-adapter.ts -> ./analyzer/pipeline.ts",
      mutate: (sources) => {
        sources.set(
          "src/package-checks/function-metrics/analyzer-adapter.ts",
          [
            'import "./analyzer/port-facade.ts";',
            'import { analyzeSourceCode } from "./analyzer/pipeline.ts";',
            "void analyzeSourceCode;"
          ].join("\n")
        );
      }
    },
    {
      expected:
        "function-metrics-analyzer-imports-product: src/package-checks/function-metrics/analyzer/port-facade.ts -> ../analyzer-adapter.ts",
      mutate: (sources) => {
        sources.set(
          "src/package-checks/function-metrics/analyzer/port-facade.ts",
          'import "../analyzer-adapter.ts";\n'
        );
      }
    },
    {
      expected:
        "function-metrics-test-deep-imports-analyzer: src/package-checks/function-metrics/target-files.test.ts -> ./analyzer/port-facade.ts",
      mutate: (sources) => {
        sources.set(
          "src/package-checks/function-metrics/target-files.test.ts",
          'import type { LizardSourceAnalysis } from "./analyzer/port-facade.ts";\nexport type { LizardSourceAnalysis };\n'
        );
      }
    },
    {
      expected:
        "function-metrics-nonproduct-imports-analyzer: scripts/validation/illegal.ts -> ../../src/package-checks/function-metrics/analyzer/pipeline.ts",
      mutate: (sources) => {
        sources.set(
          "scripts/validation/illegal.ts",
          `import type { AnalyzerReader } from ${JSON.stringify(PRIVATE_FUNCTION_METRICS_ANALYZER_IMPORT)};\nexport type { AnalyzerReader};\n`
        );
      }
    },
    {
      expected:
        "function-metrics-private-public-entry: src/index.ts -> ./package-checks/function-metrics/analyzer-adapter.ts",
      mutate: (sources) => {
        sources.set(
          "src/index.ts",
          'export { analyzeFunctionMetricsSources } from "./package-checks/function-metrics/analyzer-adapter.ts";\n'
        );
      }
    },
    {
      expected:
        "function-metrics-port-facade-consumers: expected only src/package-checks/function-metrics/analyzer-adapter.ts to import src/package-checks/function-metrics/analyzer/port-facade.ts; found none",
      mutate: (sources) => {
        sources.set("src/package-checks/function-metrics/analyzer-adapter.ts", "export {};\n");
      }
    }
  ];
  for (const violation of violations) {
    const sources = repositoryBoundarySources();
    violation.mutate(sources);
    assert.match(
      boundaryViolations(sources).join("\n"),
      new RegExp(escapeRegExp(violation.expected))
    );
  }

  const sources = repositoryBoundarySources();
  sources.set(
    "src/package-checks/function-metrics/analyzer-worker.ts",
    ['import { analyzeFunctionMetricsSources } from "./analyzer-adapter.ts";', "const = ;"].join(
      "\n"
    )
  );
  const diagnostics = boundaryViolations(sources);
  assert.equal(diagnostics.length, 1);
  assert.match(
    diagnostics[0] ?? "",
    /module-specifier-parse: src\/package-checks\/function-metrics\/analyzer-worker\.ts:/u
  );
  assert.doesNotMatch(diagnostics.join("\n"), /function-metrics-required-adapter-import:/u);
});

function boundaryViolations(sources: ReadonlyMap<string, string>): readonly string[] {
  const analyses = new Map<string, ModuleSpecifierAnalysis>();
  const violations: string[] = [];
  for (const [path, source] of sources) {
    const analysis = analyzeModuleSpecifiers(source, path);
    analyses.set(path, analysis);
    validateModuleImportBoundaries(path, analysis, violations);
  }
  validateFunctionMetricsAnalyzerModules(analyses, violations);
  return violations;
}
