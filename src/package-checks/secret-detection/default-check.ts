import { defineCheck, type TypedCheckWithOptions } from "../../check/check.ts";
import { executeSecretDetection, SECRET_DETECTION_CHECK_DEFINITION } from "./execution.ts";
import { parseSecretDetectionData } from "./final-data.ts";
import type { ResolvedSecretDetectionOptions, SecretDetectionOptions } from "./options.ts";
import { resolveSecretDetectionOptions } from "./options-resolution.ts";
import { validSecretDetectionOptions } from "./options-validation.ts";

/**
 * 构造只检查其必填、显式 `files` policy 所选择输入的 high-confidence secret Check。
 *
 * @param options - 必须声明完整 `files`；limits 和 finding waivers 使用本 Check 的固定安全策略。
 * @returns 固定 `secret-detection` identity、完整冻结 options、final-data parser 与 execution。
 * @throws {TypeError} files 缺失、策略不完整或输入含未知字段时抛出。
 */
export function secretDetection(
  options: SecretDetectionOptions
): TypedCheckWithOptions<
  "secret-detection",
  ResolvedSecretDetectionOptions,
  typeof parseSecretDetectionData
> {
  const resolvedOptions = resolveSecretDetectionOptions(options);
  if (resolvedOptions === undefined) {
    throw new TypeError(
      "secretDetection options must declare the documented closed explicit file policy"
    );
  }
  return defineCheck({
    ...SECRET_DETECTION_CHECK_DEFINITION,
    execution: executeSecretDetection,
    parseData: parseSecretDetectionData,
    preflight: (preparedOptions) =>
      validSecretDetectionOptions(preparedOptions)
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
                  "secretDetection options are invalid; recreate the Check with secretDetection({ files }) or restore its complete resolved options."
              }
            ]
          },
    options: resolvedOptions
  });
}
