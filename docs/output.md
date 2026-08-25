# 输出边界

本文是 Vibe Check public machine publication contract 的唯一 owner。实现位于
`src/output/machine-v4/**`：`projection.ts` 只从 trusted Core snapshot 与 invocation metadata 创建 v4 model，
`serializers.ts` 生成候选 bytes，`validation.ts` 验证完整 set，`publish.ts` 只发布已验证候选，
`atomic-publication.ts` 拥有 filesystem lifecycle。`src/run/publication.ts` 仅在 Run effect 中调用该 owner；
Package Run、Core、progress 与 repository process adapters 不复制 machine DTO 规则。

## 当前产品输出

| 输出             | 合约                                                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `run.json`       | 单一 UTF-8 JSON value，schema `urn:vibe-check:schema:run:v4`                                                                 |
| `records.ndjson` | canonical ordered supplemental Record rows；非空时每行一个 JSON value 且以 LF 结束，schema `urn:vibe-check:schema:record:v4` |

`run.json` 只发布 `schemaVersion`、`invocation`、`recordsFingerprint` 和 `checks`。每个 Check row 有 `checkId`、`displayName` 与一个 terminal `outcome`：`passed` / `failed` 带 canonical final `data`；`not-applicable` / `unavailable` 带其受控 reason（前者可省略）。Aggregation、effect status、execution timing、terminal messages、visibility 和人读内容不是 machine publication fields。

Output effect 只创建这两个 canonical paths 及其短暂的 owned temp files；artifact directory 不包含
scanner-private material。

`records.ndjson` 的每行是：

```json
{
  "schemaVersion": "vibe-check.record.v4",
  "checkId": "api-health",
  "id": "sample:health",
  "data": { "latencyMs": 820, "statusCode": 503 }
}
```

`id` 只在 owning Check 内唯一；不同 Checks 可以使用同一 `id`。Record presence、count 或 `data` 不决定 Check terminal status。final `data` 是该 Check 的主事实；Records 是补充事实。完整 field/nullability/enums 只见 [run schema](schemas/vibe-check-run.schema.json) 与 [record schema](schemas/vibe-check-record.schema.json)。

For `markdown-link-validation`, the generic Record envelope carries only its safe local-reference projection:
source-relative navigation/range, occurrence kind, safe reason, and, only for an inside-root target, a
relative target path and decoded fragment. The inside-root descriptor is `same-document`, `project-file`,
`project-directory`, or `project-path`; the last means only a safe path was established, not an endpoint type.
Its final data carries only source, occurrence, target-read, and
finding counts. Raw destinations and query/userinfo, external absolute paths, symlink payloads, target bytes,
and target digests are excluded from Record IDs, Record data, final data, messages, cache, logs, and published
artifacts. An outside-root finding publishes neither a target path nor fragment. This exclusion is part of
the Check's data contract; the machine format does not reconstruct or retain a hidden target representation.

这里的 canonical JSON 是 Product 的**安全结构契约**，不是业务 schema，也不是 JSON bytes 的排版契约。final/Record `data` 的根必须是 non-array plain object；递归只接受 `null`、boolean、string、finite number、dense array 与 plain object。Product 通过 own-property descriptors materialize，不读取 accessor 或调用 `toJSON`；拒绝 accessor、symbol/non-enumerable key、unsupported prototype、cycle、sparse array 与非有限 number，并将 `-0` 规范为 `0`。materialized data 使用 null-prototype container 和 recursive freeze 成为 detached Core fact；需要 canonical text 时才递归按 lexical key order 生成它，而不把 JavaScript own-key enumeration 声明为该顺序。它不验证 required property、业务 union、跨 Check consistency 或敏感值。

## Core-to-machine projection

`src/core/**` 先验证并冻结 `{ checks, records }`。`src/output/machine-v4/**` 将这个 trusted Core snapshot 与
已验证 invocation metadata 组成 trusted input，再创建 v4 projection、序列化 two-file candidate，并在 canonical
path 变更前完整验证该 candidate；不会重算 Check status，不解释 Check-local data，也不会从 Record 内容猜测 owner、
count、ID、presentation 或 aggregate。这里的 trusted 描述 projection 的输入事实，不表示两个 filesystem paths
具有跨路径原子可见性。

Validators 检查 schema identity、canonical JSON、Check order、`{ checkId, id }` composite uniqueness/order、Record ownership 和 complete Record-set fingerprint。Check rows 按 `checkId` 排序；Record rows 按 `{ checkId, id }` 结构 pair 排序，不能把 pair 拼接成 delimiter string。`recordsFingerprint` 绑定这些完整排序 Record rows：它 hash 的输入是 row array 的 UTF-8 **recursive lexical canonical text**，即每个 object 在每一层以 lexical property-name order 写入、array 保持 index order；空集也有稳定摘要。它不是 `records.ndjson` bytes 的 hash。

