# `jsonValidation`

返回 [README 的随包 Check 概览](../../README.md#随包提供的-check)。

## 用途

本页说明 `jsonValidation` 的 options、terminal effects 与安全边界。该 Check 严格验证自己选择且以小写
`.json` 结尾的文档，并报告 syntax error、duplicate key 与 incomplete document。导出值可以直接放入 Project
Definition 的 `checks`。

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
  maximumBytes: 1_048_576
}
```

`files` 完整定义本 Check 的 project-file selection；source 可选 `filesystem` 或 `git-worktree`，selected path 必须命中
`include` 且不能命中 `exclude`。只有其中 case-sensitive `path.endsWith(".json")` 的 paths 成为输入。
filesystem 不解释 `.gitignore`；git-worktree 使用已跟踪文件和未被 Git 标准忽略规则排除的未跟踪文件。两种来源都使用
本页 `files` branch 的 `include` / `exclude` glob；来源不可用时 Check 结算为 `unavailable`，不会切换到另一来源。
`maximumBytes` 是每个 raw JSON document 的 byte 上限，必须是正安全整数。替换 options 时两个字段都必须保留。

## 工作原理

Run 的全局 preflight barrier 接受 canonical authored options 后，execution 收集 selected paths，通过 strict-document
boundary 读取并解析每个小写 `.json` 文件。无效文档产生 supplemental Record。

## 效果与结果

`invalidFileCount === 0` 时 outcome 为 `passed`；`invalidFileCount > 0` 时 outcome 为 `failed`。final data
包含 `scannedFileCount`、`validFileCount`、`invalidFileCount` 与 `issueCount`，Records 指向单个文档问题。

按 [README 的 Run / Check 结果规则](../../README.md#读取-run-和-check-结果)，先缩窄
`RunResult.kind`，再按 `json-validation` checkId 读取 outcome。

## `not-applicable` 与 `unavailable`

合格小写 `.json` 输入数量为零时结算为 `not-applicable` / `no-eligible-input`。Run preflight 按本页完整 shape
验证 replacement options；验证失败结算为 `unavailable` / `invalid-options`。通用语法见
[options preflight 与 execution](../api-mechanics.md#options-preflight-与-execution)。file collection、读取、
size limit、cancellation 或 parsing 无法形成可信完整结果时结算为 `unavailable`。

## I/O 与安全边界

I/O scope 是 `files` 选中的本地文件；external command 和 network request 数均为零。

## 最小用法

```ts
import { defineConfig, jsonValidation, run } from "vibe-check";
const result = await run(defineConfig({ checks: [jsonValidation] }));
```

## 适用边界

该 Check 适用于 JSON document integrity；需要按 schema 评估字段与结构时使用
[`jsonSchemaValidation`](json-schema-validation.md)。
