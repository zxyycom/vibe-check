# Quality Metrics

本文是 Check、QualityRecord、DecisionPolicy 与人读质量状态的稳定 owner。它不拥有 machine 字段、
artifact bytes、CLI parsing、scope collection 或 scanner executable。

## 当前模型

一次 invocation 在 work 前冻结 public `CheckDefinition` catalog、每个 definition 的一个 private
binding、selection、applicability 与 policy resolution。`CheckManager` 形成每个 definition 的一个
`CheckRun`；`RecordManager` 以 bound provenance 验证并立即提交 `QualityRecord`。最终
`FinalCoreSnapshot` 包含 canonical definitions、runs、records、integrity 和 snapshot completeness。

snapshot completeness 只汇总 frozen work handles、acknowledgements 和 terminal runs：它是 Core 的
事实，不是全局质量结论。invalid record、record conflict、ack protocol 与 execution failure 以 owning
run/integrity evidence 表达；已可信提交的 records 保留。

## Built-in Checks 与 exact inputs

当前 built-ins 是 `file-metrics`、`function-metrics` 和 `duplicate-detection`。每个只消费 Product
批准的 current 或 named-reference exact inputs；adapter-private scanner data 不进入 Check catalog 或
record contract。source-scope acceptance 拒绝任一越界 batch，避免 partial record conversion。

quick 执行 current fast path，跳过 baseline comparison 与 duplicate detection；full 可在显式
`--baseline <revision>` 下建立 named reference。reference evidence 独立于 current run，不能伪造
第二个 public run 或改写 current facts。

## DecisionPolicy

`DecisionPolicy` 是 closed declarative model：acceptance、named views、ordered readiness 与一个
`blockWhen` 都在 policy data 中。evaluator 只消费 final snapshot、reference facts 和 policy，产生
auditable `DecisionEvidence` 与 `GateResult`。

`all`、`changed`、`regressions` 只是 current CLI/config 的单向 adapter spellings，分别选择 ordinary
named policy；Core 不根据这些拼写分支。`changed` 与 `regressions` 要求 full profile 和 explicit
baseline。policy 的 readiness 明确表示 incomplete scan、no eligible input 或 unavailable comparison，
不会由 Core 的全局 reducer 推断。

`acceptedWarnings[]` 是现行 semantic config 中保留 legacy 命名的 input：每个 `checkId` 必须映射为 owning Check 与同名
`recordTypeId` 的 typed selector，其他 filters 只可使用该 record type catalog 声明的 operands 或
relations。acceptance 只影响 policy evidence，不删除 record。

## Human status

Output 从 final snapshot 与 decision evidence 纯投影两个状态：`Quality check status` 与
`Quality verification status`。snapshot incomplete 为 `failed`；没有 applicable selected run 或有
completed quality-failed verdict 时为 `warning`；其余为 `passed`。verification 只额外检查
`all-current` view 中未被 acceptance 覆盖的 records。`--verification-output` 只选择人读显示，
不改变 snapshot、publication、GateResult 或 process outcome。Output 在 publication model 构造阶段
核对并冻结该投影及显示选择，后续 report、console 与 outcome 不接受第二份 status 事实。

## 验证

当前测试覆盖 catalog/binding freeze、run/result legality、coverage、record identity/conflict/retention、
built-in exact inputs、reference evidence、policy validation/evaluation、acceptance、readiness 与 human
status projection。machine bytes 和 publication 由 [Output](output.md) 证明。
