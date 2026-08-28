import {
  exactFinalDataRecord,
  invalidFinalData,
  nonNegativeSafeInteger
} from "../final-data-parsing.ts";

/** `markdown-link-validation` 在 passed/failed outcome 中发布的主数据。 */
export interface MarkdownLinkValidationFinalData {
  readonly sourceFileCount: number;
  readonly occurrenceCount: number;
  readonly targetReadCount: number;
  readonly findingCount: number;
}

/** 验证计数不变量并脱离一份 canonical final-data object。 */
export function parseMarkdownLinkValidationData(data: unknown): MarkdownLinkValidationFinalData {
  const value = exactFinalDataRecord(
    data,
    ["sourceFileCount", "occurrenceCount", "targetReadCount", "findingCount"],
    "markdownLinkValidation"
  );
  const sourceFileCount = nonNegativeSafeInteger(value.sourceFileCount);
  const occurrenceCount = nonNegativeSafeInteger(value.occurrenceCount);
  const targetReadCount = nonNegativeSafeInteger(value.targetReadCount);
  const findingCount = nonNegativeSafeInteger(value.findingCount);
  if (
    sourceFileCount === undefined ||
    occurrenceCount === undefined ||
    targetReadCount === undefined ||
    findingCount === undefined ||
    targetReadCount > occurrenceCount ||
    findingCount > occurrenceCount
  ) {
    throw invalidFinalData("markdownLinkValidation");
  }
  return Object.freeze({ sourceFileCount, occurrenceCount, targetReadCount, findingCount });
}
