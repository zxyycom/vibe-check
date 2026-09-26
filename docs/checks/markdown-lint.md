# `markdownLint`

## 用途与组合

`markdownLint(options?)` 是 package 提供的 ordinary Check，用于检查已选择 Markdown source 的结构和明确内容缺陷。它的公共契约由本页完整定义；`files` 的共同选择语义见[选择与收集项目文件](../guides/collecting-project-files.md)。

它与 [`markdownLinkValidation`](./markdown-link-validation.md) 分工互补：`markdownLint` 检查本页列出的结构与内容规则；`markdownLinkValidation` 检查本地 link target 与 anchor 完整性。需要两类 evidence 时，将两个 Check 一起放入 `checks`；`link-fragments` 默认不启用，避免默认产生与链接 Check 重复的 same-document anchor evidence。

## 构造器项目声明

`markdownLint` 有三类 overload：`markdownLint(options?: MarkdownLintOptions<"markdown-lint">)` 保留默认 literal；
`markdownLint<Id>(options: MarkdownLintOptions<Id> & { checkId: Id })` 保留 custom literal；已宽化为
`MarkdownLintOptions` 的变量返回 `string` identity。默认 `checkId` 是 `markdown-lint`，默认 `displayName` 是 `Markdown lint`。
`files`、`findingPolicy`、`findingWaivers`、`rules`、`limits` 与 `cache` 是本 Check 的领域 options，不属于项目展示字段。

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
| `findingPolicy` | `"non-blocking"` | lint Finding 保留为 evidence；设为 `"blocking"` 时，有未豁免 lint Finding 的 Check 结算为 `failed`。|
| `findingWaivers` | `[]` | 带非空理由的精确 Finding 例外；完整 lint 后对账，不删除 Finding。见下方精确豁免边界。|
| `rules` | 下表八项默认规则 | 省略时使用默认集；提供非空数组时完整替换默认集。数组只可含下表九个名称，resolved 顺序固定为 Product catalog 顺序。|
| `limits.maxMarkdownBytes` | `1_048_576`，最大 `16_777_216` | 单个 source 的 UTF-8 字节上限。|
| `limits.maxFindings` | `10_000`，最大 `100_000` | 整次 execution 可形成的 lint Finding 上限。|
| `cache` | `{ enabled: false }` | 显式启用时为 `{ enabled: true, directory }`；directory 必须是调用方拥有的绝对路径。见下方缓存边界。|

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

每次 execution 只收集一次 `files` 选中的路径并稳定排序。选中但后缀不是 `.md` 或 `.markdown` 的路径不会读取内容，而是各发布一条 non-blocking `input-rejected / unsupported-file-type` Record。accepted source 必须位于 project root 内、是 regular file、可作为 UTF-8 读取且不超过 `maxMarkdownBytes`；Check 按路径顺序逐文件执行，并在文件前后响应取消。

私有 adapter 使用随包固定的 `markdownlint@0.41.1` Promise `strings` API，只接收已读取的 source text，不接收项目路径或文件系统权限。inline config 固定禁用；文件开头的 YAML、TOML 和 JSON front matter 受支持。pipe table、HTML comment 与未支持扩展的识别以该固定 backend 版本的实际行为为准，不承诺与任意 Markdown renderer 等价。

### 逐文件 findings 缓存

缓存默认关闭，不访问缓存目录。显式启用后，每次 execution 仍完成以下工作：

1. 按当前 `files` 选择路径，确认每份 source 位于 project root 内、符合大小限制，并读取、解码当前 UTF-8 内容。
2. 对未变化的 source 复用已验证的逐文件 findings；内容、所选规则或 backend 版本变化时重新 lint。缓存身份还包含 source path 与内部 adapter 契约版本。
3. 根据本次完整遍历结算 Finding 总量限制、记录顺序、Finding policy、Records、消息与终态。缓存命中不复用 Check outcome。

只有成功计算的 findings 可写入缓存。损坏或不可用的缓存会重新计算，不会被视为空结果；取消、source 读取失败、backend 失败及超限仍按原有终态结算。adapter 的规则配置或 finding 解释变化时，维护者必须提升内部缓存契约版本。

缓存目录由调用方指定，保存由 source 派生的 findings 和 identity 摘要，不保存原文。调用方应使用可信、可删除的绝对目录并管理容量；该目录不提供防篡改、机密性或自动清理保证。

### 精确 Finding waiver

