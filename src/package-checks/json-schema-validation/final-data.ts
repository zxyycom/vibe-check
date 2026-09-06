import {
  exactFinalDataRecord,
  invalidFinalData,
  nonNegativeSafeInteger
} from "../final-data-parsing.ts";

/** 单次运行最多发布的 JSON Schema issue Record 数量。 */
export const MAX_REPORTED_JSON_SCHEMA_ISSUES = 100;

/** `json-schema-validation` 在 passed/failed outcome 中发布的主数据。 */
export interface JsonSchemaValidationFinalData {
  /** Definition 中已声明的 binding 总数。 */
  readonly bindingCount: number;
  /** 因所引用 schema 存在 document 或 compile issue 而未验证 instance 的 binding 数。 */
  readonly blockedBindingCount: number;
  /** instance out-of-scope、document invalid 或不符合对应 schema 的 binding 数。 */
  readonly invalidBindingCount: number;
  /** schema document、compile、instance 与 keyword issue 的总数。 */
  readonly issueCount: number;
  /** 是否因发布上限而省略了一个或多个 issue Record。 */
  readonly issuesTruncated: boolean;
  /** 实际发布为 Record 的 issue 数。 */
  readonly reportedIssueCount: number;
  /** Definition 中声明的不同 schema identity 数。 */
  readonly schemaCount: number;
  /** input 符合对应 schema 的 binding 数。 */
  readonly validBindingCount: number;
}

/** 验证计数与截断不变量并脱离 canonical final data。 */
export function parseJsonSchemaValidationData(data: unknown): JsonSchemaValidationFinalData {
  const value = jsonSchemaFinalDataRecord(data);
  const counts = parsedCounts(value);
  const issuesTruncated = value.issuesTruncated;
  if (typeof issuesTruncated !== "boolean" || !validFinalDataInvariants(issuesTruncated, counts)) {
    throw invalidFinalData("jsonSchemaValidation");
  }
  return Object.freeze({
    bindingCount: counts.bindingCount,
    blockedBindingCount: counts.blockedBindingCount,
    invalidBindingCount: counts.invalidBindingCount,
    issueCount: counts.issueCount,
    issuesTruncated,
    reportedIssueCount: counts.reportedIssueCount,
    schemaCount: counts.schemaCount,
    validBindingCount: counts.validBindingCount
  });
}

function jsonSchemaFinalDataRecord(data: unknown): Readonly<Record<string, unknown>> {
  return exactFinalDataRecord(
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
}

interface ParsedCounts {
  readonly bindingCount: number | undefined;
  readonly blockedBindingCount: number | undefined;
  readonly invalidBindingCount: number | undefined;
  readonly issueCount: number | undefined;
  readonly reportedIssueCount: number | undefined;
  readonly schemaCount: number | undefined;
  readonly validBindingCount: number | undefined;
}

function parsedCounts(value: Readonly<Record<string, unknown>>): ParsedCounts {
  return {
    bindingCount: nonNegativeSafeInteger(value.bindingCount),
    blockedBindingCount: nonNegativeSafeInteger(value.blockedBindingCount),
    invalidBindingCount: nonNegativeSafeInteger(value.invalidBindingCount),
    issueCount: nonNegativeSafeInteger(value.issueCount),
    reportedIssueCount: nonNegativeSafeInteger(value.reportedIssueCount),
    schemaCount: nonNegativeSafeInteger(value.schemaCount),
    validBindingCount: nonNegativeSafeInteger(value.validBindingCount)
  };
}

interface CompleteCounts {
  readonly bindingCount: number;
  readonly blockedBindingCount: number;
  readonly invalidBindingCount: number;
  readonly issueCount: number;
  readonly reportedIssueCount: number;
  readonly schemaCount: number;
  readonly validBindingCount: number;
}

function validFinalDataInvariants(
  issuesTruncated: boolean,
  counts: ParsedCounts
): counts is CompleteCounts {
  if (!allCountsDefined(counts)) return false;
  return (
    counts.bindingCount ===
      counts.blockedBindingCount + counts.invalidBindingCount + counts.validBindingCount &&
    counts.reportedIssueCount <= counts.issueCount &&
    counts.reportedIssueCount <= MAX_REPORTED_JSON_SCHEMA_ISSUES &&
    issuesTruncated === counts.issueCount > counts.reportedIssueCount
  );
}

function allCountsDefined(counts: ParsedCounts): counts is CompleteCounts {
  return (
    counts.bindingCount !== undefined &&
    counts.blockedBindingCount !== undefined &&
    counts.invalidBindingCount !== undefined &&
    counts.issueCount !== undefined &&
    counts.reportedIssueCount !== undefined &&
    counts.schemaCount !== undefined &&
    counts.validBindingCount !== undefined
  );
}
