/**
 * Storage-mechanics microbenchmark for a possible Markdown Link packed cache.
 *
 * This is not a formal Check benchmark: it deliberately prepares parser payloads
 * before each timed sample and does not invoke executeMarkdownLinkValidation.
 * Its only purpose is to compare serial filesystem/cache mechanics using the
 * archived deterministic 1,160-document payload shape.
 */
import { createHash, randomUUID } from "node:crypto";
import { cpus, tmpdir } from "node:os";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  statfs,
  writeFile
} from "node:fs/promises";
import path from "node:path";

import { parseMarkdownLinkFacts } from "../../../../src/package-checks/markdown-link-validation/markdown-parser.ts";
import {
  parseMarkdownLinkParseFactsPayload,
  projectMarkdownLinkParseFactsPayload
} from "../../../../src/package-checks/markdown-link-validation/parse-facts-cache.ts";

const SEED = 0x5eedc0de;
const SOURCE_COUNT = 1_000;
const NORMAL_TARGET_COUNT = 160;
const SAMPLES_PER_SCENARIO = 5;
const PACK_SIZES = [1, 16, 64, 256, "all"] as const;
const PACK_FORMAT = "markdown-link-packed-mechanics-v1";

type PackSize = (typeof PACK_SIZES)[number];
type Payload = ReturnType<typeof projectMarkdownLinkParseFactsPayload>;
type Entry = Readonly<{
  digest: string;
  mutatedDigest: string;
  payload: Payload;
  mutatedPayload: Payload;
  relativePath: string;
}>;
type Scenario =
  | "cold-population"
  | "warm-full-scan"
  | "warm-partial-1"
  | "warm-partial-100"
  | "single-file-incremental";
type Counter = {
  lookupReadAttempts: number;
  lookupMisses: number;
  lookupReadBytes: number;
  jsonParses: number;
  restoredEntries: number;
  mkdirCalls: number;
  temporaryWrites: number;
  temporaryWriteBytes: number;
  renames: number;
  publishedFiles: number;
};
type Sample = Readonly<{
  packSize: PackSize;
  scenario: Scenario;
  repetition: number;
  wallMs: number;
  cpuUserMicros: number;
  cpuSystemMicros: number;
  processMaxRssBytes: number;
  counters: Counter;
  footprint: {
    fileCount: number;
    bytes: number;
    entries: number;
    nonEmptyPackCount: number;
    minEntriesPerPack: number;
    maxEntriesPerPack: number;
  };
}>;

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function guide(relativePath: string, targetCount: number, random: () => number): string {
  const source = Number(relativePath.match(/(\d+)/)?.[1] ?? 0);
  const targetLinks = 1 + Math.floor(random() * 5);
  const fillerBytes = [512, 2_048, 8_192][Math.floor(random() * 3)] ?? 512;
  const lines = [`# Guide ${source}`, "", `## local-${source % 11}`, ""];
  for (let link = 0; link < targetLinks; link += 1) {
    const target = (source * 17 + link * 29 + Math.floor(random() * targetCount)) % targetCount;
    lines.push(
      `[target-${target}](../targets/topic-${target.toString().padStart(3, "0")}.md#topic-${target % 7})`
    );
  }
  lines.push("", "x".repeat(fillerBytes));
  return `${lines.join("\n")}\n`;
}

function parsePayload(markdown: string): Payload {
  const parsed = parseMarkdownLinkFacts(markdown);
  assert(parsed.ok, "deterministic fixture must parse");
  return projectMarkdownLinkParseFactsPayload(parsed.facts);
}

function digest(markdown: string): string {
  return createHash("sha256").update(new TextEncoder().encode(markdown)).digest("hex");
}

function buildEntries(): readonly Entry[] {
  const random = rng(SEED + NORMAL_TARGET_COUNT);
  const entries: Entry[] = [];
  for (let target = 0; target < NORMAL_TARGET_COUNT; target += 1) {
    const markdown = `# Target ${target}\n\n## topic-${target % 7}\n\nDeterministic target ${target}.\n`;
    entries.push(
      Object.freeze({
        digest: digest(markdown),
        mutatedDigest: digest(markdown),
        payload: parsePayload(markdown),
        mutatedPayload: parsePayload(markdown),
        relativePath: `targets/topic-${target.toString().padStart(3, "0")}.md`
      })
    );
  }
  for (let source = 0; source < SOURCE_COUNT; source += 1) {
    const relativePath = `guides/guide-${source.toString().padStart(4, "0")}.md`;
    const markdown = guide(relativePath, NORMAL_TARGET_COUNT, random);
    const mutated = source === 500 ? `${markdown}\n## incremental-change\n` : markdown;
    entries.push(
      Object.freeze({
        digest: digest(markdown),
        mutatedDigest: digest(mutated),
        payload: parsePayload(markdown),
        mutatedPayload: parsePayload(mutated),
        relativePath
      })
    );
  }
  return Object.freeze(entries);
}

