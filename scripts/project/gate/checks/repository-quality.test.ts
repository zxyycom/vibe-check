import assert from "node:assert/strict";
import { isAbsolute } from "node:path";
import { describe, it } from "node:test";
import { minimatch } from "minimatch";

import {
  createRepositoryQualityChecks,
  repositoryQualityScannerCommands
} from "./repository-quality.ts";
import { PROJECT_GATE_REPOSITORY_QUALITY_OPTIONS } from "../definition.ts";

describe("repository quality Checks", () => {
  it("uses the retained repository policy and binds only the mise-provided SCC command", () => {
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
    assert.equal(
      duplicateDetection.options.codeAreas["product-source"]?.findingPolicy,
      "non-blocking"
    );
    assert.equal(fileMetrics.options.codeAreas["product-source"]?.findingPolicy, "non-blocking");
    assert.equal(markdownLinkValidation.options.findingPolicy, "non-blocking");
    assert.deepEqual(markdownLinkValidation.options.files, {
      exclude: duplicateDetection.options.codeAreas["product-source"]?.files.exclude,
      include: ["docs/**/*.md", "changes/**/*.md"],
      source: "filesystem"
    });
    assert.equal(fileMetrics.options.scanner.executable, "/tools/scc");
    assert.equal(Object.hasOwn(functionMetrics.options, "scanner"), false);
    assert.equal(
      functionMetrics.options.codeAreas["product-source"]?.findingPolicy,
      "non-blocking"
    );
    assert.equal(
      functionMetrics.options.codeAreas["script-tooling"]?.findingPolicy,
      "non-blocking"
    );
    assert.equal(duplicateDetection.options.codeAreas["script-tests"]?.minimumTokens, 100);
    assert.equal(Object.hasOwn(duplicateDetection.options.codeAreas, "docs-specs"), false);
    assert.equal(
      Object.values(duplicateDetection.options.codeAreas).some((area) =>
        selectsPath(area.files, "docs/checks/duplicate-detection.md")
      ),
      false
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
    assert.equal(
      selectsPath(schemasExamples.files, "docs/schemas/vibe-check-run.schema.json"),
      true
    );
    assert.equal(
      selectsPath(schemasExamples.files, "docs/schemas/vibe-check-record.schema.json"),
      true
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
});

function selectsPath(
  files: Readonly<{ readonly exclude: readonly string[]; readonly include: readonly string[] }>,
  path: string
): boolean {
  return (
    files.include.some((glob) => minimatch(path, glob, { dot: true })) &&
    !files.exclude.some((glob) => minimatch(path, glob, { dot: true }))
  );
}
