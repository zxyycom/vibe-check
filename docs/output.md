# 输出边界

本文是 Vibe Check public machine publication contract 的唯一 owner，面向读取 Package Run `run.json` 与
`records.ndjson` 的 consumer。两份文件共同构成一个 v4 publication set；任何一份都不能单独证明完整结果。本文随 package
发布，精确字段使用同目录的 [run schema](schemas/vibe-check-run.schema.json) 与
[Record schema](schemas/vibe-check-record.schema.json)。

## 读取 publication set 的顺序

1. 同时读取同一 output directory 的 `run.json` 与 `records.ndjson` bytes；不要接受缺失文件或混合不同 Run 的文件。
2. 按本页 framing 解析：`run.json` 是单一 UTF-8 JSON value；非空 `records.ndjson` 每行一个 JSON value，并以 LF 结束，空
   Record set 恰好是零字节文件。
3. 分别按 current v4 schemas 验证每个 value，再验证 Check / Record 排序、`{ checkId, id }` 唯一性与 ownership，并重算
   `recordsFingerprint` 以关闭完整 set。任一步失败都拒绝整组，不能保留“已验证前缀”。
4. 只在 `passed` / `failed` Check row 上读取 `outcome.data`。若目标是随包 Check，可再调用它从 package root 导出的
   final-data parser；该 parser 验证 Check-local shape，不替代前三步。

package 内的 `docs/examples/artifacts/` 提供 `complete-passed`、`complete-failed-with-record`、`legitimate-empty` 与
`unavailable` 四组完整字节示例。它们用于核对 framing 和字段关系，不是可复制后改写 identity 的配置模板。

## 当前产品输出

| 输出             | 合约                                                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `run.json`       | 单一 UTF-8 JSON value，schema `urn:vibe-check:schema:run:v4`                                                                 |
| `records.ndjson` | canonical ordered supplemental Record rows；非空时每行一个 JSON value 且以 LF 结束，schema `urn:vibe-check:schema:record:v4` |

`run.json` 只发布 `schemaVersion`、`invocation`、`recordsFingerprint` 和 `checks`。每个 Check row 有 `checkId`、`displayName` 与一个 terminal `outcome`：`passed` / `failed` 带 canonical final `data`；`not-applicable` / `unavailable` 带其受控 reason（前者可省略）。Aggregation、output status、execution timing、terminal messages、visibility 和人读内容不是 machine publication fields。

Machine-publication output 只创建这两个 canonical paths 及其短暂的 owned temp files；artifact directory 不包含
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

Machine projection 接受 Check facts 后，不会恢复、解释或脱敏其中的 business diagnostics。特别是
`json-schema-validation` 必须只提交其 owner 已批准的 safe ID、path、closed reason、pointer 与 keyword；raw
schema/instance/response material、native diagnostic、credential 和 external URI detail 都不得到达这个 generic
v4 boundary。

对 `markdown-link-validation`，generic Record envelope 只携带其 safe local-reference projection：source-relative
navigation/range、occurrence kind、safe reason，以及仅在 target 位于 root 内时携带 relative target path 和 decode 后
fragment。root 内 descriptor 是 `same-document`、`project-file`、`project-directory` 或 `project-path`；最后一种仅表示
已确定 safe path，尚未确定 endpoint type。其 final data 只携带 source、occurrence、target-read 和 finding count。
raw destination、query/userinfo、external absolute path、symlink payload、target byte 和 target digest 均不得进入
Record ID、Record data、final data、message、cache、log 或 published artifact。root 外 finding 不发布 target path 或
fragment。这一排除是 Check data contract 的一部分；machine format 不重建或保留隐藏的 target representation。

这里的 canonical JSON 是 Product 的**安全结构契约**，不是业务 schema，也不是 JSON bytes 的排版契约。final/Record `data` 的根必须是 non-array plain object；递归只接受 `null`、boolean、string、finite number、dense array 与 plain object。Product 通过 own-property descriptors materialize，不读取 accessor 或调用 `toJSON`；拒绝 accessor、symbol/non-enumerable key、unsupported prototype、cycle、sparse array 与非有限 number，并将 `-0` 规范为 `0`。materialized data 使用 null-prototype container 和 recursive freeze 成为 detached Check-facts fact；需要 canonical text 时才递归按 lexical key order 生成它，而不把 JavaScript own-key enumeration 声明为该顺序。它不验证 required property、业务 union、跨 Check consistency 或敏感值。

## 随包材料与版本边界

当前 schemas 位于 `docs/schemas/`，examples 位于 `docs/examples/artifacts/**`；每个 example directory 都包含
`run.json`、`records.ndjson` 和 README。本文、两个 current v4 schemas 与四组 current examples 都以原始 bytes 随
package 发布。consumer 应只把这些材料解释为本文所述的 current v4 contract。

repository-only v2 schema bytes 只供明确的历史验证或参考，不进入 package。v3 没有 current 或 historical
runtime/publication path；其输入只会被 v4 validator 拒绝。历史材料不是 current schema entry、runtime reader/writer、
example input 或 fallback；current output 只接受 v4。

## 仓库实现与维护说明

以下章节面向修改 publisher、progress renderer 或随包材料的仓库维护者。只读取 package output 的 consumer 不需要依赖这些
内部实现细节。

### Check facts 到 machine files 的投影

`src/check-settlement/**` 先验证并冻结 `{ checks, records }`。`src/machine-output/v4/**` 将这个 trusted Check-facts snapshot 与
已验证 invocation metadata 组成 trusted input，再创建 v4 projection、序列化 two-file candidate，并在 canonical
path 变更前完整验证该 candidate；不会重算 Check status，不解释 Check-local data，也不会从 Record 内容猜测 owner、
count、ID、presentation 或 aggregate。这里的 trusted 描述 projection 的输入事实，不表示两个 filesystem paths
具有跨路径原子可见性。

