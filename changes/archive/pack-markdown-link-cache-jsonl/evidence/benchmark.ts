/**
 * Formal runtime evidence for the active JSONL cache Plan.
 *
 * This file deliberately invokes the current direct Check envelope only. It
 * does not reproduce the archived prototype, instrument private I/O counters,
 * or make storage-only measurements into a runtime result.
 */
import { createHash } from "node:crypto";
import { cpus, tmpdir } from "node:os";
import { cp, mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { markdownLinkValidation } from "../../../src/index.ts";
import { executeMarkdownLinkValidation } from "../../../src/package-checks/markdown-link-validation/execution.ts";
import type { ResolvedMarkdownLinkValidationOptions } from "../../../src/package-checks/markdown-link-validation/options.ts";

const SEED = 0x5eedc0de;
const SOURCE_COUNT = 1_000;
const TARGET_COUNT = 160;
const SAMPLES_PER_WORKLOAD = 5;
const MAX_MARKDOWN_BYTES = 65_536;
const MAX_TARGET_READS = 10_000;
const CACHE_FILE_NAME = "markdown-link-parse-facts-v1.jsonl";
const CANDIDATE_SOURCE_PATHS = [
  "src/package-checks/markdown-link-validation/execution.ts",
  "src/package-checks/markdown-link-validation/local-resolver.ts",
  "src/package-checks/markdown-link-validation/resolver-engine.ts",
  "src/package-checks/markdown-link-validation/parse-facts-cache.ts",
  "src/package-checks/markdown-link-validation/options.ts",
  "src/package-checks/markdown-link-validation/default-check.ts"
] as const;

type Workload = "cold" | "warm" | "single-file-incremental";
type Mode = "disabled" | "enabled" | "prewarm" | "verification";
type PairOrder = "disabled-first" | "enabled-first";

type Outcome = Readonly<{
  readonly status: string;
  readonly reason?: string;
  readonly data?: unknown;
  readonly messages: readonly unknown[];
  readonly records: readonly unknown[];
}>;

type CacheFootprint = Readonly<{
  readonly file: string;
  readonly exists: boolean;
  readonly bytes: number;
  readonly newlineTerminatedEntries: number;
}>;

type Sample = Readonly<{
  readonly workload: Workload;
  readonly mode: Mode;
  readonly repetition: number;
  readonly pairOrder: PairOrder | "verification";
  readonly ordinal: number;
  readonly wallMs: number;
  readonly cpuUserMicros: number;
  readonly cpuSystemMicros: number;
  readonly cpuTotalMicros: number;
  /** Cumulative process maximum, not a per-sample isolated peak. */
  readonly processMaxRssBytes: number;
  readonly cache: CacheFootprint | null;
  readonly semantic: Outcome;
  readonly semanticDigestSha256: string;
}>;

type Pair = Readonly<{
  readonly workload: Workload;
  readonly repetition: number;
  readonly order: PairOrder;
  readonly disabledOrdinal: number;
  readonly enabledOrdinal: number;
  readonly semanticParity: boolean;
  readonly disabledSemanticDigestSha256: string;
  readonly enabledSemanticDigestSha256: string;
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

async function writeFixture(root: string): Promise<void> {
  const random = rng(SEED);
  await mkdir(path.join(root, "guides"), { recursive: true });
  await mkdir(path.join(root, "targets"), { recursive: true });
  for (let target = 0; target < TARGET_COUNT; target += 1) {
    const heading = `topic-${target % 7}`;
    await writeFile(
      path.join(root, "targets", `topic-${target.toString().padStart(3, "0")}.md`),
      `# Target ${target}\n\n## ${heading}\n\nDeterministic target ${target}.\n`,
      "utf8"
    );
  }
  for (let source = 0; source < SOURCE_COUNT; source += 1) {
    const targetLinks = 1 + Math.floor(random() * 5);
    const fillerBytes = [512, 2_048, 8_192][Math.floor(random() * 3)] ?? 512;
    const lines = [`# Guide ${source}`, "", `## local-${source % 11}`, ""];
    for (let link = 0; link < targetLinks; link += 1) {
      const target = (source * 17 + link * 29 + Math.floor(random() * TARGET_COUNT)) % TARGET_COUNT;
      lines.push(
        `[target-${target}](../targets/topic-${target.toString().padStart(3, "0")}.md#topic-${target % 7})`
      );
    }
    lines.push("", "x".repeat(fillerBytes));
    await writeFile(
      path.join(root, "guides", `guide-${source.toString().padStart(4, "0")}.md`),
      `${lines.join("\n")}\n`,
      "utf8"
    );
  }
}

async function mutateSingleSource(root: string): Promise<void> {
  const file = path.join(root, "guides", "guide-0500.md");
  await writeFile(file, `${await readFile(file, "utf8")}\n## incremental-change\n`, "utf8");
}

function options(
  cache: ResolvedMarkdownLinkValidationOptions["cache"] = Object.freeze({ enabled: false as const })
): ResolvedMarkdownLinkValidationOptions {
  return markdownLinkValidation({
    files: { source: "filesystem", include: ["**/*.md"], exclude: [] },
    findingPolicy: "blocking",
    limits: {
      maxMarkdownBytes: MAX_MARKDOWN_BYTES,
      maxOccurrences: MAX_TARGET_READS,
      maxTargetReads: MAX_TARGET_READS
    },
    cache
  }).options;
}

function resourceSnapshot(): Readonly<{ user: number; system: number; maxRssBytes: number }> {
  const usage = process.resourceUsage();
  return {
    user: usage.userCPUTime,
    system: usage.systemCPUTime,
    maxRssBytes: usage.maxRSS * 1_024
  };
}

async function directOutcome(
  root: string,
  resolvedOptions: ResolvedMarkdownLinkValidationOptions
): Promise<Outcome> {
  const records: unknown[] = [];
  const result = await executeMarkdownLinkValidation({
    options: resolvedOptions,
    project: { root, flags: [] },
    signal: new AbortController().signal,
    dependencies: {
      get: () => ({ ok: false, error: { code: "dependency-not-declared", checkId: "unused" } }),
      list: () => []
    },
    records: { report: (identity: unknown, data: unknown) => records.push({ identity, data }) }
  } as never);
  return Object.freeze({
    status: result.status,
    reason:
      result.status === "unavailable" || result.status === "not-applicable"
        ? result.reason?.code
        : undefined,
    data: "data" in result ? result.data : undefined,
    messages: result.messages ?? [],
    records
  });
}

function canonicalOutcome(outcome: Outcome): string {
  return JSON.stringify({
    status: outcome.status,
    reason: outcome.reason,
    data: outcome.data,
    messages: outcome.messages,
    records: outcome.records
  });
}

function semanticDigest(outcome: Outcome): string {
  return createHash("sha256").update(canonicalOutcome(outcome)).digest("hex");
}

async function candidateSourceManifest(): Promise<
  readonly Readonly<{ readonly path: string; readonly sha256: string }>[]
> {
  const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
  return Promise.all(
    CANDIDATE_SOURCE_PATHS.map(async (sourcePath) =>
      Object.freeze({
        path: sourcePath,
        sha256: createHash("sha256")
          .update(await readFile(path.join(repositoryRoot, sourcePath)))
          .digest("hex")
      })
    )
  );
}

async function cacheFootprint(directory: string): Promise<CacheFootprint> {
  const cachePath = path.join(directory, CACHE_FILE_NAME);
  try {
    const contents = await readFile(cachePath);
    const info = await stat(cachePath);
    return Object.freeze({
      file: CACHE_FILE_NAME,
      exists: info.isFile(),
      bytes: info.size,
      newlineTerminatedEntries: contents.reduce(
        (count, byte) => count + (byte === "\n".charCodeAt(0) ? 1 : 0),
        0
      )
    });
  } catch {
    return Object.freeze({
      file: CACHE_FILE_NAME,
      exists: false,
      bytes: 0,
      newlineTerminatedEntries: 0
    });
  }
}

let ordinal = 0;

async function sample(
  workload: Workload,
  mode: Mode,
  repetition: number,
  pairOrder: PairOrder | "verification",
  root: string,
  cacheDirectory?: string
): Promise<Sample> {
  const cache =
    cacheDirectory === undefined
      ? Object.freeze({ enabled: false as const })
      : Object.freeze({ enabled: true as const, directory: cacheDirectory });
  const before = resourceSnapshot();
  const started = performance.now();
  const semantic = await directOutcome(root, options(cache));
  const wallMs = performance.now() - started;
  const after = resourceSnapshot();
  assert(
    semantic.status === "passed",
    `${workload}/${mode} did not pass: ${semantic.status}/${semantic.reason ?? ""}`
  );
  const cacheStats = cacheDirectory === undefined ? null : await cacheFootprint(cacheDirectory);
  ordinal += 1;
  return Object.freeze({
    workload,
    mode,
    repetition,
    pairOrder,
    ordinal,
    wallMs,
    cpuUserMicros: after.user - before.user,
    cpuSystemMicros: after.system - before.system,
    cpuTotalMicros: after.user - before.user + (after.system - before.system),
    processMaxRssBytes: after.maxRssBytes,
    cache: cacheStats,
    semantic,
    semanticDigestSha256: semanticDigest(semantic)
  });
}

async function pairedSamples(
  samples: Sample[],
  workload: Workload,
  repetition: number,
  root: string,
  cacheDirectory: string
): Promise<Pair> {
  const order: PairOrder = repetition % 2 === 0 ? "enabled-first" : "disabled-first";
  let disabled: Sample;
  let enabled: Sample;
  // Each awaited call completes before the next starts: no source/cache I/O overlaps.
  if (order === "disabled-first") {
    disabled = await sample(workload, "disabled", repetition, order, root);
    samples.push(disabled);
    enabled = await sample(workload, "enabled", repetition, order, root, cacheDirectory);
    samples.push(enabled);
  } else {
    enabled = await sample(workload, "enabled", repetition, order, root, cacheDirectory);
    samples.push(enabled);
    disabled = await sample(workload, "disabled", repetition, order, root);
    samples.push(disabled);
  }
  const semanticParity = canonicalOutcome(disabled.semantic) === canonicalOutcome(enabled.semantic);
  assert(semanticParity, `${workload} pair ${repetition} changed direct-Check semantics`);
  return Object.freeze({
    workload,
    repetition,
    order,
    disabledOrdinal: disabled.ordinal,
    enabledOrdinal: enabled.ordinal,
    semanticParity,
    disabledSemanticDigestSha256: disabled.semanticDigestSha256,
    enabledSemanticDigestSha256: enabled.semanticDigestSha256
  });
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function mad(values: readonly number[]): number {
  const middle = median(values);
  return median(values.map((value) => Math.abs(value - middle)));
}

function valuesFor(
  samples: readonly Sample[],
  workload: Workload,
  mode: "disabled" | "enabled"
): readonly Sample[] {
  return samples.filter((sample) => sample.workload === workload && sample.mode === mode);
}

function summarize(samples: readonly Sample[], workload: Workload, mode: "disabled" | "enabled") {
  const selected = valuesFor(samples, workload, mode);
  const wallMs = selected.map((sample) => sample.wallMs);
  const cpuMicros = selected.map((sample) => sample.cpuTotalMicros);
  const cacheBytes = selected.map((sample) => sample.cache?.bytes ?? 0);
  return Object.freeze({
    count: selected.length,
    wallMs,
    medianWallMs: median(wallMs),
    madWallMs: mad(wallMs),
    cpuTotalMicros: cpuMicros,
    medianCpuTotalMicros: median(cpuMicros),
    madCpuTotalMicros: mad(cpuMicros),
    maxObservedProcessMaxRssBytes: Math.max(...selected.map((sample) => sample.processMaxRssBytes)),
    cacheBytes,
    medianCacheBytes: median(cacheBytes),
    cacheFile: CACHE_FILE_NAME
  });
}

function acceptance(samples: readonly Sample[]) {
  const coldDisabled = summarize(samples, "cold", "disabled").medianWallMs;
  const coldEnabled = summarize(samples, "cold", "enabled").medianWallMs;
  const warmDisabled = summarize(samples, "warm", "disabled").medianWallMs;
  const warmEnabled = summarize(samples, "warm", "enabled").medianWallMs;
  const incrementalDisabled = summarize(
    samples,
    "single-file-incremental",
    "disabled"
  ).medianWallMs;
  const incrementalEnabled = summarize(samples, "single-file-incremental", "enabled").medianWallMs;
  const coldRegressionPercent = (coldEnabled / coldDisabled - 1) * 100;
  const warmImprovementPercent = (1 - warmEnabled / warmDisabled) * 100;
  const warmSavedMs = warmDisabled - warmEnabled;
  const incrementalImprovementPercent = (1 - incrementalEnabled / incrementalDisabled) * 100;
  const incrementalSavedMs = incrementalDisabled - incrementalEnabled;
  return Object.freeze({
    cold: Object.freeze({
      disabledMedianWallMs: coldDisabled,
      enabledMedianWallMs: coldEnabled,
      enabledRelativeRegressionPercent: coldRegressionPercent,
      threshold: "enabled relative regression <= 5%",
      passed: coldRegressionPercent <= 5
    }),
    warm: Object.freeze({
      disabledMedianWallMs: warmDisabled,
      enabledMedianWallMs: warmEnabled,
      enabledRelativeImprovementPercent: warmImprovementPercent,
      savedMs: warmSavedMs,
      threshold: "improvement >= 20% and saved >= 100 ms",
      passed: warmImprovementPercent >= 20 && warmSavedMs >= 100
    }),
    singleFileIncremental: Object.freeze({
      disabledMedianWallMs: incrementalDisabled,
      enabledMedianWallMs: incrementalEnabled,
      enabledRelativeImprovementPercent: incrementalImprovementPercent,
      savedMs: incrementalSavedMs,
      threshold: "improvement >= 20% and saved >= 100 ms",
      passed: incrementalImprovementPercent >= 20 && incrementalSavedMs >= 100
    })
  });
}

async function verifyHarness(): Promise<void> {
  const root = await mkdtemp(path.join(tmpdir(), "vibe-check-jsonl-harness-verify-"));
  try {
    const fixture = path.join(root, "fixture");
    const cache = path.join(root, "cache");
    await writeFixture(fixture);
    const disabled = await sample("cold", "verification", 0, "verification", fixture);
    const enabled = await sample("cold", "verification", 0, "verification", fixture, cache);
    const footprint = await cacheFootprint(cache);
    assert(
      canonicalOutcome(disabled.semantic) === canonicalOutcome(enabled.semantic),
      "verification changed semantics"
    );
    assert(footprint.exists, "verification did not create the JSONL cache file");
    assert(
      footprint.bytes > 0 && footprint.newlineTerminatedEntries > 0,
      "verification cache file is empty"
    );
    console.log(
      JSON.stringify(
        {
          verification: "passed",
          fixture: { seed: SEED, sourceCount: SOURCE_COUNT, targetCount: TARGET_COUNT },
          directCheck: "executeMarkdownLinkValidation",
          semanticParity: true,
          cache: footprint
        },
        null,
        2
      )
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function benchmark(output: string): Promise<void> {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "vibe-check-jsonl-benchmark-"));
  try {
    const candidateSources = await candidateSourceManifest();
    const fixture = path.join(tempRoot, "fixture");
    const incrementalSeed = path.join(tempRoot, "incremental-seed");
    await writeFixture(fixture);
    await writeFixture(incrementalSeed);
    const samples: Sample[] = [];
    const pairs: Pair[] = [];

    for (let repetition = 1; repetition <= SAMPLES_PER_WORKLOAD; repetition += 1) {
      const cache = path.join(tempRoot, `cold-cache-${repetition}`);
      await mkdir(cache, { recursive: true });
      pairs.push(await pairedSamples(samples, "cold", repetition, fixture, cache));
    }
    for (let repetition = 1; repetition <= SAMPLES_PER_WORKLOAD; repetition += 1) {
      const cache = path.join(tempRoot, `warm-cache-${repetition}`);
      await mkdir(cache, { recursive: true });
      const prewarm = await sample("warm", "prewarm", repetition, "verification", fixture, cache);
      samples.push(prewarm);
      pairs.push(await pairedSamples(samples, "warm", repetition, fixture, cache));
    }
    for (let repetition = 1; repetition <= SAMPLES_PER_WORKLOAD; repetition += 1) {
      const incrementalRoot = path.join(tempRoot, `incremental-${repetition}`);
      const cache = path.join(tempRoot, `incremental-cache-${repetition}`);
      await cp(incrementalSeed, incrementalRoot, { recursive: true });
      await mkdir(cache, { recursive: true });
      const prewarm = await sample(
        "single-file-incremental",
        "prewarm",
        repetition,
        "verification",
        incrementalRoot,
        cache
      );
      samples.push(prewarm);
      await mutateSingleSource(incrementalRoot);
      pairs.push(
        await pairedSamples(samples, "single-file-incremental", repetition, incrementalRoot, cache)
      );
    }

    const result = Object.freeze({
      schemaVersion: 1,
      generatedAtUtc: new Date().toISOString(),
      command:
        "bun changes/pack-markdown-link-cache-jsonl/evidence/benchmark.ts --output changes/pack-markdown-link-cache-jsonl/evidence/results/formal-run.json",
      environment: Object.freeze({
        bun: process.versions.bun ?? "unknown",
        node: process.version,
        os: process.platform,
        arch: process.arch,
        cpu: cpus()[0]?.model ?? "unknown",
        cpuCount: cpus().length
      }),
      candidateSources,
      fixture: Object.freeze({
        seed: `0x${SEED.toString(16)}`,
        sourceCount: SOURCE_COUNT,
        targetCount: TARGET_COUNT,
        totalMarkdownFiles: SOURCE_COUNT + TARGET_COUNT,
        sourceBodyBytes: [512, 2_048, 8_192],
        linksPerSource: "deterministic 1..5",
        incrementalMutation:
          "append one heading to guides/guide-0500.md after that pair's enabled prewarm"
      }),
      protocol: Object.freeze({
        directCheck: "executeMarkdownLinkValidation",
        strictSerial:
          "Every direct invocation is awaited before the next; the harness starts no concurrent source or cache work.",
        interleaving:
          "Five pairs per workload alternate disabled-first, enabled-first, disabled-first, enabled-first, disabled-first.",
        cold: "Each enabled sample receives its own empty application cache directory; operating-system page cache is not forcibly dropped.",
        warm: "Each pair owns a cache populated by one unmeasured enabled invocation before its pair.",
        singleFileIncremental:
          "Each pair copies the deterministic seed, prewarms its own cache, then mutates exactly one source before its pair.",
        semanticParity:
          "Each pair compares status, reason, final data, messages, and ordered record identity/data from the direct Check envelope.",
        cpu: "process.resourceUsage user + system CPU deltas per sample.",
        processMaxRssBoundary:
          "process.resourceUsage maxRSS is cumulative for this Bun process; max observed values are reported, not isolated per-sample peaks.",
        cacheFootprint:
          "The cache metric is the current single markdown-link-parse-facts-v1.jsonl file's bytes and complete newline count after an enabled invocation."
      }),
      samples,
      pairs,
      summaries: Object.freeze({
        cold: Object.freeze({
          disabled: summarize(samples, "cold", "disabled"),
          enabled: summarize(samples, "cold", "enabled")
        }),
        warm: Object.freeze({
          disabled: summarize(samples, "warm", "disabled"),
          enabled: summarize(samples, "warm", "enabled")
        }),
        singleFileIncremental: Object.freeze({
          disabled: summarize(samples, "single-file-incremental", "disabled"),
          enabled: summarize(samples, "single-file-incremental", "enabled")
        })
      }),
      acceptance: acceptance(samples),
      semanticParity: Object.freeze({
        allPairsPassed: pairs.every((pair) => pair.semanticParity),
        pairs
      }),
      comparisonBoundary: Object.freeze({
        currentPairedBaseline:
          "Within this run, default-disabled is the strict-serial no-persistent-cache comparator and enabled is the current single-JSONL append implementation.",
        historicalPerEntryBaseline:
          "The archived per-entry strict-serial result is audit context only. It comes from a different revision/run and is not combined with these medians or treated as causal before/after proof.",
        storageOnly: "Storage-only measurements are excluded from all acceptance calculations."
      })
    });
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    console.log(
      JSON.stringify(
        { output, acceptance: result.acceptance, semanticParity: result.semanticParity },
        null,
        2
      )
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

function outputArgument(): string | undefined {
  const index = process.argv.indexOf("--output");
  if (index < 0) return undefined;
  const output = process.argv[index + 1];
  assert(output !== undefined && !output.startsWith("--"), "--output requires a path");
  return path.resolve(output);
}

if (process.argv.includes("--verify")) {
  await verifyHarness();
} else {
  const output = outputArgument() ?? path.join(import.meta.dirname, "results", "formal-run.json");
  await benchmark(output);
}
