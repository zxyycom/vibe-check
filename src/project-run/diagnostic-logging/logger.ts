import { closeSync, mkdirSync, openSync, writeSync } from "node:fs";
import { dirname } from "node:path";
import { types } from "node:util";

import type { CheckExecutionClock } from "../check-execution/resolved-checks.ts";

/** Product-private observation written synchronously at the fact owner. */
export interface DiagnosticObservation {
  readonly details?: unknown;
  readonly event: string;
  readonly tags: readonly string[];
}

/** Product-private invocation logger; its failures never escape lifecycle owners. */
export interface DiagnosticLogger {
  close(): "disabled" | "failed" | "succeeded";
  observe(observation: DiagnosticObservation): void;
}

/** A bounded, descriptor-safe description for normal diagnostic payloads. */
export type DiagnosticValueSummary =
  | Readonly<{
      readonly availability: "available";
      readonly bytes: number;
      readonly items?: number;
      readonly keys?: number;
      readonly shape: "array" | "boolean" | "null" | "number" | "object" | "string";
    }>
  | Readonly<{ readonly availability: "unavailable"; readonly reason: string }>;

/** Test-only construction seam; Product invocation owns its lifecycle and output mapping. */
export type DiagnosticLoggerFactory = (
  input: Readonly<{
    readonly clock: CheckExecutionClock;
    readonly enabled: boolean;
    readonly file: string | null;
  }>
) => DiagnosticLogger;

export const createDiagnosticLogger: DiagnosticLoggerFactory = (input) => {
  if (!input.enabled || input.file === null) return disabledLogger();
  return createEnabledLogger({ clock: input.clock, file: input.file });
};

/** Builds one immutable set of human-filterable diagnostic labels. */
export function diagnosticTags(...tags: readonly string[]): readonly string[] {
  return Object.freeze([...tags]);
}

function disabledLogger(): DiagnosticLogger {
  return Object.freeze({
    close: () => "disabled" as const,
    observe: () => undefined
  });
}

function createEnabledLogger(
  input: Readonly<{
    readonly clock: CheckExecutionClock;
    readonly file: string;
  }>
): DiagnosticLogger {
  let descriptor: number | undefined;
  let failed = false;
  let sequence = 0;
  const startedAt = safeNow(input.clock);

  try {
    mkdirSync(dirname(input.file), { recursive: true });
    descriptor = openSync(input.file, "wx");
  } catch {
    failed = true;
  }

  return Object.freeze({
    close: () => {
      if (descriptor !== undefined) {
        try {
          closeSync(descriptor);
        } catch {
          failed = true;
        }
        descriptor = undefined;
      }
      return failed ? "failed" : "succeeded";
    },
    observe: (observation: DiagnosticObservation) => {
      if (failed || descriptor === undefined) return;
      try {
        const buffer = renderObservation({
          elapsedMs: elapsedSince(startedAt, input.clock),
          observation,
          sequence: sequence + 1
        });
        sequence += 1;
        writeBuffer(descriptor, buffer);
      } catch {
        failed = true;
      }
    }
  });
}

function writeBuffer(descriptor: number, buffer: string): void {
  const bytes = Buffer.from(buffer, "utf8");
  let offset = 0;
  while (offset < bytes.length) {
    const written = writeSync(descriptor, bytes, offset, bytes.length - offset, null);
    if (written <= 0) throw new Error("Diagnostic log append made no progress");
    offset += written;
  }
}

function renderObservation(
  input: Readonly<{
    readonly elapsedMs: number;
    readonly observation: DiagnosticObservation;
    readonly sequence: number;
  }>
): string {
  const tags = input.observation.tags.map((tag) => `[${escapeLogHeaderField(tag)}]`).join(" ");
  const header = `#${String(input.sequence).padStart(6, "0")} +${formatElapsed(input.elapsedMs)} ${tags} ${escapeLogHeaderField(input.observation.event)}`;
  return renderFactLines(header, diagnosticFacts(input.observation));
}

