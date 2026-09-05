import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { describe, it } from "node:test";
import { minimatch } from "minimatch";

import { run as packageRun } from "@zxyycom/vibe-check";
import {
  createRepositoryQualityChecks,
  PROJECT_GATE_REPOSITORY_QUALITY_OPTIONS,
  repositoryQualityScannerCommands
} from "./repository-quality.ts";
import { createProjectGateDefinition, projectGateAggregation } from "../definition.ts";
import { selectionFlags } from "../runtime/controls.ts";
import { defineProjectGateEntries } from "../runtime/entries.ts";

describe("repository quality Checks", () => {
  it("uses the strict repository policy and binds only the mise-provided SCC command", () => {
    const checks = createRepositoryQualityChecks(PROJECT_GATE_REPOSITORY_QUALITY_OPTIONS, {
      scc: "/tools/scc"
    });

    assert.deepEqual(
      [
        checks.duplicateDetection.checkId,
        checks.fileMetrics.checkId,
        checks.functionMetrics.checkId,
        checks.markdownLinkValidation.checkId
      ],
      ["duplicate-detection", "file-metrics", "function-metrics", "markdown-link-validation"]
    );
    const { duplicateDetection, fileMetrics, functionMetrics, markdownLinkValidation } = checks;
    assert.equal(duplicateDetection.options.codeAreas["product-source"]?.findingPolicy, "blocking");
    assert.equal(fileMetrics.options.codeAreas["product-source"]?.findingPolicy, "blocking");
    assert.equal(markdownLinkValidation.options.findingPolicy, "blocking");
    assert.deepEqual(markdownLinkValidation.options.files, {
      exclude: duplicateDetection.options.codeAreas["product-source"]?.files.exclude.filter(
        (path) => !path.startsWith(analyzerPathPrefix)
      ),
      include: ["docs/**/*.md", "changes/**/*.md"],
      source: "filesystem"
    });
    assert.equal(fileMetrics.options.scanner.executable, "/tools/scc");
    assert.equal(Object.hasOwn(functionMetrics.options, "scanner"), false);
    assert.equal(functionMetrics.options.codeAreas["product-source"]?.findingPolicy, "blocking");
    assert.equal(functionMetrics.options.codeAreas["script-tooling"]?.findingPolicy, "blocking");
    assert.equal(duplicateDetection.options.codeAreas["script-tests"]?.minimumTokens, 100);
    assert.equal(Object.hasOwn(duplicateDetection.options.codeAreas, "docs-specs"), false);
    assert.equal(
      Object.values(duplicateDetection.options.codeAreas).some((area) =>
        selectsPath(area.files, "docs/checks/duplicate-detection.md")
      ),
      false
    );
    const docsSpecs = fileMetrics.options.codeAreas["docs-specs"];
    assert.ok(docsSpecs);
    assert.equal(
      selectsPath(
        docsSpecs.files,
        "docs/investigations/_resources/diagnose-lizard/typescript-cpu-profile.md"
      ),
      false
    );
    assert.equal(selectsPath(docsSpecs.files, "docs/investigations/diagnose-lizard.md"), true);
    assert.equal(
      selectsPath(
        markdownLinkValidation.options.files,
        "docs/investigations/_resources/diagnose-lizard/typescript-cpu-profile.md"
      ),
      true
    );
    const duplicateSchemasExamples = duplicateDetection.options.codeAreas["schemas-examples"];
    assert.ok(duplicateSchemasExamples);
    assert.equal(
      selectsPath(
        duplicateSchemasExamples.files,
        "docs/schemas/historical/v2/vibe-check-run.schema.json"
      ),
      false
    );
    assert.equal(
      selectsPath(duplicateSchemasExamples.files, "docs/schemas/vibe-check-run.schema.json"),
      true
    );
    const schemasExamples = fileMetrics.options.codeAreas["schemas-examples"];
    assert.ok(schemasExamples);
    assert.deepEqual(schemasExamples.files.include, ["docs/schemas/**", "docs/examples/**"]);
    assert.equal(
      selectsPath(schemasExamples.files, "docs/schemas/historical/v2/vibe-check-run.schema.json"),
      false
    );
    assert.equal(
      selectsPath(
        schemasExamples.files,
        "docs/schemas/historical/v2/vibe-check-record.schema.json"
      ),
      false
    );
    assert.deepEqual(fileMetrics.options.findingWaivers, []);
    assert.deepEqual(duplicateDetection.options.findingWaivers, []);
    assert.deepEqual(functionMetrics.options.findingWaivers, []);
    assert.equal(Object.hasOwn(markdownLinkValidation.options, "findingWaivers"), false);
    assert.equal(
      selectsPath(schemasExamples.files, "docs/schemas/vibe-check-run.schema.json"),
      true
    );
    assert.equal(
      selectsPath(schemasExamples.files, "docs/schemas/vibe-check-record.schema.json"),
      true
    );
    const productQualitySelections = {
      duplicateDetection: duplicateDetection.options.codeAreas["product-source"]?.files,
      fileMetrics: fileMetrics.options.codeAreas["product-source"]?.files,
      functionMetrics: functionMetrics.options.codeAreas["product-source"]?.files
    };
    assert.deepEqual(
      Object.fromEntries(
        Object.entries(productQualitySelections).map(([check, files]) => [
          check,
          lizardPortQualityExclusions(files)
        ])
      ),
      {
        duplicateDetection: [lizardPortQualityExclusion],
        fileMetrics: [lizardPortQualityExclusion],
        functionMetrics: [lizardPortQualityExclusion]
      }
    );
    for (const files of Object.values(productQualitySelections)) {
      assert.ok(files);
      for (const path of lizardPortRepresentativePaths) {
        assert.equal(selectsPath(files, path), false, `${path} must stay outside quality metrics`);
      }
      for (const path of retainedProductBoundaryPaths) {
        assert.equal(selectsPath(files, path), true, `${path} must remain selected`);
      }
    }
    for (const path of retainedProductTestPaths) {
      assert.equal(
        selectsPath(duplicateDetection.options.codeAreas["product-source"].files, path),
        true,
        `${path} must remain selected for duplicate detection`
      );
      assert.equal(
        selectsPath(fileMetrics.options.codeAreas["product-source"].files, path),
        true,
        `${path} must remain selected for file metrics`
      );
      assert.equal(
        selectsPath(functionMetrics.options.codeAreas["product-source"].files, path),
        false,
        `${path} must stay outside function metrics`
      );
    }
    assert.deepEqual(
      functionMetrics.options.codeAreas["product-source"].files.exclude.filter((path) =>
        path.startsWith("src/**/")
      ),
      ["src/**/*.test.ts", "src/**/*.test-support.ts"]
    );
    for (const area of Object.values(fileMetrics.options.codeAreas)) {
      assert.deepEqual(area.codeLines, {
        lowDecisionTokenAllowance: {
          maximumCodeLines: 500,
          maximumDecisionTokens: 10
        },
        maximum: 300
      });
    }
    for (const area of Object.values(functionMetrics.options.codeAreas)) {
      assert.deepEqual(area.limits, {
        codeLines: {
          lowComplexityAllowance: { cyclomaticComplexityBelow: 5, maximum: 150 },
          maximum: 50
        },
        cyclomaticComplexity: { maximum: 10 },
        nestingDepth: { maximum: 7 },
        parameters: { maximum: 5 }
      });
    }
  });

  it("substitutes an unavailable absolute SCC command without a function-metrics command", () => {
    const commands = repositoryQualityScannerCommands({
      VIBE_CHECK_SCC_CMD: undefined
    });

    assert.equal(isAbsolute(commands.scc), true);
    assert.notEqual(commands.scc, "scc");
    assert.equal(Object.hasOwn(commands, "lizard"), false);

    const checks = createRepositoryQualityChecks(PROJECT_GATE_REPOSITORY_QUALITY_OPTIONS, {
      scc: "scc"
    });
    assert.equal(isAbsolute(checks.fileMetrics.options.scanner.executable), true);
    assert.notEqual(checks.fileMetrics.options.scanner.executable, "scc");
    assert.equal(Object.hasOwn(checks.functionMetrics.options, "scanner"), false);
  });

  it("settles all four blocking repository-quality Checks through the existing Gate aggregate", async () => {
    const cleanRoot = createRepositoryQualityFixture(false);
    const findingRoot = createRepositoryQualityFixture(true);
    try {
      const zeroFindings = await runRepositoryQualityFixture(cleanRoot);
      assert.equal(zeroFindings.kind, "completed");
      if (zeroFindings.kind !== "completed") return;
      assert.equal(zeroFindings.aggregate, "passed");
      assert.deepEqual(qualityOutcomeStatuses(zeroFindings), {
        "duplicate-detection": "passed",
        "file-metrics": "passed",
        "function-metrics": "passed",
        "markdown-link-validation": "passed"
      });
      assert.equal(zeroFindings.snapshot.records.length, 0);

      const normalFindings = await runRepositoryQualityFixture(findingRoot);
      assert.equal(normalFindings.kind, "completed");
      if (normalFindings.kind !== "completed") return;
      assert.deepEqual(qualityOutcomeStatuses(normalFindings), {
        "duplicate-detection": "failed",
        "file-metrics": "failed",
        "function-metrics": "failed",
        "markdown-link-validation": "failed"
      });
      assert.equal(normalFindings.aggregate, "failed");
      assert.ok(normalFindings.snapshot.records.length >= 4);
    } finally {
      rmSync(cleanRoot, { force: true, recursive: true });
      rmSync(findingRoot, { force: true, recursive: true });
    }
  });
});

