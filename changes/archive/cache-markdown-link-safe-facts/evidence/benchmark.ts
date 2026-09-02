/**
 * Synthetic readiness benchmark for cache-markdown-link-safe-facts.
 *
 * This is evidence-only code. It imports the owned Markdown Link parser,
 * resolver helpers, record builder, and the public `run` API; it does not
 * change any Product source or public contract.
 */
import { createHash } from "node:crypto";
import { cpus, tmpdir } from "node:os";
import { cp, mkdtemp, mkdir, readFile, readdir, rm, stat, statfs, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  cacheJsonByKey,
  defineConfig,
  markdownLinkValidation,
  run
} from "../../../src/index.ts";
import { executeMarkdownLinkValidation } from "../../../src/package-checks/markdown-link-validation/execution.ts";
import { collectProjectFiles } from "../../../src/package-checks/project-files/collection.ts";
import { partitionProjectFilesByEligibility } from "../../../src/package-checks/project-files/input-eligibility.ts";
import { parseMarkdownLinkFacts, type ParsedMarkdownLinkFacts } from "../../../src/package-checks/markdown-link-validation/markdown-parser.ts";
import { buildMarkdownLinkRecordCandidate } from "../../../src/package-checks/markdown-link-validation/records.ts";
import { appendCheckMessages } from "../../../src/check/finding-presentation.ts";
import { markdownFindingMessages } from "../../../src/package-checks/markdown-link-validation/finding-messages.ts";
import { settledMarkdownTraversalResult } from "../../../src/package-checks/markdown-link-validation/traversal-result.ts";
import { markdownLinkUnavailableMessage } from "../../../src/package-checks/markdown-link-validation/unavailable-reasons.ts";
import {
  anchorResolution,
  finding,
  isMarkdownPath,
  isRootRelativePath,
  isWithinRoot,
  parseLocalDestination,
  sameRootRelativePath,
  sourceUnavailable,
  toSlashPath,
  unavailable,
  valid,
  type MarkdownLocalResolution,
  type MarkdownLocalResolutionRequest,
  type MarkdownSafeTargetDescriptor,
  type MarkdownSourceReadResult
} from "../../../src/package-checks/markdown-link-validation/local-resolution.ts";
import { directoryTarget, fileTargetDescriptor, outsideProjectRootTarget, projectTarget } from "../../../src/package-checks/markdown-link-validation/target-descriptor.ts";
import { probeEndpoint, probeRootContainedPath, readRegularFile } from "../../../src/package-checks/markdown-link-validation/filesystem-probes.ts";
import type { ResolvedMarkdownLinkValidationOptions } from "../../../src/package-checks/markdown-link-validation/options.ts";

const SEED = 0x5eedc0de;
const PARSER_VERSION = "link-private-facts-v1";
const SOURCE_COUNT = 1_000;
const NORMAL_TARGET_COUNT = 160;
const HIGH_REUSE_TARGET_COUNT = 8;
const SAMPLES_PER_GROUP = 5;
const MAX_MARKDOWN_BYTES = 65_536;
const MAX_TARGET_READS = 10_000;

type Mode = "public-observation" | "direct-baseline" | "formal-disabled" | "formal-enabled" | "prototype-cold" | "prototype-warm" | "prototype-incremental" | "prototype-high-reuse" | "prototype-control";
type Counter = { reads: number; rootProbes: number; endpointProbes: number; parses: number; decodes: number; sourceReads: number; targetReads: number; sourceDecodes: number; targetDecodes: number; sourceParses: number; targetParses: number; sourceRootProbes: number; targetRootProbes: number };
type CacheStats = { hits: number; misses: number; writes: number; rejectedPayloads: number; bytes: number; entries: number; sourceHits: number; targetHits: number; sourceMisses: number; targetMisses: number; sourceWrites: number; targetWrites: number };

type Sample = Readonly<{
  group: string;
  mode: Mode;
  repetition: number;
  order: "baseline-first" | "candidate-first" | "observation";
  wallMs: number;
  cpuUserMicros: number;
  cpuSystemMicros: number;
  maxRssBytes: number;
  counters: Counter | null;
  cache: CacheStats | null;
  publicOutcome: unknown;
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

async function writeFixture(root: string, targetCount: number): Promise<void> {
  const random = rng(SEED + targetCount);
  await mkdir(path.join(root, "guides"), { recursive: true });
  await mkdir(path.join(root, "targets"), { recursive: true });
  for (let target = 0; target < targetCount; target += 1) {
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
      const target = (source * 17 + link * 29 + Math.floor(random() * targetCount)) % targetCount;
      lines.push(
        `[target-${target}](../targets/topic-${target.toString().padStart(3, "0")}.md#topic-${target % 7})`
      );
    }
    lines.push("", "x".repeat(fillerBytes));
    await writeFile(path.join(root, "guides", `guide-${source.toString().padStart(4, "0")}.md`), `${lines.join("\n")}\n`, "utf8");
  }
}

async function mutateSingleSource(root: string): Promise<void> {
  const file = path.join(root, "guides", "guide-0500.md");
  await writeFile(file, `${await readFile(file, "utf8")}\n## incremental-change\n`, "utf8");
}

