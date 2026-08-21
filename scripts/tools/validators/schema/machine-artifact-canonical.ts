import { createHash } from "node:crypto";

import type { RecordShape } from "./machine-artifact-types.ts";

export function recordsFingerprint(records: readonly RecordShape[]): string {
  return `check-record/v2/records/sha256:${digest(records)}`;
}

export function isCanonicalCompositeRecordOrder(records: readonly RecordShape[]): boolean {
  let previous: readonly [string, string] | undefined;
  for (const record of records) {
    const current = [record.checkId, record.id] as const;
    if (
      previous !== undefined &&
      (previous[0] > current[0] || (previous[0] === current[0] && previous[1] >= current[1]))
    ) {
      return false;
    }
    previous = current;
  }
  return true;
}

export function isCanonicalText(values: readonly string[]): boolean {
  let previous: string | undefined;
  for (const value of values) {
    if (previous !== undefined && previous >= value) return false;
    previous = value;
  }
  return true;
}

function digest(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.entries(value)
    .sort(([left], [right]) => compareText(left, right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
    .join(",")}}`;
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
