import { createHash } from "node:crypto";

import type { CanonicalMetric } from "./contract.ts";

export function canonicalMetrics(value: readonly CanonicalMetric[]): readonly CanonicalMetric[] {
  return Object.freeze(
    [...value]
      .map((metric) =>
        Object.freeze({
          ccn: metric.ccn,
          endLine: metric.endLine,
          file: metric.file.replaceAll("\\", "/"),
          name: metric.name,
          nloc: metric.nloc,
          parameterCount: metric.parameterCount,
          startLine: metric.startLine
        })
      )
      .sort(compareMetrics)
  );
}

export function canonicalDigest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function metricsEqual(
  left: readonly CanonicalMetric[],
  right: readonly CanonicalMetric[]
): boolean {
  return JSON.stringify(canonicalMetrics(left)) === JSON.stringify(canonicalMetrics(right));
}

function compareMetrics(left: CanonicalMetric, right: CanonicalMetric): number {
  for (const comparison of metricFieldComparisons(left, right)) {
    if (comparison) return comparison;
  }
  return 0;
}

function metricFieldComparisons(left: CanonicalMetric, right: CanonicalMetric): readonly number[] {
  return Object.freeze([
    compareText(left.file, right.file),
    left.startLine - right.startLine,
    left.endLine - right.endLine,
    compareText(left.name, right.name),
    left.nloc - right.nloc,
    (left.ccn ?? -1) - (right.ccn ?? -1),
    left.parameterCount - right.parameterCount
  ]);
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
