import { isUtf8 } from "node:buffer";
import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import {
  snapshotClosedArray,
  snapshotExactClosedRecord
} from "../../data-boundary/closed-values.ts";
import { canonicalJsonText } from "../../data-boundary/canonical-data.ts";
import { isPositiveSafeInteger } from "../../data-boundary/value-shapes.ts";
import {
  parseMarkdownLinkFacts,
  type MarkdownHeading,
  type MarkdownLinkOccurrence,
  type MarkdownLinkParseResult,
  type MarkdownSourcePosition,
  type MarkdownSourceRange,
  type ParsedMarkdownLinkFacts
} from "./markdown-parser.ts";
import type { ResolvedMarkdownLinkValidationOptions } from "./options.ts";

const CACHE_FILE_NAME = "markdown-link-parse-facts-v1.jsonl";
const CACHE_FORMAT_VERSION = "markdown-link-parse-facts-jsonl-v1";
const CACHE_PAYLOAD_VERSION = "1";
/** Version the resolver memo and persistent identity share when parser facts change. */
export const MARKDOWN_LINK_PARSE_FACTS_PARSER_CONTRACT_VERSION =
  "mdast-gfm-frontmatter-github-slug-v1";
const MAX_FACTS_PER_DOCUMENT = 100_000;
const MAX_FACT_STRING_LENGTH = 16_777_216;

