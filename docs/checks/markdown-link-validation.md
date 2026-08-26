# `markdownLinkValidation`

## 用途

离线验证该 Check 自己选择的 Markdown sources 中，本机链接、图片目标与标题锚点的完整性。它是普通 Check value，
source discovery 与 direct-target resolver 都由 `markdown-link-validation` 自己拥有。

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

- `files` 完整定义 Markdown source selection；其中只有 `.md` / `.markdown` 成为 source。direct target 不会反向成为
  source input。
- `requireExistingTargets` 控制缺失 direct local target 是否是 finding。
- `validateSameDocumentAnchors` / `validateCrossDocumentAnchors` 分别控制当前文档与直接 Markdown target 的 heading
  lookup。
- `rootExternalTargetMode` 为 `ignore | report | validate`；只有显式 `validate` 才授权 bounded root-external target I/O。
- `requireNonEmptyDirectories` 启用时最多读取 direct directory 的一个 entry，不递归遍历。
- `limits` 限制单文档 bytes、全部 semantic occurrences 与 direct target reads；替换此 nested branch 时必须保留三个
  positive safe integer fields。

## 工作原理

Check 验证 options，收集自己的 Markdown source paths，每份 source 只 decode/parse 一次，再让 Check-local resolver 处理
supported inline/reference/autolink occurrences。target file、directory 与 GitHub-priority heading anchor 按上面 policy 做
bounded validation；每个 finding 产生一条 supplemental Record。source selection 外的 direct target 可以被验证，但不参与
source discovery，也不会递归产生新的 links。

## 效果与结果

无 finding 时为 `passed`；有 finding 时为 `failed`。final data 包含
`sourceFileCount`、`occurrenceCount`、`targetReadCount` 与 `findingCount`。

## `not-applicable` 与 `unavailable`

没有 selected Markdown source 时为 `not-applicable` / `no-eligible-input`。非法 replacement options 的共享组合、Run
preflight 与 direct execution 边界见[组合与 options preflight](index.md#组合与-options-preflight)。合法 Check 遇到
取消、source/target 不可读取、project root 无法 canonicalize、parse failure 或 work limit exceeded 时才返回
`unavailable`。

## 外部工具与安全边界

不请求 HTTP、DNS、TLS 或 redirect。默认 `report` 不读取 root 外 target；raw external absolute path、target bytes 和
remote credentials 不进入 Core、Records、output、cache 或 log。

## 最小用法

```ts
import { defineConfig, markdownLinkValidation, run } from "vibe-check";
const result = await run(defineConfig({ checks: [markdownLinkValidation] }));
```

## 非目标

它不是 Markdown 风格、拼写或通用语法 lint，也不验证远程 URL 可达性。