async function runRepositoryQualityFixture(projectRoot: string) {
  const checks = createRepositoryQualityChecks(
    {
      duplicateDetection: {
        cache: { enabled: false },
        codeAreas: {
          source: {
            files: qualitySourceFiles,
            minimumLines: 3,
            minimumTokens: 75
          }
        },
        findingPolicy: "blocking",
        scanner: { command: { executable: join(projectRoot, "jscpd.mjs"), kind: "custom" } }
      },
      fileMetrics: {
        codeAreas: {
          source: {
            codeLines: {
              lowDecisionTokenAllowance: { maximumCodeLines: 500, maximumDecisionTokens: 10 },
              maximum: 300
            },
            files: qualitySourceFiles
          }
        },
        findingPolicy: "blocking"
      },
      functionMetrics: {
        codeAreas: {
          source: {
            files: qualitySourceFiles,
            limits: {
              codeLines: {
                lowComplexityAllowance: { cyclomaticComplexityBelow: 5, maximum: 150 },
                maximum: 50
              },
              cyclomaticComplexity: { maximum: 10 },
              nestingDepth: { maximum: 7 },
              parameters: { maximum: 5 }
            }
          }
        },
        findingPolicy: "blocking"
      },
      markdownLinkValidation: {
        files: { exclude: [], include: ["docs/**/*.md"], source: "filesystem" },
        findingPolicy: "blocking"
      }
    },
    { scc: join(projectRoot, "scc.mjs") }
  );
  const entries = defineProjectGateEntries([
    { check: checks.duplicateDetection, presets: ["quality"], required: false },
    { check: checks.fileMetrics, presets: ["quality"], required: false },
    { check: checks.functionMetrics, presets: ["quality"], required: false },
    { check: checks.markdownLinkValidation, presets: ["quality"], required: false }
  ]);

  return packageRun(createProjectGateDefinition(entries), {
    checkAggregation: projectGateAggregation(),
    flags: selectionFlags({ kind: "focused", presets: ["quality"] }),
    outputs: {
      diagnosticLogging: { enabled: false },
      machinePublication: { enabled: false },
      progressRendering: { enabled: false }
    },
    projectRoot
  });
}

