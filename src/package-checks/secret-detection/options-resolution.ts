import { snapshotClosedPolicyRecord } from "../../data-boundary/closed-values.ts";
import { isPositiveSafeInteger } from "../../data-boundary/value-shapes.ts";
import { resolveFindingWaiverAuthoring } from "../code-quality-findings/finding-waiver-authoring.ts";
import {
  snapshotProjectFileSelection,
  validProjectFileSelection
} from "../project-files/configuration.ts";
import { resolveSecretDetectionFindingIdentity } from "./finding-waiver-identity.ts";
import type { ResolvedSecretDetectionOptions } from "./options.ts";
import { validSecretDetectionOptions } from "./options-validation.ts";

export const DEFAULT_SECRET_DETECTION_MAXIMUM_FILE_BYTES = 1_048_576;
export const DEFAULT_SECRET_DETECTION_MAXIMUM_TOTAL_BYTES = 8_388_608;
export const DEFAULT_SECRET_DETECTION_MAXIMUM_FILE_COUNT = 2_048;

/** 将 required exact file policy 和有限资源策略物化为完整、冻结 options。 */
export function resolveSecretDetectionOptions(
  value: unknown
): ResolvedSecretDetectionOptions | undefined {
  const input = snapshotClosedPolicyRecord(value, {
    optional: ["findingWaivers", "maximumFileBytes", "maximumFileCount", "maximumTotalBytes"],
    required: ["files"]
  });
  if (input === undefined || !validProjectFileSelection(input.files)) return undefined;

  const limits = resolveSecretDetectionResourceLimits(input);
  const findingWaivers = resolveFindingWaiverAuthoring(
    input.findingWaivers,
    resolveSecretDetectionFindingIdentity
  );
  if (limits === undefined || findingWaivers === undefined) return undefined;

  const options = Object.freeze({
    files: snapshotProjectFileSelection(input.files),
    findingWaivers,
    ...limits
  });
  return validSecretDetectionOptions(options) ? options : undefined;
}

function resolveSecretDetectionResourceLimits(
  input: Readonly<{
    readonly maximumFileBytes?: unknown;
    readonly maximumFileCount?: unknown;
    readonly maximumTotalBytes?: unknown;
  }>
):
  | Readonly<{
      readonly maximumFileBytes: number;
      readonly maximumFileCount: number;
      readonly maximumTotalBytes: number;
    }>
  | undefined {
  const maximumFileBytes = input.maximumFileBytes ?? DEFAULT_SECRET_DETECTION_MAXIMUM_FILE_BYTES;
  const maximumFileCount = input.maximumFileCount ?? DEFAULT_SECRET_DETECTION_MAXIMUM_FILE_COUNT;
  const maximumTotalBytes = input.maximumTotalBytes ?? DEFAULT_SECRET_DETECTION_MAXIMUM_TOTAL_BYTES;
  if (
    !isPositiveSafeInteger(maximumFileBytes) ||
    !isPositiveSafeInteger(maximumFileCount) ||
    !isPositiveSafeInteger(maximumTotalBytes)
  ) {
    return undefined;
  }
  return Object.freeze({ maximumFileBytes, maximumFileCount, maximumTotalBytes });
}
