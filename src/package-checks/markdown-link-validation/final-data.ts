import {
  exactFinalDataRecord,
  invalidFinalData,
  nonNegativeSafeInteger
} from "../final-data-parsing.ts";

/** `markdown-link-validation` 在 passed/failed outcome 中发布的主数据。 */
export interface MarkdownLinkValidationFinalData {
  /** 已成功读取并完成 Markdown link occurrence 提取的 source 文件数。 */
  readonly sourceFileCount: number;
  /** 从已处理 source 中提取的 semantic link occurrence 数。 */
  readonly occurrenceCount: number;
  /** 进入 direct endpoint validation 的 logical occurrence 数，包括 target memo hit。 */
  readonly targetReadCount: number;
  /** occurrence finding 与 rejected input 的合计数。 */
  readonly findingCount: number;
  /** files policy 已选中、但因不是 `.md`/`.markdown` path 而被拒绝的输入数。 */
  readonly rejectedInputCount: number;
}

/** 验证计数不变量并脱离一份 canonical final-data object。 */
export function parseMarkdownLinkValidationData(data: unknown): MarkdownLinkValidationFinalData {
  const value = exactFinalDataRecord(
    data,
    ["sourceFileCount", "occurrenceCount", "targetReadCount", "findingCount", "rejectedInputCount"],
    "markdownLinkValidation"
  );
  const sourceFileCount = nonNegativeSafeInteger(value.sourceFileCount);
  const occurrenceCount = nonNegativeSafeInteger(value.occurrenceCount);
  const targetReadCount = nonNegativeSafeInteger(value.targetReadCount);
  const findingCount = nonNegativeSafeInteger(value.findingCount);
  const rejectedInputCount = nonNegativeSafeInteger(value.rejectedInputCount);
  if (
    sourceFileCount === undefined ||
    occurrenceCount === undefined ||
    targetReadCount === undefined ||
    findingCount === undefined ||
    rejectedInputCount === undefined ||
    targetReadCount > occurrenceCount ||
    findingCount < rejectedInputCount ||
    findingCount - rejectedInputCount > occurrenceCount
  ) {
    throw invalidFinalData("markdownLinkValidation");
  }
  return Object.freeze({
    sourceFileCount,
    occurrenceCount,
    targetReadCount,
    findingCount,
    rejectedInputCount
  });
}