function createRepositoryQualityFixture(withNormalFindings: boolean): string {
  const projectRoot = mkdtempSync(join(tmpdir(), "vibe-check-project-gate-quality-"));
  const sourceDirectory = join(projectRoot, "src");
  const docsDirectory = join(projectRoot, "docs");
  mkdirSync(sourceDirectory);
  mkdirSync(docsDirectory);
  writeFileSync(join(sourceDirectory, "a.ts"), "export const a = 1;\n", "utf8");
  writeFileSync(join(sourceDirectory, "b.ts"), "export const b = 2;\n", "utf8");
  writeFileSync(
    join(sourceDirectory, "parameters.ts"),
    withNormalFindings
      ? "export function parameters(a: number, b: number, c: number, d: number, e: number, f: number): number { return a; }\n"
      : "export function parameters(value: number): number { return value; }\n",
    "utf8"
  );
  writeFileSync(join(docsDirectory, "target.md"), "# Target\n", "utf8");
  writeFileSync(
    join(docsDirectory, "guide.md"),
    withNormalFindings ? "[missing](missing.md)\n" : "[target](target.md)\n",
    "utf8"
  );
  writeQualityFixtureScanner(projectRoot, "jscpd.mjs", duplicateScannerSource(withNormalFindings));
  writeQualityFixtureScanner(projectRoot, "scc.mjs", sccScannerSource(withNormalFindings));
  return projectRoot;
}

