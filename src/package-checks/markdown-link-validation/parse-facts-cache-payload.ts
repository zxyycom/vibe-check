import { createHash } from "node:crypto";

import {
  snapshotClosedArray,
  snapshotExactClosedRecord
} from "../../data-boundary/closed-values.ts";
import { canonicalJsonText } from "../../data-boundary/canonical-data.ts";
import { isPositiveSafeInteger } from "../../data-boundary/value-shapes.ts";
import type {
  MarkdownHeading,
  MarkdownLinkOccurrence,
  MarkdownSourcePosition,
  MarkdownSourceRange,
  ParsedMarkdownLinkFacts
} from "./markdown-parser.ts";

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
 * Serializes one complete Link-private JSONL envelope from immutable parser facts.
 * The session owns when this line is appended; this codec owns its shape and identity.
 */
export function cacheEnvelopeLine(identityDigest: string, facts: ParsedMarkdownLinkFacts): string {
  return `${canonicalJsonText({
    cacheFormatVersion: CACHE_FORMAT_VERSION,
    identityDigest,
    parserContractVersion: MARKDOWN_LINK_PARSE_FACTS_PARSER_CONTRACT_VERSION,
    payloadVersion: CACHE_PAYLOAD_VERSION,
    payload: projectMarkdownLinkParseFactsPayload(facts)
  })}\n`;
}

/** Restores one complete, current-version JSONL envelope or rejects it as a cache miss. */
export function parseCacheEnvelopeLine(
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
    if (!isCurrentCacheEnvelope(envelope)) return undefined;
    return Object.freeze({
      identityDigest: envelope.identityDigest,
      facts: parseMarkdownLinkParseFactsPayload(envelope.payload)
    });
  } catch {
    return undefined;
  }
}

/** SHA-256 identity over the current, exact authorized Markdown bytes. */
export function markdownBytesDigest(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
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

function isCurrentCacheEnvelope(
  envelope: Readonly<Record<string, unknown>> | undefined
): envelope is Readonly<{
  readonly identityDigest: string;
  readonly payload: unknown;
}> {
  return (
    envelope !== undefined &&
    envelope.cacheFormatVersion === CACHE_FORMAT_VERSION &&
    validIdentityDigest(envelope.identityDigest) &&
    envelope.parserContractVersion === MARKDOWN_LINK_PARSE_FACTS_PARSER_CONTRACT_VERSION &&
    envelope.payloadVersion === CACHE_PAYLOAD_VERSION
  );
}

function validIdentityDigest(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
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
  if (start === undefined || end === undefined || !sourcePositionFollows(end, start)) {
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
