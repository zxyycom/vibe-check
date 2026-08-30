import {
  exactFinalDataRecord,
  invalidFinalData,
  nonNegativeSafeInteger
} from "../final-data-parsing.ts";

/** `json-validation` 在 passed/failed outcome 中发布的主数据。 */
export interface JsonValidationFinalData {
  readonly scannedFileCount: number;
  readonly validFileCount: number;
  readonly invalidFileCount: number;
  readonly issueCount: number;
  readonly rejectedInputCount: number;
}

/** 验证计数不变量并脱离一份 `json-validation` canonical final-data object。 */
export function parseJsonValidationData(data: unknown): JsonValidationFinalData {
  const value = exactFinalDataRecord(
    data,
    ["scannedFileCount", "validFileCount", "invalidFileCount", "issueCount", "rejectedInputCount"],
    "jsonValidation"
  );
  const scannedFileCount = nonNegativeSafeInteger(value.scannedFileCount);
  const validFileCount = nonNegativeSafeInteger(value.validFileCount);
  const invalidFileCount = nonNegativeSafeInteger(value.invalidFileCount);
  const issueCount = nonNegativeSafeInteger(value.issueCount);
  const rejectedInputCount = nonNegativeSafeInteger(value.rejectedInputCount);
  if (
    scannedFileCount === undefined ||
    validFileCount === undefined ||
    invalidFileCount === undefined ||
    issueCount === undefined ||
    rejectedInputCount === undefined ||
    scannedFileCount !== validFileCount + invalidFileCount ||
    issueCount !== invalidFileCount + rejectedInputCount
  ) {
    throw invalidFinalData("jsonValidation");
  }
  return Object.freeze({
    scannedFileCount,
    validFileCount,
    invalidFileCount,
    issueCount,
    rejectedInputCount
  });
}
