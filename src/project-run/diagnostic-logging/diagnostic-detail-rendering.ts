import { types } from "node:util";

import type { DiagnosticValueSummary } from "./logger.ts";

export function summarizeDiagnosticValue(value: unknown): DiagnosticValueSummary {
  const rendered = renderSafeDiagnosticDetail(value);
  if (!rendered.ok) return Object.freeze({ availability: "unavailable", reason: rendered.reason });

  const parsed: unknown = JSON.parse(rendered.text);
  return summarizeRenderedDiagnosticValue(parsed, Buffer.byteLength(rendered.text, "utf8"));
}

function summarizeRenderedDiagnosticValue(value: unknown, bytes: number): DiagnosticValueSummary {
  if (value === null) return Object.freeze({ availability: "available", bytes, shape: "null" });
  if (Array.isArray(value)) {
    return Object.freeze({ availability: "available", bytes, items: value.length, shape: "array" });
  }
  return summarizeNonArrayDiagnosticValue(value, bytes);
}

function summarizeNonArrayDiagnosticValue(value: unknown, bytes: number): DiagnosticValueSummary {
  switch (typeof value) {
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
        keys: value === null ? 0 : Object.keys(value).length,
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

export function renderSafeDiagnosticDetail(value: unknown): DetailRendering {
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
  const scalar = renderDetailScalar(value, context);
  if (scalar !== undefined) return scalar;
  return renderDetailCompound(value, context, depth);
}

function renderDetailScalar(
  value: unknown,
  context: DetailRenderingContext
): DetailRendering | undefined {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return renderDetailText(JSON.stringify(value), context);
  }
  if (typeof value !== "number") return undefined;
  return Number.isFinite(value)
    ? renderDetailText(JSON.stringify(value), context)
    : unavailable("non-finite-number");
}

function renderDetailCompound(
  value: unknown,
  context: DetailRenderingContext,
  depth: number
): DetailRendering {
  if (value === null || typeof value !== "object")
    return unavailable(`unsupported-${typeof value}`);
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
  const inspection = inspectDetailArray(value);
  if (!inspection.ok) return inspection;
  context.ancestors.add(value);
  try {
    return renderDetailArrayItems(value, inspection.length, context, depth);
  } finally {
    context.ancestors.delete(value);
  }
}

type DetailArrayInspection =
  | Readonly<{ readonly ok: false; readonly reason: string }>
  | Readonly<{ readonly ok: true; readonly length: number }>;

function inspectDetailArray(value: readonly unknown[]): DetailArrayInspection {
  if (Object.getPrototypeOf(value) !== Array.prototype)
    return unavailableArray("unsupported-prototype");
  const length = readableArrayLength(value);
  if (length === null) return unavailableArray("invalid-array");
  if (length > MAX_DETAIL_WIDTH) return unavailableArray("width-limit");
  return Reflect.ownKeys(value).length === length + 1
    ? Object.freeze({ length, ok: true })
    : unavailableArray("invalid-array");
}

function readableArrayLength(value: readonly unknown[]): number | null {
  const descriptor = Object.getOwnPropertyDescriptor(value, "length");
  const length: unknown = descriptor?.value;
  if (descriptor?.get !== undefined || descriptor?.set !== undefined) return null;
  return typeof length === "number" && Number.isSafeInteger(length) && length >= 0 ? length : null;
}

function renderDetailArrayItems(
  value: readonly unknown[],
  length: number,
  context: DetailRenderingContext,
  depth: number
): DetailRendering {
  const items: string[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!isEnumerableDataDescriptor(descriptor)) return unavailable("accessor-or-sparse-array");
    const rendered = renderDetailValue(descriptor.value, context, depth + 1);
    if (!rendered.ok) return rendered;
    items.push(rendered.text);
  }
  return renderDetailText(`[${items.join(",")}]`, context);
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

function unavailableArray(reason: string): DetailArrayInspection {
  return Object.freeze({ ok: false, reason });
}
