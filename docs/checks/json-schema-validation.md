# `jsonSchemaValidation`

返回 [README 的随包 Check 概览](../../README.md#随包提供的-check)。

## 用途

本页说明 `jsonSchemaValidation` 的 options、terminal effects 与安全边界。该 Check 使用显式 schema registry 与
instance bindings 验证选定的 JSON instances。`jsonSchemaValidation(options?)` 补齐默认值并返回可直接放入 Project
Definition `checks` 的普通 Check。

## 参数与默认配置

```ts
{
  files: defaultProjectFileSelection,
  maximumBytes: 1_048_576,
  schemaIdentity: { mode: "require-match" },
  referenceResolution: { mode: "offline" },
  schemas: [],
  bindings: []
}
```

上面的代码块是无参调用物化后的完整 resolved options；`defaultProjectFileSelection` 是 package root 公开的同值深冻结
基线；完整默认 glob 可直接从该 public value 读取。六个顶层 authoring fields 都可省略；`files` 内的三个字段也可分别省略。显式 `schemas`、`bindings` 与
`referenceResolution.sources` 数组是完整替换值。`schemaIdentity` 与
`referenceResolution` 的显式 discriminated branch 必须自身完整。无参调用不会发现 schema；由于 `bindings: []`，它结算为
`not-applicable / no-bindings`。constructor 返回后若通过普通对象组合替换 `check.options`，replacement 才必须保留完整
resolved shape。

- `files` 完整定义本 Check 可读取的 local paths；source 可选 `filesystem` 或 `git-worktree`，selected path 必须命中
  `include` 且不能命中 `exclude`。filesystem 不解释 `.gitignore`；git-worktree 使用已跟踪文件和未被 Git 标准忽略
  规则排除的未跟踪文件。schema 与 instance 的读取 scope 是 selected set；来源不可用时 Check 结算为
  `unavailable`，不会切换到另一来源。
- `maximumBytes` 是每个 schema 或 instance document 的 raw byte 上限，必须是正安全整数。
- `schemas` 每项为 `{ id, path }`；schema `id` 是 1–256 字符且没有 credentials、query 或 fragment 的绝对
  `https:` / `urn:` identity，`path` 是 1–512 字符的 normalized project-relative 小写 `.json` path。schema ID 与 path
  分别唯一。
- `bindings` 每项为 `{ id, instancePath, schemaId }`；binding `id` 匹配 `[A-Za-z0-9][A-Za-z0-9_.-]{0,127}`，
  `instancePath` 使用同一小写 `.json` path 规则，`schemaId` 必须引用已声明 schema。binding ID 与
  `(instancePath, schemaId)` 分别唯一。
- `schemaIdentity.mode` 为 `require-match`、`configuration-authoritative` 或 `document-authoritative`，决定 root `$id`
  与 engine identity 的关系。
- `referenceResolution` 默认 `{ mode: "offline" }`。`allowlisted` branch 可包含 package-fixed
  `{ kind: "bundled", catalog: "json-schema-2020-12" }` 或显式
  `{ kind: "https", id, origin, pathPrefix }` sources。

### `schemaIdentity` 根身份规则

`schemaIdentity` 是整个 Check 共用的 policy，不按 schema 分别选择：

| `mode` | root `$id` 与 engine identity |
| --- | --- |
| `require-match`（默认） | root `$id` 必须等于 `schemas[].id`，该 configured ID 同时作为 engine identity。 |
| `configuration-authoritative` | configured ID 是 engine identity；object schema 的 invocation-local compile copy 把 root `$id` 设为该 ID，已读取文档与发布 facts 不被改写；boolean schema 直接使用 configured identity。 |
| `document-authoritative` | root `$id` 必须是安全 identity，并成为 engine identity；configured ID 继续作为 binding 与 Record 使用的 public label。 |

### `referenceResolution` 引用解析规则

默认 `offline` 仍允许 package-fixed JSON Schema 2020-12 catalog，但不发起网络请求。只有以下显式 branch 才允许读取
额外 HTTPS schema：

```ts
{
  mode: "allowlisted",
  sources: [
    { kind: "bundled", catalog: "json-schema-2020-12" },
    {
      kind: "https",
      id: "urn:example:schema-source",
      origin: "https://schemas.example.test",
      pathPrefix: "/catalog/"
    }
  ]
}
```

`sources` 必须非空，最多包含一个 bundled catalog；HTTPS source 的 `id` 与 `(origin, pathPrefix)` 分别唯一。HTTPS source
`id` 使用与 schema ID 相同的 1–256 字符安全 identity；`origin` 是最长 200 字符且不含 path、credentials、query 或
fragment 的精确 HTTPS origin；`pathPrefix` 最长 256 字符，从 `/` 开始，非 root prefix 以 `/` 结束，并排除 `\\`、`//`、
`.` / `..` path segments、query 与 fragment。它不接受 headers、redirect、environment registry 或 callback loader。

## 工作原理

constructor 先关闭 authoring shape、补齐并冻结 resolved options。该 Check 获 Scheduler admission 后，其 task-local preflight 验证完整 options；zero
bindings 结算为 `not-applicable`；其它调用从 `files`
selection 建立可读 path set，加载 registered schemas，按 identity policy 编译，再验证每个 binding。selected set
之外的声明 path 形成 `out-of-scope` domain issue，读取 scope 保持为 selected set。schema document、compile 与
instance issues 形成 Records。

local schema 与 instance document 复用 [JSON Validation 工作原理](json-validation.md#工作原理)定义的 strict-document
boundary；本指南只增加 schema identity、reference resolution、binding 与 engine settlement，不建立另一套 JSON 解析规则。

## 效果与结果

`issueCount === 0` 时 outcome 为 `passed`；`issueCount > 0` 时 outcome 为 `failed`。正常 final data 恰为：

```ts
{
  schemaCount: number,
  bindingCount: number,
  validBindingCount: number,
  invalidBindingCount: number,
  blockedBindingCount: number,
  issueCount: number,
  reportedIssueCount: number,
  issuesTruncated: boolean
}
```

`validBindingCount + invalidBindingCount + blockedBindingCount = bindingCount`。Check 验证全部可处理 bindings，但只发布
前 100 条 issue Records；`issueCount` 保留真实总数，`reportedIssueCount` 是已发布数量，`issuesTruncated` 表示是否省略
后续 Records。

| Record `kind` | Record data 的领域字段 |
| --- | --- |
| `schema-document` | `schemaId`、`path`、document `reason` |
| `schema-compile` | `schemaId`、`path`、closed compile `reason` |
| `instance-document` | `bindingId`、`schemaId`、`path`、document `reason` |
| `keyword-violation` | `bindingId`、`schemaId`、`path`、sanitized `pointer` 与 known `keyword` / `"other"` |

document `reason` 是 `too-large | bom | invalid-utf8 | invalid-json | duplicate-key | out-of-scope`。compile issue、未授权或
不受支持的 reference 都是可信 domain issue；compile `reason` 使用以下 closed set：

```text
duplicate-engine-id
invalid-document-id
invalid-schema
missing-schema-id
schema-id-mismatch
unapproved-reference
unsupported-reference
remote-document-invalid
remote-schema-id-mismatch
```

这些 issue 会让正常 outcome 为 `failed`，不同于 engine 或 transport `unavailable`。Records 不包含 source/response
bytes、raw reference、credentials、engine message 或 stack。

`failed` outcome 携带 `schema-validation-issues` error message；当 Records 因 100 条上限被截断时，message 会直接说明。
由本 Check 结算的 `unavailable` 使用对应 `reason.code` 提供可操作 error message；`passed` 与 `not-applicable` 不合成人为
提示。

用返回 Check 的 `check.parseData(value)` 或 package root 的 `parseJsonSchemaValidationData(value)` 验证 final data。两者返回
`JsonSchemaValidationFinalData`；Records 与原因可用 `JsonSchemaValidationRecordData`、
`JsonSchemaValidationRecordReason`、`JsonSchemaDocumentReason` 和 `JsonSchemaValidationUnavailableCode` 标注，authoring /
resolved options types 是 `JsonSchemaValidationOptions` 与 `ResolvedJsonSchemaValidationOptions`。parser 验证字段、计数等式、
100 条 reported issue 上限与 truncation 不变量，不匹配时抛出 `TypeError`。

## `not-applicable` 与 `unavailable`

binding 数量为零时结算为 `not-applicable / no-bindings`。`unavailable.reason.code` 只使用以下值：

| `reason.code` | 触发边界 | 调用方检查项 |
| --- | --- | --- |
| `invalid-options` | constructor 返回后形成的 replacement options 不是完整 closed resolved shape | 重新调用 `jsonSchemaValidation(options)`，或检查所有 branches、ID、path、唯一性与 binding 引用 |
| `scan-input-unavailable` | configured file source 无法形成 selected set | 检查 project root、目录权限或 Git worktree 状态 |
| `document-unavailable` | 某个 selected local schema 或 instance 无法完成受限读取 | 检查文件是否仍存在、是否可读，以及运行期间是否被替换 |
| `reference-transport-unavailable` | 已授权 HTTPS reference 的 transport 无法完成 | 检查 allowlist、网络与远端可用性；不要把它解释为 schema violation |
| `engine-unavailable` | schema engine 或内部 settlement 无法形成可信完整结果 | 检查 package/runtime 状态，并保留已接受的 Records 供诊断 |
| `execution-cancelled` | invocation signal 在可观察工作边界取消本 Check | 检查调用方取消原因，不把结果解释为 clean validation |

任一 `unavailable` 分支都不提供 final data；此前已经接受的 issue Records 继续保留。

通用 preflight 语法见 [options preflight 与 execution](../api-mechanics.md#options-preflight-与-execution)。

## I/O 与安全边界

默认 `offline` mode 的 network request 数为零。`allowlisted` HTTPS source 以精确 origin 与 path prefix 定义
remote scope；每次 response 最多读取 1,048,576 bytes，单次请求 timeout 为 5 秒。request 不携带 credentials 或 custom
headers，也不跟随 redirect。remote reference authorization 保持 local file selection 不变。

## 最小用法

```ts
import { defineConfig, jsonSchemaValidation, run } from "@zxyycom/vibe-check";

const configured = {
  schemas: [{ id: "urn:example:config", path: "schema/config.json" }],
  bindings: [
    { id: "config", instancePath: "config.json", schemaId: "urn:example:config" }
  ]
};
const schemaCheck = jsonSchemaValidation(configured);
const result = await run(defineConfig({ checks: [schemaCheck] }));
```

## 适用边界

该 Check 适用于显式 schema registry 与 bindings。JSON Schema `format` 使用 2020-12 annotation 语义，不加载 format
assertion plugin；`$async`、`$dynamicRef` 与 `$recursiveRef` 在 schema 位置形成 compile issue。JSON instance 中同名的普通
property 不受该限制。需要独立检查 JSON document integrity 时，可以另外运行
[`jsonValidation`](json-validation.md)；它不是本 Check 的隐式 prerequisite。
