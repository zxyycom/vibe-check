import { defineCheck, type TypedCheckWithOptions } from "../../check/check.ts";
import { MARKDOWN_LINT_CHECK_DEFINITION, executeMarkdownLint } from "./execution.ts";
import { parseMarkdownLintData } from "./final-data.ts";
import type { MarkdownLintOptions, ResolvedMarkdownLintOptions } from "./options.ts";
import { resolveMarkdownLintOptions } from "./options-resolution.ts";
import { validMarkdownLintOptions } from "./options-validation.ts";

/**
 * 构造使用稳定闭合规则与受限输入的 Markdown 结构检查。
 *
 * @param options - 省略时采用八项 recommended 规则；非空 rules 数组完整替换该集合。
 * @returns 固定 `markdown-lint` identity、完整冻结 options、parser 与执行逻辑。
 * @throws {TypeError} options 含未知字段、未知/重复规则或非法 limits 时抛出。
 * @example 最小用法
 * ```ts
 * import { defineConfig, markdownLint, run } from "@zxyycom/vibe-check";
 *
 * const definition = defineConfig({
 *   checks: [markdownLint({ findingPolicy: "blocking" })],
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
export function markdownLint(
  options: MarkdownLintOptions = {}
): TypedCheckWithOptions<
  "markdown-lint",
  ResolvedMarkdownLintOptions,
  typeof parseMarkdownLintData
> {
  const resolvedOptions = resolveMarkdownLintOptions(options);
  if (resolvedOptions === undefined) {
    throw new TypeError("markdownLint options must match the documented closed policy");
  }
  return defineCheck({
    ...MARKDOWN_LINT_CHECK_DEFINITION,
    execute: executeMarkdownLint,
    parseData: parseMarkdownLintData,
    prepare: (preparedOptions) =>
      validMarkdownLintOptions(preparedOptions)
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
                  "markdownLint options are invalid; recreate the Check with markdownLint(options) or restore its complete resolved options."
              }
            ]
          },
    options: resolvedOptions
  });
}
