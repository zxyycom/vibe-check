import { defineCheck, type TypedCheckWithOptions } from "../../check/check.ts";
import {
  MARKDOWN_LINK_VALIDATION_CHECK_DEFINITION,
  executeMarkdownLinkValidation
} from "./execution.ts";
import { parseMarkdownLinkValidationData } from "./final-data.ts";
import type {
  MarkdownLinkValidationOptions,
  ResolvedMarkdownLinkValidationOptions
} from "./options.ts";
import { resolveMarkdownLinkValidationOptions } from "./options-resolution.ts";
import { validMarkdownLinkValidationOptions } from "./options-validation.ts";

/**
 * 使用可省略的 source、target 与 work-limit policy 构造离线 Markdown 引用 Check。
 *
 * @param options - 省略字段由 package 补齐；files 数组是完整替换值，limits fields 可分别省略。
 * @returns 固定 `markdown-link-validation` identity、完整冻结 options、parser 与执行逻辑。
 * @throws {TypeError} input 含未知字段、非法 target policy 或非法 work limit 时抛出。
 * @example 离线 Markdown 本地链接完整性
 * ```ts
 * import { defineConfig, markdownLinkValidation, run } from "@zxyycom/vibe-check";
 *
 * const definition = defineConfig({
 *   checks: [markdownLinkValidation()],
 *   outputs: {
 *     diagnosticLogging: { enabled: false },
 *     machinePublication: { enabled: false },
 *     progressRendering: { enabled: false }
 *   }
 * });
 *
 * const result = await run(definition);
 * if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
 * ```
 */
export function markdownLinkValidation(
  options: MarkdownLinkValidationOptions = {}
): TypedCheckWithOptions<
  "markdown-link-validation",
  ResolvedMarkdownLinkValidationOptions,
  typeof parseMarkdownLinkValidationData
> {
  const resolvedOptions = resolveMarkdownLinkValidationOptions(options);
  if (resolvedOptions === undefined) {
    throw new TypeError("markdownLinkValidation options must match the documented closed policy");
  }
  return defineCheck({
    ...MARKDOWN_LINK_VALIDATION_CHECK_DEFINITION,
    execution: executeMarkdownLinkValidation,
    parseData: parseMarkdownLinkValidationData,
    preflight: (preparedOptions) =>
      validMarkdownLinkValidationOptions(preparedOptions)
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
                  "markdownLinkValidation options are invalid; recreate the Check with markdownLinkValidation(options) or restore its complete resolved options."
              }
            ]
          },
    options: resolvedOptions
  });
}
