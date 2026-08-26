import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { parseMarkdownLinkFacts } from "./markdown-parser.ts";

describe("Markdown link parser", () => {
  it("collects GFM inline, image, reference, and autolink occurrences", () => {
    const markdown = [
      "---",
      "title: [front matter](front-matter.md)",
      "---",
      "[inline](inline.md)",
      "![image](image.png)",
      "[full label][full-reference]",
      "[collapsed][]",
      "[shortcut]",
      "![reference image][image-reference]",
      "<https://explicit.example/path>",
      "https://literal.example/path",
      "[undefined][missing-reference]",
      "`[code](code.md)`",
      "```md",
      "[fenced](fenced.md)",
      "```",
      '<a href="attribute.html">HTML</a>',
      "plain.example/path",
      "",
      "[full-reference]: full.md",
      "[collapsed]: collapsed.md",
      "[shortcut]: shortcut.md",
      "[image-reference]: image-reference.png"
    ].join("\n");

    const facts = parsedFacts(markdown);

    assert.deepEqual(
      facts.occurrences.map((occurrence) => [occurrence.kind, occurrence.rawDestination]),
      [
        ["link", "inline.md"],
        ["image", "image.png"],
        ["link", "full.md"],
        ["link", "collapsed.md"],
        ["link", "shortcut.md"],
        ["image", "image-reference.png"],
        ["link", "https://explicit.example/path"],
        ["link", "https://literal.example/path"]
      ]
    );
    assert.deepEqual(
      facts.occurrences.map((occurrence) => occurrence.range),
      [
        expectedRange(markdown, "[inline](inline.md)"),
        expectedRange(markdown, "![image](image.png)"),
        expectedRange(markdown, "[full label][full-reference]"),
        expectedRange(markdown, "[collapsed][]"),
        expectedRange(markdown, "[shortcut]"),
        expectedRange(markdown, "![reference image][image-reference]"),
        expectedRange(markdown, "<https://explicit.example/path>"),
        expectedRange(markdown, "https://literal.example/path")
      ]
    );
  });

  it("generates fresh GitHub-compatible slugs for ATX and Setext headings", () => {
    const markdown = [
      "---",
      "title: ignored heading",
      "---",
      "# Hello, World!",
      "Hello, World!",
      "=============",
      "## Café & tea",
      "## 你好，世界",
      "# Hello, World!"
    ].join("\n");

    assert.deepEqual(parsedFacts(markdown).headings, [
      { slug: "hello-world", range: expectedRange(markdown, "# Hello, World!") },
      {
        slug: "hello-world-1",
        range: expectedRange(
          markdown,
          "Hello, World!\n=============",
          markdown.indexOf("Hello, World!", markdown.indexOf("Hello, World!") + 1)
        )
      },
      { slug: "café--tea", range: expectedRange(markdown, "## Café & tea") },
      { slug: "你好世界", range: expectedRange(markdown, "## 你好，世界") },
      {
        slug: "hello-world-2",
        range: expectedRange(markdown, "# Hello, World!", markdown.lastIndexOf("# Hello, World!"))
      }
    ]);

    assert.deepEqual(
      parsedFacts("# Hello, World!").headings.map((heading) => heading.slug),
      ["hello-world"]
    );
  });

  it("reports decoded UTF-16 source ranges with 1-based, end-exclusive positions", () => {
    const markdown = "😀 [link](target.md)\n";
    const [occurrence] = parsedFacts(markdown).occurrences;

    assert.deepEqual(occurrence?.range, {
      startOffset: 3,
      endOffset: 20,
      start: { line: 1, column: 4 },
      end: { line: 1, column: 21 }
    });
  });

  it("returns immutable facts and a controlled failure for malformed decoded text", () => {
    const parsed = parseMarkdownLinkFacts("# Heading\n[link](target.md)");
    assert.equal(parsed.ok, true);
    if (!parsed.ok) {
      assert.fail("expected Markdown parser facts");
    }

    assert.equal(Object.isFrozen(parsed), true);
    assert.equal(Object.isFrozen(parsed.facts), true);
    assert.equal(Object.isFrozen(parsed.facts.occurrences), true);
    assert.equal(Object.isFrozen(parsed.facts.occurrences[0] as object), true);
    assert.equal(Object.isFrozen(parsed.facts.occurrences[0]?.range as object), true);
    assert.equal(Object.isFrozen(parsed.facts.headings), true);
    assert.equal(Object.isFrozen(parsed.facts.headings[0] as object), true);

    assert.deepEqual(parseMarkdownLinkFacts("\ud800"), {
      ok: false,
      reason: "markdown-parse-failure"
    });
  });
});

function parsedFacts(markdown: string) {
  const parsed = parseMarkdownLinkFacts(markdown);
  if (!parsed.ok) {
    assert.fail(`expected Markdown facts, received ${parsed.reason}`);
  }
  return parsed.facts;
}

function expectedRange(
  markdown: string,
  source: string,
  offset = markdown.indexOf(source)
): {
  readonly startOffset: number;
  readonly endOffset: number;
  readonly start: { readonly line: number; readonly column: number };
  readonly end: { readonly line: number; readonly column: number };
} {
  assert.notEqual(offset, -1, `missing source: ${source}`);
  const endOffset = offset + source.length;
  return {
    startOffset: offset,
    endOffset,
    start: sourcePosition(markdown, offset),
    end: sourcePosition(markdown, endOffset)
  };
}

function sourcePosition(
  markdown: string,
  offset: number
): {
  readonly line: number;
  readonly column: number;
} {
  const prefix = markdown.slice(0, offset);
  const line = prefix.split("\n").length;
  const previousNewline = prefix.lastIndexOf("\n");
  return { line, column: offset - previousNewline };
}
