import { defineCheck, type CheckWithOptions } from "../../check/check.ts";
import { FILE_METRICS_CHECK_DEFINITION, executeFileMetrics } from "./execution.ts";
import type { FileMetricsOptions, ResolvedFileMetricsOptions } from "./options.ts";
import { resolveFileMetricsOptions } from "./options-resolution.ts";
import { validResolvedFileMetricsOptions } from "./options-validation.ts";

/** 使用可省略的 area policy 定义一个完整 file-metrics Check。 */
export function fileMetrics(
  options: FileMetricsOptions = {}
): CheckWithOptions<"file-metrics", ResolvedFileMetricsOptions> {
  const resolvedOptions = resolveFileMetricsOptions(options);
  if (resolvedOptions === undefined) {
    throw new TypeError(
      "fileMetrics options are invalid; use the documented closed constructor policy"
    );
  }
  return defineCheck<"file-metrics", ResolvedFileMetricsOptions>({
    ...FILE_METRICS_CHECK_DEFINITION,
    execution: executeFileMetrics,
    preflight: (preparedOptions) =>
      validResolvedFileMetricsOptions(preparedOptions)
        ? { status: "success", preparedOptions }
        : { status: "failure", action: "block", reason: { code: "invalid-options" } },
    options: resolvedOptions
  });
}
