# `jsonValidation`

## 用途

严格验证该 Check 自己选择且以小写 `.json` 结尾的文档，适合尽早发现语法错误、duplicate key 与不完整 document。
它是普通 Check value，不依赖 Product-wide quality scope。

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
  maximumBytes: 1_048_576
}
```

`files` 完整定义本 Check 的 project-file selection；只有其中 case-sensitive `path.endsWith(".json")` 的 paths
成为输入。`maximumBytes` 是每个 raw JSON document 的 byte 上限，必须是正安全整数。替换 options 时两个字段都必须
保留。

## 工作原理

共享 preflight barrier 接受 canonical authored options 后，execution 收集自己的 selected paths，以 private
strict-document boundary 读取并
解析每个小写 `.json` 文件。无效文档产生 supplemental Record；Check 不复用 `jsonSchemaValidation` 的 execution 或
result，二者只是分别使用相同的 private strict JSON mechanism。

## 效果与结果

所有文档有效时为 `passed`；出现无效文档时为 `failed`。final data 包含
`scannedFileCount`、`validFileCount`、`invalidFileCount` 与 `issueCount`，Records 指向单个文档问题。

## `not-applicable` 与 `unavailable`

没有合格小写 `.json` 输入时为 `not-applicable` / `no-eligible-input`。非法 replacement options 的共享组合、Run
preflight 与 direct execution 边界见[组合与 options preflight](index.md#组合与-options-preflight)。合法 Check 遇到
file collection、读取、大小限制、取消或无法形成可信解析结果时才返回 `unavailable`。

## 外部工具与安全边界

不启动外部命令，也不访问网络；只读取该 Check `files` 选中的本地文件。

## 最小用法

```ts
import { defineConfig, jsonValidation, run } from "vibe-check";
const result = await run(defineConfig({ checks: [jsonValidation] }));
```

## 非目标

它不按 JSON Schema 校验业务字段，也不自动格式化或修复 JSON。
