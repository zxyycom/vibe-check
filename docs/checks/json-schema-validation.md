# `jsonSchemaValidation`

返回 [README 的随包 Check 概览](../../README.md#随包提供的-check)。

## 用途

本页说明 `jsonSchemaValidation` 的 options、terminal effects 与安全边界。该 Check 使用显式 schema registry 与
instance bindings 验证选定的 JSON instances。导出值可以直接放入 Project Definition 的 `checks`。

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
  maximumBytes: 1_048_576,
  schemaIdentity: { mode: "require-match" },
  referenceResolution: { mode: "offline" },
  schemas: [],
  bindings: []
}
```

- `files` 完整定义本 Check 可读取的 local paths；schema 与 instance 的读取 scope 是 selected set。
- `maximumBytes` 是每个 schema 或 instance document 的 raw byte 上限，必须是正安全整数。
- `schemas` 每项为 `{ id, path }`；`bindings` 每项为 `{ id, instancePath, schemaId }`。ID、path、uniqueness 与引用关系
  都由 owning Check 的 closed validator 检查。
- `schemaIdentity.mode` 为 `require-match`、`configuration-authoritative` 或 `document-authoritative`，决定 root `$id`
  与 engine identity 的关系。
- `referenceResolution` 默认 `{ mode: "offline" }`。`allowlisted` branch 可包含 package-fixed
  `{ kind: "bundled", catalog: "json-schema-2020-12" }` 或显式
  `{ kind: "https", id, origin, pathPrefix }` sources。

## 工作原理

Run 的全局 preflight barrier 接受完整 options 后，zero bindings 结算为 `not-applicable`；其它调用从 `files`
selection 建立可读 path set，加载 registered schemas，按 identity policy 编译，再验证每个 binding。selected set
之外的声明 path 形成 `out-of-scope` domain issue，读取 scope 保持为 selected set。schema document、compile 与
instance issues 形成 Records。

## 效果与结果

`issueCount === 0` 时 outcome 为 `passed`；`issueCount > 0` 时 outcome 为 `failed`。final data 包含 schema、
binding、valid、invalid、blocked 与 issue counts；Records 表示具体可报告问题。

按 [README 的 Run / Check 结果规则](../../README.md#读取-run-和-check-结果)，先缩窄
`RunResult.kind`，再按 `json-schema-validation` checkId 读取 outcome。

## `not-applicable` 与 `unavailable`

binding 数量为零时结算为 `not-applicable` / `no-bindings`。Run preflight 按本页完整 shape 验证 replacement
options；验证失败结算为 `unavailable` / `invalid-options`。通用语法见
[options preflight 与 execution](../api-mechanics.md#options-preflight-与-execution)。file collection、读取、
document limit、reference authorization、engine / compile 或 cancellation 无法形成可信完整结果时结算为
`unavailable`。

## I/O 与安全边界

默认 `offline` mode 的 network request 数为零。`allowlisted` HTTPS source 以精确 origin 与 path prefix 定义
remote scope；request 不携带 credentials 或 custom headers，也不跟随 redirect。remote reference authorization
保持 local file selection 不变。

## 最小用法

```ts
import { defineConfig, jsonSchemaValidation, run } from "vibe-check";

const configured = {
  ...jsonSchemaValidation,
  options: {
    ...jsonSchemaValidation.options,
    schemas: [{ id: "urn:example:config", path: "schema/config.json" }],
    bindings: [
      { id: "config", instancePath: "config.json", schemaId: "urn:example:config" }
    ]
  }
};
const result = await run(defineConfig({ checks: [configured] }));
```

## 适用边界

该 Check 适用于显式 schema registry 与 bindings。JSON Schema `format` 使用 2020-12 annotation 语义；JSON
document integrity 可以先由 [`jsonValidation`](json-validation.md) 独立检查。
