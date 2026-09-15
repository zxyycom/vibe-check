import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { lintMarkdownString } from "./adapter.ts";
import { MARKDOWN_LINT_RULE_NAMES } from "./options.ts";

describe("Markdown lint adapter", () => {
  it("maps each Product rule through its fixed backend configuration", async () => {
    const samples: Readonly<Record<(typeof MARKDOWN_LINT_RULE_NAMES)[number], string>> = {
      "heading-increment": "# one\n### three\n",
      "no-reversed-links": "(Incorrect link syntax)[https://example.test/]\n",
      "no-missing-space-atx": "#missing\n",
      "fenced-code-language": "```\ncode\n```\n",
      "no-empty-links": "[empty]()\n",
      "no-alt-text": "![](image.png)\n",
      "link-fragments": "# Present\n[missing](#absent)\n",
      "reference-links-images": "[missing][definition]\n",
      "table-column-count": "| A | B |\n| - | - |\n| one |\n"
    };
    for (const rule of MARKDOWN_LINT_RULE_NAMES) {
      const findings = await lintMarkdownString(`${rule}.md`, samples[rule], [rule]);
      assert.notEqual(typeof findings, "string", rule);
      if (typeof findings === "string") continue;
      assert.equal(
        findings.some((finding) => finding.rule === rule),
        true,
        rule
      );
    }
  });

  it("uses fixed front matter and ignores inline configuration", async () => {
    const findings = await lintMarkdownString(
      "dialect.md",
      "---\ntitle: Document\n---\n<!-- markdownlint-disable MD018 -->\n#missing\n",
      ["heading-increment", "no-missing-space-atx"]
    );
    assert.notEqual(typeof findings, "string");
    if (typeof findings === "string") return;
    assert.equal(
      findings.some((finding) => finding.rule === "no-missing-space-atx"),
      true
    );
  });

  it("warms MD052 parsing without leaking its helper rule", async () => {
    const findings = await lintMarkdownString(
      "references.md",
      "### Warmup heading\n[full][missing-full]\n[collapsed][]\n![image][missing-image]\n[x][x]\n[shortcut]\n",
      ["reference-links-images"]
    );
    assert.notEqual(typeof findings, "string");
    if (typeof findings === "string") return;
    assert.equal(findings.length, 3);
    assert.equal(
      findings.every((finding) => finding.rule === "reference-links-images"),
      true
    );
  });
});
