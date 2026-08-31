# `markdownLinkValidation`

返回 [README 的随包 Check 概览](../../README.md#随包提供的-check)。

## 用途

本页说明 `markdownLinkValidation` 的 options、terminal effects 与安全边界。该 Check 离线验证 selected Markdown
sources 中的本机链接、图片目标与标题锚点。`markdownLinkValidation(options?)` 补齐默认值并返回可直接放入 Project
Definition `checks` 的普通 Check。

## 参数与默认配置

```ts
{
  files: {
    source: "filesystem",
    include: ["**/*.[mM][dD]", "**/*.[mM][aA][rR][kK][dD][oO][wW][nN]"],
    exclude: defaultProjectFileSelection.exclude
  },
  findingPolicy: "non-blocking",
  requireExistingTargets: true,
  validateSameDocumentAnchors: true,
  validateCrossDocumentAnchors: true,
  rootExternalTargetMode: "report",
  requireNonEmptyDirectories: false,
  limits: {
    maxMarkdownBytes: 1_048_576,
    maxOccurrences: 10_000,
    maxTargetReads: 1_000
  }
}
```

上面的代码块是无参调用物化后的完整 resolved options；`exclude` 表示 constructor detached-copy 了 package root 公开
`defaultProjectFileSelection.exclude` 的全部条目，不是调用方必须复制的输入。所有顶层 authoring fields 都可省略，
`files` 与 `limits` 内的字段也可分别省略。显式 `include` / `exclude` 数组是完整替换值；显式宽泛 include 选中的非 Markdown
path 会产生拒绝 Finding，而不是被静默过滤。

- `files` 定义 Markdown source selection；source 可选 `filesystem` 或 `git-worktree`，selected path 必须命中
  `include` 且不能命中 `exclude`。filesystem 不解释 `.gitignore`；git-worktree 使用已跟踪文件和未被 Git 标准忽略
  规则排除的未跟踪文件。其中 extension 大小写不敏感的 `.md` / `.markdown` 成为 sources，direct targets 仅用于
  resolution；来源不可用时 Check 结算为 `unavailable`，不会切换到另一来源。
- `findingPolicy` 为 `blocking | non-blocking`，默认 `non-blocking`。它只结算本 Check 的 normal local-reference
  findings：`blocking` 使 finding outcome 为 `failed`，`non-blocking` 保留相同的 Records、计数与 final data，但以
  `passed` outcome 和 warning message 提示；它不会改写 Project Run、aggregation 或 Gate outcome。
- `requireExistingTargets` 控制缺失 direct local target 是否是 finding。
- `validateSameDocumentAnchors` / `validateCrossDocumentAnchors` 分别控制当前文档与直接 Markdown target 的 heading
  lookup。
- `rootExternalTargetMode` 为 `ignore | report | validate`；只有显式 `validate` 才授权 bounded root-external target I/O。
- `requireNonEmptyDirectories` 启用时最多读取 direct directory 的一个 entry，不递归遍历。
- `limits` 限制单文档 bytes、全部 semantic occurrences 与 direct target reads；constructor 会补齐该 branch 中省略的
  fields。`maxMarkdownBytes` 不得超过 `16_777_216`，`maxOccurrences` 不得超过 `100_000`，
  `maxTargetReads` 不得超过 `10_000`。

### 定制 authoring options

下面只扫描 `docs/**`、排除 `docs/fixtures/**`、忽略 project root 外目标，并保留其它 defaults：

```ts
import { defaultProjectFileSelection, markdownLinkValidation } from "@zxyycom/vibe-check";

const documentationLinks = markdownLinkValidation({
  files: {
    ...defaultProjectFileSelection,
    exclude: [...defaultProjectFileSelection.exclude, "docs/fixtures/**"],
    include: ["docs/**/*.md", "docs/**/*.markdown"]
  },
  rootExternalTargetMode: "ignore"
});
```

## 工作原理

Check 验证 options，收集 Markdown source paths，每份 source decode / parse 一次，再处理 supported inline、
reference 与 autolink occurrences。完整 selected paths 先按 `.md` / `.markdown` suffix 分为 accepted/rejected，每个
rejected path 产生 supplemental Record，只有 accepted path 成为 source。target file、directory 与 GitHub-priority heading
anchor 按上面 policy 做 bounded validation；每个 link finding 产生另一种 supplemental Record。direct target 可以参与当前
occurrence validation，source discovery 始终由 `files` selection 决定。

受支持 occurrence 包含 inline link/image、已定义的 full/collapsed/shortcut reference、explicit autolink 和选定的 GFM
autolink literal。YAML front matter、code/fenced code、HTML attribute、普通 prose URL 与 undefined reference 不进入本
Check 的 occurrence 集合。HTTP(S)、`mailto:` 与其它非本地 target 只分类后停止，不产生 remote reachability 结论。

## 效果与结果

没有 normal link finding 时 outcome 为 `passed`；有 normal link finding 时，`findingPolicy: "blocking"` 为 `failed`，
`findingPolicy: "non-blocking"` 为 `passed`。input rejection 固定 non-blocking，不受该 policy 影响。两种 finding policy 都
保留相同的 final data 与每 finding 一条 Record；blocking link finding 附带 `invalid-local-links` error message，
non-blocking link finding 附带同 code 的 warning message。正常 final data 恰为：

```ts
{
  sourceFileCount: number,
  occurrenceCount: number,
  targetReadCount: number,
  findingCount: number,
  rejectedInputCount: number
}
```

`occurrenceCount` 包含所有 parser-semantic occurrences，包括没有进入 local target validation 的项；
`targetReadCount` 统计进入 direct endpoint validation 的 occurrence；`findingCount - rejectedInputCount` 是 normal link
finding 数量并且不超过 `occurrenceCount`。每个 normal link finding 恰好形成一条 Record，data 恰为：

```ts
{
  occurrenceKind: "link" | "image",
  range: {
    start: { line: number, column: number },
    end: { line: number, column: number }
  },
  reason:
    | "missing-target"
    | "target-outside-project-root"
    | "empty-directory"
    | "anchor-on-directory"
    | "anchor-target-not-markdown"
    | "missing-anchor"
    | "unsupported-target-type",
  sourcePath: string,
  target:
    | { kind: "same-document" | "project-file" | "project-directory" | "project-path", path: string, fragment: string | null }
    | { kind: "outside-project-root" }
}
```

`range` 使用 one-based、end-exclusive 的 decoded UTF-16 line/column。`outside-project-root` descriptor 不携带 target
path 或 fragment。

每个 rejected selected path 产生一条 ID 为 `/input-rejected/<path>` 的 Record：

```ts
{
  blocking: false,
  kind: "input-rejected",
  path: string,
  reason: "unsupported-file-type"
}
```

blocking finding 的 `failed` outcome 携带 `invalid-local-links` error message；non-blocking finding 的 `passed` outcome
携带同 code 的 warning message。两者随后按 normal link、再按 input rejection 的稳定顺序直接展示最多十条安全摘要：normal
摘要只含 source project-relative path、start line/column、occurrence kind 与封闭 reason，不复制 target；rejection 摘要只含
项目相对 path。存在 rejected input 时仍先附 `input-rejected` 数量 warning；Finding 超过十条时再用 `findings-omitted` 说明
未显示数量，完整 source range、safe target 与 reason 仍从 Records 读取。由本 Check 结算的 `unavailable` 使用对应
`reason.code` 提供可操作 error message；无 Finding 的 `passed` 与 `not-applicable` 不合成人为提示。

用返回 Check 的 `check.parseData(value)` 或 package root 的 `parseMarkdownLinkValidationData(value)` 验证 final data。两者返回
`MarkdownLinkValidationFinalData`；Records 与原因可用 `MarkdownLinkValidationRecordData`、
`MarkdownLinkFindingReason` 和 `MarkdownLinkValidationUnavailableReason` 标注，authoring / resolved options types 是
`MarkdownLinkValidationOptions` 与 `ResolvedMarkdownLinkValidationOptions`。parser 验证字段与计数上界，不匹配时抛出
`TypeError`。

## `not-applicable` 与 `unavailable`

selected path 数量为零时结算为 `not-applicable / no-eligible-input`。selected 非空但全部 rejected 时，不解析 source，直接以
带 final data、Records 与 warning 的 `passed` 结算。`unavailable.reason.code` 使用以下受控值：

| `reason.code` | 触发边界与调用方检查项 |
| --- | --- |
| `invalid-options` | constructor 返回后形成的 replacement options 不是完整 closed resolved shape；重新调用 `markdownLinkValidation(options)` 或恢复完整字段。 |
| `project-root-unavailable` | project root 无法 canonicalize；检查路径存在性与访问权限。 |
| `source-unavailable` | source collection、读取、decode 或 containment 失败；检查 source 与 file-selection 来源。 |
| `source-too-large` | 某个 selected Markdown source 超过 `maxMarkdownBytes`。 |
| `markdown-parse-failed` | selected source 无法形成完整 parser facts。 |
| `invalid-local-destination` | local destination 无法按受支持的 path/URI grammar 安全解析。 |
| `target-unavailable` | target containment probe、I/O、decode、parse 或 directory read 失败；Markdown anchor target 超过 `maxMarkdownBytes` 也属于此分支。 |
| `occurrence-limit-exceeded` | semantic occurrence 总数超过 `maxOccurrences`。 |
| `target-read-limit-exceeded` | direct endpoint validation work 超过 `maxTargetReads`。 |
| `cancelled` | invocation signal 取消本 Check；不要把结果解释为 clean validation。 |

这些边界不发布 partial link-finding Records，也不提供 final data；若 selected classification 已完成，已发布的
rejected-input Records 与对应 warning 仍保留。通用 preflight 语法见
[options preflight 与 execution](../api-mechanics.md#options-preflight-与-execution)。

## I/O 与安全边界

source I/O scope 只包含通过 `.md` / `.markdown` eligibility 的 accepted paths；rejected path 不读取内容。resolver I/O scope
是本地 filesystem，HTTP、DNS、TLS 与 redirect request 数为零。默认 `report` mode 对 root-external
target 形成 finding，显式 `validate` mode 授权 bounded read。published facts 排除 raw external absolute path、target
bytes 与 remote credentials。

## 最小用法

```ts
import { defineConfig, markdownLinkValidation, run } from "@zxyycom/vibe-check";
const result = await run(defineConfig({ checks: [markdownLinkValidation()] }));
```

## 适用边界

该 Check 只评估本机 target 与 heading-anchor integrity，不评估 remote URL reachability 或 HTML attribute links。项目需要
这些能力时，应另外提供明确拥有网络或 HTML parsing policy 的 Check；当前 `markdownLinkValidation` 不会隐式扩展到这些
输入。