Validators 检查 schema identity、canonical JSON、Check order、`{ checkId, id }` composite uniqueness/order、Record ownership 和 complete Record-set fingerprint。Check rows 按 `checkId` 排序；Record rows 按 `{ checkId, id }` 结构 pair 排序，不能把 pair 拼接成 delimiter string。`recordsFingerprint` 绑定这些完整排序 Record rows：它 hash 的输入是 row array 的 UTF-8 **recursive lexical canonical text**，即每个 object 在每一层以 lexical property-name order 写入、array 保持 index order；空集也有稳定摘要。它不是 `records.ndjson` bytes 的 hash。

JavaScript object own-key enumeration，以及 `run.json`/`records.ndjson` 通过 `JSON.stringify` 产生的 lexical key order，都不是 public contract；validator 只以 schema、结构排序和 complete-set fingerprint 判断可信性。完整 two-file validation 是唯一 artifact trust boundary：失败绝不返回 partial validated prefix。

Product 没有 package-owned artifact-reader 或 consumer surface。v4 publisher 在写入前完整验证自己序列化的
candidate；这是 producing-path safety check，不是向下游暴露的读取 API。该验证是 candidate bytes 的一次完整
validation pass；Check-facts canonicalization 与 Output candidate validation 是不同边界，不应把后者描述为
“没有第二次 traversal”。独立的 docs validator 才读取 checked-in artifact bytes：它使用 checked-in schema，
递归检查 canonical JSON（包括拒绝 non-finite number），再计算和比较完整 Record-set fingerprint；任一步失败都
fail closed，且它不 import Product validator。

### 发布生命周期与可信边界

candidate stages 是 validate publication model、serialize machine candidates、validate complete machine set；它们都在 canonical path 变更前完成。artifact stages 先清理 stale owned temps，并写齐同目录 temps；只有全部 candidate writes 成功后，才依次以单文件 rename 替换 `run.json` 与 `records.ndjson`、清理 retired artifacts，并由 producing process 宣布 trusted paths。

candidate write 或首次 rename 的 handled failure 保留 prior canonical set；一次 canonical replacement 已成功后的 handled failure 清理可能混合的 canonical files、retired human artifacts 与 owned temps，并返回 typed publication failure。pre-work configuration failure 不进行 output I/O。该 lifecycle 只处理 two-file set、retired artifacts 与 owned temps。

固定的 `run.json` 与 `records.ndjson` 是两个 independent filesystem paths；常规 rename 不提供跨 path reader-visible transaction。保证来自 candidate validation、complete-set fingerprint binding 和 handled-failure cleanup，不是 OS-level atomic snapshot。mixed-generation files fail closed；consumer 必须把两份 bytes 作为一组验证。需要 generation pointer、reader lock 或跨 paths atomic visibility 时，必须另行定义 public reader protocol。

### 进度呈现边界

Product progress 向人显示 Check lifecycle status、duration、受控 reason code 和已接受的 terminal messages；它使用 producing Run 的 lifecycle facts，不从 machine artifacts 反向恢复状态。每个 visible settled block 先输出 row，再按 author order 输出缩进 message lines；message `code` 只留在 `RunResult.checkMessages`，不重复到终端。`attention` 只省略 passed 且无 messages 的 settled row，TTY running rows 始终可见，所有 settled outcomes 仍计入 canonical ordinal 和最终计数。

当至少一个 Check 仍在运行时，普通 TTY 每 5 秒重绘 running region，并在 `running` 后显示该 Check 的已运行时间；首次 running row 在第一个 heartbeat 前不伪造时长。heartbeat 只刷新 Product-private presentation state，不新增 Check lifecycle fact、公共 observer 或 machine field。plain output 与 `TERM=dumb` 仍保持 append-only，Check row 只在 settled 后出现，也不启动 heartbeat timer。

启用 TTY progress 时，renderer 在 Run 期间独占目标 terminal；同一进程内被 Check 调用的 operation 必须保持 stdout/stderr
静默，并通过 Check result、terminal message 或 project-owned transcript 返回事实。独立 CLI 可以使用自己的 reporter，
但不得把 library 内部的直接 console write 带入 in-process Check；否则未登记写入会破坏 running region 的 cursor state。

Plain/dumb terminal 使用 literal `[info]`、`[warning]`、`[error]`；color-capable TTY 只分别给这三个 level label 加 cyan、yellow、red，不给 message body 或 status 上色。display name、reason code 与 message 都转义 newline、carriage return、tab、terminal controls、ESC、U+2028 和 U+2029，防止它们控制终端；`RunResult.checkMessages` 保留已验证的原 message string。

v4 machine publication 只携带结构化 final / Record data，不定义任意 data 的人读投影；当前由 Product progress 承担人读
lifecycle 呈现。

typed-provider parser 由[深入 API 机制](api-mechanics.md#类型化依赖数据)定义，不属于 machine contract。consumer 可以在完整
artifact set 通过自己选择的 v4 validation boundary 后，把兼容 Check row 的 final-data object 交给 provider parser；这是
Check-owned business parsing，不是 machine-reader protocol。parser 不新增 v4 field、schema change、serialized parser 或
unchecked-cast helper，也不直接接收 JSON / NDJSON bytes。

### Package 材料的维护与验证

`scripts/docs/machine-artifacts/**` 维护 published material，
`scripts/validation/documentation/machine-artifacts/**` 的独立 validator 从 raw example bytes 解析并完整验证 set，随后检查 schema/example
generation drift；`src/machine-output/v4/**` tests 则确认 runtime schema source 与 serializer 一致。两条验证路径互不把对方的 validator 当作 acceptance authority。
