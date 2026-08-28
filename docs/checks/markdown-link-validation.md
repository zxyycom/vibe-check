# `markdownLinkValidation`

返回 [README 的随包 Check 概览](../../README.md#随包提供的-check)。

## 用途

本页说明 `markdownLinkValidation` 的 options、terminal effects 与安全边界。该 Check 离线验证 selected Markdown
sources 中的本机链接、图片目标与标题锚点。导出值可以直接放入 Project Definition 的 `checks`。

## 参数与默认配置

```ts
{
  files: {
    include: ["**/*"],
    excludeDirs: [
      ".git", ".vibe-check", ".cache", ".venv", "artifacts", "build", "dist",
      "node_modules", "target", "vendor"
    ],
    generatedFiles: ["**/generated/**", "**/*.generated.*"]
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

- `files` 完整定义 Markdown source selection；其中 `.md` / `.markdown` 成为 sources，direct targets 仅用于
  resolution。
- `requireExistingTargets` 控制缺失 direct local target 是否是 finding。
- `validateSameDocumentAnchors` / `validateCrossDocumentAnchors` 分别控制当前文档与直接 Markdown target 的 heading
  lookup。
- `rootExternalTargetMode` 为 `ignore | report | validate`；只有显式 `validate` 才授权 bounded root-external target I/O。
- `requireNonEmptyDirectories` 启用时最多读取 direct directory 的一个 entry，不递归遍历。
- `limits` 限制单文档 bytes、全部 semantic occurrences 与 direct target reads；替换此 nested branch 时必须保留三个
  positive safe integer fields。

## 工作原理

Check 验证 options，收集 Markdown source paths，每份 source decode / parse 一次，再处理 supported inline、
reference 与 autolink occurrences。target file、directory 与 GitHub-priority heading anchor 按上面 policy 做 bounded
validation；每个 finding 产生一条 supplemental Record。direct target 可以参与当前 occurrence validation，source
discovery 始终由 `files` selection 决定。

## 效果与结果

`findingCount === 0` 时 outcome 为 `passed`；`findingCount > 0` 时 outcome 为 `failed`。final data 包含
`sourceFileCount`、`occurrenceCount`、`targetReadCount` 与 `findingCount`。

按 [README 的 Run / Check 结果规则](../../README.md#读取-run-和-check-结果)，先缩窄
`RunResult.kind`，再按 `markdown-link-validation` checkId 读取 outcome。

## `not-applicable` 与 `unavailable`

selected Markdown source 数量为零时结算为 `not-applicable` / `no-eligible-input`。Run preflight 按本页完整
shape 验证 replacement options；验证失败结算为 `unavailable` / `invalid-options`。通用语法见
[options preflight 与 execution](../api-mechanics.md#options-preflight-与-execution)。cancellation、source / target
read、project-root canonicalization、parse 或 work limit 无法形成可信完整结果时结算为 `unavailable`。

## I/O 与安全边界

resolver I/O scope 是本地 filesystem，HTTP、DNS、TLS 与 redirect request 数为零。默认 `report` mode 对 root-external
target 形成 finding，显式 `validate` mode 授权 bounded read。published facts 排除 raw external absolute path、target
bytes 与 remote credentials。

## 最小用法

```ts
import { defineConfig, markdownLinkValidation, run } from "vibe-check";
const result = await run(defineConfig({ checks: [markdownLinkValidation] }));
```

## 适用边界

该 Check 适用于本机 target 与 heading-anchor integrity；remote URL reachability 由 network-aware checker 评估。
