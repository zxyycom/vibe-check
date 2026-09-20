import { defineCheck, type TypedCheckWithOptions } from "../../check/check.ts";
import {
  resolvePackageCheckAuthoringInput,
  type PackageCheckIdentityInput
} from "../check-authoring.ts";
import { executeFunctionMetrics } from "./execution.ts";
import { parseFunctionMetricsData } from "./final-data.ts";
import type { FunctionMetricsOptions, ResolvedFunctionMetricsOptions } from "./options.ts";
import { resolveFunctionMetricsOptions } from "./options-resolution.ts";
import { validResolvedFunctionMetricsOptions } from "./options-validation.ts";

const FUNCTION_METRICS_CHECK_DEFINITION = {
  checkId: "function-metrics",
  displayName: "Function metrics"
} as const;

/**
 * 使用可省略的区域、阈值与 finding policy 构造一个完整 function-metrics Check。
 *
 * @param options - 省略字段由 package 补齐；显式 files 数组完整替换对应字段的默认数组。
 * @returns 固定 `function-metrics` identity、完整冻结 options、preparation 与 execution。
 * @throws {TypeError} input 含未知字段、空 area、非法 finding policy/waiver 或非法 limit 时抛出。
 */
export function functionMetrics(
  options?: FunctionMetricsOptions<"function-metrics">
): TypedCheckWithOptions<
  "function-metrics",
  ResolvedFunctionMetricsOptions,
  typeof parseFunctionMetricsData
>;
export function functionMetrics<const Id extends string>(
  options: FunctionMetricsOptions<Id> & PackageCheckIdentityInput<Id>
): TypedCheckWithOptions<Id, ResolvedFunctionMetricsOptions, typeof parseFunctionMetricsData>;
export function functionMetrics(
  options: FunctionMetricsOptions
): TypedCheckWithOptions<string, ResolvedFunctionMetricsOptions, typeof parseFunctionMetricsData>;
export function functionMetrics(
  options: FunctionMetricsOptions = {}
): TypedCheckWithOptions<string, ResolvedFunctionMetricsOptions, typeof parseFunctionMetricsData> {
  const input = resolvePackageCheckAuthoringInput(
    options,
    ["codeAreas", "findingPolicy", "findingWaivers"],
    FUNCTION_METRICS_CHECK_DEFINITION
  );
  if (input === undefined) {
    throw new TypeError(
      "functionMetrics options must use the documented closed policy: a non-empty area map, recognized finding policies and waivers, and positive safe-integer limits"
    );
  }
  const resolvedOptions = resolveFunctionMetricsOptions(input.domainOptions);
  if (resolvedOptions === undefined) {
    throw new TypeError(
      "functionMetrics options must use the documented closed policy: a non-empty area map, recognized finding policies and waivers, and positive safe-integer limits"
    );
  }
  return defineCheck({
    ...input.definition,
    execute: executeFunctionMetrics,
    parseData: parseFunctionMetricsData,
    prepare: (preparedOptions) =>
      validResolvedFunctionMetricsOptions(preparedOptions)
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
                  "functionMetrics options are invalid; recreate the Check with functionMetrics(options) or restore its complete resolved options."
              }
            ]
          },
    options: resolvedOptions
  });
}
