import { defineCheck, type CheckWithOptions } from "../../check/check.ts";
import { DUPLICATE_DETECTION_CHECK_DEFINITION, executeDuplicateDetection } from "./execution.ts";
import type { DuplicateDetectionOptions, ResolvedDuplicateDetectionOptions } from "./options.ts";
import { resolveDuplicateDetectionOptions } from "./options-resolution.ts";
import { validResolvedDuplicateDetectionOptions } from "./options-validation.ts";

/** 使用可省略的 policy 定义一个完整 duplicate-detection Check。 */
export function duplicateDetection(
  options: DuplicateDetectionOptions = {}
): CheckWithOptions<"duplicate-detection", ResolvedDuplicateDetectionOptions> {
  const resolvedOptions = resolveDuplicateDetectionOptions(options);
  if (resolvedOptions === undefined) {
    throw new TypeError(
      "duplicateDetection options are invalid; use the documented closed constructor policy"
    );
  }
  return defineCheck<"duplicate-detection", ResolvedDuplicateDetectionOptions>({
    ...DUPLICATE_DETECTION_CHECK_DEFINITION,
    execution: executeDuplicateDetection,
    preflight: (preparedOptions) =>
      validResolvedDuplicateDetectionOptions(preparedOptions)
        ? { status: "success", preparedOptions }
        : { status: "failure", action: "block", reason: { code: "invalid-options" } },
    options: resolvedOptions
  });
}
