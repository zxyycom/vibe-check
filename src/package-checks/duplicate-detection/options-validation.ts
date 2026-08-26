/* eslint-disable no-unused-vars */
import { snapshotClosedArray, snapshotClosedRecord } from "../../data-boundary/closed-values.ts";
import { validCodeAreas, validProjectFileSelection } from "../project-files/configuration.ts";
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
export function validDuplicateDetectionOptions(value: object): boolean {
  const options = exactRecord(value, [
    "cache",
    "codeAreas",
    "files",
    "scanner",
    "defaultMinimumTokens",
    "minimumTokensByCodeArea"
  ]);
  return (
    options !== undefined &&
    validDuplicateCache(options.cache) &&
    validCodeAreas(options.codeAreas) &&
    validProjectFileSelection(options.files) &&
    validDuplicationScanner(options.scanner) &&
    finiteNumber(options.defaultMinimumTokens) &&
    validNumberRecord(options.minimumTokensByCodeArea) &&
    codeAreaThresholdsAreKnown(options.minimumTokensByCodeArea, options.codeAreas)
  );
}

function codeAreaThresholdsAreKnown(thresholdsValue: unknown, areasValue: unknown): boolean {
  const thresholds = snapshotClosedRecord(thresholdsValue);
  const areas = snapshotClosedRecord(areasValue);
  return (
    thresholds !== undefined &&
    areas !== undefined &&
    Object.keys(thresholds).every((area) => Object.hasOwn(areas, area))
  );
}
function validDuplicationScanner(value: unknown): boolean {
  const scanner = exactRecord(value, ["args", "availabilityArgs", "executable", "maxConcurrency"]);
  return (
    scanner !== undefined &&
    validStringArray(scanner.args) &&
    validStringArray(scanner.availabilityArgs) &&
    nonEmptyString(scanner.executable) &&
    positiveSafeInteger(scanner.maxConcurrency)
  );
}
function validNumberRecord(value: unknown): boolean {
  const record = snapshotClosedRecord(value);
  return record !== undefined && Object.values(record).every(finiteNumber);
}

function validDuplicateCache(value: unknown): boolean {
  const cache = exactRecord(value, ["directory", "enabled"]);
  return (
    cache !== undefined && typeof cache.directory === "string" && typeof cache.enabled === "boolean"
  );
}