JavaScript object own-key enumeration，以及 `run.json`/`records.ndjson` 通过 `JSON.stringify` 产生的 lexical key order，都不是 public contract；validator 只以 schema、结构排序和 complete-set fingerprint 判断可信性。完整 two-file validation 是唯一 artifact trust boundary：失败绝不返回 partial validated prefix。

Product 没有 package-owned artifact-reader 或 consumer surface。v4 publisher 在写入前完整验证自己序列化的
candidate；这是 producing-path safety check，不是向下游暴露的读取 API。该验证是 candidate bytes 的一次完整
validation pass；Core fact 的 canonicalization 与 Output candidate validation 是不同边界，不应把后者描述为
“没有第二次 traversal”。独立的 docs validator 才读取 checked-in artifact bytes：它使用 checked-in schema，
递归检查 canonical JSON（包括拒绝 non-finite number），再计算和比较完整 Record-set fingerprint；任一步失败都
fail closed，且它不 import Product validator。

## Publication lifecycle and trust boundary

candidate stages 是 validate publication model、serialize machine candidates、validate complete machine set；它们都在 canonical path 变更前完成。artifact stages 先清理 stale owned temps，并写齐同目录 temps；只有全部 candidate writes 成功后，才依次以单文件 rename 替换 `run.json` 与 `records.ndjson`、清理 retired artifacts，并由 producing process 宣布 trusted paths。

candidate write 或首次 rename 的 handled failure 保留 prior canonical set；一次 canonical replacement 已成功后的 handled failure 清理可能混合的 canonical files、retired human artifacts 与 owned temps，并返回 typed effect failure。pre-work configuration failure 不进行 output I/O。该 lifecycle 只处理 two-file set、retired artifacts 与 owned temps。

固定的 `run.json` 与 `records.ndjson` 是两个 independent filesystem paths；常规 rename 不提供跨 path reader-visible transaction。保证来自 candidate validation、complete-set fingerprint binding 和 handled-failure cleanup，不是 OS-level atomic snapshot。mixed-generation files fail closed；consumer 必须把两份 bytes 作为一组验证。需要 generation pointer、reader lock 或跨 paths atomic visibility 时，必须另行定义 public reader protocol。

## Progress and presentation boundaries

Product progress 向人显示 Check lifecycle status、duration、受控 reason code 和已接受的 terminal messages；它使用 producing Run 的 lifecycle facts，不从 machine artifacts 反向恢复状态。每个 visible settled block 先输出 row，再按 author order 输出缩进 message lines；message `code` 只留在 `RunResult.checkMessages`，不重复到终端。`attention` 只省略 passed 且无 messages 的 settled row，TTY running rows 始终可见，所有 settled outcomes 仍计入 canonical ordinal 和最终计数。

Plain/dumb terminal 使用 literal `[info]`、`[warning]`、`[error]`；color-capable TTY 只分别给这三个 level label 加 cyan、yellow、red，不给 message body 或 status 上色。display name、reason code 与 message 都转义 newline、carriage return、tab、terminal controls、ESC、U+2028 和 U+2029，防止它们控制终端；`RunResult.checkMessages` 保留已验证的原 message string。

v4 machine publication carries structured final/Record data only; it defines no human-readable projection of arbitrary data. Product progress remains the current human-facing lifecycle surface.

The typed-provider parser is defined by [Configuration](configuration.md#typed-dependency-data), not by this machine contract. A consumer may apply its provider-owned parser to the same final-data object projected by `RunResult` or by a compatible v4 Check row; this is consumer-owned business parsing, not a machine-reader protocol. It adds no v4 field, schema change, parser serialization, or public unchecked-cast helper. Consumers must choose their own artifact validation and version-compatibility boundary before using machine bytes.

## Published materials and historical schemas

当前 schemas 位于 `docs/schemas/`，examples 位于 `docs/examples/artifacts/**`；每个 example directory 有 `run.json`、`records.ndjson` 和 README。`scripts/docs/machine-artifacts/**` 维护 published material，
`scripts/validation/schema/**` 的独立 validator 从 raw example bytes 解析并完整验证 set，随后检查 schema/example
generation drift；`src/output/machine-v4/**` tests 则确认 runtime schema source 与 serializer 一致。两条验证路径互不把对方的 validator 当作 acceptance authority。

v2 schema bytes 只保留在 `docs/schemas/historical/v2/` 供明确 historical validation/reference 使用。v3 没有 current 或 historical runtime/publication path；其输入只会被 v4 validator 拒绝。历史材料不是 current schema entry、runtime reader/writer、example input 或 fallback；current output 只接受 v4。