/** Keeps author-controlled header fields on one physical header line. */
function escapeLogHeaderField(text: string): string {
  let escaped = "";
  for (const character of text) {
    if (character === "\\") {
      escaped += "\\\\";
      continue;
    }
    const codeUnit = character.charCodeAt(0);
    escaped +=
      codeUnit <= 0x1f ||
      (codeUnit >= 0x7f && codeUnit <= 0x9f) ||
      codeUnit === 0x5b ||
      codeUnit === 0x5d ||
      codeUnit === 0x2028 ||
      codeUnit === 0x2029
        ? `\\u${codeUnit.toString(16).padStart(4, "0")}`
        : character;
  }
  return escaped;
}

function diagnosticFacts(observation: DiagnosticObservation): readonly string[] {
  if (observation.details === undefined) return Object.freeze([]);
  const rendered = renderSafeDetailValue(observation.details);
  if (!rendered.ok)
    return Object.freeze([`details=unavailable:${escapeLogHeaderField(rendered.reason)}`]);

  const value: unknown = JSON.parse(rendered.text);
  const facts: string[] = [];
  flattenDiagnosticFacts(value, [], facts, observation);
  return Object.freeze(facts);
}

function flattenDiagnosticFacts(
  value: unknown,
  path: readonly string[],
  facts: string[],
  observation: DiagnosticObservation
): void {
  if (Array.isArray(value)) {
    const inline = JSON.stringify(value);
    if (inline.length <= MAX_INLINE_DIAGNOSTIC_VALUE_CHARACTERS) {
      facts.push(`${factKey(path)}=${inline}`);
      return;
    }
    const arrayPath = path.length === 0 ? ["details"] : path;
    for (let index = 0; index < value.length; index += 1) {
      flattenDiagnosticFacts(value[index], [...arrayPath, String(index)], facts, observation);
    }
    return;
  }

  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      facts.push(`${factKey(path)}={}`);
      return;
    }
    for (const [key, nested] of entries) {
      if (path.length === 0 && isTopLevelFactRepresentedByTag(observation, key, nested)) continue;
      flattenDiagnosticFacts(nested, [...path, key], facts, observation);
    }
    return;
  }

  facts.push(`${factKey(path)}=${factValue(path, value)}`);
}

/** Omits only exact producer facts already visible in the observation's filter tags. */
function isTopLevelFactRepresentedByTag(
  observation: DiagnosticObservation,
  key: string,
  value: unknown
): boolean {
  if (typeof value !== "string") return false;
  if (observation.event === "scheduler.decision") {
    if (key === "kind") return observation.tags.includes(value.toUpperCase());
    return key === "taskId" && observation.tags.includes(`TASK:${value}`);
  }
  return (
    observation.event === "record.reported" &&
    key === "result" &&
    observation.tags.includes(value.toUpperCase())
  );
}

const MAX_INLINE_DIAGNOSTIC_VALUE_CHARACTERS = 120;

function factKey(path: readonly string[]): string {
  if (path.length === 0) return "details";
  const joined = path.join(".");
  return /^[A-Za-z_][A-Za-z0-9_.-]*$/u.test(joined) ? joined : JSON.stringify(joined);
}

function factValue(path: readonly string[], value: unknown): string {
  const key = path.at(-1);
  if (typeof value === "number" && key?.endsWith("Ms")) {
    return String(Math.round(value * 1_000) / 1_000);
  }
  return JSON.stringify(value);
}

const MAX_DIAGNOSTIC_LINE_CHARACTERS = 200;

function renderFactLines(header: string, facts: readonly string[]): string {
  if (facts.length === 0) return `${header}\n`;

  const lines: string[] = [];
  let current = header;
  for (const fact of facts) {
    if (current.length + 1 + fact.length <= MAX_DIAGNOSTIC_LINE_CHARACTERS) {
      current += ` ${fact}`;
      continue;
    }

    lines.push(current);
    const firstCapacity = MAX_DIAGNOSTIC_LINE_CHARACTERS - "│ ".length;
    const continuationCapacity = MAX_DIAGNOSTIC_LINE_CHARACTERS - "│   ".length;
    let offset = 0;
    let prefix = "│ ";
    while (fact.length - offset > (prefix === "│ " ? firstCapacity : continuationCapacity)) {
      const capacity = prefix === "│ " ? firstCapacity : continuationCapacity;
      const end = diagnosticChunkEnd(fact, offset, capacity);
      lines.push(`${prefix}${fact.slice(offset, end)}`);
      offset = end;
      prefix = "│   ";
    }
    current = `${prefix}${fact.slice(offset)}`;
  }
  lines.push(current);
  return `${lines.join("\n")}\n`;
}

