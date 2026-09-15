import {
  exactFinalDataRecord,
  invalidFinalData,
  nonNegativeSafeInteger
} from "../final-data-parsing.ts";

/** 已完成 `markdownLint` execution 的 canonical final data。 */
export interface MarkdownLintFinalData {
  readonly sourceFileCount: number;
  readonly findingCount: number;
  readonly rejectedInputCount: number;
}

/** 解析并验证 `markdownLint` 完成结果中的 canonical final data。 */
export function parseMarkdownLintData(data: unknown): MarkdownLintFinalData {
  const value = exactFinalDataRecord(
    data,
    ["sourceFileCount", "findingCount", "rejectedInputCount"],
    "markdownLint"
  );
  const sourceFileCount = nonNegativeSafeInteger(value.sourceFileCount);
  const findingCount = nonNegativeSafeInteger(value.findingCount);
  const rejectedInputCount = nonNegativeSafeInteger(value.rejectedInputCount);
  if (
    sourceFileCount === undefined ||
    findingCount === undefined ||
    rejectedInputCount === undefined ||
    findingCount < rejectedInputCount
  ) {
    throw invalidFinalData("markdownLint");
  }
  return Object.freeze({ sourceFileCount, findingCount, rejectedInputCount });
}
