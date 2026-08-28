import { defineCheck, type TypedCheckWithOptions } from "../../check/check.ts";
import { FILE_METRICS_CHECK_DEFINITION, executeFileMetrics } from "./execution.ts";
import { parseFileMetricsData } from "./final-data.ts";
import type { FileMetricsOptions, ResolvedFileMetricsOptions } from "./options.ts";
import { resolveFileMetricsOptions } from "./options-resolution.ts";
import { isValidResolvedFileMetricsOptions } from "./options-validation.ts";

/**
 * 使用可省略的区域、代码行与 scanner policy 构造一个完整 file-metrics Check。
 *
 * @param options - 省略字段由 package 补齐；显式 files 数组作为对应字段的完整替换值。
 * @returns 固定 `file-metrics` identity、完整冻结 options、preflight 与 execution。
 * @throws {TypeError} input 含未知字段、空 area、非法代码行 policy 或空 executable 时抛出。
 */
export function fileMetrics(
  options: FileMetricsOptions = {}
): TypedCheckWithOptions<"file-metrics", ResolvedFileMetricsOptions, typeof parseFileMetricsData> {
  const resolvedOptions = resolveFileMetricsOptions(options);
  if (resolvedOptions === undefined) {
    throw new TypeError(
      "fileMetrics options must match the documented closed { codeAreas?, scanner? } constructor policy"
    );
  }
  return defineCheck({
    ...FILE_METRICS_CHECK_DEFINITION,
    execution: executeFileMetrics,
    parseData: parseFileMetricsData,
    preflight: (preparedOptions) =>
      isValidResolvedFileMetricsOptions(preparedOptions)
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
                  "fileMetrics options are invalid; recreate the Check with fileMetrics(options) or restore its complete resolved options."
              }
            ]
          },
    options: resolvedOptions
  });
}
