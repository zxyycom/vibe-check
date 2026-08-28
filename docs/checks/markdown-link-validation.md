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
    include: ["**/*"],
    exclude: [
      "**/.git", "**/.git/**", "**/.vibe-check/**", "**/.cache/**",
      "**/.venv/**", "**/artifacts/**", "**/build/**", "**/dist/**",
      "**/generated/**", "**/*.generated.*", "**/node_modules/**",
      "**/target/**", "**/vendor/**"
    ]
  },
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

上面的代码块是无参调用物化后的完整 resolved options。所有顶层 authoring fields 都可省略，`files` 与 `limits` 内的字段也可
分别省略。显式 `include` / `exclude` 数组是完整替换值。

- `files` 定义 Markdown source selection；source 可选 `filesystem` 或 `git-worktree`，selected path 必须命中
  `include` 且不能命中 `exclude`。filesystem 不解释 `.gitignore`；git-worktree 使用已跟踪文件和未被 Git 标准忽略
  规则排除的未跟踪文件。其中 extension 大小写不敏感的 `.md` / `.markdown` 成为 sources，direct targets 仅用于
  resolution；来源不可用时 Check 结算为 `unavailable`，不会切换到另一来源。
- `requireExistingTargets` 控制缺失 direct local target 是否是 finding。
- `validateSameDocumentAnchors` / `validateCrossDocumentAnchors` 分别控制当前文档与直接 Markdown target 的 heading
  lookup。
- `rootExternalTargetMode` 为 `ignore | report | validate`；只有显式 `validate` 才授权 bounded root-external target I/O。
- `requireNonEmptyDirectories` 启用时最多读取 direct directory 的一个 entry，不递归遍历。
- `limits` 限制单文档 bytes、全部 semantic occurrences 与 direct target reads；constructor 会补齐该 branch 中省略的
  fields。`maxMarkdownBytes` 不得超过 `16_777_216`，`maxOccurrences` 不得超过 `100_000`，
  `maxTargetReads` 不得超过 `10_000`。

### 定制 authoring options

下面只扫描 `docs/**`，忽略 project root 外目标，并保留其它 defaults：

```ts
import { markdownLinkValidation } from "vibe-check";

const documentationLinks = markdownLinkValidation({
  files: { include: ["docs/**/*.md", "docs/**/*.markdown"] },
  rootExternalTargetMode: "ignore"
});
```

## 工作原理

Check 验证 options，收集 Markdown source paths，每份 source decode / parse 一次，再处理 supported inline、
reference 与 autolink occurrences。target file、directory 与 GitHub-priority heading anchor 按上面 policy 做 bounded
validation；每个 finding 产生一条 supplemental Record。direct target 可以参与当前 occurrence validation，source
discovery 始终由 `files` selection 决定。

受支持 occurrence 包含 inline link/image、已定义的 full/collapsed/shortcut reference、explicit autolink 和选定的 GFM
autolink literal。YAML front matter、code/fenced code、HTML attribute、普通 prose URL 与 undefined reference 不进入本
Check 的 occurrence 集合。HTTP(S)、`mailto:` 与其它非本地 target 只分类后停止，不产生 remote reachability 结论。

## 效果与结果

`findingCount === 0` 时 outcome 为 `passed`；`findingCount > 0` 时 outcome 为 `failed`。正常 final data 恰为：

```ts
{
  sourceFileCount: number,
  occurrenceCount: number,
  targetReadCount: number,
  findingCount: number
}
```

`occurrenceCount` 包含所有 parser-semantic occurrences，包括没有进入 local target validation 的项；
`targetReadCount` 统计进入 direct endpoint validation 的 occurrence。每个 finding 恰好形成一条 Record，data 恰为：

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

按 [README 的 Run / Check 结果规则](../../README.md#读取-run-和-check-结果)，先缩窄
`RunResult.kind`，再按 `markdown-link-validation` checkId 读取 outcome。

`failed` outcome 携带 `invalid-local-links` error message，并引导调用方检查 Records 的 source range、target 与 reason。由本
Check 结算的 `unavailable` 使用对应 `reason.code` 提供可操作 error message；`passed` 与 `not-applicable` 不合成人为提示。

用返回 Check 的 `check.parseData(value)` 或 package root 的 `parseMarkdownLinkValidationData(value)` 验证 final data。两者返回
`MarkdownLinkValidationFinalData`；Records 与原因可用 `MarkdownLinkValidationRecordData`、
`MarkdownLinkFindingReason` 和 `MarkdownLinkValidationUnavailableReason` 标注，authoring / resolved options types 是
`MarkdownLinkValidationOptions` 与 `ResolvedMarkdownLinkValidationOptions`。parser 验证字段与计数上界，不匹配时抛出
`TypeError`。

## `not-applicable` 与 `unavailable`

selected Markdown source 数量为零时结算为 `not-applicable / no-eligible-input`。`unavailable.reason.code` 使用以下受控值：

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

这些边界不发布 partial finding Records，也不提供 final data。通用 preflight 语法见
[options preflight 与 execution](../api-mechanics.md#options-preflight-与-execution)。

## I/O 与安全边界

resolver I/O scope 是本地 filesystem，HTTP、DNS、TLS 与 redirect request 数为零。默认 `report` mode 对 root-external
target 形成 finding，显式 `validate` mode 授权 bounded read。published facts 排除 raw external absolute path、target
bytes 与 remote credentials。

## 最小用法

```ts
import { defineConfig, markdownLinkValidation, run } from "vibe-check";
const result = await run(defineConfig({ checks: [markdownLinkValidation()] }));
```

## 适用边界

该 Check 只评估本机 target 与 heading-anchor integrity，不评估 remote URL reachability 或 HTML attribute links。项目需要
这些能力时，应另外提供明确拥有网络或 HTML parsing policy 的 Check；当前 `markdownLinkValidation` 不会隐式扩展到这些
输入。