function writeQualityFixtureScanner(projectRoot: string, name: string, source: string): void {
  const executable = join(projectRoot, name);
  writeFileSync(executable, `#!/usr/bin/env bun\n${source}`, "utf8");
  chmodSync(executable, 0o755);
}

function duplicateScannerSource(withNormalFindings: boolean): string {
  const report = JSON.stringify({
    duplicates: withNormalFindings
      ? [
          {
            firstFile: { name: "src/a.ts", startLoc: { line: 1 }, endLoc: { line: 12 } },
            lines: 12,
            secondFile: { name: "src/b.ts", startLoc: { line: 1 }, endLoc: { line: 12 } },
            tokens: 80
          }
        ]
      : []
  });
  return [
    "import { mkdirSync, writeFileSync } from 'node:fs';",
    "import { join } from 'node:path';",
    "if (process.argv.includes('--version')) process.stdout.write('jscpd 5.0.11\\n');",
    "else {",
    "  const output = process.argv[process.argv.indexOf('--output') + 1];",
    "  mkdirSync(output, { recursive: true });",
    `  writeFileSync(join(output, 'jscpd-report.json'), ${JSON.stringify(report)});`,
    "}"
  ].join("\n");
}

function sccScannerSource(withNormalFindings: boolean): string {
  const output = withNormalFindings
    ? "Language,Provider,Filename,Lines,Code,Comments,Blanks,Complexity,Bytes,ULOC\nTypeScript,,src/a.ts,700,650,20,30,5,1000,650\n"
    : "Language,Provider,Filename,Lines,Code,Comments,Blanks,Complexity,Bytes,ULOC\nTypeScript,,src/a.ts,10,5,2,3,1,100,5\n";
  return [
    "if (process.argv.includes('--version')) process.stdout.write('scc version 4.0.0\\n');",
    `else process.stdout.write(${JSON.stringify(output)});`
  ].join("\n");
}

function qualityOutcomeStatuses(
  result: Extract<Awaited<ReturnType<typeof runRepositoryQualityFixture>>, { kind: "completed" }>
) {
  return Object.fromEntries(
    result.snapshot.checks.map(({ checkId, outcome }) => [checkId, outcome.status])
  );
}

const qualitySourceFiles = {
  exclude: [],
  include: ["src/**/*.ts"],
  source: "filesystem" as const
};

function selectsPath(
  files: Readonly<{ readonly exclude: readonly string[]; readonly include: readonly string[] }>,
  path: string
): boolean {
  return (
    files.include.some((glob) => minimatch(path, glob, { dot: true })) &&
    !files.exclude.some((glob) => minimatch(path, glob, { dot: true }))
  );
}

const analyzerPathPrefix = "src/package-checks/function-metrics/analyzer/";
const lizardPortQualityExclusion = `${analyzerPathPrefix}**`;
const lizardPortRepresentativePaths = [
  "src/package-checks/function-metrics/analyzer/core.ts",
  "src/package-checks/function-metrics/analyzer/port-facade.ts",
  "src/package-checks/function-metrics/analyzer/core.test.ts",
  "src/package-checks/function-metrics/analyzer/performance-harness.test-support.ts"
] as const;
const retainedProductBoundaryPaths = [
  "src/package-checks/function-metrics/analyzer-worker.ts",
  "src/package-checks/function-metrics/analyzer-worker-contract.ts",
  "src/package-checks/function-metrics/analyzer-adapter.ts",
  "src/package-checks/function-metrics/target-files.ts",
  "src/package-checks/function-metrics/measurement.ts",
  "src/package-checks/function-metrics/execution.ts"
] as const;
const retainedProductTestPaths = [
  "src/run.test.ts",
  "src/package-checks/function-metrics/constructor.test-support.ts"
] as const;

function lizardPortQualityExclusions(
  files:
    | Readonly<{ readonly exclude: readonly string[]; readonly include: readonly string[] }>
    | undefined
): readonly string[] {
  assert.ok(files);
  return files.exclude.filter((path) => path.startsWith(analyzerPathPrefix));
}
