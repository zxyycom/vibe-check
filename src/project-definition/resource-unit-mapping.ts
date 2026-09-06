import { snapshotClosedRecord } from "../data-boundary/closed-values.ts";

export type ResourceUnitMapping = Readonly<Record<string, number>>;

export const EMPTY_RESOURCE_UNIT_MAPPING: ResourceUnitMapping = Object.freeze({});

/** Snapshots a canonical closed resource-to-positive-units mapping. */
export function snapshotResourceUnitMapping(value: unknown): ResourceUnitMapping | undefined {
  const data = snapshotClosedRecord(value);
  if (data === undefined) return undefined;
  const entries: [string, number][] = [];
  for (const resourceId of Object.keys(data).sort()) {
    const units = data[resourceId];
    if (
      resourceId.trim().length === 0 ||
      typeof units !== "number" ||
      !Number.isSafeInteger(units) ||
      units <= 0
    ) {
      return undefined;
    }
    entries.push([resourceId, units]);
  }
  return Object.freeze(Object.fromEntries(entries));
}
