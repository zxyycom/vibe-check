import {
  hasExactPlainRecordKeys,
  snapshotClosedArray,
  snapshotClosedRecord
} from "../data-boundary/closed-values.ts";
import type { FindingSummary } from "./code-quality-findings/policy.ts";

/** Parses the final-data shape shared by the three area-based quality Checks. */
export function parseFindingSummaryData(data: unknown, checkName: string): FindingSummary {
  const summary = exactFinalDataRecord(data, ["blockingFindingCount", "findingCount"], checkName);
  const blockingFindingCount = nonNegativeSafeInteger(summary.blockingFindingCount);
  const findingCount = nonNegativeSafeInteger(summary.findingCount);
  if (
    blockingFindingCount === undefined ||
    findingCount === undefined ||
    blockingFindingCount > findingCount
  ) {
    throw invalidFinalData(checkName);
  }
  return Object.freeze({ blockingFindingCount, findingCount });
}

/** Returns a detached exact record or rejects an unsupported final-data shape. */
export function exactFinalDataRecord(
  data: unknown,
  keys: readonly string[],
  checkName: string
): Readonly<Record<string, unknown>> {
  const record = snapshotClosedRecord(data);
  if (record === undefined || !hasExactPlainRecordKeys(record, keys)) {
    throw invalidFinalData(checkName);
  }
  return record;
}

/** Returns a detached closed array or rejects an unsupported final-data shape. */
export function finalDataArray(data: unknown, checkName: string): readonly unknown[] {
  const items = snapshotClosedArray(data);
  if (items === undefined) throw invalidFinalData(checkName);
  return items;
}

export function nonNegativeSafeInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

export function invalidFinalData(checkName: string): TypeError {
  return new TypeError(`${checkName} final data does not match the supported package contract`);
}
