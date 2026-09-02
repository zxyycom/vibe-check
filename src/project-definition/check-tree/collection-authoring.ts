import { snapshotClosedArray } from "../../data-boundary/closed-values.ts";

/** Snapshots one closed array as unique, non-empty authored identifiers. */
export function parseUniqueIdentifiers(value: unknown): readonly string[] | undefined {
  const items = snapshotClosedArray(value);
  if (items === undefined) return undefined;
  const identifiers: string[] = [];
  for (const item of items) {
    if (typeof item !== "string" || item.length === 0) return undefined;
    if (!identifiers.includes(item)) identifiers.push(item);
  }
  return Object.freeze(identifiers);
}