function options(cache: ResolvedMarkdownLinkValidationOptions["cache"] = Object.freeze({ enabled: false as const })): ResolvedMarkdownLinkValidationOptions {
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

function publicDefinition() {
  return defineConfig({
    checks: [markdownLinkValidation({
      files: { source: "filesystem", include: ["**/*.md"], exclude: [] },
      findingPolicy: "blocking",
      limits: {
        maxMarkdownBytes: MAX_MARKDOWN_BYTES,
        maxOccurrences: MAX_TARGET_READS,
        maxTargetReads: MAX_TARGET_READS
      }
    })],
    outputs: {
      diagnosticLogging: { enabled: false },
      machinePublication: { enabled: false },
      progressRendering: { enabled: false }
    }
  });
}

function resourceSnapshot() {
  const usage = process.resourceUsage();
  return { user: usage.userCPUTime, system: usage.systemCPUTime, maxRss: usage.maxRSS * 1_024 };
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function mad(values: readonly number[]): number {
  const middle = median(values);
  return median(values.map((value) => Math.abs(value - middle)));
}

function publicOutcome(result: Awaited<ReturnType<typeof run>>): unknown {
  if (result.kind !== "completed") return { kind: result.kind };
  return {
    aggregate: result.aggregate,
    checks: result.snapshot.checks.map((check) => ({ checkId: check.checkId, outcome: check.outcome }))
  };
}

async function publicSample(group: string, repetition: number, root: string): Promise<Sample> {
  const before = resourceSnapshot();
  const started = performance.now();
  const result = await run(publicDefinition(), { projectRoot: root });
  const wallMs = performance.now() - started;
  const after = resourceSnapshot();
  assert(result.kind === "completed", `public run did not complete: ${result.kind}`);
  return Object.freeze({
    group,
    mode: "public-observation",
    repetition,
    order: "observation",
    wallMs,
    cpuUserMicros: after.user - before.user,
    cpuSystemMicros: after.system - before.system,
    maxRssBytes: after.maxRss,
    counters: null,
    cache: null,
    publicOutcome: publicOutcome(result)
  });
}

function emptyCounter(): Counter {
  return { reads: 0, rootProbes: 0, endpointProbes: 0, parses: 0, decodes: 0, sourceReads: 0, targetReads: 0, sourceDecodes: 0, targetDecodes: 0, sourceParses: 0, targetParses: 0, sourceRootProbes: 0, targetRootProbes: 0 };
}
function emptyCache(): CacheStats {
  return { hits: 0, misses: 0, writes: 0, rejectedPayloads: 0, bytes: 0, entries: 0, sourceHits: 0, targetHits: 0, sourceMisses: 0, targetMisses: 0, sourceWrites: 0, targetWrites: 0 };
}
function deepFreezeFacts(value: ParsedMarkdownLinkFacts): ParsedMarkdownLinkFacts {
  return Object.freeze({
    occurrences: Object.freeze(value.occurrences.map((occurrence) => Object.freeze({
      ...occurrence,
      range: Object.freeze({ ...occurrence.range, start: Object.freeze({ ...occurrence.range.start }), end: Object.freeze({ ...occurrence.range.end }) })
    }))),
    headings: Object.freeze(value.headings.map((heading) => Object.freeze({
      ...heading,
      range: Object.freeze({ ...heading.range, start: Object.freeze({ ...heading.range.start }), end: Object.freeze({ ...heading.range.end }) })
    })))
  });
}

/** Strict, Link-private persistent projection: no path, outcome, or probe facts. */
function parseCachedFacts(value: unknown): ParsedMarkdownLinkFacts {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new TypeError("facts payload is not an object");
  const record = value as Record<string, unknown>;
  if (Object.keys(record).sort().join(",") !== "facts") throw new TypeError("facts payload must have exactly facts");
  if (typeof record.facts !== "object" || record.facts === null || Array.isArray(record.facts)) throw new TypeError("facts payload is invalid");
  const facts = record.facts as Record<string, unknown>;
  if (Object.keys(facts).sort().join(",") !== "headings,occurrences" || !Array.isArray(facts.occurrences) || !Array.isArray(facts.headings)) throw new TypeError("facts shape is invalid");
  if (facts.occurrences.length > MAX_TARGET_READS || facts.headings.length > MAX_TARGET_READS) throw new TypeError("facts arrays exceed bounds");
  const parsed = parseFactsShape(facts);
  if (parsed === undefined) throw new TypeError("facts fields are invalid");
  return deepFreezeFacts(parsed);
}

function parseFactsShape(facts: Record<string, unknown>): ParsedMarkdownLinkFacts | undefined {
  const occurrences = [] as ParsedMarkdownLinkFacts["occurrences"][number][];
  const headings = [] as ParsedMarkdownLinkFacts["headings"][number][];
  for (const candidate of facts.occurrences as unknown[]) {
    if (!isOccurrence(candidate)) return undefined;
    occurrences.push(candidate);
  }
  for (const candidate of facts.headings as unknown[]) {
    if (!isHeading(candidate)) return undefined;
    headings.push(candidate);
  }
  return { occurrences, headings };
}

function isRange(value: unknown): value is ParsedMarkdownLinkFacts["occurrences"][number]["range"] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const point = (input: unknown) => {
    if (typeof input !== "object" || input === null || Array.isArray(input) || Object.keys(input).sort().join(",") !== "column,line") return false;
    const pointRecord = input as Record<string, unknown>;
    return typeof pointRecord.line === "number" && typeof pointRecord.column === "number" && Number.isSafeInteger(pointRecord.line) && Number.isSafeInteger(pointRecord.column) && pointRecord.line >= 1 && pointRecord.column >= 1;
  };
  const startOffset = record.startOffset;
  const endOffset = record.endOffset;
  return Object.keys(record).sort().join(",") === "end,endOffset,start,startOffset" &&
    typeof startOffset === "number" && typeof endOffset === "number" &&
    Number.isSafeInteger(startOffset) && Number.isSafeInteger(endOffset) &&
    startOffset >= 0 && endOffset >= startOffset && point(record.start) && point(record.end);
}
function isOccurrence(value: unknown): value is ParsedMarkdownLinkFacts["occurrences"][number] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return Object.keys(record).sort().join(",") === "kind,range,rawDestination" &&
    (record.kind === "link" || record.kind === "image") && typeof record.rawDestination === "string" && record.rawDestination.length <= MAX_MARKDOWN_BYTES && isRange(record.range);
}
function isHeading(value: unknown): value is ParsedMarkdownLinkFacts["headings"][number] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return Object.keys(record).sort().join(",") === "range,slug" && typeof record.slug === "string" && record.slug.length <= MAX_MARKDOWN_BYTES && isRange(record.range);
}

