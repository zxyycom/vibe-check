import type { FindingSummary } from "../code-quality-findings/policy.ts";
import { parseFindingSummaryData } from "../final-data-parsing.ts";

/** `file-metrics` 在 passed/failed outcome 中发布的主数据。 */
export type FileMetricsFinalData = FindingSummary;

/** 验证并脱离一份 `file-metrics` canonical final-data object。 */
export function parseFileMetricsData(data: unknown): FileMetricsFinalData {
  return parseFindingSummaryData(data, "fileMetrics");
}
