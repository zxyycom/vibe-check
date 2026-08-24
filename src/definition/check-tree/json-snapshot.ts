import { snapshotClosedArray, snapshotClosedRecord } from "../../foundation/closed-values.ts";

type JsonSnapshot = object | readonly unknown[] | string | number | boolean | null;

/** Copies a closed JSON object without retaining untyped authoring input. */
export function snapshotJsonObject(value: unknown): object | undefined {
  const snapshot = snapshotJson(value, new Set<object>());
  return isJsonObject(snapshot) ? snapshot : undefined;
}

function isJsonObject(value: JsonSnapshot | undefined): value is object {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function snapshotJson(value: unknown, ancestors: Set<object>): JsonSnapshot | undefined {
  const primitive = snapshotJsonPrimitive(value);
  if (primitive !== undefined || value === null) return primitive;
  if (typeof value !== "object") return undefined;
  if (ancestors.has(value)) return undefined;

  const items = snapshotClosedArray(value);
  if (items !== undefined) return snapshotJsonArray(value, items, ancestors);

  const data = snapshotClosedRecord(value);
  if (data === undefined) return undefined;
  return snapshotJsonRecord(value, data, ancestors);
}

function snapshotJsonPrimitive(value: unknown): string | number | boolean | null | undefined {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return value;
}

function snapshotJsonArray(
  value: object,
  items: readonly unknown[],
  ancestors: Set<object>
): readonly JsonSnapshot[] | undefined {
  ancestors.add(value);
  try {
    const snapshot: JsonSnapshot[] = [];
    for (const item of items) {
      const parsed = snapshotJson(item, ancestors);
      if (parsed === undefined) return undefined;
      snapshot.push(parsed);
    }
    return Object.freeze(snapshot);
  } finally {
    ancestors.delete(value);
  }
}

function snapshotJsonRecord(
  value: object,
  data: Readonly<Record<string, unknown>>,
  ancestors: Set<object>
): object | undefined {
  ancestors.add(value);
  try {
    const snapshot: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(data)) {
      const parsed = snapshotJson(item, ancestors);
      if (parsed === undefined) return undefined;
      snapshot[key] = parsed;
    }
    return Object.freeze(snapshot);
  } finally {
    ancestors.delete(value);
  }
}
