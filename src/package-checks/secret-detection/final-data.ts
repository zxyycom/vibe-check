import {
  exactFinalDataRecord,
  invalidFinalData,
  nonNegativeSafeInteger
} from "../final-data-parsing.ts";

/** `secretDetection` 正常完成时发布的安全计数。 */
export interface SecretDetectionFinalData {
  /** 已选择但未获得 bounded detector coverage 的文件数。 */
  readonly coverageGapCount: number;
  /** 所有安全投影后的 detector finding 数，包括已 waived 的 finding。 */
  readonly findingCount: number;
  /** 已获得 bounded text detector coverage 的文件数。 */
  readonly scannedFileCount: number;
  /** files policy 的 exact selection 数，恒等于 scannedFileCount 与 coverageGapCount 之和。 */
  readonly selectedFileCount: number;
  /** 安全 identity 被唯一 waiver 匹配的 finding 数。 */
  readonly waivedFindingCount: number;
}

/** 验证并脱离一份 `secretDetection` canonical final-data object。 */
export function parseSecretDetectionData(data: unknown): SecretDetectionFinalData {
  const value = exactFinalDataRecord(
    data,
    [
      "coverageGapCount",
      "findingCount",
      "scannedFileCount",
      "selectedFileCount",
      "waivedFindingCount"
    ],
    "secretDetection"
  );
  const coverageGapCount = nonNegativeSafeInteger(value.coverageGapCount);
  const findingCount = nonNegativeSafeInteger(value.findingCount);
  const scannedFileCount = nonNegativeSafeInteger(value.scannedFileCount);
  const selectedFileCount = nonNegativeSafeInteger(value.selectedFileCount);
  const waivedFindingCount = nonNegativeSafeInteger(value.waivedFindingCount);
  if (
    coverageGapCount === undefined ||
    findingCount === undefined ||
    scannedFileCount === undefined ||
    selectedFileCount === undefined ||
    waivedFindingCount === undefined ||
    scannedFileCount + coverageGapCount !== selectedFileCount ||
    waivedFindingCount > findingCount
  ) {
    throw invalidFinalData("secretDetection");
  }
  return Object.freeze({
    coverageGapCount,
    findingCount,
    scannedFileCount,
    selectedFileCount,
    waivedFindingCount
  });
}
