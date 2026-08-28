import { defineCheck, type TypedCheckWithOptions } from "../../check/check.ts";
import {
  JSON_SCHEMA_VALIDATION_CHECK_DEFINITION,
  executeJsonSchemaValidation
} from "./json-schema-validation.ts";
import { parseJsonSchemaValidationData } from "./final-data.ts";
import type {
  JsonSchemaValidationOptions,
  ResolvedJsonSchemaValidationOptions
} from "./options.ts";
import { resolveJsonSchemaValidationOptions } from "./options-resolution.ts";
import { validJsonSchemaValidationOptions } from "./options-validation.ts";

/**
 * 使用可省略的 file、identity、reference、schema 与 binding policy 构造 Check。
 *
 * @param options - 省略顶层字段和 file fields 使用 package defaults；显式数组是完整替换值。
 * @returns 固定 `json-schema-validation` identity、完整冻结 options、parser 与执行逻辑。
 * @throws {TypeError} input 不符合 closed authoring policy、identity 或 binding 不变量时抛出。
 */
export function jsonSchemaValidation(
  options: JsonSchemaValidationOptions = {}
): TypedCheckWithOptions<
  "json-schema-validation",
  ResolvedJsonSchemaValidationOptions,
  typeof parseJsonSchemaValidationData
> {
  const resolvedOptions = resolveJsonSchemaValidationOptions(options);
  if (resolvedOptions === undefined) {
    throw new TypeError("jsonSchemaValidation options must match the documented closed policy");
  }
  return defineCheck({
    ...JSON_SCHEMA_VALIDATION_CHECK_DEFINITION,
    execution: executeJsonSchemaValidation,
    parseData: parseJsonSchemaValidationData,
    preflight: (preparedOptions) =>
      validJsonSchemaValidationOptions(preparedOptions)
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
                  "jsonSchemaValidation options are invalid; recreate the Check with jsonSchemaValidation(options) or restore its complete resolved options."
              }
            ]
          },
    options: resolvedOptions
  });
}