function emptyCounter(): Counter {
  return {
    lookupReadAttempts: 0,
    lookupMisses: 0,
    lookupReadBytes: 0,
    jsonParses: 0,
    restoredEntries: 0,
    mkdirCalls: 0,
    temporaryWrites: 0,
    temporaryWriteBytes: 0,
    renames: 0,
    publishedFiles: 0
  };
}

function resourceSnapshot() {
  const usage = process.resourceUsage();
  return {
    user: usage.userCPUTime,
    system: usage.systemCPUTime,
    processMaxRssBytes: usage.maxRSS * 1_024
  };
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function mad(values: readonly number[]): number {
  const middle = median(values);
  return median(values.map((value) => Math.abs(value - middle)));
}

function shardCount(packSize: PackSize, totalEntries: number): number {
  return packSize === 1
    ? totalEntries
    : packSize === "all"
      ? 1
      : Math.ceil(totalEntries / packSize);
}

function shardFor(digestValue: string, count: number): number {
  return Number.parseInt(digestValue.slice(0, 8), 16) % count;
}

function fileName(digestValue: string, packSize: PackSize, totalEntries: number): string {
  if (packSize === 1) return `${digestValue}.json`;
  return `pack-${shardFor(digestValue, shardCount(packSize, totalEntries)).toString().padStart(4, "0")}.json`;
}

type DecodedFile = Map<string, Payload>;

function encodeFile(
  entries: ReadonlyMap<string, Payload>,
  file: string,
  packSize: PackSize
): string {
  if (packSize === 1) {
    const [identityDigest, payload] = entries.entries().next().value as [string, Payload];
    return JSON.stringify({ cacheFormatVersion: "caller-keyed-json-v1", identityDigest, payload });
  }
  return JSON.stringify({ format: PACK_FORMAT, file, entries: Object.fromEntries(entries) });
}

function decodeFile(source: string, expectedFile: string, packSize: PackSize): DecodedFile {
  const value: unknown = JSON.parse(source);
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new TypeError("cache file must be an object");
  const record = value as Record<string, unknown>;
  if (packSize === 1) {
    if (typeof record.identityDigest !== "string" || !("payload" in record))
      throw new TypeError("entry envelope is invalid");
    return new Map([[record.identityDigest, record.payload as Payload]]);
  }
  if (
    record.format !== PACK_FORMAT ||
    record.file !== expectedFile ||
    typeof record.entries !== "object" ||
    record.entries === null ||
    Array.isArray(record.entries)
  )
    throw new TypeError("pack envelope is invalid");
  return new Map(Object.entries(record.entries as Record<string, Payload>));
}

class SerialStorageExperiment {
  readonly #directory: string;
  readonly #packSize: PackSize;
  readonly #totalEntries: number;
  readonly counters = emptyCounter();
  readonly #loaded = new Map<string, DecodedFile>();
  readonly #dirty = new Set<string>();

  constructor(directory: string, packSize: PackSize, totalEntries: number) {
    this.#directory = directory;
    this.#packSize = packSize;
    this.#totalEntries = totalEntries;
  }

  async restoreOrStage(entry: Entry, payload: Payload): Promise<void> {
    const file = fileName(entry.digest, this.#packSize, this.#totalEntries);
    const entries = await this.#load(file);
    const restored = entries.get(entry.digest);
    if (restored !== undefined) {
      parseMarkdownLinkParseFactsPayload(restored);
      this.counters.restoredEntries += 1;
      return;
    }
    entries.set(entry.digest, payload);
    this.#dirty.add(file);
  }

  async publish(): Promise<void> {
    for (const file of [...this.#dirty].sort()) {
      const temporary = path.join(this.#directory, `.pack-experiment-${randomUUID()}.tmp`);
      const encoded = encodeFile(this.#loaded.get(file) ?? new Map(), file, this.#packSize);
      this.counters.mkdirCalls += 1;
      await mkdir(this.#directory, { recursive: true });
      this.counters.temporaryWrites += 1;
      this.counters.temporaryWriteBytes += Buffer.byteLength(encoded);
      await writeFile(temporary, encoded, { encoding: "utf8", flag: "wx" });
      this.counters.renames += 1;
      await rename(temporary, path.join(this.#directory, file));
      this.counters.publishedFiles += 1;
    }
    this.#dirty.clear();
  }

  async #load(file: string): Promise<DecodedFile> {
    const remembered = this.#loaded.get(file);
    if (remembered !== undefined) return remembered;
    this.counters.lookupReadAttempts += 1;
    try {
      const source = await readFile(path.join(this.#directory, file), "utf8");
      this.counters.lookupReadBytes += Buffer.byteLength(source);
      this.counters.jsonParses += 1;
      const decoded = decodeFile(source, file, this.#packSize);
      this.#loaded.set(file, decoded);
      return decoded;
    } catch (error: unknown) {
      if (
        typeof error !== "object" ||
        error === null ||
        (error as { code?: unknown }).code !== "ENOENT"
      )
        throw error;
      this.counters.lookupMisses += 1;
      const empty = new Map<string, Payload>();
      this.#loaded.set(file, empty);
      return empty;
    }
  }
}

async function footprint(directory: string, packSize: PackSize): Promise<Sample["footprint"]> {
  const files = await readdir(directory);
  let bytes = 0;
  const entryCounts: number[] = [];
  for (const file of files) {
    bytes += (await stat(path.join(directory, file))).size;
    entryCounts.push(
      decodeFile(await readFile(path.join(directory, file), "utf8"), file, packSize).size
    );
  }
  return {
    fileCount: files.length,
    bytes,
    entries: entryCounts.reduce((total, count) => total + count, 0),
    nonEmptyPackCount: entryCounts.length,
    minEntriesPerPack: Math.min(...entryCounts),
    maxEntriesPerPack: Math.max(...entryCounts)
  };
}

async function prewarm(
  directory: string,
  packSize: PackSize,
  entries: readonly Entry[]
): Promise<void> {
  const storage = new SerialStorageExperiment(directory, packSize, entries.length);
  for (const entry of entries) await storage.restoreOrStage(entry, entry.payload);
  await storage.publish();
}

async function oneSample(
  root: string,
  packSize: PackSize,
  scenario: Scenario,
  repetition: number,
  entries: readonly Entry[]
): Promise<Sample> {
  const directory = path.join(root, `${scenario}-${String(packSize)}-${repetition}`);
  await mkdir(directory, { recursive: true });
  if (scenario !== "cold-population") await prewarm(directory, packSize, entries);
  const selected =
    scenario === "warm-full-scan" || scenario === "cold-population"
      ? entries
      : scenario === "warm-partial-1" || scenario === "single-file-incremental"
        ? entries.filter((entry) => entry.relativePath === "guides/guide-0500.md")
        : entries.filter((entry) => entry.relativePath.startsWith("guides/")).slice(0, 100);
  const storage = new SerialStorageExperiment(directory, packSize, entries.length);
  const before = resourceSnapshot();
  const started = performance.now();
  for (const entry of selected) {
    const payload = scenario === "single-file-incremental" ? entry.mutatedPayload : entry.payload;
    const key =
      scenario === "single-file-incremental"
        ? Object.freeze({ ...entry, digest: entry.mutatedDigest })
        : entry;
    await storage.restoreOrStage(key, payload);
  }
  // Deferred pack publication remains inside the timed interval and is serial.
  await storage.publish();
  const wallMs = performance.now() - started;
  const after = resourceSnapshot();
  const sample = Object.freeze({
    packSize,
    scenario,
    repetition,
    wallMs,
    cpuUserMicros: after.user - before.user,
    cpuSystemMicros: after.system - before.system,
    processMaxRssBytes: after.processMaxRssBytes,
    counters: storage.counters,
    footprint: await footprint(directory, packSize)
  });
  await rm(directory, { recursive: true, force: true });
  return sample;
}

function summarize(samples: readonly Sample[]) {
  const byKey = new Map<string, Sample[]>();
  for (const sample of samples) {
    const key = `${sample.packSize}:${sample.scenario}`;
    byKey.set(key, [...(byKey.get(key) ?? []), sample]);
  }
  return Object.fromEntries(
    [...byKey].map(([key, group]) => [
      key,
      {
        sampleCount: group.length,
        medianWallMs: median(group.map((sample) => sample.wallMs)),
        madWallMs: mad(group.map((sample) => sample.wallMs)),
        medianCpuMicros: median(
          group.map((sample) => sample.cpuUserMicros + sample.cpuSystemMicros)
        ),
        medianCounters: Object.fromEntries(
          Object.keys(group[0]?.counters ?? {}).map((counter) => [
            counter,
            median(group.map((sample) => sample.counters[counter as keyof Counter]))
          ])
        ),
        footprint: group[0]?.footprint
      }
    ])
  );
}

async function main(): Promise<void> {
  const outputFlag = process.argv.indexOf("--output");
  const output = outputFlag >= 0 ? process.argv[outputFlag + 1] : undefined;
  assert(output !== undefined, "usage: bun benchmark.ts --output <path>");
  const entries = buildEntries();
  assert(entries.length === 1_160, "fixture must contain 1,160 Markdown entries");
  const payloadBytes = entries.reduce(
    (total, entry) =>
      total +
      Buffer.byteLength(
        JSON.stringify({
          cacheFormatVersion: "caller-keyed-json-v1",
          identityDigest: entry.digest,
          payload: entry.payload
        })
      ),
    0
  );
  const root = await mkdtemp(path.join(tmpdir(), "vibe-check-packed-cache-mechanics-"));
  try {
    const samples: Sample[] = [];
    for (const packSize of PACK_SIZES) {
      for (const scenario of [
        "cold-population",
        "warm-full-scan",
        "warm-partial-1",
        "warm-partial-100",
        "single-file-incremental"
      ] as const) {
        for (let repetition = 1; repetition <= SAMPLES_PER_SCENARIO; repetition += 1) {
          samples.push(await oneSample(root, packSize, scenario, repetition, entries));
        }
      }
    }
    const outputValue = {
      schemaVersion: 1,
      generatedAtUtc: new Date().toISOString(),
      command: `bun ${path.relative(process.cwd(), import.meta.path)} --output ${output}`,
      scope:
        "storage-mechanics microbenchmark only; it does not execute formal Markdown Link Check runtime and cannot establish end-to-end Check savings",
      measurement: {
        samplesPerScenario: SAMPLES_PER_SCENARIO,
        wallTime:
          "performance.now() covers only the serial lookup/publication interval; payload preparation, directory setup, warm prepopulation, and footprint accounting are outside the interval",
        cpu: "per-sample process.resourceUsage user+system deltas",
        processMaxRssBytes:
          "process.resourceUsage().maxRSS sampled after each scenario is a process-lifetime cumulative high-water, not per-sample memory, a delta, or timed-interval memory. It is retained only as diagnostic context and must not support memory or optimization conclusions."
      },
      environment: {
        bun: Bun.version,
        os: process.platform,
        arch: process.arch,
        cpu: cpus()[0]?.model,
        cpuCount: cpus().length,
        tmpdir: tmpdir(),
        statfs: await statfs(root)
      },
      fixture: {
        seed: SEED,
        sourceCount: SOURCE_COUNT,
        normalTargetCount: NORMAL_TARGET_COUNT,
        totalMarkdownFiles: entries.length,
        sizes: [512, 2_048, 8_192],
        targetLinksPerSource: "deterministic 1..5",
        preparedPerEntryEnvelopeBytes: payloadBytes,
        parserPayloadPreparation:
          "real parseMarkdownLinkFacts + projectMarkdownLinkParseFactsPayload, completed before any timed sample"
      },
      algorithm: {
        common:
          "strictly serial await-based reads and publications; no background write; cold starts with empty application cache; warm scenarios prepopulate outside timing",
        packMapping:
          "for pack sizes >1, digest first 32 bits modulo ceil(1160 / requestedPackSize); pack size is expected rather than a hard cap",
        entryFiles: "packSize=1 is the current-style one digest JSON envelope per file",
        packFiles:
          "first selected digest for a file loads and JSON.parses the complete pack; requested entry only is restored with the current strict payload parser; misses are staged in memory and all dirty packs atomically publish before sample end",
        corruptionAssumption:
          "invalid/missing pack is a cache miss/fresh-parse fallback in a future product; this mechanics experiment throws rather than measuring recovery",
        concurrencyAssumption:
          "no concurrent writer is run. A future last-writer-wins pack design can lose a concurrently added entry and needs separate correctness/design work",
        growthAssumption:
          "content-digest entries accumulate; no TTL/LRU/quota/deletion is modeled. Incremental adds one new digest to its affected pack",
        memoryBoundary:
          "processMaxRssBytes is process-lifetime high-water diagnostic context, not per-sample/timed-interval memory and not an optimization result"
      },
      scenarios: {
        "cold-population":
          "empty lookup plus parse-independent payload publication for all 1,160 entries",
        "warm-full-scan":
          "prewarmed full corpus; measures serial load/JSON parse and strict payload restoration",
        "warm-partial-1":
          "prewarmed one selected guide; a pack implementation reads its entire containing pack",
        "warm-partial-100":
          "prewarmed first 100 guides; a pack implementation reads every distinct containing pack",
        "single-file-incremental":
          "prewarmed original corpus then one guide uses a new deterministic digest/payload; deferred affected-pack publication is timed"
      },
      samples,
      summaries: summarize(samples)
    };
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(outputValue, null, 2)}\n`, "utf8");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

await main();
