import type { FindingSummary } from "../code-quality-findings/policy.ts";
import { parseFindingSummaryData } from "../final-data-parsing.ts";

/** `function-metrics` 在 passed/failed outcome 中发布的主数据。 */
export type FunctionMetricsFinalData = FindingSummary;

/** 验证并脱离一份 `function-metrics` canonical final-data object。 */
export function parseFunctionMetricsData(data: unknown): FunctionMetricsFinalData {
  return parseFindingSummaryData(data, "functionMetrics");
}
