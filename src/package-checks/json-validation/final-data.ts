import {
  exactFinalDataRecord,
  invalidFinalData,
  nonNegativeSafeInteger
} from "../final-data-parsing.ts";

/** `json-validation` 在 passed/failed outcome 中发布的主数据。 */
export interface JsonValidationFinalData {
  /** 已完成 JSON parse 判定的文件数，恒等于 validFileCount 与 invalidFileCount 之和。 */
  readonly scannedFileCount: number;
  /** 被 bounded strict-document boundary 接受为有效 JSON 的文件数。 */
  readonly validFileCount: number;
  /** 形成 `too-large`、encoding、syntax 或 duplicate-key document issue 的文件数。 */
  readonly invalidFileCount: number;
  /** 全部 invalid file 与 rejected input 的合计问题数。 */
  readonly issueCount: number;
  /** files policy 已选中、但因不是 lower-case `.json` path 而被拒绝的输入数。 */
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
