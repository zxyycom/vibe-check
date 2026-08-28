import { canonicalizeJsonObject } from "../../data-boundary/canonical-data.ts";
import {
  hasRequiredAndOptionalRecordKeys,
  snapshotClosedRecord
} from "../../data-boundary/closed-values.ts";
import {
  resolveProjectFileSelection,
  snapshotDefaultProjectFileSelection
} from "../project-files/configuration.ts";
import type { ResolvedJsonSchemaValidationOptions } from "./options.ts";
import { validJsonSchemaValidationOptions } from "./options-validation.ts";

const DEFAULT_MAXIMUM_BYTES = 1_048_576;

/** 将可省略 schema registry policy 物化为完整、冻结的 execution options。 */
export function resolveJsonSchemaValidationOptions(
  value: unknown
): ResolvedJsonSchemaValidationOptions | undefined {
  const input = snapshotClosedRecord(value);
  if (
    input === undefined ||
    !hasRequiredAndOptionalRecordKeys(input, {
      optional: [
        "files",
        "maximumBytes",
        "schemaIdentity",
        "referenceResolution",
        "schemas",
        "bindings"
      ],
      required: []
    })
  ) {
    return undefined;
  }
  const files =
    input.files === undefined
      ? snapshotDefaultProjectFileSelection()
      : resolveProjectFileSelection(input.files);
  if (files === undefined) return undefined;
  const candidate = canonicalizeJsonObject({
    files,
    maximumBytes: input.maximumBytes === undefined ? DEFAULT_MAXIMUM_BYTES : input.maximumBytes,
    schemaIdentity:
      input.schemaIdentity === undefined ? { mode: "require-match" } : input.schemaIdentity,
    referenceResolution:
      input.referenceResolution === undefined ? { mode: "offline" } : input.referenceResolution,
    schemas: input.schemas === undefined ? [] : input.schemas,
    bindings: input.bindings === undefined ? [] : input.bindings
  });
  return candidate !== undefined && validJsonSchemaValidationOptions(candidate)
    ? candidate
    : undefined;
}
