import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { cacheJsonByKey } from "../../../../src/cache/cache-json-by-key.ts";
import { parseMarkdownLinkFacts } from "../../../../src/package-checks/markdown-link-validation/markdown-parser.ts";
import { parseMarkdownLinkFactsWithCache } from "../../../../src/package-checks/markdown-link-validation/parse-facts-cache.ts";

const payloadChars = Number(process.env.PAYLOAD_CHARS ?? 0);
const payloadString = "x".repeat(payloadChars);
const count = Number(process.env.COUNT ?? 1160);
const rounds = Number(process.env.ROUNDS ?? 7);
const only = process.env.ONLY ?? "all";
const root = await fs.mkdtemp(join(tmpdir(), "vibe-cache-profile-"));
const documents = Array.from({ length: count }, (_, index) =>
  new TextEncoder().encode(
    `# Guide ${index}\n\n## section-${index % 11}\n\n[target](../targets/topic-${index % 160}.md#topic-${index % 7})\n\n${"x".repeat([512, 2048, 8192][index % 3]!)}\n`
  )
);
const abortController = new AbortController();

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)]!;
}

function range(values: readonly number[]): string {
  return `${Math.min(...values).toFixed(2)}-${Math.max(...values).toFixed(2)}`;
}

async function cacheStats(
  directory: string
): Promise<Readonly<{ entries: number; bytes: number }>> {
  const entries = (await fs.readdir(directory)).filter((entry) => entry.endsWith(".json"));
  let bytes = 0;
  for (const entry of entries) {
    bytes += (await fs.stat(join(directory, entry))).size;
  }
  return { entries: entries.length, bytes };
}

async function freshParse(): Promise<void> {
  for (const bytes of documents) {
    parseMarkdownLinkFacts(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  }
}

async function parseCache(directory: string): Promise<void> {
  const cache = Object.freeze({ enabled: true as const, directory });
  for (const bytes of documents) {
    const parsed = await parseMarkdownLinkFactsWithCache(bytes, cache, abortController.signal);
    if (!parsed?.ok) throw new Error("bad");
  }
}

async function cacheOnly(directory: string): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    const key = createHash("sha256").update(String(index)).digest("hex");
    const cached = await cacheJsonByKey({
      directory,
      namespace: "profile",
      version: "1",
      key,
      compute: () => ({ occurrences: [], headings: [], payloadString }),
      parse: (
        value
      ): {
        occurrences: readonly unknown[];
        headings: readonly unknown[];
        payloadString: string;
      } => {
        if (typeof value !== "object" || value === null) throw new Error("bad");
        return value as {
          occurrences: readonly unknown[];
          headings: readonly unknown[];
          payloadString: string;
        };
      }
    });
    if (!cached.value) throw new Error("bad");
  }
}

async function timed(label: string, work: () => Promise<void>): Promise<void> {
  const allMs: number[] = [];
  for (let round = 0; round < rounds; round += 1) {
    const started = performance.now();
    await work();
    allMs.push(performance.now() - started);
  }
  console.log(
    JSON.stringify({
      label,
      rounds,
      allMs,
      medianMs: median(allMs),
      rangeMs: range(allMs),
      perEntryMedianMs: median(allMs) / count
    })
  );
}

try {
  if (only === "all" || only === "fresh") {
    await timed("fresh-parse", freshParse);
  }
  if (only === "all" || only === "cacheonly") {
    for (let round = 0; round < rounds; round += 1) {
      const directory = join(root, `co-cold-${round}`);
      const started = performance.now();
      await cacheOnly(directory);
      const ms = performance.now() - started;
      console.log(
        JSON.stringify({
          label: "cache-only-cold",
          round,
          ms,
          perEntryMs: ms / count,
          ...(await cacheStats(directory))
        })
      );
    }
    const directory = join(root, "co-warm");
    await cacheOnly(directory);
    await timed("cache-only-warm", () => cacheOnly(directory));
  }
  if (only === "all" || only === "parsecache") {
    for (let round = 0; round < rounds; round += 1) {
      const directory = join(root, `pc-cold-${round}`);
      const started = performance.now();
      await parseCache(directory);
      const ms = performance.now() - started;
      console.log(
        JSON.stringify({
          label: "parse-cache-cold",
          round,
          ms,
          perEntryMs: ms / count,
          ...(await cacheStats(directory))
        })
      );
    }
    const directory = join(root, "pc-warm");
    await parseCache(directory);
    await timed("parse-cache-warm", () => parseCache(directory));
  }
} finally {
  if (process.env.KEEP !== "1") {
    await fs.rm(root, { recursive: true, force: true });
  } else {
    console.error(root);
  }
}
