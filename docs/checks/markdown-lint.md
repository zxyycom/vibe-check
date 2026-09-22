# `markdownLint`

## 用途与组合

`markdownLint(options?)` 是 package 提供的 ordinary Check，用于检查已选择 Markdown source 的结构和明确内容缺陷。它的公共契约由本页完整定义；`files` 的共同选择语义见[选择与收集项目文件](../guides/collecting-project-files.md)。

它与 [`markdownLinkValidation`](./markdown-link-validation.md) 分工互补：`markdownLint` 检查本页列出的结构与内容规则；`markdownLinkValidation` 检查本地 link target 与 anchor 完整性。需要两类 evidence 时，将两个 Check 一起放入 `checks`；`link-fragments` 默认不启用，避免默认产生与链接 Check 重复的 same-document anchor evidence。

## 构造器项目声明

`markdownLint` 有三类 overload：`markdownLint(options?: MarkdownLintOptions<"markdown-lint">)` 保留默认 literal；
`markdownLint<Id>(options: MarkdownLintOptions<Id> & { checkId: Id })` 保留 custom literal；已宽化为
`MarkdownLintOptions` 的变量返回 `string` identity。默认 `checkId` 是 `markdown-lint`，默认 `displayName` 是 `Markdown lint`；`files`、`findingPolicy`、`rules`
与 `limits` 仍是本 Check 的领域 options。

例如，为文档 lint 声明项目展示和进度呈现策略：

```ts
const documentationLint = markdownLint({
  checkId: "documentation-lint",
  displayName: "Documentation lint",
  omitQuietPassedRow: true,
  files: { include: ["docs/**/*.md"] }
});
```

