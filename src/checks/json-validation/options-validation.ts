/* eslint-disable no-unused-vars */
import { snapshotClosedArray, snapshotClosedRecord } from "../../foundation/closed-values.ts";
import { validProjectFileSelection } from "../../project-files/configuration.ts";
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
export function validJsonValidationOptions(value: object): boolean {
  const options = exactRecord(value, ["files", "maximumBytes"]);
  return (
    options !== undefined &&
    validProjectFileSelection(options.files) &&
    positiveSafeInteger(options.maximumBytes)
  );
}
