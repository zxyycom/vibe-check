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
    for (const frontMatter of [
      "---\nlink: '[empty]()'\n---\n",
      '+++\nlink = "[empty]()"\n+++\n',
      '{\n  "link": "[empty]()"\n}\n'
    ]) {
      const findings = await lintMarkdownString(
        "dialect.md",
        `${frontMatter}<!-- markdownlint-disable MD018 -->\n#missing\n`,
        ["no-empty-links", "no-missing-space-atx"]
      );
      assert.deepEqual(findings, [{ lineNumber: 5, range: [1, 2], rule: "no-missing-space-atx" }]);
    }
  });

  it("warms MD052 parsing without leaking its helper rule", async () => {
    const findings = await lintMarkdownString(
      "references.md",
      "# Title\n### Warmup heading\n[full][missing-full]\n[collapsed][]\n![image][missing-image]\n[x][x]\n[shortcut]\n",
      ["reference-links-images"]
    );
    assert.deepEqual(findings, [
      { lineNumber: 3, range: [1, 20], rule: "reference-links-images" },
      { lineNumber: 4, range: [1, 13], rule: "reference-links-images" },
      { lineNumber: 5, range: [1, 23], rule: "reference-links-images" }
    ]);
  });
});