function diagnosticChunkEnd(text: string, offset: number, capacity: number): number {
  let end = offset + capacity;
  const preferredMinimum = offset + Math.floor(capacity * 0.6);
  for (let index = end - 1; index >= preferredMinimum; index -= 1) {
    if (text[index] === " ") {
      end = index;
      break;
    }
    if (text[index] === ",") {
      end = index + 1;
      break;
    }
  }
  if (
    end < text.length &&
    text.charCodeAt(end - 1) >= 0xd800 &&
    text.charCodeAt(end - 1) <= 0xdbff &&
    text.charCodeAt(end) >= 0xdc00 &&
    text.charCodeAt(end) <= 0xdfff
  ) {
    end -= 1;
  }
  return end;
}

function formatElapsed(elapsedMs: number): string {
  const totalMilliseconds = Math.round(elapsedMs);
  const hours = Math.floor(totalMilliseconds / 3_600_000);
  const minutes = Math.floor((totalMilliseconds % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMilliseconds % 60_000) / 1_000);
  const milliseconds = totalMilliseconds % 1_000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
}

/**
 * Describes a normal payload without invoking author hooks or preserving its
 * full value in a lifecycle event. `bytes` measures this logger's safe JSON
 * rendering rather than an author-defined serialization.
 */
export function summarizeDiagnosticValue(value: unknown): DiagnosticValueSummary {
  const rendered = renderSafeDetailValue(value);
  if (!rendered.ok) return Object.freeze({ availability: "unavailable", reason: rendered.reason });

  const parsed: unknown = JSON.parse(rendered.text);
  const bytes = Buffer.byteLength(rendered.text, "utf8");
  if (parsed === null) return Object.freeze({ availability: "available", bytes, shape: "null" });
  if (Array.isArray(parsed))
    return Object.freeze({
      availability: "available",
      bytes,
      items: parsed.length,
      shape: "array"
    });
  switch (typeof parsed) {
    case "boolean":
      return Object.freeze({ availability: "available", bytes, shape: "boolean" });
    case "number":
      return Object.freeze({ availability: "available", bytes, shape: "number" });
    case "string":
      return Object.freeze({ availability: "available", bytes, shape: "string" });
    case "object":
      return Object.freeze({
        availability: "available",
        bytes,
        keys: Object.keys(parsed).length,
        shape: "object"
      });
    case "bigint":
    case "function":
    case "symbol":
    case "undefined":
      throw new Error("safe diagnostic rendering produced a non-JSON value");
    default:
      throw new Error("safe diagnostic rendering produced an unknown value");
  }
}

function renderSafeDetailValue(value: unknown): DetailRendering {
  return renderDetailValue(value, {
    ancestors: new Set<object>(),
    remainingCharacters: MAX_DETAIL_CHARACTERS,
    remainingValues: MAX_DETAIL_VALUES
  });
}

// These bounds admit ordinary package handoffs while keeping diagnostic work finite.
const MAX_DETAIL_CHARACTERS = 1_048_576;
const MAX_DETAIL_DEPTH = 16;
const MAX_DETAIL_VALUES = 32_768;
const MAX_DETAIL_WIDTH = 4_096;

type DetailRendering =
  | Readonly<{ readonly ok: true; readonly text: string }>
  | Readonly<{ readonly ok: false; readonly reason: string }>;

interface DetailRenderingContext {
  readonly ancestors: Set<object>;
  remainingCharacters: number;
  remainingValues: number;
}

