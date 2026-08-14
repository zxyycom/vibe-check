# Quality Metrics

本文是 Check、QualityRecord、DecisionPolicy 与人读质量状态的稳定 owner。它不拥有 machine 字段、
artifact bytes、CLI parsing、scope collection 或 scanner executable。

## 当前模型

一次 invocation 在 work 前冻结 public `CheckDefinition` catalog、每个 definition 的一个 private
binding、selection、applicability、closed `requiresChecks` schedule、static TaskPlan 与 policy resolution。
Product 使用 `src/product/task-orchestration/**` 的唯一 generic runner；它继续只调度 opaque private Task
value。Check adapter 是闭合 Product 层：direct binding 是直接形成 terminal result 的一个 Task，TaskPlan
leaf 归一化为 ordinary Task，而每个 TaskPlan 的 Check-level `complete(outcomes)` 只在全部 leaf 可用后
恰好调用一次。Task、group、Task dependency、mutex 和 Task outcome 不进入产品输出。

`requiresChecks` 依赖 foundation 已 settlement 的 private availability，而不是 runner 的 resolved value
或临时 Check 状态。合法完成的 `passed`、quality `failed` 和 pre-work `not-applicable` 都满足 prerequisite；
execution throw/rejection、invalid result、record failure 或 ack protocol failure 使 owning Check unavailable，
dependent 的 user function 不调用。unrelated Check 仍可由 shared runner 正常执行。

`CheckManager` 形成每个 definition 的一个 `CheckRun`；`RecordManager` 以 bound provenance 验证并立即
提交 `QualityRecord`。最终 `FinalCoreSnapshot` 包含 canonical definitions、runs、records、integrity 和
snapshot completeness。

snapshot completeness 只汇总 frozen work handles、acknowledgements 和 terminal runs：它是 Core 的
事实，不是全局质量结论。invalid record、record conflict、ack protocol 与 execution failure 以 owning
run/integrity evidence 表达；已可信提交的 records 保留。

每个 applicable Check 只 settlement 一次。leaf wrapper 在其 function return 或 throw 时关闭该 leaf 的
function-scoped record sink；settlement 则在返回 availability 前原子关闭仍可能被保留的 Check-level execution
ports，并冻结 result、adapter acknowledgement、record conflict 与 invalid-record facts。late 调用返回
rejected，不能追溯改变 availability、最终 CheckRun 或 snapshot integrity。settlement 只产生 private
availability。所有 Check settled 后，RecordManager 一次性生成 canonical integrity/evidence IDs，
CheckManager 一次性形成 final CheckRuns；因此不同 Task completion 或 record arrival order 不改变 final
snapshot。duplicate、unknown 或 missing settlement 是 trusted foundation invariant failure，不发布 trusted
snapshot。

稳定边界分为三层：

| 层 | Owner 与内容 | 是否输出 |
| --- | --- | --- |
| Record | `QualityRecord` 的类型、subject、message、fields、location 与既有 provenance identities | `records.ndjson` |
| Run / snapshot | `CheckRun`、aggregate coverage、integrity、completeness | `run.json` |
| Invocation-private execution | work handles、adapter acknowledgement、function-scoped sink、Check-level execution/settlement capability、Task/group identity、dependency/mutex state 与 opaque outcome | 否 |

## Built-in Checks 与 exact inputs

当前 built-ins 是 `file-metrics`、`function-metrics` 和 `duplicate-detection`。每个只消费 Product
批准的 current 或 named-reference exact inputs；adapter-private scanner data 不进入 Check catalog 或
record contract。source-scope acceptance 拒绝任一越界 batch，避免 partial record conversion。

Project Definition 在 Check tree 中直接放入 built-in 或 custom leaf 来选择它们；Package Run 不从
quick/full profile、tree array order 或 Run Controls 隐式改写 selection。tree group 只在 authoring 时存在，
归一化后不成为 Check/Record identity。需要比较的 named policy 通过与其唯一 reference name 匹配的 Run
Control comparison 建立 reference input。reference evidence 独立于 current run，不能伪造第二个 public
run 或改写 current facts。

## DecisionPolicy

`DecisionPolicy` 是 closed declarative model：acceptance、named views、ordered readiness 与一个
`blockWhen` 都在 policy data 中。evaluator 只消费 final snapshot、reference facts 和 policy，产生
auditable `DecisionEvidence` 与 `GateResult`。

Project Definition 直接声明 named policies 并用 `selectedPolicy` 选择一个；Package Run 不保留
`all`、`changed` 或 `regressions` 等 adapter spellings。引用型 policy 只能使用与 closed comparison
control 匹配的一个 reference name。policy readiness 明确表示 incomplete scan、no eligible input 或
unavailable comparison，不会由 Core 的全局 reducer 推断。

Acceptance 只来自 `DecisionPolicy.acceptance`。每条规则绑定 owning Check、record type 及其 catalog
声明的 operands/relations；它只影响 policy evidence，不删除 record，也不在 quality config 中建立第二份
accepted-warning input。

## Human status

Output 从 final snapshot 与 decision evidence 纯投影 `Quality check status` 和 verification status。
snapshot incomplete 为 `failed`；没有 applicable selected run 或有 completed quality-failed verdict 时为
`warning`；其余为 `passed`。verification 只额外检查 policy 提供的 `all-current` view 中未被 acceptance
覆盖的 records。Package Run 的当前 publication 选择普通 quality status；没有 CLI flag 可以改写该选择。
Output 在 publication model 构造阶段核对并冻结全部 projection，后续 report、console 与 structured
result 不接受第二份 status 事实。

## 验证

当前测试覆盖 catalog/binding/schedule/TaskPlan freeze、runner-preserved scheduling contract、run/result
legality、settled availability、coverage、record identity/conflict/retention、built-in exact inputs、reference
evidence、policy validation/evaluation、acceptance、readiness 与 human status projection。machine bytes 和
publication 由 [Output](output.md) 证明。
