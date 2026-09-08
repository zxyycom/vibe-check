# `jsonValidation`

## 用途

`jsonValidation(options?)` 构造普通 Check，严格验证所选小写 `.json` 文档的完整性，报告 syntax error、duplicate key
与 incomplete document。

## 最小用法

示例保留终端进度，不写 machine files。

```ts
import { defineConfig, jsonValidation, run } from "@zxyycom/vibe-check";

const check = jsonValidation();
const result = await run(defineConfig({
  checks: [check],
  outputs: { machinePublication: { enabled: false } }
}));
const outcome = result.kind === "completed"
  ? result.snapshot.checks.find(({ checkId }) => checkId === check.checkId)?.outcome
  : undefined;
if (result.kind !== "completed" || outcome?.status !== "passed") {
  console.error(`JSON validation did not pass: ${result.kind} / ${outcome?.status ?? "no outcome"}`);
  process.exitCode = 1;
}
```

本例只接受 `completed` Run 中的 `passed` Check，否则退出非零。若需接受 `not-applicable` 或聚合多个 Check，
显式配置并读取 [`checkAggregation`](../api-mechanics.md#runcontrols-与-check-aggregation)；`run(...)` 返回本身不表示通过。

## 参数与默认配置

```ts
{
  files: {
    source: "filesystem",
    include: ["**/*.json"],
    exclude: defaultProjectFileSelection.exclude
  },
  maximumBytes: 1_048_576
}
```

无参调用物化上述完整 options，其中 `exclude` 是公开 `defaultProjectFileSelection.exclude` 的独立副本。
`files`、其子字段和 `maximumBytes` 都可省略；`maximumBytes` 必须是正安全整数。

文件来源、glob 与数组替换遵循[共享 files 选择语义](../guides/collecting-project-files.md#共享的-files-选择语义)。
本 Check 只读取 case-sensitive `path.endsWith(".json")` 的 selected paths；宽泛 include 选中的其它路径发布拒绝 Finding，
不静默过滤。constructor 后替换 `check.options` 时，必须提供完整 resolved shape。

### 定制 authoring options

下面只把输入限制到 `config/**`；constructor 保留默认 source、exclude 与 `maximumBytes`：

```ts
import { jsonValidation } from "@zxyycom/vibe-check";

const configJsonValidation = jsonValidation({
  files: { include: ["config/**/*.json"] }
});
```

## 工作原理

constructor 补齐并冻结 closed options，获 Scheduler admission 后先 preflight，再按本页 suffix 规则完整分类输入。
每个 rejected path 先发布 Record；accepted path 才读取、解析，无效文档另发 Record。

strict-document boundary 先按 byte length 应用 `maximumBytes`，再依次区分 BOM、fatal UTF-8、strict JSON grammar 与 decoded
duplicate key；每个文档只返回最先成立的封闭 reason。合法文档只向 owning Check 交付不含 prototype 的深冻结私有值，
不会保留 source、AST、key 或 parser detail；读取或边界执行失败结算为 unavailable，而不是伪装成 invalid document。

## 效果与结果

`invalidFileCount === 0` 时 outcome 为 `passed`；`invalidFileCount > 0` 时 outcome 为 `failed`。正常 final data 恰为：

```ts
{
  scannedFileCount: number,
  validFileCount: number,
  invalidFileCount: number,
  issueCount: number,
  rejectedInputCount: number
}
```

其中 `scannedFileCount = validFileCount + invalidFileCount`，
`issueCount = invalidFileCount + rejectedInputCount`。只有 `invalidFileCount > 0` 使 Check failed；仅有 rejected input 时
outcome 是带 warning 的 `passed`。每个 invalid file 最多形成一条 Record；Record ID 是 project-root-relative path，data
恰为：

```ts
{
  path: string,
  reason: "too-large" | "bom" | "invalid-utf8" | "invalid-json" | "duplicate-key"
}
```

`reason` 表示 strict-document boundary 观察到的第一项文档问题；Record 不包含 JSON 内容、key、pointer、parser message
或 stack。

每个 rejected selected path 产生一条 ID 为 `/input-rejected/<path>` 的 Record：

```ts
{
  blocking: false,
  kind: "input-rejected",
  path: string,
  reason: "unsupported-file-type"
}
```

`failed` outcome 携带 `invalid-json-documents` error message，并引导调用方按 path / reason 检查 Records。由本 Check 结算的
`unavailable` 使用对应 `reason.code` 提供可操作 error message；存在 rejected input 时另附一条汇总数量的
`input-rejected` warning，逐路径事实仍只在 Records 中。无 Finding 的 `passed` 与 `not-applicable` 不合成人为提示。

用返回 Check 的 `check.parseData(value)` 或 package root 的 `parseJsonValidationData(value)` 验证 final data。两者返回
`JsonValidationFinalData`；Record 与原因可分别用 `JsonValidationRecordData`、`JsonValidationRecordReason` 和
`JsonValidationUnavailableCode` 标注，authoring / resolved options types 是 `JsonValidationOptions` 与
`ResolvedJsonValidationOptions`。parser 验证字段、非负安全整数以及计数等式，不匹配时抛出 `TypeError`。

## `not-applicable` 与 `unavailable`

selected path 数量为零时结算为 `not-applicable / no-eligible-input`。selected 非空但全部 rejected 时，以带 final data、
Records 与 warning 的 `passed` 结算。`unavailable.reason.code` 只使用以下值：

| `reason.code` | 触发边界 | 调用方检查项 |
| --- | --- | --- |
| `invalid-options` | constructor 返回后形成的 replacement options 不是完整 closed resolved shape | 重新调用 `jsonValidation(options)`，或恢复完整 `files` 与 `maximumBytes` |
| `scan-input-unavailable` | 所选 filesystem 或 git-worktree 无法形成候选集合 | 检查 project root、目录权限或 Git worktree 状态 |
| `document-unavailable` | 某个已选 JSON 文件无法完成受限读取 | 检查文件是否仍存在、是否可读，以及运行期间是否被替换 |
| `execution-cancelled` | invocation signal 在可观察工作边界取消本 Check | 检查调用方取消原因，不把结果解释为 clean validation |

后续文件导致 `unavailable` 时，分类阶段的 rejected-input Records 与先前已接受的 invalid-file Records 均保留，但本 Check
不提供 final data；对应 rejection warning 也随 terminal error message 一起保留。通用 preflight 语法见
[options preflight 与 execution](../api-mechanics.md#options-preflight-与-execution)。

## I/O 与安全边界

I/O scope 是 `files` 选中且通过小写 `.json` eligibility 的本地文件；rejected path 只形成事实，不读取内容。external
command 和 network request 数均为零。

## 适用边界

该 Check 适用于 JSON document integrity；需要按 schema 评估字段与结构时使用
[`jsonSchemaValidation`](json-schema-validation.md)。
