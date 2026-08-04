import { strict as assert } from "node:assert";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { loadSemanticProjectConfig } from "./config-file.ts";
import { resolveProjectConfigPaths } from "./config-paths.ts";
import { resolveQualityConfig } from "./config-schema.ts";
import {
  createEmptyMetrics,
  generateMarkdownReport
} from "./quality-core/src/index.ts";

const CURRENT_TOP_NOTICE =
  "Non-blocking development quality snapshot. The Vibe Check TypeScript/Bun product CLI, report contract, and product tests define the release contract.";
const CURRENT_FOOTER_NOTICE =
  "This report is a non-blocking development snapshot. Vibe Check TypeScript/Bun product tests and contract validation define the release gates.";
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

describe("product report notices", () => {
  it("renders current TypeScript/Bun release ownership at the stable notice positions", async () => {
    const repositoryConfig = resolveQualityConfig(
      await loadSemanticProjectConfig(
        resolveProjectConfigPaths(repoRoot).configPath
      )
    );
    const report = generateMarkdownReport(
      createEmptyMetrics({
        repository: "/repo",
        commitSha: "test",
        configVersion: repositoryConfig.version,
        tools: [],
        scope: {
          include: [...repositoryConfig.include],
          excludeDirs: [...repositoryConfig.excludeDirs],
          generatedFiles: [...repositoryConfig.generatedFiles]
        }
      }),
      repositoryConfig.report.topN,
      repositoryConfig.report
    );

    assert.equal(repositoryConfig.report.nonBlockingNotice, CURRENT_TOP_NOTICE);
    assert.equal(repositoryConfig.report.footerNotice, CURRENT_FOOTER_NOTICE);
    assert.ok(
      report.startsWith(`# ${repositoryConfig.report.title}\n\n**${CURRENT_TOP_NOTICE}**\n\n`),
      "top notice should immediately follow the report title"
    );
    assert.ok(
      report.endsWith(`\n\n*${CURRENT_FOOTER_NOTICE}*`),
      "footer notice should remain the final report line"
    );
    assert.doesNotMatch(report, /Rust CLI, schema, and tests remain the release contract/);
    assert.doesNotMatch(report, /Rust tests and schema validation remain the release gates/);
  });
});
