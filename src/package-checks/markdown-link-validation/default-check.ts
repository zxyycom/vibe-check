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
 * @param options - 省略字段由 package 补齐；files 数组是完整替换值，limits fields 可分别省略；cache 省略时关闭，启用时由调用方提供 absolute、可信且可删除的 directory，其中本 Check 只维护一个 source-derived JSONL local state；调用方负责容量和删除，cache 不可用不改变 Check 结果。
 * @returns 固定 `markdown-link-validation` identity、完整冻结 options、parser 与执行逻辑。
 * @throws {TypeError} input 含未知字段、非法 target policy、cache branch/directory 或非法 work limit 时抛出。
 * @example 离线 Markdown 本地链接完整性
 * ```ts
 * import { defineConfig, markdownLinkValidation, run } from "@zxyycom/vibe-check";
 *
 * // 此调用方自有目录是 absolute、可删除的，并且可能保存 source-derived parse facts。
 * const cacheDirectory = new URL(".vibe-check/markdown-link-parse-cache", import.meta.url).pathname;
 * const definition = defineConfig({
 *   checks: [
 *     markdownLinkValidation({
 *       cache: { enabled: true, directory: cacheDirectory }
 *     })
 *   ],
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