返回值仍是原生 typed Check。项目声明字段不会进入 `.options` 或执行时的 `context.options`；
完整字段集合、投影和校验边界见[API 机制](../api-mechanics.md#随包-check-的构造器项目声明)。

## 参数与默认配置

`markdownLint` 只接受以下闭合 options。未知字段、未知或重复规则、空规则数组，以及不是正安全整数或超过上限的 limit，会在构造 Check 时以 `TypeError` 拒绝。

| 字段 | 默认值 | 契约 |
| --- | --- | --- |
| `files` | 选择大小写不敏感的 `.md` 与 `.markdown` 路径 | 通过 project-file selection 指定本次 source 范围。|
| `findingPolicy` | `"non-blocking"` | lint Finding 保留为 evidence；设为 `"blocking"` 时，有 lint Finding 的 Check 结算为 `failed`。|
| `rules` | 下表八项默认规则 | 省略时使用默认集；提供非空数组时完整替换默认集。数组只可含下表九个名称，resolved 顺序固定为 Product catalog 顺序。|
| `limits.maxMarkdownBytes` | `1_048_576`，最大 `16_777_216` | 单个 source 的 UTF-8 字节上限。|
| `limits.maxFindings` | `10_000`，最大 `100_000` | 整次 execution 可形成的 lint Finding 上限。|

### 规则 catalog

| Public rule | 默认启用 | 报告的缺陷 |
| --- | --- | --- |
| `heading-increment` | 是 | 标题层级一次增加超过一级。|
| `no-reversed-links` | 是 | 反向 `()[]` link 语法。|
| `no-missing-space-atx` | 是 | ATX heading marker 后缺少空格。|
| `fenced-code-language` | 是 | fenced code block 缺少语言。|
| `no-empty-links` | 是 | link destination 或 fragment 为空。|
| `no-alt-text` | 是 | Markdown image 缺少 alt text。|
| `link-fragments` | 否；仅显式选择 | same-document fragment 未匹配标题。|
| `reference-links-images` | 是 | full/collapsed reference link 或 image 缺少 definition。|
| `table-column-count` | 是 | GFM pipe table 的行列数不一致。|

backend 规则名、preset、rule object、rule 参数、parser plugin 和自动修复不是公共配置。

## 工作原理

每次 execution 只收集一次 `files` 选中的路径并稳定排序。选中但后缀不是 `.md` 或 `.markdown` 的路径不会读取内容，而是各发布一条 non-blocking `input-rejected / unsupported-file-type` Record。accepted source 必须位于 project root 内、是 regular file、可作为 UTF-8 读取且不超过 `maxMarkdownBytes`；Check 按路径顺序逐文件执行，并在文件前后响应取消。它不使用 persistent cache。

私有 adapter 使用随包固定的 `markdownlint@0.41.1` Promise `strings` API，只接收已读取的 source text，不接收项目路径或文件系统权限。inline config 固定禁用；文件开头的 YAML、TOML 和 JSON front matter 受支持。pipe table、HTML comment 与未支持扩展的识别以该固定 backend 版本的实际行为为准，不承诺与任意 Markdown renderer 等价。

## I/O 与安全边界

Check 不读取 backend 配置文件，不访问网络，不读取 project root 外的 source，也不写入项目。调用方通过 `files` 决定 source 范围。

## 效果与结果

成功 execution 的 lint Record 为：

```ts
{
  kind: "lint-finding",
  path,
  rule,
  range: { start: { line, column }, end: { line, column } }
}
```

`path` 是 project-relative path。`range` 使用一基 UTF-16 line/column，end 是同一行 end-exclusive position；backend 未提供 range 时使用该行 column 1 的 point range。消息只包含 Product-owned path、position、public rule 与固定摘要，不泄漏 backend message、context、source、fix、URL 或异常。

成功 execution 的 final data 为 `{ sourceFileCount, findingCount, rejectedInputCount }`：`sourceFileCount` 是成功 lint 的 accepted source 数量；`findingCount` 是 lint Findings 与 rejected inputs 的合计，因而不小于 `rejectedInputCount`。

用返回 Check 的 `check.parseData(value)` 或 package root 的 `parseMarkdownLintData(value)` 验证 `passed` / `failed` outcome 的 final data。两者返回 `MarkdownLintFinalData`；Record 和不可用原因可分别用 `MarkdownLintRecordData` 与 `MarkdownLintUnavailableReason` 标注，authoring / resolved options types 是 `MarkdownLintOptions` 与 `ResolvedMarkdownLintOptions`。parser 要求完整且无额外字段、计数为非负安全整数，并验证 `findingCount >= rejectedInputCount`；不匹配时抛出 `TypeError`。`not-applicable` 与 `unavailable` 不提供可解析的 final data。

| 条件 | 结算 | 发布内容 |
| --- | --- | --- |
| 没有 selected path | `not-applicable / no-eligible-input` | 不发布 final data。|
| 全部 selected path 被后缀资格拒绝 | `passed` | rejected-input Records、warning 和 final data。|
| 无 lint Finding | `passed` | final data。|
| 有 lint Finding 且 `findingPolicy: "non-blocking"` | `passed` | lint Records、消息和 final data。|
| 有 lint Finding 且 `findingPolicy: "blocking"` | `failed` | lint Records、消息和 final data。|
| root、source、limit、backend、协议或取消阻止完整结果 | `unavailable` | 不发布 final data 或 partial lint Findings；已完成资格分类的 rejected-input Records 与 warning 保留。|

## `not-applicable` 与 `unavailable`

`unavailable` 的稳定 reason code 是 `invalid-options`、`project-root-unavailable`、`source-unavailable`、`source-too-large`、`finding-limit-exceeded`、`backend-failed`、`backend-protocol-invalid` 或 `cancelled`。其中 `source-unavailable` 包含 selection、containment、读取或 UTF-8 decode 无法完成的情形。

## 最小用法

<!-- package-api-example:markdown-lint -->

```ts
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
```

<!-- /package-api-example:markdown-lint -->

本例对 blocking Finding 和其它 Check 失败退出非零；`not-applicable` 仅表示没有可检查的 Markdown，不是 lint 通过的证据。默认严格 `aggregate` 会把有效的 `not-applicable` 结论为 `failed`，调用方可将其映射为 Gate 失败；需要不同领域解释时才提供同步 `checkAggregation` 函数。仅有 `RunResult.kind === "completed"` 不代表 Check 通过。

## 适用边界

本 Check 的 package 默认仍为 advisory。Project Gate 当前以独立的 `markdown-lint` identity 采用它：完整 `docs/**/*.md` 与 `changes/**/*.md` corpus 固定使用八项默认规则、保留 non-blocking Finding policy，并在 repository-material changed 的 required path 以及 `--materials`、`--quality`、`--all` force path 执行。该仓库策略不改变 consumer 默认值、backend、规则或 cache，也不替代独立的 Markdown link validation；blocking migration 与 persistent cache 仍由独立 Change 决定。
