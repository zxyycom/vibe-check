import { defineCheck, type TypedCheckWithOptions } from "../../check/check.ts";
import { JSON_VALIDATION_CHECK_DEFINITION, executeJsonValidation } from "./json-validation.ts";
import { parseJsonValidationData } from "./final-data.ts";
import type { JsonValidationOptions, ResolvedJsonValidationOptions } from "./options.ts";
import { resolveJsonValidationOptions } from "./options-resolution.ts";
import { validJsonValidationOptions } from "./options-validation.ts";

/**
 * 使用可省略的文件范围与 byte limit 构造严格 JSON document Check。
 *
 * @param options - 省略字段由 package 补齐；显式 files 数组作为对应字段的完整替换值。
 * @returns 固定 `json-validation` identity、完整冻结 options、final-data parser 与执行逻辑。
 * @throws {TypeError} input 含未知字段、非法文件选择或非法 byte limit 时抛出。
 */
export function jsonValidation(
  options: JsonValidationOptions = {}
): TypedCheckWithOptions<
  "json-validation",
  ResolvedJsonValidationOptions,
  typeof parseJsonValidationData
> {
  const resolvedOptions = resolveJsonValidationOptions(options);
  if (resolvedOptions === undefined) {
    throw new TypeError("jsonValidation options must match the documented closed policy");
  }
  return defineCheck({
    ...JSON_VALIDATION_CHECK_DEFINITION,
    execution: executeJsonValidation,
    parseData: parseJsonValidationData,
    preflight: (preparedOptions) =>
      validJsonValidationOptions(preparedOptions)
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
                  "jsonValidation options are invalid; recreate the Check with jsonValidation(options) or restore its complete resolved options."
              }
            ]
          },
    options: resolvedOptions
  });
}
