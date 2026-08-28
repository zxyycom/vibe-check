import { snapshotClosedRecord } from "../../data-boundary/closed-values.ts";
import { validProjectFileSelection } from "../project-files/configuration.ts";
import { validFindingPolicy } from "../code-quality-findings/policy.ts";
import type { ResolvedFileMetricsOptions } from "./options.ts";

/** 验证 constructor 产物或普通对象组合形成的完整 file-metrics options。 */
export function isValidResolvedFileMetricsOptions(
  resolvedOptions: unknown
): resolvedOptions is ResolvedFileMetricsOptions {
  const options = exactRecord(resolvedOptions, ["codeAreas", "scanner"]);
  return (
    options !== undefined && isValidCodeAreas(options.codeAreas) && isValidScanner(options.scanner)
  );
}

function isValidCodeAreas(value: unknown): boolean {
  const codeAreas = snapshotClosedRecord(value);
  if (codeAreas === undefined || Object.keys(codeAreas).length === 0) return false;
  return Object.entries(codeAreas).every(
    ([areaId, candidate]) => areaId.length > 0 && isValidCodeArea(candidate)
  );
}

function isValidCodeArea(value: unknown): boolean {
  const area = exactRecord(value, ["codeLines", "files", "findingPolicy"]);
  return (
    area !== undefined &&
    validProjectFileSelection(area.files) &&
    validFindingPolicy(area.findingPolicy) &&
    isValidCodeLinePolicy(area.codeLines)
  );
}

function isValidCodeLinePolicy(value: unknown): boolean {
  const policy = exactRecord(value, ["lowDecisionTokenAllowance", "maximum"]);
  if (policy === undefined || !isPositiveSafeInteger(policy.maximum)) return false;
  const allowance = exactRecord(policy.lowDecisionTokenAllowance, [
    "maximumCodeLines",
    "maximumDecisionTokens"
  ]);
  return (
    allowance !== undefined &&
    isPositiveSafeInteger(allowance.maximumCodeLines) &&
    allowance.maximumCodeLines > policy.maximum &&
    isNonNegativeSafeInteger(allowance.maximumDecisionTokens)
  );
}

function isValidScanner(value: unknown): boolean {
  const scanner = exactRecord(value, ["executable"]);
  return scanner !== undefined && isNonEmptyString(scanner.executable);
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

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
