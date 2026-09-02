import { defineCheck, type TypedCheckWithOptions } from "../../check/check.ts";
import { DUPLICATE_DETECTION_CHECK_DEFINITION, executeDuplicateDetection } from "./execution.ts";
import { parseDuplicateDetectionData } from "./final-data.ts";
import type { DuplicateDetectionOptions, ResolvedDuplicateDetectionOptions } from "./options.ts";
import { resolveDuplicateDetectionOptions } from "./options-resolution.ts";
import { validResolvedDuplicateDetectionOptions } from "./options-validation.ts";

/**
 * 使用可省略的区域、cache 与 scanner policy 构造一个完整 duplicate-detection Check。
 *
 * @param options - 省略字段由 package 补齐；显式 files 数组作为对应字段的完整替换值。
 * @returns 固定 `duplicate-detection` identity、完整冻结 options、preflight 与 execution。
 * @throws {TypeError} input 含未知字段、空 area、非法阈值、非法 cache 或 scanner policy 时抛出。
 */
export function duplicateDetection(
  options: DuplicateDetectionOptions = {}
): TypedCheckWithOptions<
  "duplicate-detection",
  ResolvedDuplicateDetectionOptions,
  typeof parseDuplicateDetectionData
> {
  const resolvedOptions = resolveDuplicateDetectionOptions(options);
  if (resolvedOptions === undefined) {
    throw new TypeError(
      "duplicateDetection options are invalid; use the documented closed constructor policy including exact finding waivers"
    );
  }
  return defineCheck({
    ...DUPLICATE_DETECTION_CHECK_DEFINITION,
    execution: executeDuplicateDetection,
    parseData: parseDuplicateDetectionData,
    preflight: (preparedOptions) =>
      validResolvedDuplicateDetectionOptions(preparedOptions)
        ? { status: "success", preparedOptions }
        : {
            status: "failure",
            action: "block",
            reason: { code: "invalid-options" },
            messages: [
              {
                code: "invalid-options",
                level: "error",
                message:
                  "duplicateDetection options are invalid; recreate the Check with duplicateDetection(options) or restore its complete resolved options."
              }
            ]
          },
    options: resolvedOptions
  });
}
