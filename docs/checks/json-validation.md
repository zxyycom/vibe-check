# `jsonValidation`

返回 [README 的随包 Check 概览](../../README.md#随包提供的-check)。

## 用途

本页说明 `jsonValidation` 的 options、terminal effects 与安全边界。该 Check 严格验证自己选择且以小写
`.json` 结尾的文档，并报告 syntax error、duplicate key 与 incomplete document。`jsonValidation(options?)` 补齐默认值并
返回可直接放入 Project Definition `checks` 的普通 Check。

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

上面的代码块是无参调用物化后的完整 resolved options；`exclude` 表示 constructor detached-copy 了 package root 公开
`defaultProjectFileSelection.exclude` 的全部条目，不是调用方必须复制的输入。authoring options 的 `files` 与
`maximumBytes` 都可以省略；`files.source`、`files.include` 与 `files.exclude` 也可分别省略。source 可选 `filesystem` 或
`git-worktree`，selected path 必须命中
`include` 且不能命中 `exclude`。只有其中 case-sensitive `path.endsWith(".json")` 的 paths 成为输入。
filesystem 不解释 `.gitignore`；git-worktree 使用已跟踪文件和未被 Git 标准忽略规则排除的未跟踪文件。两种来源都使用
本页 `files` branch 的 `include` / `exclude` glob；来源不可用时 Check 结算为 `unavailable`，不会切换到另一来源。
`maximumBytes` 是每个 raw JSON document 的 byte 上限，必须是正安全整数。显式 `include` / `exclude` 数组是完整替换值；
例如显式 `include: ["**/*"]` 会选择其它类型，Check 将为每个不受支持的 path 发布拒绝 Finding，而不会静默过滤。
constructor 返回后若通过普通对象组合替换 `check.options`，该 replacement 才必须提供完整 resolved shape。

### 定制 authoring options

下面只把输入限制到 `config/**`；constructor 保留默认 source、exclude 与 `maximumBytes`：

```ts
import { jsonValidation } from "@zxyycom/vibe-check";

const configJsonValidation = jsonValidation({
  files: { include: ["config/**/*.json"] }
});
```

## 工作原理

constructor 先关闭 authoring shape、补齐并冻结 resolved options。Run 的全局 preflight barrier 再验证该完整 options；
execution 收集 selected paths，按小写 `.json` suffix 完整分成 accepted/rejected。每个 rejected path 先产生 supplemental
Record，accepted path 才通过 strict-document boundary 读取和解析；无效文档产生另一种 supplemental Record。

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

## 最小用法

```ts
import { defineConfig, jsonValidation, run } from "@zxyycom/vibe-check";
const result = await run(defineConfig({ checks: [jsonValidation()] }));
```

## 适用边界

该 Check 适用于 JSON document integrity；需要按 schema 评估字段与结构时使用
[`jsonSchemaValidation`](json-schema-validation.md)。
