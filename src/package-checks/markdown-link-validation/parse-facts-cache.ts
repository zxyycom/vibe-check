import { isUtf8 } from "node:buffer";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import {
  cacheEnvelopeLine,
  markdownBytesDigest,
  parseCacheEnvelopeLine
} from "./parse-facts-cache-payload.ts";
import {
  parseMarkdownLinkFacts,
  type MarkdownLinkParseResult,
  type ParsedMarkdownLinkFacts
} from "./markdown-parser.ts";
import type { ResolvedMarkdownLinkValidationOptions } from "./options.ts";

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
  #initialRead: Promise<void> | undefined;
  #canPublish = true;
  #needsPartialTailIsolation = false;
  #finalization: Promise<void> | undefined;

  constructor(cache: ResolvedMarkdownLinkValidationOptions["cache"]) {
    this.#cache = cache;
  }

  async parse(
    bytes: Uint8Array,
    signal: AbortSignal
  ): Promise<MarkdownLinkParseResult | undefined> {
    if (signal.aborted || !isUtf8(bytes)) return undefined;
    if (!this.#cache.enabled) return parseCurrentMarkdownBytes(bytes, signal);

    await this.#restoreOnce();
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

  async #restoreOnce(): Promise<void> {
    this.#initialRead ??= this.#restore();
    await this.#initialRead;
  }

  async #restore(): Promise<void> {
    if (!this.#cache.enabled) return;
    let contents: Uint8Array;
    try {
      contents = await readFile(cacheFilePath(this.#cache.directory));
    } catch (error) {
      if (isMissingFile(error)) return;
      this.#canPublish = false;
      return;
    }

    this.#needsPartialTailIsolation =
      contents.length > 0 && contents[contents.length - 1] !== "\n".charCodeAt(0);
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(contents);
    } catch {
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
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as Readonly<{ readonly code?: unknown }>).code === "ENOENT"
  );
}
