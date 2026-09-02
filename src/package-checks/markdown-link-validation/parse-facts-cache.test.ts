import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { cacheJsonByKey } from "../../cache/cache-json-by-key.ts";
import { parseMarkdownLinkFacts } from "./markdown-parser.ts";
import {
  MARKDOWN_LINK_PARSE_FACTS_PARSER_CONTRACT_VERSION,
  parseMarkdownLinkFactsWithCache,
  parseMarkdownLinkParseFactsPayload,
  projectMarkdownLinkParseFactsPayload
} from "./parse-facts-cache.ts";

describe("Markdown Link parse-facts cache", () => {
  it("restores only closed immutable parser facts", () => {
    const facts = parserFacts("# Heading\n[link](target.md)\n");
    const restored = parseMarkdownLinkParseFactsPayload(
      projectMarkdownLinkParseFactsPayload(facts)
    );

    assert.deepEqual(restored, facts);
    assert.equal(Object.isFrozen(restored), true);
    assert.equal(Object.isFrozen(restored.occurrences), true);
    assert.equal(Object.isFrozen(restored.occurrences[0] as object), true);
    assert.equal(Object.isFrozen(restored.occurrences[0]?.range as object), true);
    assert.equal(Object.isFrozen(restored.headings), true);
    assert.equal(Object.isFrozen(restored.headings[0] as object), true);
    assert.throws(() =>
      parseMarkdownLinkParseFactsPayload({
        occurrences: [],
        headings: [],
        unexpected: true
      })
    );
    assert.throws(() =>
      parseMarkdownLinkParseFactsPayload({
        occurrences: [
          {
            kind: "link",
            rawDestination: "target.md",
            range: {
              startOffset: 2,
              endOffset: 1,
              start: { line: 1, column: 2 },
              end: { line: 1, column: 1 }
            }
          }
        ],
        headings: []
      })
    );
  });

  it("invalidates entries written for a different parser-contract version", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "vibe-check-markdown-link-cache-version-"));
    const markdown = "# Current\n";
    const bytes = new TextEncoder().encode(markdown);
    try {
      await cacheJsonByKey({
        compute: () => projectMarkdownLinkParseFactsPayload(parserFacts("# Stale\n")),
        directory,
        key: createHash("sha256").update(bytes).digest("hex"),
        namespace: "markdown-link-parse-facts",
        parse: parseMarkdownLinkParseFactsPayload,
        version: "1:stale-parser-contract"
      });

      const parsed = await parseMarkdownLinkFactsWithCache(
        markdown,
        bytes,
        Object.freeze({ enabled: true as const, directory }),
        new AbortController().signal
      );
      if (parsed === undefined) assert.fail("expected a non-cancelled parser result");
      assert.equal(parsed.ok, true);
      if (!parsed.ok) assert.fail("expected current parser facts");
      assert.deepEqual(
        parsed.facts.headings.map((heading) => heading.slug),
        ["current"]
      );
      assert.notEqual(MARKDOWN_LINK_PARSE_FACTS_PARSER_CONTRACT_VERSION, "stale-parser-contract");
      assert.equal((await readdir(directory)).filter((entry) => entry.endsWith(".json")).length, 2);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

function parserFacts(markdown: string) {
  const parsed = parseMarkdownLinkFacts(markdown);
  if (!parsed.ok) assert.fail(`expected Markdown facts, received ${parsed.reason}`);
  return parsed.facts;
}
