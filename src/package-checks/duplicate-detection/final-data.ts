import type { FindingSummary } from "../code-quality-findings/policy.ts";
import { parseFindingSummaryData } from "../final-data-parsing.ts";

/** `duplicate-detection` 在 passed/failed outcome 中发布的主数据。 */
export type DuplicateDetectionFinalData = FindingSummary;

/** 验证并脱离一份 `duplicate-detection` canonical final-data object。 */
export function parseDuplicateDetectionData(data: unknown): DuplicateDetectionFinalData {
  return parseFindingSummaryData(data, "duplicateDetection");
}
