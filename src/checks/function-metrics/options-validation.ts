/* eslint-disable no-unused-vars */
import { snapshotClosedArray, snapshotClosedRecord } from "../../foundation/closed-values.ts";
import { validCodeAreas, validProjectFileSelection } from "../../project-files/configuration.ts";
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
function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
function positiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
function boundedPositiveSafeInteger(value: unknown, maximum: number): value is number {
  return positiveSafeInteger(value) && value <= maximum;
}
function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
function validStringArray(value: unknown): boolean {
  const items = snapshotClosedArray(value);
  return items !== undefined && items.every((item) => typeof item === "string");
}
export function validFunctionMetricsOptions(value: object): boolean {
  const options = exactRecord(value, [
    "codeAreas",
    "files",
    "scanner",
    "codeLines",
    "cyclomaticComplexity",
    "parameterCount"
  ]);
  return (
    options !== undefined &&
    validCodeAreas(options.codeAreas) &&
    validProjectFileSelection(options.files) &&
    validScanner(options.scanner) &&
    validExactNumberRecord(options.codeLines, ["absoluteFloor"], {
      lowComplexityAllowance: ["codeLineFloor", "maxCyclomaticComplexityExclusive"]
    }) &&
    validExactNumberRecord(options.cyclomaticComplexity, ["absoluteFloor"]) &&
    validExactNumberRecord(options.parameterCount, ["absoluteFloor"])
  );
}
function validScanner(value: unknown): boolean {
  const scanner = exactRecord(value, ["args", "availabilityArgs", "executable"]);
  return (
    scanner !== undefined &&
    validStringArray(scanner.args) &&
    validStringArray(scanner.availabilityArgs) &&
    nonEmptyString(scanner.executable)
  );
}
function validExactNumberRecord(
  value: unknown,
  numericKeys: readonly string[],
  nested: Readonly<Record<string, readonly string[]>> = {}
): boolean {
  const expectedKeys = [...numericKeys, ...Object.keys(nested)];
  const record = exactRecord(value, expectedKeys);
  return (
    record !== undefined &&
    numericKeys.every((key) => finiteNumber(record[key])) &&
    Object.entries(nested).every(([key, nestedKeys]) =>
      validExactNumberRecord(record[key], nestedKeys)
    )
  );
}
