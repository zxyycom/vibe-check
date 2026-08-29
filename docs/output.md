# 机器输出契约

本文定义 package consumer 读取 Vibe Check v4 machine publication 的方式。一次 publication 由同一目录中的
`run.json` 与 `records.ndjson` 共同组成；任何单文件都不能证明完整结果。精确字段由随包发布的
[run schema](schemas/vibe-check-run.schema.json) 与
[Record schema](schemas/vibe-check-record.schema.json) 定义。

## 读取与验证顺序

1. 同时读取同一 output directory 的两份原始 bytes；缺少任一文件或混用不同 Run 的文件时拒绝整组。
2. 按 framing 解析：`run.json` 是一个 UTF-8 JSON value；非空 `records.ndjson` 每行一个 JSON value 并以 LF
   结束，空 Record set 恰好是零字节文件。
3. 分别按 current v4 schema 验证 `run.json` 和每个 Record row。
4. 验证 Check 与 Record 的排序、`{ checkId, id }` 唯一性和 Record ownership，再重算
   `recordsFingerprint`。任一步失败都拒绝整组，不保留“已验证前缀”。
5. 只从 `passed` / `failed` Check row 读取 `outcome.data`。随包 Check 的 final-data parser 可以继续验证该
   Check 的业务 shape，但不能替代前四步。

Artifact reader 由 consumer 实现或选择；读取实现先用 schema 与完整集合不变量把原始 bytes 收窄为可信数据，再进入
Check-local parser。

## 字段与完整集合验证

| 文件 | 内容与 schema identity |
| --- | --- |
| `run.json` | invocation、完整 Record-set fingerprint 与按 `checkId` 排序的 terminal Check rows；`urn:vibe-check:schema:run:v4` |
| `records.ndjson` | 按 `{ checkId, id }` 排序的 supplemental Record rows；`urn:vibe-check:schema:record:v4` |

`run.json` 只发布 `schemaVersion`、`invocation`、`recordsFingerprint` 和 `checks`。每个 Check row 包含
`checkId`、`displayName` 和一种 terminal outcome：`passed` / `failed` 带 object-shaped final `data`；
`not-applicable` / `unavailable` 带受控 reason，前者可以省略 reason。Aggregation、所有 Run output status 与
diagnostic logging file、duration、terminal messages、visibility 和 progress presentation 不属于 machine fields。

每个 `records.ndjson` row 的结构是：

```json
{
  "schemaVersion": "vibe-check.record.v4",
  "checkId": "api-health",
  "id": "sample:health",
  "data": { "latencyMs": 820, "statusCode": 503 }
}
```

Record `id` 只在 owning Check 内唯一；Record presence、count 和 data 不决定 terminal status。final data 是主要事实，
Records 是补充事实；producing Check 拥有二者的业务字段与安全投影，generic publication 只保存已经通过 settlement 的
数据。随包 Check 的安全字段与排除边界见对应 [Check 指南](../README.md#随包提供的-check)。

`recordsFingerprint` 绑定完整、排序后的 Record row array。重算时把每个 object 的 properties 递归按名称词法排序，array
保持 index order，再对所得 UTF-8 canonical JSON text 计算 SHA-256；结果是
`check-record/v2/records/sha256:<lowercase-hex>`，空 array 也有稳定摘要。它不是 `records.ndjson` bytes 的 hash，JavaScript
own-key enumeration 与序列化时的 key 排列也不是 public contract。

## 发布与并发读取边界

Publisher 在修改 canonical paths 前先形成并完整验证两份文件。写入或首次 canonical rename 失败时保留 prior set；一次
canonical replacement 已发生后的 handled failure 会清理可能混合的 canonical files。pre-work configuration failure
不进行 output I/O。diagnostic logging 是独立的人读 Run output，不进入 v4 directory、schema、example 或 publication set；
machine consumer 不发现或解析它。其 configuration 与 `RunResult` readback 见
[深入 API 机制](api-mechanics.md#outputs-与-runresult-边界)。

两个 canonical files 是独立 filesystem paths，rename 不提供跨路径原子可见性。并发 reader 可能观察到 mixed
generation，因此必须按完整集合执行 fingerprint validation；需要 generation pointer、reader lock 或跨路径 atomic
visibility 的系统，应在 Vibe Check 契约之外建立自己的读取协议。

## 随包材料与版本

随包机器契约材料包含本文、开头链接的两份 current v4 schemas，以及一组以 TypeScript Definition 为输入的
`mixed-outcomes` example。该示例由以下三份文件组成：

| 文件 | 用途 |
| --- | --- |
| [`definition.ts`](examples/artifacts/mixed-outcomes/definition.ts) | 可直接交给 `run` 的 TypeScript Project Definition；混合一个 `jsonValidation` 内置 Check 与一条递归自定义 workflow。 |
| [`run.json`](examples/artifacts/mixed-outcomes/run.json) | 与该 Definition 的五个可执行 Check 对应，集中展示 package-provided/custom `passed`、`failed`、`not-applicable` 与 `unavailable` facts。 |
| [`records.ndjson`](examples/artifacts/mixed-outcomes/records.ndjson) | failed policy 发布的两条 supplemental Records，用于核对多行 framing、ownership、排序和 fingerprint。 |

这三份材料按以下关系阅读：

1. `jsonValidation({ files: { include: ["package.json"] } })` 使用随包 constructor，显式选择 `package.json` 并保留默认
   source / exclude policy；示例输入中的有效 manifest 使 `json-validation` 形成 `passed` final data。
2. `example-release-inputs` 的 preflight 在 authored files 为空时以 `failure / continue` 准备 fallback，再由
   `parseData` 声明 typed provider contract；对应 Check 形成 `passed`。
3. 递归 `example-release-workflow` 把 manifest dependency 传给 children；`example-release-policy` 用 `inherit` 追加 provider
   dependency，读取并解析两份 upstream final data，随后形成 `failed` final data 和两条 Records。组织节点自身不产生 Check row。
4. optional Check 直接形成 `not-applicable`；external review 的 `failure / block` preflight 在任何 execution 开始前形成
   `unavailable`。两条 preflight message 与 failed policy message 保留在 `RunResult.checkMessages`，不进入 machine fields。

仓库生成器通过完整 public `run` 执行同一份 Definition，并使用只含有效 `package.json` 的隔离 project root 得到以上
Check/Record facts；随后只把 invocation ID 与 timestamp 固定为文档值，使 checked-in bytes 可重复生成。示例 Definition
启用了 `artifacts/vibe-check` machine publication；直接运行会在本次 project root 下更新该目录中的两份 canonical files。
示例 facts 与固定 metadata 只用于核对 Definition/output 对应关系；consumer 在自己的 project root 调用
`run(definition)` 时，会按实际 `package.json` 形成结果和本次 Run 的 invocation metadata。

随包机器契约的当前版本是 v4，validation boundary 对其它 schema identity fail closed。本示例使用非空 Record set；零
Record 集合按读取规则表示为零字节 `records.ndjson`。
