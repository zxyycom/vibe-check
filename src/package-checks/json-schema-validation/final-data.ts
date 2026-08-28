import {
  exactFinalDataRecord,
  invalidFinalData,
  nonNegativeSafeInteger
} from "../final-data-parsing.ts";

/** 单次运行最多发布的 JSON Schema issue Record 数量。 */
export const MAX_REPORTED_JSON_SCHEMA_ISSUES = 100;

/** `json-schema-validation` 在 passed/failed outcome 中发布的主数据。 */
export interface JsonSchemaValidationFinalData {
  readonly bindingCount: number;
  readonly blockedBindingCount: number;
  readonly invalidBindingCount: number;
  readonly issueCount: number;
  readonly issuesTruncated: boolean;
  readonly reportedIssueCount: number;
  readonly schemaCount: number;
  readonly validBindingCount: number;
}

/** 验证计数与截断不变量并脱离 canonical final data。 */
export function parseJsonSchemaValidationData(data: unknown): JsonSchemaValidationFinalData {
  const value = exactFinalDataRecord(
    data,
    [
      "bindingCount",
      "blockedBindingCount",
      "invalidBindingCount",
      "issueCount",
      "issuesTruncated",
      "reportedIssueCount",
      "schemaCount",
      "validBindingCount"
    ],
    "jsonSchemaValidation"
  );
  const bindingCount = nonNegativeSafeInteger(value.bindingCount);
  const blockedBindingCount = nonNegativeSafeInteger(value.blockedBindingCount);
  const invalidBindingCount = nonNegativeSafeInteger(value.invalidBindingCount);
  const issueCount = nonNegativeSafeInteger(value.issueCount);
  const reportedIssueCount = nonNegativeSafeInteger(value.reportedIssueCount);
  const schemaCount = nonNegativeSafeInteger(value.schemaCount);
  const validBindingCount = nonNegativeSafeInteger(value.validBindingCount);
  const issuesShouldBeTruncated =
    issueCount !== undefined && reportedIssueCount !== undefined
      ? issueCount > reportedIssueCount
      : undefined;
  if (
    bindingCount === undefined ||
    blockedBindingCount === undefined ||
    invalidBindingCount === undefined ||
    issueCount === undefined ||
    reportedIssueCount === undefined ||
    schemaCount === undefined ||
    validBindingCount === undefined ||
    typeof value.issuesTruncated !== "boolean" ||
    bindingCount !== blockedBindingCount + invalidBindingCount + validBindingCount ||
    reportedIssueCount > issueCount ||
    reportedIssueCount > MAX_REPORTED_JSON_SCHEMA_ISSUES ||
    value.issuesTruncated !== issuesShouldBeTruncated
  ) {
    throw invalidFinalData("jsonSchemaValidation");
  }
  return Object.freeze({
    bindingCount,
    blockedBindingCount,
    invalidBindingCount,
    issueCount,
    issuesTruncated: value.issuesTruncated,
    reportedIssueCount,
    schemaCount,
    validBindingCount
  });
}