`findingWaivers` 是闭合的 `{ identity, reason }` 数组；每项 identity 只包含公开 `lint-finding` Record data 的 `path`、`rule`、`range`。复核一条 Finding 后，完整复制这三个字段并填写非空 reason，不解析 Record ID，也不要自动把全部新 Finding 转成 waiver。[配置示例](../guides/finding-waivers.md#为-markdown-lint-声明精确例外)展示同一 authoring。

- `path` 是规范 project-relative `/` 路径，不解释 glob；`rule` 必须是本页 catalog 中的公共规则名。
- `range` 只含 `start`、`end`，两者只含正安全整数 `line`、`column`；两端同行，end column 不小于 start column。使用完整的一基 UTF-16 range，包括 end-exclusive 的 end；point range 的两端相等。
- 类型为 `MarkdownLintFindingIdentity` 与 `MarkdownLintFindingWaiver`。未知字段、非法位置、空 reason、重复 identity、稀疏数组或 accessor 配置在构造 Check 时以 `TypeError` 拒绝；合法配置被独立、递归冻结地快照。

每次完成全部 source traversal 后，Check 使用[通用 reconciliation](../guides/finding-waivers.md#identity-与-audit)按完整 identity 对账：

| 匹配次数 | Finding 与 audit | 结算影响 |
| --- | --- | --- |
| 恰好一条 | 原 Finding 保留原 id、位置与规则，增加 `waiver: { reason }`，并发布 `finding-waived` 信息消息。 | 该 Finding 不再阻断。 |
| 零条 | 发布 `finding-waiver-audit / unused` Record 与 warning。 | 不豁免其它 Finding；audit 本身不阻断。 |
| 多条 | 发布 `finding-waiver-audit / overmatched` Record 与 warning，所有匹配 Finding 均保留。 | 所有匹配 Finding 继续接受原 findingPolicy 判断。 |

audit Record data 包含 `kind: "finding-waiver-audit"`、`identity`、`reason`、`matchCount` 与 `status: "unused" | "overmatched"`，其类型为 `MarkdownLintFindingWaiverAuditRecordData`。不为 applied 另发 audit Record，因为原 Finding 上已有 waiver evidence。

完全相同位置、规则和路径的多条 Finding 不会按 ordinal 任挑一条豁免；不同 end range 则是不同 identity。编辑导致路径或位置漂移时，旧 waiver 会变为 unused，应人工更新或删除。reason 会进入公开 Records 和消息，不得包含秘密或敏感原文。

waiver 不改变文件选择、规则、source 读取、`maxFindings` 或缓存 facts：所有原始 Finding 仍计入上限，每次 cache hit 后也按当前 waiver 重新结算。rejected input、source/backend 失败、超限和取消不可豁免；没有 selected path 时继续 N/A，不对账；无法取得完整 lint 时不发布 partial lint 或 waiver audit。省略或传入空数组保持既有输出。

## I/O 与安全边界

Check 不读取 backend 配置文件，不访问网络，不读取 project root 外的 source；默认不写入项目，显式启用缓存时只写调用方指定的缓存目录。调用方通过 `files` 决定 source 范围。

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

应用精确 waiver 的 lint Record 还包含 `waiver: { reason }`；未豁免时不增加该字段。unused/overmatched audit 见上节，`MarkdownLintRecordData` 同时覆盖 lint、input-rejected 和 waiver-audit 三种 Record。

`path` 是 project-relative path。`range` 使用一基 UTF-16 line/column，end 是同一行 end-exclusive position；backend 未提供 range 时使用该行 column 1 的 point range。普通 lint 诊断消息只包含 Product-owned path、position、public rule 与固定摘要，不泄漏 backend message、context、source、fix、URL 或异常；waiver 消息另含调用方显式提供的 reason，其公开边界见上方精确豁免说明。

成功 execution 的 final data 为 `{ sourceFileCount, findingCount, rejectedInputCount }`：`sourceFileCount` 是成功 lint 的 accepted source 数量；`findingCount` 是全部 lint Findings（包括已豁免项）与 rejected inputs 的合计，因而不小于 `rejectedInputCount`。audit 不计入 findingCount，该计数不代表阻断数；通过 lint Record 上的 waiver evidence 区分已豁免项。

用返回 Check 的 `check.parseData(value)` 或 package root 的 `parseMarkdownLintData(value)` 验证 `passed` / `failed` outcome 的 final data。两者返回 `MarkdownLintFinalData`；Record 和不可用原因可分别用 `MarkdownLintRecordData` 与 `MarkdownLintUnavailableReason` 标注，authoring / resolved options types 是 `MarkdownLintOptions` 与 `ResolvedMarkdownLintOptions`。parser 要求完整且无额外字段、计数为非负安全整数，并验证 `findingCount >= rejectedInputCount`；不匹配时抛出 `TypeError`。`not-applicable` 与 `unavailable` 不提供可解析的 final data。

| 条件 | 结算 | 发布内容 |
| --- | --- | --- |
| 没有 selected path | `not-applicable / no-eligible-input` | 不发布 final data。|
| 全部 selected path 被后缀资格拒绝 | `passed` | rejected-input Records、可能的 unused waiver audit、warning 和 final data。|
| 无 lint Finding | `passed` | final data，以及已配置但未命中的 waiver audit。|
| 有 lint Finding 且 `findingPolicy: "non-blocking"` | `passed` | 全部 lint Records、waiver evidence/audit、消息和 final data。|
| 有未豁免 lint Finding 且 `findingPolicy: "blocking"` | `failed` | 全部 lint Records、waiver evidence/audit、消息和 final data。|
| 全部 lint Finding 已豁免 | `passed` | 全部 lint Records 及 waiver evidence、消息和 final data。|
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

本 Check 的 package 默认仍为 advisory，缓存默认关闭。Project Gate 以独立的 `markdown-lint` identity 使用八项默认规则、完整 `docs/**/*.md` 与 `changes/**/*.md` corpus，以及 non-blocking Finding policy。required 在 Markdown 文档或其实现输入变更时运行；`--materials`、`--quality`、`--all` 可强制运行。Gate 显式使用 `.cache/vibe-check/markdown-lint-findings/` 复用逐文件 findings，不缩小检查范围或改变 consumer 默认值；独立的 Markdown link validation 仍负责链接目标完整性。
