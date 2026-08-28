import {
  hasExactPlainRecordKeys,
  snapshotClosedRecord
} from "../../data-boundary/closed-values.ts";
import { validProjectFileSelection } from "../project-files/configuration.ts";
import type { ResolvedJsonValidationOptions } from "./options.ts";

function exactRecord(
  value: unknown,
  keys: readonly string[]
): Readonly<Record<string, unknown>> | undefined {
  const record = snapshotClosedRecord(value);
  return record !== undefined && hasExactPlainRecordKeys(record, keys) ? record : undefined;
}

function positiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export function validJsonValidationOptions(value: unknown): value is ResolvedJsonValidationOptions {
  const options = exactRecord(value, ["files", "maximumBytes"]);
  return (
    options !== undefined &&
    validProjectFileSelection(options.files) &&
    positiveSafeInteger(options.maximumBytes)
  );
}
