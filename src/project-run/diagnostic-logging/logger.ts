import { closeSync, mkdirSync, openSync, writeSync } from "node:fs";
import { dirname } from "node:path";
import { types } from "node:util";

import type { CheckExecutionClock } from "../check-execution/resolved-checks.ts";

/** Product-private observation written synchronously at the fact owner. */
export interface DiagnosticObservation {
  readonly details?: unknown;
  readonly event: string;
  readonly scope: string;
  readonly summary: string;
}

/** Product-private invocation logger; its failures never escape lifecycle owners. */
export interface DiagnosticLogger {
  close(): "disabled" | "failed" | "succeeded";
  observe(observation: DiagnosticObservation): void;
}

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
  const details = renderDetails(input.observation.details);
  return `#${String(input.sequence).padStart(6, "0")} +${input.elapsedMs.toFixed(1)}ms ${escapeLogHeaderField(input.observation.scope)} ${escapeLogHeaderField(input.observation.event)} ${escapeLogHeaderField(input.observation.summary)}${details}\n`;
}

/** Keeps each diagnostic observation to one physical line when author IDs reach its header. */
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
      codeUnit === 0x2028 ||
      codeUnit === 0x2029
        ? `\\u${codeUnit.toString(16).padStart(4, "0")}`
        : character;
  }
  return escaped;
}

function renderDetails(details: unknown): string {
  if (details === undefined) return "";
  const rendered = renderDetailValue(details, {
    ancestors: new Set<object>(),
    remainingCharacters: MAX_DETAIL_CHARACTERS,
    remainingValues: MAX_DETAIL_VALUES
  });
  return rendered.ok
    ? ` details=${rendered.text}`
    : ` details=details-unavailable:${rendered.reason}`;
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
