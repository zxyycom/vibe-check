import assert from "node:assert/strict";
import { isAbsolute } from "node:path";
import { describe, it } from "node:test";
import { minimatch } from "minimatch";

import {
  createRepositoryQualityChecks,
  repositoryQualityScannerCommands
} from "./repository-quality-checks.ts";

describe("repository quality Checks", () => {
  it("uses the retained repository policy and mise-provided absolute scanner commands", () => {
    const checks = createRepositoryQualityChecks({
      lizard: "/tools/lizard",
      scc: "/tools/scc"
    });

    assert.deepEqual(
      checks.map(({ checkId }) => checkId),
      ["duplicate-detection", "file-metrics", "function-metrics", "markdown-link-validation"]
    );
    const [duplicateDetection, fileMetrics, functionMetrics, markdownLinkValidation] = checks;
    assert.equal(
      duplicateDetection.options.codeAreas["product-source"]?.findingPolicy,
      "non-blocking"
    );
    assert.equal(fileMetrics.options.codeAreas["product-source"]?.findingPolicy, "non-blocking");
    assert.equal(markdownLinkValidation.options.findingPolicy, "non-blocking");
    assert.equal(fileMetrics.options.scanner.executable, "/tools/scc");
    assert.equal(functionMetrics.options.scanner.executable, "/tools/lizard");
    assert.equal(
      functionMetrics.options.codeAreas["product-source"]?.findingPolicy,
      "non-blocking"
    );
    assert.equal(
      functionMetrics.options.codeAreas["script-tooling"]?.findingPolicy,
      "non-blocking"
    );
    assert.equal(duplicateDetection.options.codeAreas["script-tests"]?.minimumTokens, 100);
    const schemasExamples = fileMetrics.options.codeAreas["schemas-examples"];
    assert.ok(schemasExamples);
    assert.deepEqual(schemasExamples.files.include, ["docs/schemas/**", "docs/examples/**"]);
    assert.equal(
      selectsPath(schemasExamples.files, "docs/schemas/historical/v2/vibe-check-run.schema.json"),
      true
    );
    assert.equal(
      selectsPath(
        schemasExamples.files,
        "docs/schemas/historical/v2/vibe-check-record.schema.json"
      ),
      true
    );
    assert.deepEqual(fileMetrics.options.findingWaivers, [
      {
        identity: {
          metric: "code-lines",
          path: "docs/schemas/historical/v2/vibe-check-run.schema.json"
        },
        reason: "Historical v2 schema bytes and URN must remain unchanged."
      }
    ]);
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

  it("substitutes an unavailable absolute command when mise bindings are missing or relative", () => {
    const commands = repositoryQualityScannerCommands({
      VIBE_CHECK_LIZARD_CMD: "lizard",
      VIBE_CHECK_SCC_CMD: undefined
    });

    assert.equal(isAbsolute(commands.lizard), true);
    assert.equal(isAbsolute(commands.scc), true);
    assert.notEqual(commands.lizard, "lizard");
    assert.notEqual(commands.scc, "scc");

    const checks = createRepositoryQualityChecks({ lizard: "lizard", scc: "scc" });
    assert.equal(isAbsolute(checks[1].options.scanner.executable), true);
    assert.equal(isAbsolute(checks[2].options.scanner.executable), true);
    assert.notEqual(checks[1].options.scanner.executable, "scc");
    assert.notEqual(checks[2].options.scanner.executable, "lizard");
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
