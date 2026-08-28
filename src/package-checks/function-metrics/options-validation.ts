import { snapshotClosedRecord } from "../../data-boundary/closed-values.ts";
import { validProjectFileSelection } from "../project-files/configuration.ts";
import {
  FUNCTION_METRICS_FINDING_POLICIES,
  type ResolvedFunctionMetricsOptions
} from "./options.ts";

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
  const codeLines = exactRecord(limits.codeLines, ["lowComplexityAllowance", "maximum"]);
  const allowance = exactRecord(codeLines?.lowComplexityAllowance, [
    "cyclomaticComplexityBelow",
    "maximum"
  ]);
  const cyclomaticComplexity = exactRecord(limits.cyclomaticComplexity, ["maximum"]);
  const parameters = exactRecord(limits.parameters, ["maximum"]);
  return (
    codeLines !== undefined &&
    allowance !== undefined &&
    cyclomaticComplexity !== undefined &&
    parameters !== undefined &&
    positiveSafeInteger(codeLines.maximum) &&
    positiveSafeInteger(allowance.maximum) &&
    allowance.maximum >= codeLines.maximum &&
    positiveSafeInteger(allowance.cyclomaticComplexityBelow) &&
    positiveSafeInteger(cyclomaticComplexity.maximum) &&
    positiveSafeInteger(parameters.maximum)
  );
}

function validScanner(value: unknown): boolean {
  const scanner = exactRecord(value, ["executable"]);
  return scanner !== undefined && nonEmptyString(scanner.executable);
}

function validFindingPolicy(value: unknown): boolean {
  return FUNCTION_METRICS_FINDING_POLICIES.some((policy) => policy === value);
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
