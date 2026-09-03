import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { parseMarkdownLinkFacts } from "./markdown-parser.ts";
import {
  MARKDOWN_LINK_PARSE_FACTS_PARSER_CONTRACT_VERSION,
  MarkdownLinkParseFactsSession,
  parseMarkdownLinkParseFactsPayload,
  projectMarkdownLinkParseFactsPayload
} from "./parse-facts-cache.ts";

const CACHE_FILE = "markdown-link-parse-facts-v1.jsonl";
const CACHE_FORMAT = "markdown-link-parse-facts-jsonl-v1";

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
    const identityDigest = digest(bytes);
    try {
      await writeFile(path.join(directory, "legacy-entry.json"), '{"hostile":true}');
      await writeFile(
        path.join(directory, CACHE_FILE),
        `${envelope(identityDigest, parserFacts("# Stale\n"), "stale-parser-contract")}\n`
      );
      const session = new MarkdownLinkParseFactsSession(
        Object.freeze({ enabled: true as const, directory })
      );
      const first = await session.parse(bytes, new AbortController().signal);
      const second = await session.parse(bytes, new AbortController().signal);
      assertFactsHeadings(first, ["current"]);
      assertFactsHeadings(second, ["current"]);
      if (first === undefined || !first.ok || second === undefined || !second.ok) {
        assert.fail("expected current parser facts");
      }
      assert.strictEqual(second.facts, first.facts);
      await session.finalize(new AbortController().signal);

      const lines = completeLines(await readFile(path.join(directory, CACHE_FILE), "utf8"));
      assert.equal(lines.length, 2);
      assert.equal(
        await readFile(path.join(directory, "legacy-entry.json"), "utf8"),
        '{"hostile":true}'
      );
      assert.notEqual(MARKDOWN_LINK_PARSE_FACTS_PARSER_CONTRACT_VERSION, "stale-parser-contract");
      const publishedEnvelope: unknown = JSON.parse(lines[1] ?? "{}");
      assert.equal(
        typeof publishedEnvelope === "object" &&
          publishedEnvelope !== null &&
          "identityDigest" in publishedEnvelope
          ? publishedEnvelope.identityDigest
          : undefined,
        identityDigest
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("awaits the append once publication has started despite later cancellation", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "vibe-check-markdown-link-cache-cancel-"));
    const controller = new AbortController();
    let abortedChecks = 0;
    const signal = new Proxy(controller.signal, {
      get(target, property): unknown {
        if (property !== "aborted") return Reflect.get(target, property, target);
        abortedChecks += 1;
        const aborted = target.aborted;
        // The second check is after mkdir and immediately before appendFile starts.
        if (abortedChecks === 2) controller.abort();
        return aborted;
      }
    });
    try {
      const session = new MarkdownLinkParseFactsSession(
        Object.freeze({ enabled: true as const, directory })
      );
      assertFactsHeadings(
        await session.parse(new TextEncoder().encode("# Current\n"), controller.signal),
        ["current"]
      );
      await session.finalize(signal);

      assert.equal(controller.signal.aborted, true);
      assert.equal(
        completeLines(await readFile(path.join(directory, CACHE_FILE), "utf8")).length,
        1
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("ignores malformed, unknown, and unterminated lines while last valid identity wins", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "vibe-check-markdown-link-cache-lines-"));
    const bytes = new TextEncoder().encode("# Current\n");
    const identityDigest = digest(bytes);
    const partialTail = envelope(identityDigest, parserFacts("# Tail ignored\n")).slice(0, -1);
    try {
      await writeFile(
        path.join(directory, CACHE_FILE),
        [
          "{malformed}",
          envelope(
            identityDigest,
            parserFacts("# Wrong version\n"),
            undefined,
            "different-version"
          ),
          envelope(identityDigest, parserFacts("# First\n")),
          envelope(identityDigest, parserFacts("# Last\n")),
          partialTail
        ].join("\n")
      );
      const session = new MarkdownLinkParseFactsSession(
        Object.freeze({ enabled: true as const, directory })
      );
      const parsed = await session.parse(bytes, new AbortController().signal);
      assertFactsHeadings(parsed, ["last"]);
      await writeFile(
        path.join(directory, CACHE_FILE),
        `\n${envelope(digest(new TextEncoder().encode("# Fresh publication\n")), parserFacts("# Disk stale\n"))}`,
        { flag: "a" }
      );
      assertFactsHeadings(
        await session.parse(
          new TextEncoder().encode("# Fresh publication\n"),
          new AbortController().signal
        ),
        ["fresh-publication"]
      );
      await session.finalize(new AbortController().signal);

      const contents = await readFile(path.join(directory, CACHE_FILE), "utf8");
      assert.equal(contents.includes(`${partialTail}\n{`), true);
      assert.equal(contents.endsWith("\n"), true);
      assert.equal(contents.endsWith("\n\n"), false);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rejects cached facts when the exact source bytes are not valid UTF-8", async () => {
    const directory = await mkdtemp(
      path.join(tmpdir(), "vibe-check-markdown-link-cache-fatal-utf8-")
    );
    const invalidUtf8 = new Uint8Array([0xc3]);
    try {
      await writeFile(
        path.join(directory, CACHE_FILE),
        `${envelope(digest(invalidUtf8), parserFacts("# Cached\n"))}\n`
      );
      const session = new MarkdownLinkParseFactsSession(
        Object.freeze({ enabled: true as const, directory })
      );
      assert.equal(await session.parse(invalidUtf8, new AbortController().signal), undefined);
      await session.finalize(new AbortController().signal);
      assert.equal(
        completeLines(await readFile(path.join(directory, CACHE_FILE), "utf8")).length,
        1
      );
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

function digest(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function envelope(
  identityDigest: string,
  facts: ReturnType<typeof parserFacts>,
  parserContractVersion = MARKDOWN_LINK_PARSE_FACTS_PARSER_CONTRACT_VERSION,
  cacheFormatVersion = CACHE_FORMAT
): string {
  return JSON.stringify({
    cacheFormatVersion,
    identityDigest,
    parserContractVersion,
    payloadVersion: "1",
    payload: projectMarkdownLinkParseFactsPayload(facts)
  });
}

function completeLines(contents: string): string[] {
  return contents.split("\n").filter((line) => line !== "");
}

function assertFactsHeadings(
  parsed: Awaited<ReturnType<MarkdownLinkParseFactsSession["parse"]>>,
  expected: string[]
): void {
  if (parsed === undefined || !parsed.ok) assert.fail("expected current parser facts");
  assert.deepEqual(
    parsed.facts.headings.map((heading) => heading.slug),
    expected
  );
}