type MarkdownLinkParseFactsPayload = Readonly<{
  readonly occurrences: readonly MarkdownLinkOccurrence[];
  readonly headings: readonly MarkdownHeading[];
}>;

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
    if (signal.aborted) return undefined;
    // Hits must still validate the current authorized bytes, but need not decode them.
    if (!isUtf8(bytes)) return undefined;
    if (!this.#cache.enabled) {
      const markdown = decodeMarkdownBytes(bytes);
      return markdown === undefined || signal.aborted
        ? undefined
        : parseMarkdownLinkFacts(markdown);
    }

    await this.#restoreOnce();
    if (signal.aborted) return undefined;
    const identityDigest = markdownBytesDigest(bytes);
    const restored = this.#restored.get(identityDigest);
    if (restored !== undefined) return Object.freeze({ ok: true as const, facts: restored });
    const dirty = this.#dirty.get(identityDigest);
    if (dirty !== undefined) return Object.freeze({ ok: true as const, facts: dirty });

    const markdown = decodeMarkdownBytes(bytes);
    if (markdown === undefined || signal.aborted) return undefined;
    const parsed = parseMarkdownLinkFacts(markdown);
    if (!parsed.ok || signal.aborted) return parsed.ok ? undefined : parsed;
    this.#dirty.set(identityDigest, parsed.facts);
    return parsed;
  }

  finalize(signal: AbortSignal): Promise<void> {
    this.#finalization ??= this.#publish(signal);
    return this.#finalization;
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
      const restored = parseCacheEnvelope(line);
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

function cacheEnvelopeLine(identityDigest: string, facts: ParsedMarkdownLinkFacts): string {
  return `${canonicalJsonText({
    cacheFormatVersion: CACHE_FORMAT_VERSION,
    identityDigest,
    parserContractVersion: MARKDOWN_LINK_PARSE_FACTS_PARSER_CONTRACT_VERSION,
    payloadVersion: CACHE_PAYLOAD_VERSION,
    payload: projectMarkdownLinkParseFactsPayload(facts)
  })}\n`;
}

function parseCacheEnvelope(
  line: string
):
  | Readonly<{ readonly identityDigest: string; readonly facts: ParsedMarkdownLinkFacts }>
  | undefined {
  try {
    const envelope = snapshotExactClosedRecord(JSON.parse(line), [
      "cacheFormatVersion",
      "identityDigest",
      "parserContractVersion",
      "payloadVersion",
      "payload"
    ]);
    if (
      envelope === undefined ||
      envelope.cacheFormatVersion !== CACHE_FORMAT_VERSION ||
      !validIdentityDigest(envelope.identityDigest) ||
      envelope.parserContractVersion !== MARKDOWN_LINK_PARSE_FACTS_PARSER_CONTRACT_VERSION ||
      envelope.payloadVersion !== CACHE_PAYLOAD_VERSION
    ) {
      return undefined;
    }
    return Object.freeze({
      identityDigest: envelope.identityDigest,
      facts: parseMarkdownLinkParseFactsPayload(envelope.payload)
    });
  } catch {
    return undefined;
  }
}

function validIdentityDigest(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

/** Converts parser-owned immutable facts to the closed persistent JSON payload. */
export function projectMarkdownLinkParseFactsPayload(
  facts: ParsedMarkdownLinkFacts
): MarkdownLinkParseFactsPayload {
  return Object.freeze({
    occurrences: Object.freeze(
      facts.occurrences.map((occurrence) =>
        Object.freeze({
          kind: occurrence.kind,
          rawDestination: occurrence.rawDestination,
          range: projectSourceRange(occurrence.range)
        })
      )
    ),
    headings: Object.freeze(
      facts.headings.map((heading) =>
        Object.freeze({ slug: heading.slug, range: projectSourceRange(heading.range) })
      )
    )
  });
}

/** Strictly restores the Link-private persistent JSON payload to immutable parser facts. */
export function parseMarkdownLinkParseFactsPayload(value: unknown): ParsedMarkdownLinkFacts {
  const payload = snapshotExactClosedRecord(value, ["occurrences", "headings"]);
  if (payload === undefined) throw new TypeError("Markdown Link cache payload must be closed");
  const occurrences = parseOccurrences(payload.occurrences);
  const headings = parseHeadings(payload.headings);
  if (occurrences === undefined || headings === undefined) {
    throw new TypeError("Markdown Link cache payload contains invalid parse facts");
  }
  return Object.freeze({ occurrences, headings });
}

function markdownBytesDigest(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function parseOccurrences(value: unknown): readonly MarkdownLinkOccurrence[] | undefined {
  const values = boundedPayloadArray(value);
  if (values === undefined) return undefined;
  const occurrences: MarkdownLinkOccurrence[] = [];
  for (const candidate of values) {
    const occurrence = snapshotExactClosedRecord(candidate, ["kind", "rawDestination", "range"]);
    if (
      occurrence === undefined ||
      (occurrence.kind !== "image" && occurrence.kind !== "link") ||
      !validFactString(occurrence.rawDestination)
    ) {
      return undefined;
    }
    const range = parseSourceRange(occurrence.range);
    if (range === undefined) return undefined;
    occurrences.push(
      Object.freeze({ kind: occurrence.kind, rawDestination: occurrence.rawDestination, range })
    );
  }
  return Object.freeze(occurrences);
}

function parseHeadings(value: unknown): readonly MarkdownHeading[] | undefined {
  const values = boundedPayloadArray(value);
  if (values === undefined) return undefined;
  const headings: MarkdownHeading[] = [];
  for (const candidate of values) {
    const heading = snapshotExactClosedRecord(candidate, ["slug", "range"]);
    if (heading === undefined || !validFactString(heading.slug)) return undefined;
    const range = parseSourceRange(heading.range);
    if (range === undefined) return undefined;
    headings.push(Object.freeze({ slug: heading.slug, range }));
  }
  return Object.freeze(headings);
}

function boundedPayloadArray(value: unknown): readonly unknown[] | undefined {
  const values = snapshotClosedArray(value);
  return values !== undefined && values.length <= MAX_FACTS_PER_DOCUMENT ? values : undefined;
}

function validFactString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= MAX_FACT_STRING_LENGTH &&
    !hasUnpairedSurrogate(value)
  );
}

function parseSourceRange(value: unknown): MarkdownSourceRange | undefined {
  const range = snapshotExactClosedRecord(value, ["startOffset", "endOffset", "start", "end"]);
  if (
    range === undefined ||
    !boundedNonNegativeSafeInteger(range.startOffset) ||
    !boundedNonNegativeSafeInteger(range.endOffset) ||
    range.endOffset < range.startOffset
  ) {
    return undefined;
  }
  const start = parseSourcePosition(range.start);
  const end = parseSourcePosition(range.end);
  if (start === undefined || end === undefined || sourcePositionFollows(end, start) === false) {
    return undefined;
  }
  return Object.freeze({ startOffset: range.startOffset, endOffset: range.endOffset, start, end });
}

function sourcePositionFollows(
  end: MarkdownSourcePosition,
  start: MarkdownSourcePosition
): boolean {
  return end.line > start.line || (end.line === start.line && end.column >= start.column);
}

function parseSourcePosition(value: unknown): MarkdownSourcePosition | undefined {
  const position = snapshotExactClosedRecord(value, ["line", "column"]);
  if (
    position === undefined ||
    !boundedPositiveSafeInteger(position.line) ||
    !boundedPositiveSafeInteger(position.column)
  ) {
    return undefined;
  }
  return Object.freeze({ line: position.line, column: position.column });
}

function projectSourceRange(range: MarkdownSourceRange): MarkdownSourceRange {
  return Object.freeze({
    startOffset: range.startOffset,
    endOffset: range.endOffset,
    start: Object.freeze({ line: range.start.line, column: range.start.column }),
    end: Object.freeze({ line: range.end.line, column: range.end.column })
  });
}

function boundedNonNegativeSafeInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= MAX_FACT_STRING_LENGTH
  );
}

function boundedPositiveSafeInteger(value: unknown): value is number {
  return isPositiveSafeInteger(value) && value <= MAX_FACT_STRING_LENGTH + 1;
}

function hasUnpairedSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (!(nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff)) return true;
      index += 1;
      continue;
    }
    if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) return true;
  }
  return false;
}
