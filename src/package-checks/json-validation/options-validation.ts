import { snapshotExactClosedRecord } from "../../data-boundary/closed-values.ts";
import { isPositiveSafeInteger } from "../../data-boundary/value-shapes.ts";
import { validProjectFileSelection } from "../project-files/configuration.ts";
import type { ResolvedJsonValidationOptions } from "./options.ts";

export function validJsonValidationOptions(value: unknown): value is ResolvedJsonValidationOptions {
  const options = snapshotExactClosedRecord(value, ["files", "maximumBytes"]);
  return (
    options !== undefined &&
    validProjectFileSelection(options.files) &&
    isPositiveSafeInteger(options.maximumBytes)
  );
}