/** Renders only descriptor-readable JSON values; diagnostics must never invoke author hooks. */
function renderDetailValue(
  value: unknown,
  context: DetailRenderingContext,
  depth = 0
): DetailRendering {
  if (context.remainingValues <= 0) return unavailable("value-limit");
  context.remainingValues -= 1;
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return renderDetailText(JSON.stringify(value), context);
  if (typeof value === "number")
    return Number.isFinite(value)
      ? renderDetailText(JSON.stringify(value), context)
      : unavailable("non-finite-number");
  if (typeof value !== "object") return unavailable(`unsupported-${typeof value}`);
  if (types.isProxy(value)) return unavailable("proxy");
  if (context.ancestors.has(value)) return unavailable("cycle");
  if (depth >= MAX_DETAIL_DEPTH) return unavailable("depth-limit");
  return Array.isArray(value)
    ? renderDetailArray(value, context, depth)
    : renderDetailRecord(value, context, depth);
}

function renderDetailArray(
  value: readonly unknown[],
  context: DetailRenderingContext,
  depth: number
): DetailRendering {
  if (Object.getPrototypeOf(value) !== Array.prototype) return unavailable("unsupported-prototype");
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  const length: unknown = lengthDescriptor?.value;
  if (
    lengthDescriptor?.get !== undefined ||
    lengthDescriptor?.set !== undefined ||
    typeof length !== "number" ||
    !Number.isSafeInteger(length) ||
    length < 0
  )
    return unavailable("invalid-array");
  if (length > MAX_DETAIL_WIDTH) return unavailable("width-limit");
  const keys = Reflect.ownKeys(value);
  if (keys.length !== length + 1) return unavailable("invalid-array");
  context.ancestors.add(value);
  try {
    const items: string[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!isEnumerableDataDescriptor(descriptor)) return unavailable("accessor-or-sparse-array");
      const rendered = renderDetailValue(descriptor.value, context, depth + 1);
      if (!rendered.ok) return rendered;
      items.push(rendered.text);
    }
    return renderDetailText(`[${items.join(",")}]`, context);
  } finally {
    context.ancestors.delete(value);
  }
}

function renderDetailRecord(
  value: object,
  context: DetailRenderingContext,
  depth: number
): DetailRendering {
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null)
    return unavailable("unsupported-prototype");
  const keys = Reflect.ownKeys(value);
  if (keys.length > MAX_DETAIL_WIDTH) return unavailable("width-limit");
  const textKeys: string[] = [];
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (typeof key !== "string") return unavailable("symbol-key");
    textKeys.push(key);
  }
  textKeys.sort();
  context.ancestors.add(value);
  try {
    const entries: string[] = [];
    for (const key of textKeys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!isEnumerableDataDescriptor(descriptor))
        return unavailable("accessor-or-hidden-property");
      const rendered = renderDetailValue(descriptor.value, context, depth + 1);
      if (!rendered.ok) return rendered;
      entries.push(`${JSON.stringify(key)}:${rendered.text}`);
    }
    return renderDetailText(`{${entries.join(",")}}`, context);
  } finally {
    context.ancestors.delete(value);
  }
}

function isEnumerableDataDescriptor(
  descriptor: PropertyDescriptor | undefined
): descriptor is PropertyDescriptor & Readonly<{ readonly value: unknown }> {
  return (
    descriptor !== undefined &&
    descriptor.enumerable === true &&
    descriptor.get === undefined &&
    descriptor.set === undefined &&
    Object.hasOwn(descriptor, "value")
  );
}

function renderDetailText(text: string, context: DetailRenderingContext): DetailRendering {
  if (text.length > context.remainingCharacters) return unavailable("size-limit");
  context.remainingCharacters -= text.length;
  return Object.freeze({ ok: true, text });
}

function unavailable(reason: string): DetailRendering {
  return Object.freeze({ ok: false, reason });
}

function safeNow(clock: CheckExecutionClock): number {
  try {
    const now = clock.now();
    return Number.isFinite(now) ? now : 0;
  } catch {
    return 0;
  }
}

function elapsedSince(startedAt: number, clock: CheckExecutionClock): number {
  const elapsed = safeNow(clock) - startedAt;
  return Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : 0;
}
