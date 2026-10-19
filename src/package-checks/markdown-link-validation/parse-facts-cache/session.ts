import { isUtf8 } from "node:buffer";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { CheckMessage } from "../../../check/check.ts";
import { DEFAULT_CACHE_WARN_ABOVE_BYTES } from "../cache-options.ts";
import { cacheEnvelopeLine, markdownBytesDigest, parseCacheEnvelopeLine } from "./payload.ts";
import {
  parseMarkdownLinkFacts,
  type MarkdownLinkParseResult,
  type ParsedMarkdownLinkFacts
} from "../markdown-parser.ts";
import type { ResolvedMarkdownLinkValidationOptions } from "../options.ts";

const CACHE_FILE_NAME = "markdown-link-parse-facts-v1.jsonl";

/**
 * Link-private state for one resolver invocation's parse-facts cache lifecycle.
 * It restores at most once, collects successful fresh facts by identity, and
 * publishes at the execution terminal boundary.
 */
export class MarkdownLinkParseFactsSession {
  readonly #cache: ResolvedMarkdownLinkValidationOptions["cache"];
  readonly #restored = new Map<string, ParsedMarkdownLinkFacts>();
  readonly #dirty = new Map<string, ParsedMarkdownLinkFacts>();
  #messages: readonly CheckMessage[] = Object.freeze([]);
  #initialRead: Promise<void> | undefined;
  #canPublish = true;
  #needsPartialTailIsolation = false;
  #finalization: Promise<void> | undefined;

  constructor(cache: ResolvedMarkdownLinkValidationOptions["cache"]) {
    this.#cache = cache;
  }

  get messages(): readonly CheckMessage[] {
    return this.#messages;
  }

  async parse(
    bytes: Uint8Array,
    signal: AbortSignal
  ): Promise<MarkdownLinkParseResult | undefined> {
    if (signal.aborted || !isUtf8(bytes)) return undefined;
    if (!this.#cache.enabled) return parseCurrentMarkdownBytes(bytes, signal);

    await this.#restoreOnce(signal);
    if (signal.aborted) return undefined;
    const identityDigest = markdownBytesDigest(bytes);
    const cachedFacts = this.#cachedFacts(identityDigest);
    if (cachedFacts !== undefined) return parsedFacts(cachedFacts);
    return this.#parseFreshFacts(bytes, identityDigest, signal);
  }

  finalize(signal: AbortSignal): Promise<void> {
    this.#finalization ??= this.#publish(signal);
    return this.#finalization;
  }

  #cachedFacts(identityDigest: string): ParsedMarkdownLinkFacts | undefined {
    return this.#restored.get(identityDigest) ?? this.#dirty.get(identityDigest);
  }

  async #parseFreshFacts(
    bytes: Uint8Array,
    identityDigest: string,
    signal: AbortSignal
  ): Promise<MarkdownLinkParseResult | undefined> {
    const parsed = parseCurrentMarkdownBytes(bytes, signal);
    if (parsed === undefined || !parsed.ok) return parsed;
    if (signal.aborted) return undefined;
    this.#dirty.set(identityDigest, parsed.facts);
    return parsed;
  }

  async #restoreOnce(signal: AbortSignal): Promise<void> {
    this.#initialRead ??= this.#restore(signal);
    await this.#initialRead;
  }

  async #restore(signal: AbortSignal): Promise<void> {
    if (!this.#cache.enabled) return;
    const contents = await this.#readCacheFile(this.#cache.directory);
    if (contents === undefined || signal.aborted) return;
    this.#recordCapacityWarning({
      byteCount: contents.length,
      directory: this.#cache.directory,
      thresholdBytes: this.#cache.warnAboveBytes ?? DEFAULT_CACHE_WARN_ABOVE_BYTES
    });
    this.#restoreContents(contents);
  }

  /** A failed whole-file read prevents publication; a missing file remains an empty cache. */
  async #readCacheFile(directory: string): Promise<Uint8Array | undefined> {
    try {
      return await readFile(cacheFilePath(directory));
    } catch (error) {
      if (!isMissingFile(error)) this.#canPublish = false;
      return undefined;
    }
  }

  #recordCapacityWarning(
    input: Readonly<{
      byteCount: number;
      directory: string;
      thresholdBytes: number;
    }>
  ): void {
    const { byteCount, directory, thresholdBytes } = input;
    if (byteCount <= thresholdBytes) return;
    this.#messages = Object.freeze([
      Object.freeze({
        code: "parse-facts-cache-capacity",
        level: "warning" as const,
        message: `Markdown Link parse-facts cache is ${byteCount} bytes, above the ${thresholdBytes}-byte reminder threshold. You may delete ${cacheFilePath(directory)} to reclaim space; parsing and link validation continue unchanged.`
      })
    ]);
  }

  /** Decoding owns publication safety; only complete valid lines become restored facts. */
  #restoreContents(contents: Uint8Array): void {
    this.#needsPartialTailIsolation =
      contents.length > 0 && contents[contents.length - 1] !== "\n".charCodeAt(0);
    const text = decodeMarkdownBytes(contents);
    if (text === undefined) {
      this.#canPublish = false;
      return;
    }
    const lastNewline = text.lastIndexOf("\n");
    if (lastNewline < 0) return;
    for (const line of text.slice(0, lastNewline).split("\n")) {
      const restored = parseCacheEnvelopeLine(line);
      if (restored !== undefined) this.#restored.set(restored.identityDigest, restored.facts);
    }
  }

  async #publish(signal: AbortSignal): Promise<void> {
    if (signal.aborted || !this.#cache.enabled || !this.#canPublish || this.#dirty.size === 0)
      return;
    try {
      await mkdir(this.#cache.directory, { recursive: true });
      if (signal.aborted) return;
      const block = `${this.#needsPartialTailIsolation ? "\n" : ""}${[...this.#dirty.entries()]
        .map(([identityDigest, facts]) => cacheEnvelopeLine(identityDigest, facts))
        .join("")}`;
      // appendFile both creates a missing file and appends the invocation's one complete block.
      await appendFile(cacheFilePath(this.#cache.directory), block);
    } catch {
      // Cache publication is best effort and never changes Check settlement.
    }
  }
}

function parseCurrentMarkdownBytes(
  bytes: Uint8Array,
  signal: AbortSignal
): MarkdownLinkParseResult | undefined {
  const markdown = decodeMarkdownBytes(bytes);
  return markdown === undefined || signal.aborted ? undefined : parseMarkdownLinkFacts(markdown);
}

function parsedFacts(facts: ParsedMarkdownLinkFacts): MarkdownLinkParseResult {
  return Object.freeze({ ok: true as const, facts });
}

function decodeMarkdownBytes(bytes: Uint8Array): string | undefined {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return undefined;
  }
}

function cacheFilePath(directory: string): string {
  return path.join(directory, CACHE_FILE_NAME);
}

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
