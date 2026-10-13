import {
  hasRequiredAndOptionalRecordKeys,
  snapshotClosedRecord
} from "../../data-boundary/closed-values.ts";
import { isPositiveSafeInteger } from "../../data-boundary/value-shapes.ts";
import { validLocalCacheOptions } from "../local-cache-options.ts";
import type { ResolvedMarkdownLinkValidationOptions } from "./options.ts";

export const DEFAULT_CACHE_WARN_ABOVE_BYTES = 16 * 1024 * 1024;

/** Markdown 专属 closed cache grammar，不扩展其它 Check 的 local cache policy。 */
export function resolveMarkdownLinkCacheOptions(
  value: unknown
): ResolvedMarkdownLinkValidationOptions["cache"] | undefined {
  if (value === undefined) return Object.freeze({ enabled: false as const });
  const cache = snapshotClosedRecord(value);
  if (cache === undefined) return undefined;
  if (cache.enabled === false && validLocalCacheOptions(cache))
    return Object.freeze({ enabled: false as const });
  const directoryOptions = { enabled: cache.enabled, directory: cache.directory };
  if (
    !hasRequiredAndOptionalRecordKeys(cache, {
      required: ["enabled", "directory"],
      optional: ["warnAboveBytes"]
    }) ||
    directoryOptions.enabled !== true ||
    !validLocalCacheOptions(directoryOptions) ||
    (cache.warnAboveBytes !== undefined && !isPositiveSafeInteger(cache.warnAboveBytes))
  )
    return undefined;
  return Object.freeze({
    enabled: true as const,
    directory: directoryOptions.directory,
    ...(cache.warnAboveBytes === undefined ? {} : { warnAboveBytes: cache.warnAboveBytes })
  });
}

export function validMarkdownLinkCacheOptions(
  value: unknown
): value is ResolvedMarkdownLinkValidationOptions["cache"] {
  return value !== undefined && resolveMarkdownLinkCacheOptions(value) !== undefined;
}
