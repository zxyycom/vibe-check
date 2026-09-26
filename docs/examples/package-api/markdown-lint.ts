// #region package-api-example:markdown-lint
import { defineConfig, markdownLint, run } from "@zxyycom/vibe-check";

const check = markdownLint({ findingPolicy: "blocking" });
const definition = defineConfig({
  checks: [check],
  outputs: {
    diagnosticLogging: { enabled: false },
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  }
});

const result = await run(definition);
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
const outcome = result.snapshot.checks.find(({ checkId }) => checkId === check.checkId)?.outcome;
if (outcome?.status !== "passed" && outcome?.status !== "not-applicable") {
  throw new Error(`Markdown lint did not pass: ${outcome?.status ?? "no outcome"}`);
}
if (outcome.status === "not-applicable") console.warn("No Markdown input selected; no lint evidence.");
// #endregion package-api-example:markdown-lint

// #region package-api-example:markdown-lint-waivers
import {
  markdownLint as lintWithWaivers,
  type MarkdownLintRecordData,
  type MarkdownLintFindingWaiver
} from "@zxyycom/vibe-check";

// 示例：已人工复核的一条 Record data，实际使用时复制自己检查得到的值。
const reviewedFinding: MarkdownLintRecordData = {
  kind: "lint-finding",
  path: "docs/legacy.md",
  rule: "fenced-code-language",
  range: { start: { line: 8, column: 1 }, end: { line: 8, column: 1 } }
};
const { path, rule, range } = reviewedFinding;
const acceptedException: MarkdownLintFindingWaiver = {
  identity: { path, rule, range },
  reason: "此处演示未指定语言的原始围栏，保留例外并继续检查其它 Finding。"
};
const lintWithAcceptedException = lintWithWaivers({
  findingPolicy: "blocking",
  findingWaivers: [acceptedException]
});
// 将 lintWithAcceptedException 加入项目 checks；不是删除原 Finding。
void lintWithAcceptedException;
// #endregion package-api-example:markdown-lint-waivers
