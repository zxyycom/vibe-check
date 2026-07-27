import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { DEFAULT_CONFIG } from "./config.ts";
import {
  createEmptyMetrics,
  generateMarkdownReport
} from "./quality-core/src/index.ts";

const CURRENT_TOP_NOTICE =
  "Non-blocking development quality snapshot. The Vibe Check TypeScript/Bun product CLI, report contract, and product tests define the release contract.";
const CURRENT_FOOTER_NOTICE =
  "This report is a non-blocking development snapshot. Vibe Check TypeScript/Bun product tests and contract validation define the release gates.";

describe("product report notices", () => {
  it("renders current TypeScript/Bun release ownership at the stable notice positions", () => {
    const report = generateMarkdownReport(
      createEmptyMetrics({
        repository: "/repo",
        commitSha: "test",
        configVersion: DEFAULT_CONFIG.version,
        tools: [],
        scope: {
          include: [...DEFAULT_CONFIG.include],
          excludeDirs: [...DEFAULT_CONFIG.excludeDirs],
          generatedFiles: [...DEFAULT_CONFIG.generatedFiles]
        }
      }),
      DEFAULT_CONFIG.report.topN,
      DEFAULT_CONFIG.report
    );

    assert.equal(DEFAULT_CONFIG.report.nonBlockingNotice, CURRENT_TOP_NOTICE);
    assert.equal(DEFAULT_CONFIG.report.footerNotice, CURRENT_FOOTER_NOTICE);
    assert.ok(
      report.startsWith(`# ${DEFAULT_CONFIG.report.title}\n\n**${CURRENT_TOP_NOTICE}**\n\n`),
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
