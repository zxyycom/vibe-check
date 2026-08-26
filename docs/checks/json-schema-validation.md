# `jsonSchemaValidation`

## 用途

按显式注册的 schema 与 instance binding 验证该 Check 自己选择的 JSON instances，而不是自动发现 schema。它是普通
Check value，拥有自己的 registry、identity、reference、validation 与 result model。

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

- `files` 完整定义本 Check 可读取的 local paths；声明的 schema/instance path 不在 selected set 时不会被读取。
- `maximumBytes` 是每个 schema 或 instance document 的 raw byte 上限，必须是正安全整数。
- `schemas` 每项为 `{ id, path }`；`bindings` 每项为 `{ id, instancePath, schemaId }`。ID、path、uniqueness 与引用关系
  都由 owning Check 的 closed validator 检查。
- `schemaIdentity.mode` 为 `require-match`、`configuration-authoritative` 或 `document-authoritative`，决定 root `$id`
  与 engine identity 的关系。
- `referenceResolution` 默认 `{ mode: "offline" }`。`allowlisted` branch 可包含 package-fixed
  `{ kind: "bundled", catalog: "json-schema-2020-12" }` 或显式
  `{ kind: "https", id, origin, pathPrefix }` sources。

## 工作原理

共享 preflight barrier 接受完整 options 后，zero bindings 直接为 `not-applicable`；否则 execution 从自己的 `files`
selection 建立可读 path set，
加载已注册 schemas，按 identity policy 编译，再验证每个 binding。声明 path 不在 selected set 时形成安全的
`out-of-scope` domain issue，不会扩大 file selection。schema document、compile 与 instance issues 形成 Records。

## 效果与结果

无 issue 时为 `passed`；存在 schema、compile 或 instance issue 时为 `failed`。final data 包含 schema、binding、valid、
invalid、blocked 与 issue counts；Records 表示具体可报告问题。

## `not-applicable` 与 `unavailable`

没有 binding 时为 `not-applicable` / `no-bindings`。非法 replacement options 的共享组合、Run preflight 与 direct
execution 边界见[组合与 options preflight](index.md#组合与-options-preflight)。合法 Check 遇到 file collection、读取
失败、document 超限、未获允许的 reference、engine/compile 无法安全完成或取消时才返回 `unavailable`。

## 外部工具与安全边界

默认不访问网络。`allowlisted` HTTPS source 必须精确声明 origin 与 path prefix；不使用 credentials、headers、redirect、
environment registry 或任意 resolver callback。允许 remote reference 不会扩大 local file selection。

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

## 非目标

它不扫描所有 JSON、不自动猜测 schema，也不把 JSON Schema `format` 当作 assertion。
