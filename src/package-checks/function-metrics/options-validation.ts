import {
  snapshotClosedRecord,
  snapshotExactClosedRecord
} from "../../data-boundary/closed-values.ts";
import { isNonEmptyString, isPositiveSafeInteger } from "../../data-boundary/value-shapes.ts";
import { validProjectFileSelection } from "../project-files/configuration.ts";
import { validFindingPolicy } from "../code-quality-findings/policy.ts";
import type { ResolvedFunctionMetricsOptions } from "./options.ts";

/** 验证 constructor 已物化的完整 function-metrics options。 */
export function validResolvedFunctionMetricsOptions(
  value: unknown
): value is ResolvedFunctionMetricsOptions {
  const options = snapshotExactClosedRecord(value, ["codeAreas", "scanner"]);
  return (
    options !== undefined && validCodeAreas(options.codeAreas) && validScanner(options.scanner)
  );
}

function validCodeAreas(value: unknown): boolean {
  const areas = snapshotClosedRecord(value);
  if (areas === undefined || Object.keys(areas).length === 0) return false;
  return Object.entries(areas).every(([areaId, candidate]) => {
    const area = snapshotExactClosedRecord(candidate, ["files", "findingPolicy", "limits"]);
    return (
      isNonEmptyString(areaId) &&
      area !== undefined &&
      validProjectFileSelection(area.files) &&
      validFindingPolicy(area.findingPolicy) &&
      validLimits(area.limits)
    );
  });
}

function validLimits(value: unknown): boolean {
  const limits = snapshotExactClosedRecord(value, [
    "codeLines",
    "cyclomaticComplexity",
    "parameters"
  ]);
  if (limits === undefined) return false;
  const codeLineLimits = codeLineLimitsFrom(limits.codeLines);
  const cyclomaticComplexity = maximumLimitFrom(limits.cyclomaticComplexity);
  const parameters = maximumLimitFrom(limits.parameters);
  return (
    codeLineLimits !== undefined &&
    cyclomaticComplexity !== undefined &&
    parameters !== undefined &&
    isPositiveSafeInteger(cyclomaticComplexity.maximum) &&
    isPositiveSafeInteger(parameters.maximum)
  );
}

function codeLineLimitsFrom(value: unknown): Readonly<Record<string, unknown>> | undefined {
  const codeLines = snapshotExactClosedRecord(value, ["lowComplexityAllowance", "maximum"]);
  const allowance = snapshotExactClosedRecord(codeLines?.lowComplexityAllowance, [
    "cyclomaticComplexityBelow",
    "maximum"
  ]);
  return codeLines !== undefined &&
    allowance !== undefined &&
    isPositiveSafeInteger(codeLines.maximum) &&
    isPositiveSafeInteger(allowance.maximum) &&
    allowance.maximum >= codeLines.maximum &&
    isPositiveSafeInteger(allowance.cyclomaticComplexityBelow)
    ? codeLines
    : undefined;
}

function maximumLimitFrom(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return snapshotExactClosedRecord(value, ["maximum"]);
}

function validScanner(value: unknown): boolean {
  const scanner = snapshotExactClosedRecord(value, ["executable"]);
  return scanner !== undefined && isNonEmptyString(scanner.executable);
}
