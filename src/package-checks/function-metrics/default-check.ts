import { defineCheck, type CheckWithOptions } from "../../check/check.ts";
import { FUNCTION_METRICS_CHECK_DEFINITION, executeFunctionMetrics } from "./execution.ts";
import type { FunctionMetricsOptions, ResolvedFunctionMetricsOptions } from "./options.ts";
import { resolveFunctionMetricsOptions } from "./options-resolution.ts";
import { validResolvedFunctionMetricsOptions } from "./options-validation.ts";

/** 使用可省略的区域与 finding policy 构造一个完整 function-metrics Check。 */
export function functionMetrics(
  options: FunctionMetricsOptions = {}
): CheckWithOptions<"function-metrics", ResolvedFunctionMetricsOptions> {
  const resolvedOptions = resolveFunctionMetricsOptions(options);
  if (resolvedOptions === undefined) {
    throw new TypeError(
      "functionMetrics options are invalid; use the documented closed constructor policy"
    );
  }
  return defineCheck<"function-metrics", ResolvedFunctionMetricsOptions>({
    ...FUNCTION_METRICS_CHECK_DEFINITION,
    execution: executeFunctionMetrics,
    preflight: (preparedOptions) =>
      validResolvedFunctionMetricsOptions(preparedOptions)
        ? { status: "success", preparedOptions }
        : { status: "failure", action: "block", reason: { code: "invalid-options" } },
    options: resolvedOptions
  });
}
