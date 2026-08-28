import { snapshotClosedRecord } from "../../data-boundary/closed-values.ts";
import { validProjectFileSelection } from "../project-files/configuration.ts";
import type { ResolvedFileMetricsOptions } from "./options.ts";

/** 验证 constructor 产物或普通对象组合形成的完整 file-metrics options。 */
export function validResolvedFileMetricsOptions(
  value: object
): value is ResolvedFileMetricsOptions {
  const options = exactRecord(value, ["codeAreas", "scanner"]);
  return (
    options !== undefined && validCodeAreas(options.codeAreas) && validScanner(options.scanner)
  );
}

function validCodeAreas(value: unknown): boolean {
  const codeAreas = snapshotClosedRecord(value);
  if (codeAreas === undefined || Object.keys(codeAreas).length === 0) return false;
  return Object.entries(codeAreas).every(
    ([areaId, candidate]) => areaId.length > 0 && validCodeArea(candidate)
  );
}

function validCodeArea(value: unknown): boolean {
  const area = exactRecord(value, ["codeLines", "files"]);
  return (
    area !== undefined &&
    validProjectFileSelection(area.files) &&
    validCodeLinePolicy(area.codeLines)
  );
}

function validCodeLinePolicy(value: unknown): boolean {
  const policy = exactRecord(value, ["lowDecisionTokenAllowance", "maximum"]);
  if (policy === undefined || !positiveSafeInteger(policy.maximum)) return false;
  const allowance = exactRecord(policy.lowDecisionTokenAllowance, [
    "maximumCodeLines",
    "maximumDecisionTokens"
  ]);
  return (
    allowance !== undefined &&
    positiveSafeInteger(allowance.maximumCodeLines) &&
    allowance.maximumCodeLines > policy.maximum &&
    nonNegativeSafeInteger(allowance.maximumDecisionTokens)
  );
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

function nonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
