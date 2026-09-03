import {
  exactFinalDataRecord,
  invalidFinalData,
  nonNegativeSafeInteger
} from "../final-data-parsing.ts";

/** `secretDetection` 正常完成时发布的安全计数。 */
export interface SecretDetectionFinalData {
  readonly coverageGapCount: number;
  readonly findingCount: number;
  readonly scannedFileCount: number;
  readonly selectedFileCount: number;
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
