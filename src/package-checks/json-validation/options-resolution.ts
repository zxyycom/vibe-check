import {
  hasRequiredAndOptionalRecordKeys,
  snapshotClosedRecord
} from "../../data-boundary/closed-values.ts";
import {
  defaultProjectFileSelection,
  resolveProjectFileSelection,
  snapshotProjectFileSelection
} from "../project-files/configuration.ts";
import type { ResolvedJsonValidationOptions } from "./options.ts";
import { validJsonValidationOptions } from "./options-validation.ts";

const DEFAULT_MAXIMUM_BYTES = 1_048_576;
const DEFAULT_FILES = Object.freeze({
  exclude: defaultProjectFileSelection.exclude,
  include: Object.freeze(["**/*.json"]),
  source: defaultProjectFileSelection.source
});

/** 将可省略 JSON validation policy 物化为完整、冻结的 execution options。 */
export function resolveJsonValidationOptions(
  value: unknown
): ResolvedJsonValidationOptions | undefined {
  const input = snapshotClosedRecord(value);
  if (
    input === undefined ||
    !hasRequiredAndOptionalRecordKeys(input, {
      optional: ["files", "maximumBytes"],
      required: []
    })
  ) {
    return undefined;
  }
  const files =
    input.files === undefined
      ? snapshotProjectFileSelection(DEFAULT_FILES)
      : resolveProjectFileSelection(input.files, DEFAULT_FILES);
  const maximumBytes =
    input.maximumBytes === undefined ? DEFAULT_MAXIMUM_BYTES : input.maximumBytes;
  if (
    files === undefined ||
    typeof maximumBytes !== "number" ||
    !Number.isSafeInteger(maximumBytes) ||
    maximumBytes <= 0
  ) {
    return undefined;
  }
  const options = Object.freeze({ files, maximumBytes });
  return validJsonValidationOptions(options) ? options : undefined;
}