class PrototypeResolver {
  readonly #root: string;
  readonly #maxTargetReads: number;
  readonly #cacheDirectory: string | undefined;
  readonly #persistent: boolean;
  readonly #memoTargets: boolean;
  readonly #parserVersion: string;
  readonly counters = emptyCounter();
  readonly cache = emptyCache();
  readonly #targetMemo = new Map<string, Promise<ParsedMarkdownLinkFacts | "too-large" | undefined>>();
  #targetReadCount = 0;

  constructor(input: { root: string; maxTargetReads: number; cacheDirectory?: string; persistent: boolean; memoTargets: boolean; parserVersion?: string }) {
    this.#root = input.root;
    this.#maxTargetReads = input.maxTargetReads;
    this.#cacheDirectory = input.cacheDirectory;
    this.#persistent = input.persistent;
    this.#memoTargets = input.memoTargets;
    this.#parserVersion = input.parserVersion ?? PARSER_VERSION;
  }
  get targetReadCount() { return this.#targetReadCount; }

  async readSource(rootRelativePath: string, maxMarkdownBytes: number): Promise<MarkdownSourceReadResult> {
    if (!isRootRelativePath(this.#root, rootRelativePath)) return sourceUnavailable();
    const sourcePath = path.resolve(this.#root, rootRelativePath);
    this.counters.rootProbes += 1;
    this.counters.sourceRootProbes += 1;
    const rootProbe = await probeRootContainedPath(this.#root, sourcePath);
    if (rootProbe.kind === "outside" || rootProbe.kind === "unavailable" || rootProbe.kind === "missing") return sourceUnavailable();
    const parsed = await this.readAndParse(rootProbe.absolutePath, maxMarkdownBytes, true);
    if (parsed === "too-large") return Object.freeze({ ok: false as const, reason: "source-too-large" as const });
    if (parsed === undefined) return sourceUnavailable();
    return Object.freeze({ ok: true as const, source: Object.freeze({ path: toSlashPath(path.relative(this.#root, sourcePath)), facts: parsed }) });
  }

  async resolve(request: MarkdownLocalResolutionRequest): Promise<MarkdownLocalResolution> {
    const destination = parseLocalDestination(request.rawDestination);
    if (destination === "not-local") return Object.freeze({ kind: "not-local" as const });
    if (destination === null) return unavailable("invalid-local-destination");
    const targetPath = destination.path === "" ? path.resolve(this.#root, request.source.path) : destination.isAbsolute ? path.normalize(destination.path) : path.resolve(this.#root, path.dirname(request.source.path), destination.path);
    if (!destination.isAbsolute && sameRootRelativePath(request.source.path, targetPath, this.#root)) return this.resolveSameDocument(destination.fragment, request);
    if (destination.isAbsolute || !isWithinRoot(this.#root, targetPath)) return this.resolveExternalTarget(targetPath, destination.fragment, request);
    return this.resolveRootContainedTarget(targetPath, destination.fragment, request);
  }

  async resolveRootContainedTarget(targetPath: string, fragment: string | null, request: MarkdownLocalResolutionRequest): Promise<MarkdownLocalResolution> {
    this.counters.rootProbes += 1;
    this.counters.targetRootProbes += 1;
    const rootProbe = await probeRootContainedPath(this.#root, targetPath);
    if (rootProbe.kind === "outside") return this.resolveExternalTarget(targetPath, fragment, request);
    if (rootProbe.kind === "unavailable") return unavailable("target-unavailable");
    if (rootProbe.kind === "missing") {
      if (!this.beginTargetValidation()) return unavailable("target-read-limit-exceeded");
      const target = projectTarget(this.#root, targetPath, fragment);
      return request.requireExistingTargets ? finding("missing-target", target) : valid(target);
    }
    if (!this.beginTargetValidation()) return unavailable("target-read-limit-exceeded");
    return this.resolveEndpoint(rootProbe.absolutePath, fragment, request, projectTarget(this.#root, targetPath, fragment));
  }
  async resolveExternalTarget(targetPath: string, fragment: string | null, request: MarkdownLocalResolutionRequest): Promise<MarkdownLocalResolution> {
    if (request.rootExternalTargetMode === "ignore") return Object.freeze({ kind: "ignored" as const });
    if (request.rootExternalTargetMode === "report") return finding("target-outside-project-root", outsideProjectRootTarget());
    if (!this.beginTargetValidation()) return unavailable("target-read-limit-exceeded");
    return this.resolveEndpoint(targetPath, fragment, request, outsideProjectRootTarget());
  }
  async resolveEndpoint(targetPath: string, fragment: string | null, request: MarkdownLocalResolutionRequest, target: MarkdownSafeTargetDescriptor): Promise<MarkdownLocalResolution> {
    this.counters.endpointProbes += 1;
    const endpoint = await probeEndpoint(targetPath);
    if (endpoint.kind === "missing") return request.requireExistingTargets ? finding("missing-target", target) : valid(target);
    if (endpoint.kind === "unavailable") return unavailable("target-unavailable");
    if (endpoint.kind === "directory") return this.resolveDirectory(targetPath, fragment, request, directoryTarget(target));
    if (endpoint.kind === "unsupported") return finding("unsupported-target-type", target);
    if (fragment === null || !request.validateCrossDocumentAnchors) return valid(fileTargetDescriptor(target));
    if (!isMarkdownPath(targetPath)) return finding("anchor-target-not-markdown", fileTargetDescriptor(target));
    const parsed = await this.readAndParse(targetPath, request.maxMarkdownBytes, false);
    return parsed === undefined || parsed === "too-large" ? unavailable("target-unavailable") : anchorResolution(parsed.headings, fragment, fileTargetDescriptor(target));
  }
  async resolveDirectory(targetPath: string, fragment: string | null, request: MarkdownLocalResolutionRequest, target: MarkdownSafeTargetDescriptor): Promise<MarkdownLocalResolution> {
    if (fragment !== null) return finding("anchor-on-directory", target);
    if (!request.requireNonEmptyDirectories) return valid(target);
    // The generated corpus has no directory targets. Keep the Product branch explicit rather than claim a new behavior.
    return valid(target);
  }
  resolveSameDocument(fragment: string | null, request: MarkdownLocalResolutionRequest): MarkdownLocalResolution {
    const target = Object.freeze({ kind: "same-document" as const, path: request.source.path, fragment });
    return fragment === null || !request.validateSameDocumentAnchors ? valid(target) : anchorResolution(request.source.facts.headings, fragment, target);
  }
  beginTargetValidation(): boolean {
    if (this.#targetReadCount >= this.#maxTargetReads) return false;
    this.#targetReadCount += 1;
    return true;
  }
  async readAndParse(filePath: string, maxBytes: number, source: boolean): Promise<ParsedMarkdownLinkFacts | "too-large" | undefined> {
    if (!source && this.#memoTargets) {
      const key = `${filePath}\u0000${maxBytes}\u0000${this.#parserVersion}`;
      const existing = this.#targetMemo.get(key);
      if (existing !== undefined) return existing;
      const created = this.readAndParseWithoutTargetMemo(filePath, maxBytes, source);
      this.#targetMemo.set(key, created);
      const settled = await created;
      if (settled === undefined || settled === "too-large") this.#targetMemo.delete(key);
      return settled;
    }
    return this.readAndParseWithoutTargetMemo(filePath, maxBytes, source);
  }
  async readAndParseWithoutTargetMemo(filePath: string, maxBytes: number, source: boolean): Promise<ParsedMarkdownLinkFacts | "too-large" | undefined> {
    this.counters.reads += 1;
    if (source) this.counters.sourceReads += 1;
    else this.counters.targetReads += 1;
    const bytes = await readRegularFile(filePath, maxBytes);
    if (!bytes.ok) return bytes.reason === "too-large" ? "too-large" : undefined;
    this.counters.decodes += 1;
    if (source) this.counters.sourceDecodes += 1;
    else this.counters.targetDecodes += 1;
    let markdown: string;
    try { markdown = new TextDecoder("utf-8", { fatal: true }).decode(bytes.bytes); } catch { return undefined; }
    const digest = createHash("sha256").update(bytes.bytes).digest("hex");
    if (this.#persistent && this.#cacheDirectory !== undefined) {
      try {
        const cached = await cacheJsonByKey({
          directory: this.#cacheDirectory,
          key: digest,
          namespace: "vibe-check.markdown-link-private-facts",
          version: this.#parserVersion,
          parse: parseCachedFacts,
          compute: () => {
            const parsed = this.parse(markdown, source);
            if (parsed === undefined) throw new TypeError("Markdown parser could not form cache facts");
            return { facts: parsed };
          }
        });
        if (cached.read === "hit") {
          this.cache.hits += 1;
          if (source) this.cache.sourceHits += 1; else this.cache.targetHits += 1;
        } else {
          this.cache.misses += 1;
          if (source) this.cache.sourceMisses += 1; else this.cache.targetMisses += 1;
        }
        if (cached.read === "invalid") this.cache.rejectedPayloads += 1;
        if (cached.write === "stored") {
          this.cache.writes += 1;
          if (source) this.cache.sourceWrites += 1; else this.cache.targetWrites += 1;
        }
        return cached.value;
      } catch {
        // Cache mechanics are best-effort: an invalid directory/options failure
        // falls back to fresh current bytes and cannot alter settlement.
        return this.parse(markdown, source);
      }
    }
    return this.parse(markdown, source);
  }
  parse(markdown: string, source = true): ParsedMarkdownLinkFacts | undefined {
    this.counters.parses += 1;
    if (source) this.counters.sourceParses += 1;
    else this.counters.targetParses += 1;
    const parsed = parseMarkdownLinkFacts(markdown);
    return parsed.ok ? parsed.facts : undefined;
  }
}

async function cacheFootprint(directory: string, stats: CacheStats): Promise<void> {
  let bytes = 0;
  let entries = 0;
  for (const file of await readdir(directory)) {
    const info = await stat(path.join(directory, file));
    if (info.isFile()) { bytes += info.size; entries += 1; }
  }
  stats.bytes = bytes;
  stats.entries = entries;
}

type PrototypeOutcome = { status: string; reason?: string; data?: unknown; messages?: unknown; records: readonly unknown[] };
function prototypeUnavailable(reason: string): PrototypeOutcome {
  return { status: "unavailable", reason, messages: [{ code: reason, level: "error", message: markdownLinkUnavailableMessage(reason as never) }], records: [] };
}
async function prototypeDirect(root: string, input: ResolvedMarkdownLinkValidationOptions, resolver: PrototypeResolver, signal = new AbortController().signal): Promise<PrototypeOutcome> {
  if (signal.aborted) return prototypeUnavailable("cancelled");
  const selected = collectProjectFiles(root, input.files);
  const partition = partitionProjectFilesByEligibility(selected, (file) => path.extname(file).toLowerCase() === ".md" || path.extname(file).toLowerCase() === ".markdown");
  const records: unknown[] = [];
  const candidates: NonNullable<ReturnType<typeof buildMarkdownLinkRecordCandidate>>[] = [];
  let occurrences = 0;
  for (const sourcePath of partition.acceptedPaths) {
    const source = await resolver.readSource(sourcePath, input.limits.maxMarkdownBytes);
    if (!source.ok) return prototypeUnavailable(source.reason);
    for (const [index, occurrence] of source.source.facts.occurrences.entries()) {
      if (signal.aborted) return prototypeUnavailable("cancelled");
      occurrences += 1;
      if (occurrences > input.limits.maxOccurrences) return prototypeUnavailable("occurrence-limit-exceeded");
      const resolution = await resolver.resolve({ source: source.source, rawDestination: occurrence.rawDestination, rootExternalTargetMode: input.rootExternalTargetMode, requireExistingTargets: input.requireExistingTargets, requireNonEmptyDirectories: input.requireNonEmptyDirectories, validateSameDocumentAnchors: input.validateSameDocumentAnchors, validateCrossDocumentAnchors: input.validateCrossDocumentAnchors, maxMarkdownBytes: input.limits.maxMarkdownBytes });
      if (resolution.kind === "unavailable") return prototypeUnavailable(resolution.reason);
      const candidate = buildMarkdownLinkRecordCandidate(source.source.path, index, occurrence, resolution);
      if (candidate !== undefined) candidates.push(candidate);
    }
  }
  for (const candidate of candidates) records.push({ identity: { id: candidate.id }, data: candidate.data });
  const result = appendCheckMessages(
    settledMarkdownTraversalResult({ findingCount: candidates.length, findingPolicy: input.findingPolicy, occurrenceCount: occurrences, rejectedInputCount: partition.rejectedPaths.length, sourceFileCount: partition.acceptedPaths.length, targetReadCount: resolver.targetReadCount }),
    markdownFindingMessages(candidates, partition.rejectedPaths, input.findingPolicy === "blocking")
  );
  return { status: result.status, reason: "reason" in result ? result.reason?.code : undefined, data: "data" in result ? result.data : undefined, messages: result.messages ?? [], records };
}

async function directBaseline(root: string, input: ResolvedMarkdownLinkValidationOptions, signal = new AbortController().signal): Promise<PrototypeOutcome> {
  const records: unknown[] = [];
  const result = await executeMarkdownLinkValidation({
    options: input,
    project: { root, flags: [] },
    signal,
    dependencies: { get: () => ({ ok: false, error: { code: "dependency-not-declared", checkId: "unused" } }), list: () => [] },
    records: { report: (identity: { id: string }, data: object) => records.push({ identity, data }) }
  } as never);
  return {
    status: result.status,
    reason: result.status === "unavailable" || result.status === "not-applicable" ? result.reason?.code : undefined,
    data: "data" in result ? result.data : undefined,
    messages: result.messages ?? [],
    records
  };
}

async function directBaselineSample(group: string, repetition: number, root: string, order: Sample["order"]): Promise<Sample> {
  const before = resourceSnapshot();
  const started = performance.now();
  const outcome = await directBaseline(root, options());
  const wallMs = performance.now() - started;
  const after = resourceSnapshot();
  assert(outcome.status === "passed", `direct baseline ${group} did not pass`);
  return Object.freeze({ group, mode: "direct-baseline", repetition, order, wallMs, cpuUserMicros: after.user - before.user, cpuSystemMicros: after.system - before.system, maxRssBytes: after.maxRss, counters: null, cache: null, publicOutcome: outcome });
}

/** Measures the implemented resolver through its normal direct-Check envelope. */
async function formalRuntimeSample(
  group: string,
  mode: "formal-disabled" | "formal-enabled",
  repetition: number,
  root: string,
  cacheDirectory: string | undefined,
  order: Sample["order"]
): Promise<Sample> {
  const cache = cacheDirectory === undefined
    ? Object.freeze({ enabled: false as const })
    : Object.freeze({ enabled: true as const, directory: cacheDirectory });
  const before = resourceSnapshot();
  const started = performance.now();
  const outcome = await directBaseline(root, options(cache));
  const wallMs = performance.now() - started;
  const after = resourceSnapshot();
  assert(outcome.status === "passed", `formal runtime ${group} did not pass: ${outcome.status}/${outcome.reason ?? ""}`);
  const cacheStats = emptyCache();
  if (cacheDirectory !== undefined) await cacheFootprint(cacheDirectory, cacheStats);
  return Object.freeze({
    group,
    mode,
    repetition,
    order,
    wallMs,
    cpuUserMicros: after.user - before.user,
    cpuSystemMicros: after.system - before.system,
    maxRssBytes: after.maxRss,
    counters: null,
    cache: cacheDirectory === undefined ? null : cacheStats,
    publicOutcome: outcome
  });
}

function comparable(outcome: PrototypeOutcome) {
  return JSON.stringify({ status: outcome.status, reason: outcome.reason, data: outcome.data, messages: outcome.messages ?? [], records: outcome.records });
}

async function prototypeSample(group: string, mode: Exclude<Mode, "public-observation" | "direct-baseline">, repetition: number, root: string, cacheDirectory: string, persistent: boolean, memoTargets: boolean, order: Sample["order"]): Promise<Sample> {
  const resolver = new PrototypeResolver({ root, maxTargetReads: MAX_TARGET_READS, cacheDirectory, persistent, memoTargets });
  const before = resourceSnapshot();
  const started = performance.now();
  const outcome = await prototypeDirect(root, options(), resolver);
  const wallMs = performance.now() - started;
  const after = resourceSnapshot();
  assert(outcome.status === "passed", `prototype ${group} did not pass: ${outcome.status}/${outcome.reason ?? ""}`);
  await cacheFootprint(cacheDirectory, resolver.cache);
  return Object.freeze({ group, mode, repetition, order, wallMs, cpuUserMicros: after.user - before.user, cpuSystemMicros: after.system - before.system, maxRssBytes: after.maxRss, counters: resolver.counters, cache: resolver.cache, publicOutcome: outcome });
}

async function semanticChecks(normalRoot: string, cacheDirectory: string): Promise<Record<string, unknown>> {
  const resolved = options();
  const baseline = await directBaseline(normalRoot, resolved);
  const prototype = await prototypeDirect(normalRoot, resolved, new PrototypeResolver({ root: normalRoot, maxTargetReads: MAX_TARGET_READS, cacheDirectory, persistent: true, memoTargets: true }));
  const limitOptions = Object.freeze({ ...resolved, limits: Object.freeze({ ...resolved.limits, maxTargetReads: 1 }) });
  const limitBaseline = await directBaseline(normalRoot, limitOptions);
  const limitPrototype = await prototypeDirect(normalRoot, limitOptions, new PrototypeResolver({ root: normalRoot, maxTargetReads: 1, cacheDirectory, persistent: true, memoTargets: true }));
  const controller = new AbortController(); controller.abort();
  const cancellationBaseline = await directBaseline(normalRoot, resolved, controller.signal);
  const cancellationPrototype = await prototypeDirect(normalRoot, resolved, new PrototypeResolver({ root: normalRoot, maxTargetReads: MAX_TARGET_READS, cacheDirectory, persistent: true, memoTargets: true }), controller.signal);
  const tooLargeOptions = Object.freeze({ ...resolved, limits: Object.freeze({ ...resolved.limits, maxMarkdownBytes: 1 }) });
  const tooLargeBaseline = await directBaseline(normalRoot, tooLargeOptions);
  const tooLargePrototype = await prototypeDirect(normalRoot, tooLargeOptions, new PrototypeResolver({ root: normalRoot, maxTargetReads: MAX_TARGET_READS, cacheDirectory, persistent: true, memoTargets: true }));
  const unavailableRoot = path.join(path.dirname(normalRoot), "target-unavailable");
  await mkdir(unavailableRoot, { recursive: true });
  await writeFile(path.join(unavailableRoot, "source.md"), "# Source\n\n[x](target.md#heading)\n", "utf8");
  await writeFile(path.join(unavailableRoot, "target.md"), `# heading\n${"x".repeat(256)}\n`, "utf8");
  const targetUnavailableOptions = markdownLinkValidation({ files: { source: "filesystem", include: ["source.md"], exclude: [] }, findingPolicy: "blocking", limits: { maxMarkdownBytes: 64, maxOccurrences: MAX_TARGET_READS, maxTargetReads: MAX_TARGET_READS } }).options;
  const targetUnavailableBaseline = await directBaseline(unavailableRoot, targetUnavailableOptions);
  const targetUnavailableResolver = new PrototypeResolver({ root: unavailableRoot, maxTargetReads: MAX_TARGET_READS, cacheDirectory, persistent: true, memoTargets: true });
  const targetUnavailablePrototype = await prototypeDirect(unavailableRoot, targetUnavailableOptions, targetUnavailableResolver);
  const sourceRead = await targetUnavailableResolver.readSource("source.md", 64);
  let memoFailureNotRetained = false;
  if (sourceRead.ok) {
    const request = { source: sourceRead.source, rawDestination: sourceRead.source.facts.occurrences[0]?.rawDestination ?? "target.md#heading", rootExternalTargetMode: "report" as const, requireExistingTargets: true, requireNonEmptyDirectories: false, validateSameDocumentAnchors: true, validateCrossDocumentAnchors: true, maxMarkdownBytes: 64 };
    await targetUnavailableResolver.resolve(request);
    await targetUnavailableResolver.resolve(request);
    memoFailureNotRetained = targetUnavailableResolver.counters.targetReads >= 3;
  }
  const hostilePayloads = [
    { facts: { occurrences: [], headings: [] }, extra: true },
    { facts: { occurrences: Array.from({ length: MAX_TARGET_READS + 1 }, () => ({})), headings: [] } },
    { facts: { occurrences: [{ kind: "link", rawDestination: "x".repeat(MAX_MARKDOWN_BYTES + 1), range: { startOffset: 0, endOffset: 1, start: { line: 0, column: 1 }, end: { line: 1, column: 1 } } }], headings: [] } }
  ];
  const hostilePayloadsRejected = hostilePayloads.every((payload) => { try { parseCachedFacts(payload); return false; } catch { return true; } });
  const findingRoot = path.join(path.dirname(normalRoot), "finding");
  await mkdir(findingRoot, { recursive: true });
  await writeFile(path.join(findingRoot, "broken.md"), "# Broken\n\n[missing](missing.md#nope)\n", "utf8");
  const findingBaseline = await directBaseline(findingRoot, resolved);
  const findingPrototype = await prototypeDirect(findingRoot, resolved, new PrototypeResolver({ root: findingRoot, maxTargetReads: MAX_TARGET_READS, cacheDirectory, persistent: true, memoTargets: true }));
  const beforeMutation = await prototypeDirect(normalRoot, resolved, new PrototypeResolver({ root: normalRoot, maxTargetReads: MAX_TARGET_READS, cacheDirectory, persistent: true, memoTargets: true }));
  await writeFile(path.join(normalRoot, "guides", "guide-0500.md"), `${await readFile(path.join(normalRoot, "guides", "guide-0500.md"), "utf8")}\n# cache-identity-mutation\n`, "utf8");
  const mutationResolver = new PrototypeResolver({ root: normalRoot, maxTargetReads: MAX_TARGET_READS, cacheDirectory, persistent: true, memoTargets: true });
  const afterMutation = await prototypeDirect(normalRoot, resolved, mutationResolver);
  const cacheEntries = (await readdir(cacheDirectory)).filter((file) => file.endsWith(".json"));
  await Promise.all(cacheEntries.map((entry) => writeFile(path.join(cacheDirectory, entry), JSON.stringify({ hostile: true }), "utf8")));
  const invalidResolver = new PrototypeResolver({ root: normalRoot, maxTargetReads: MAX_TARGET_READS, cacheDirectory, persistent: true, memoTargets: true });
  const invalidPayloadFallback = await prototypeDirect(normalRoot, resolved, invalidResolver);
  const unusableCachePath = path.join(path.dirname(cacheDirectory), "cache-is-a-file");
  await writeFile(unusableCachePath, "not a directory", "utf8");
  const failedCacheResolver = new PrototypeResolver({ root: normalRoot, maxTargetReads: MAX_TARGET_READS, cacheDirectory: unusableCachePath, persistent: true, memoTargets: true });
  const failedCacheFallback = await prototypeDirect(normalRoot, resolved, failedCacheResolver);
  const invalidationResolver = new PrototypeResolver({ root: normalRoot, maxTargetReads: MAX_TARGET_READS, cacheDirectory, persistent: true, memoTargets: false, parserVersion: "link-private-facts-v2" });
  await invalidationResolver.readSource("guides/guide-0500.md", MAX_MARKDOWN_BYTES);
  return {
    resultRecordOrderParity: comparable(baseline) === comparable(prototype),
    baseline,
    prototype,
    logicalTargetLimitParity: comparable(limitBaseline) === comparable(limitPrototype),
    limitBaseline,
    limitPrototype,
    cancellationParity: comparable(cancellationBaseline) === comparable(cancellationPrototype),
    cancellationBaseline,
    cancellationPrototype,
    sourceTooLargeParity: comparable(tooLargeBaseline) === comparable(tooLargePrototype),
    tooLargeBaseline,
    tooLargePrototype,
    targetUnavailableParity: comparable(targetUnavailableBaseline) === comparable(targetUnavailablePrototype),
    targetUnavailableBaseline,
    targetUnavailablePrototype,
    memoTargetFailureNotRetained: memoFailureNotRetained,
    nonemptyFindingMessageRecordParity: comparable(findingBaseline) === comparable(findingPrototype),
    findingBaseline,
    findingPrototype,
    cacheInvalidPayloadFallsBackWithParity: invalidResolver.cache.rejectedPayloads > 0 && comparable(await directBaseline(normalRoot, resolved)) === comparable(invalidPayloadFallback),
    cacheIoFailureFallsBackWithParity: comparable(baseline) === comparable(failedCacheFallback),
    exactByteMutationMissesOldCacheAndPreservesSettlement: beforeMutation.status === afterMutation.status && mutationResolver.cache.misses > 0,
    strictHostilePayloadsRejected: hostilePayloadsRejected,
    parserVersionInvalidatesEntry: invalidationResolver.cache.hits === 0 && invalidationResolver.cache.misses === 1,
    boundary: "Parity compares status/reason/final data/messages/record identity+data+order. Pre-abort is deterministic; no Product seam exists to inject a stable mid-I/O abort. Source-too-large and target-unavailable remain Product-owned failure branches not altered by this prototype."
  };
}

function groupSummary(samples: readonly Sample[]) {
  const result: Record<string, unknown> = {};
  for (const group of [...new Set(samples.map((sample) => sample.group))]) {
    const groupSamples = samples.filter((sample) => sample.group === group);
    const walls = groupSamples.map((sample) => sample.wallMs);
    result[group] = {
      sequence: groupSamples.map((sample) => sample.mode),
      wallMs: walls,
      medianWallMs: median(walls),
      madWallMs: mad(walls),
      medianCpuMicros: median(groupSamples.map((sample) => sample.cpuUserMicros + sample.cpuSystemMicros)),
      maxObservedRssBytes: Math.max(...groupSamples.map((sample) => sample.maxRssBytes))
    };
  }
  return result;
}

function medianFor(samples: readonly Sample[], group: string): number {
  return median(samples.filter((sample) => sample.group === group).map((sample) => sample.wallMs));
}

async function main(): Promise<void> {
  const evidenceRoot = path.resolve(import.meta.dirname);
  const output = process.argv.includes("--output") ? path.resolve(process.argv[process.argv.indexOf("--output") + 1]!) : path.join(evidenceRoot, "results", "latest.json");
  const root = await mkdtemp(path.join(tmpdir(), "vibe-check-link-cache-evidence-"));
  const filesystem = await statfs(root);
  const normalRoot = path.join(root, "normal");
  const incrementalSeedRoot = path.join(root, "incremental-seed");
  const highReuseRoot = path.join(root, "high-reuse");
  const cacheDirectory = path.join(root, "cache");
  await mkdir(cacheDirectory, { recursive: true });
  await writeFixture(normalRoot, NORMAL_TARGET_COUNT);
  await writeFixture(incrementalSeedRoot, NORMAL_TARGET_COUNT);
  await writeFixture(highReuseRoot, HIGH_REUSE_TARGET_COUNT);
  const samples: Sample[] = [];
  // Full Run observations are deliberately not gate comparators. The paired
  // comparator below invokes the implemented resolver through the same direct
  // Check envelope for default-disabled and explicit-enabled options.
  for (let repetition = 1; repetition <= SAMPLES_PER_GROUP; repetition += 1) {
    samples.push(await publicSample("public-run-observation-normal", repetition, normalRoot));
  }
  for (let repetition = 1; repetition <= SAMPLES_PER_GROUP; repetition += 1) {
    await rm(cacheDirectory, { recursive: true, force: true }); await mkdir(cacheDirectory);
    const order = repetition % 2 === 0 ? "candidate-first" as const : "baseline-first" as const;
    if (order === "baseline-first") {
      samples.push(await formalRuntimeSample("cold-gate-baseline", "formal-disabled", repetition, normalRoot, undefined, order));
      samples.push(await formalRuntimeSample("cold-gate-candidate", "formal-enabled", repetition, normalRoot, cacheDirectory, order));
    } else {
      samples.push(await formalRuntimeSample("cold-gate-candidate", "formal-enabled", repetition, normalRoot, cacheDirectory, order));
      samples.push(await formalRuntimeSample("cold-gate-baseline", "formal-disabled", repetition, normalRoot, undefined, order));
    }
  }
  await rm(cacheDirectory, { recursive: true, force: true }); await mkdir(cacheDirectory);
  await formalRuntimeSample("warm-prewarm", "formal-enabled", 0, normalRoot, cacheDirectory, "observation");
  for (let repetition = 1; repetition <= SAMPLES_PER_GROUP; repetition += 1) {
    const order = repetition % 2 === 0 ? "candidate-first" as const : "baseline-first" as const;
    if (order === "baseline-first") {
      samples.push(await formalRuntimeSample("warm-gate-baseline", "formal-disabled", repetition, normalRoot, undefined, order));
      samples.push(await formalRuntimeSample("warm-gate-candidate", "formal-enabled", repetition, normalRoot, cacheDirectory, order));
    } else {
      samples.push(await formalRuntimeSample("warm-gate-candidate", "formal-enabled", repetition, normalRoot, cacheDirectory, order));
      samples.push(await formalRuntimeSample("warm-gate-baseline", "formal-disabled", repetition, normalRoot, undefined, order));
    }
  }
  for (let repetition = 1; repetition <= SAMPLES_PER_GROUP; repetition += 1) {
    const incrementalRoot = path.join(root, `incremental-${repetition}`);
    const incrementalCache = path.join(root, `incremental-cache-${repetition}`);
    await cp(incrementalSeedRoot, incrementalRoot, { recursive: true });
    await mkdir(incrementalCache, { recursive: true });
    await formalRuntimeSample("incremental-prewarm", "formal-enabled", 0, incrementalRoot, incrementalCache, "observation");
    await mutateSingleSource(incrementalRoot);
    const order = repetition % 2 === 0 ? "candidate-first" as const : "baseline-first" as const;
    if (order === "baseline-first") {
      samples.push(await formalRuntimeSample("incremental-gate-baseline", "formal-disabled", repetition, incrementalRoot, undefined, order));
      samples.push(await formalRuntimeSample("incremental-gate-candidate", "formal-enabled", repetition, incrementalRoot, incrementalCache, order));
    } else {
      samples.push(await formalRuntimeSample("incremental-gate-candidate", "formal-enabled", repetition, incrementalRoot, incrementalCache, order));
      samples.push(await formalRuntimeSample("incremental-gate-baseline", "formal-disabled", repetition, incrementalRoot, undefined, order));
    }
  }
  for (let repetition = 1; repetition <= SAMPLES_PER_GROUP; repetition += 1) {
    await rm(cacheDirectory, { recursive: true, force: true }); await mkdir(cacheDirectory);
    const order = repetition % 2 === 0 ? "candidate-first" as const : "baseline-first" as const;
    samples.push(await formalRuntimeSample("high-reuse-control", "formal-disabled", repetition, highReuseRoot, undefined, order));
    if (order === "baseline-first") {
      samples.push(await formalRuntimeSample("high-reuse-gate-baseline", "formal-disabled", repetition, highReuseRoot, undefined, order));
      samples.push(await formalRuntimeSample("high-reuse-gate-candidate", "formal-enabled", repetition, highReuseRoot, cacheDirectory, order));
    } else {
      samples.push(await formalRuntimeSample("high-reuse-gate-candidate", "formal-enabled", repetition, highReuseRoot, cacheDirectory, order));
      samples.push(await formalRuntimeSample("high-reuse-gate-baseline", "formal-disabled", repetition, highReuseRoot, undefined, order));
    }
  }
  const semantic = await semanticChecks(normalRoot, cacheDirectory);
  const outputValue = {
    schemaVersion: 2,
    command: "bun changes/cache-markdown-link-safe-facts/evidence/benchmark.ts --output changes/cache-markdown-link-safe-facts/evidence/results/latest.json",
    generatedAtUtc: new Date().toISOString(),
    environment: { bun: process.versions.bun ?? "unknown", os: process.platform, arch: process.arch, cpu: cpus()[0]?.model ?? "unknown", cpuCount: cpus().length, node: process.version },
    fixture: { seed: SEED, sourceCount: SOURCE_COUNT, normalTargetCount: NORMAL_TARGET_COUNT, highReuseTargetCount: HIGH_REUSE_TARGET_COUNT, totalMarkdownFiles: { normal: SOURCE_COUNT + NORMAL_TARGET_COUNT, highReuse: SOURCE_COUNT + HIGH_REUSE_TARGET_COUNT }, sizes: [512, 2_048, 8_192], targetLinksPerSource: "deterministic 1..5", mutation: "each incremental repetition copies the deterministic seed, prewarms its own cache, then appends one heading to guides/guide-0500.md" },
    storage: { temporaryFixtureRoot: root, tmpdir: tmpdir(), statfs: { bsize: Number(filesystem.bsize), blocks: Number(filesystem.blocks), bavail: Number(filesystem.bavail), bfree: Number(filesystem.bfree), files: Number(filesystem.files), ffree: Number(filesystem.ffree), type: Number(filesystem.type) } },
    measurement: { samplesPerGroup: SAMPLES_PER_GROUP, coldDefinition: "application cache directory empty; operating-system page cache is not forcibly dropped", cpu: "per-sample process.resourceUsage user+system deltas", memory: "process.resourceUsage maxRSS; cumulative process peak, reported as max observed rather than a per-sample isolated peak", counters: "The retest invokes formal runtime only. Its public/direct Check envelope does not expose physical I/O or parser counters; cache entry footprint and full timing are measured here, while direct resolver tests prove successful canonical-target memo reuse without changing logical counts." },
    samples,
    summaries: groupSummary(samples),
    comparisons: {
      gateComparator: "same direct executeMarkdownLinkValidation envelope in formal runtime; public-run observations are not divided into candidate timings",
      coldRegressionPercent: ((medianFor(samples, "cold-gate-candidate") / medianFor(samples, "cold-gate-baseline")) - 1) * 100,
      warmImprovementPercent: (1 - medianFor(samples, "warm-gate-candidate") / medianFor(samples, "warm-gate-baseline")) * 100,
      warmSavedMs: medianFor(samples, "warm-gate-baseline") - medianFor(samples, "warm-gate-candidate"),
      incrementalImprovementPercent: (1 - medianFor(samples, "incremental-gate-candidate") / medianFor(samples, "incremental-gate-baseline")) * 100,
      incrementalSavedMs: medianFor(samples, "incremental-gate-baseline") - medianFor(samples, "incremental-gate-candidate"),
      highReuseEnabledMedianCacheEntries: median(samples.filter((sample) => sample.group === "high-reuse-gate-candidate").map((sample) => sample.cache?.entries ?? 0)),
      physicalReadParseCounterBoundary: "Formal runtime does not expose physical read/parse counters. The direct resolver test exercises real target memo reuse and verifies unchanged logical targetReadCount; this benchmark does not represent an uninstrumented counter as a measured reduction."
    },
    semantic
  };
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(outputValue, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ output, summaries: outputValue.summaries, comparisons: outputValue.comparisons, semantic: { resultRecordOrderParity: semantic.resultRecordOrderParity, logicalTargetLimitParity: semantic.logicalTargetLimitParity, cancellationParity: semantic.cancellationParity, exactByteIdentityChangesOnMutation: semantic.exactByteIdentityChangesOnMutation, strictPayloadRejectsUnknownKey: semantic.strictPayloadRejectsUnknownKey, parserVersionInvalidatesEntry: semantic.parserVersionInvalidatesEntry } }, null, 2));
}

await main();
