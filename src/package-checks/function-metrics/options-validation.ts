import { snapshotClosedRecord } from "../../data-boundary/closed-values.ts";
import { validProjectFileSelection } from "../project-files/configuration.ts";
import { validFindingPolicy } from "../code-quality-findings/policy.ts";
import type { ResolvedFunctionMetricsOptions } from "./options.ts";

/** 验证 constructor 已物化的完整 function-metrics options。 */
export function validResolvedFunctionMetricsOptions(
  value: unknown
): value is ResolvedFunctionMetricsOptions {
  const options = exactRecord(value, ["codeAreas", "scanner"]);
  return (
    options !== undefined && validCodeAreas(options.codeAreas) && validScanner(options.scanner)
  );
}

function validCodeAreas(value: unknown): boolean {
  const areas = snapshotClosedRecord(value);
  if (areas === undefined || Object.keys(areas).length === 0) return false;
  return Object.entries(areas).every(([areaId, candidate]) => {
    const area = exactRecord(candidate, ["files", "findingPolicy", "limits"]);
    return (
      nonEmptyString(areaId) &&
      area !== undefined &&
      validProjectFileSelection(area.files) &&
      validFindingPolicy(area.findingPolicy) &&
      validLimits(area.limits)
    );
  });
}

function validLimits(value: unknown): boolean {
  const limits = exactRecord(value, ["codeLines", "cyclomaticComplexity", "parameters"]);
  if (limits === undefined) return false;
  const codeLineLimits = codeLineLimitsFrom(limits.codeLines);
  const cyclomaticComplexity = maximumLimitFrom(limits.cyclomaticComplexity);
  const parameters = maximumLimitFrom(limits.parameters);
  return (
    codeLineLimits !== undefined &&
    cyclomaticComplexity !== undefined &&
    parameters !== undefined &&
    positiveSafeInteger(cyclomaticComplexity.maximum) &&
    positiveSafeInteger(parameters.maximum)
  );
}

function codeLineLimitsFrom(value: unknown): Readonly<Record<string, unknown>> | undefined {
  const codeLines = exactRecord(value, ["lowComplexityAllowance", "maximum"]);
  const allowance = exactRecord(codeLines?.lowComplexityAllowance, [
    "cyclomaticComplexityBelow",
    "maximum"
  ]);
  return codeLines !== undefined &&
    allowance !== undefined &&
    positiveSafeInteger(codeLines.maximum) &&
    positiveSafeInteger(allowance.maximum) &&
    allowance.maximum >= codeLines.maximum &&
    positiveSafeInteger(allowance.cyclomaticComplexityBelow)
    ? codeLines
    : undefined;
}

function maximumLimitFrom(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return exactRecord(value, ["maximum"]);
}

function validScanner(value: unknown): boolean {
  const scanner = exactRecord(value, ["executable"]);
  return scanner !== undefined && nonEmptyString(scanner.executable);
}

function exactRecord(
  value: unknown,
  keys: readonly string[]
): Readonly<Record<string, unknown>> | undefined {
  const record = snapshotClosedRecord(value);
  return record !== undefined &&
    Object.keys(record).length === keys.length &&
    keys.every((key) => Object.hasOwn(record, key))
    ? record
    : undefined;
}

function positiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
