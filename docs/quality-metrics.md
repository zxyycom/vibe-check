# Quality Metrics

本文是 Check、QualityRecord、DecisionPolicy 与人读质量状态的稳定 owner。它不拥有 machine 字段、artifact
bytes、CLI parsing、scope collection 或 scanner executable。

## 当前模型

Package Run 向本 owner 提供一次 invocation 唯一的 canonical Resolved Check collection。它的两阶段形成、
declarative/private 分离与 collection ordering 由 [Configuration](configuration.md#two-phase-resolution) 拥有；本 owner
只消费该 collection，不按 `checkId` 重建 catalog。适用 Check 通过 [Architecture](architecture.md#checktask-system)
拥有的单一静态 Task graph 执行：generic engine 只结算 Task，Product adapter 才把终态证据映射为下述
Check/Record facts。Task layout、scope cap 和 admission 不是本 owner 的规则。

每个 Resolved Check 在 Core session 注册一次。not-applicable 在 non-execution path 直接关闭；applicable Check
scope 获得自动绑定所属 `checkId` 和 allowed record types 的 `RecordSink`。project function 只收到 reporting
surface，不能伪造 ownership 或持有可重复调用的 settle capability。受信 direct wrapper 或 TaskPlan completion
adapter 单次结算 scope；scope 外、duplicate、invalid 和 late mutation fail closed。

Core Check 同时保存 stable definition projection 与唯一终态：

| Outcome | 含义与 prerequisite availability |
| --- | --- |
| `not-applicable` | Run pre-work 已确认本次无需执行；可满足 dependent Check。 |
| `completed(passed)` | Check 成功完成；可满足 dependent Check。 |
| `completed(failed)` | 质量 verdict 为 failed，而非运行故障；可满足 dependent Check。 |
| `unavailable(diagnostic)` | dependency、execution、invalid result、record/protocol 或 cancellation 等无法提供正常执行结论；阻断 dependent user work。 |

普通 contained failure 映射为 owning Check 的 safe unavailable diagnostic。受信 Task/Core invariant failure 则是
Package Run execution failure：不伪造为普通 Check outcome，也不暴露未经验证的 snapshot。已接受的独立
QualityRecord 不因后续 ordinary failure、dependency blocking 或 cancellation 撤销。

最终 `CoreSnapshot` 的实体集合恰好为 `checks` 与 `records`。每个 Check 使用 `checkId`，每个 Record 直接绑定
`checkId` 与 `recordTypeId` 并保持独立稳定 `recordId`。scope、Task、function、capability 和 scheduler bookkeeping
不进入 Core、policy operands 或 machine output。Core 不从 Record 反推 quality verdict。

### Cancellation

Task admission cutoff、started-work drain 与 engine-private settlement 由 [Architecture](architecture.md#terminal-and-cancellation-contract)
拥有。它们进入本 owner 时，依赖 blocking 不是取消的替代表示：未开始 Task 不产生 user work，已开始 Task 的
ordinary terminal evidence 仍须先映射为 Check fact。

已闭合 Check 与已提交 Record 在取消后保持。drain 完成后，trusted finalizer 把仍未结算的 applicable Check 关闭为
`unavailable(cancelled)`，关闭 RecordSink，并拒绝 late mutation。仅在得到冻结 Core facts 后，Package Run 才返回
execution-phase cancelled result；pre-work cancellation 不构造虚假的空 snapshot。

## Built-in Checks 与 exact inputs

当前 built-ins 是 `file-metrics`、`function-metrics` 和 `duplicate-detection`。每个只消费 Product 批准的
current 或 named-reference exact inputs；adapter-private scanner data 不进入 Normalized Check、declarative
fingerprint、Core 或 Record contract。source-scope acceptance 拒绝任一越界 batch，避免 partial record conversion。

Project Definition 在 Check tree 中直接放入 built-in 或 custom leaf 来选择它们；Product `run` 不从 quick/full
profile、tree array order 或 Run Controls 隐式改写选择。tree group 只在 authoring 时存在，归一化后不成为
Check/Record identity。需要比较的 named policy 通过与其唯一 reference name 匹配的 Run Control comparison 建立
reference input。reference evidence 独立于 current run，不能伪造第二个 public Check 或改写 current facts。

## DecisionPolicy

`DecisionPolicy` 是 closed declarative model：acceptance、named views、ordered readiness 与一个 `blockWhen`
都在 policy data 中。evaluator 只消费 frozen Core snapshot、reference facts 和已解析 policy，产生 auditable
`DecisionEvidence` 与 `GateResult`。

Project Definition 直接声明 named policies 并用 `selectedPolicy` 选择一个；Product `run` 不保留 `all`、`changed`
或 `regressions` 等 adapter spellings。引用型 policy 只能使用与 closed comparison control 匹配的一个 reference
name。policy readiness 明确表示 reference unavailable、no eligible input 或指定 Check outcome，不能借由新的
全局 execution reducer推断。

Acceptance 只来自 `DecisionPolicy.acceptance`。每条规则绑定 owning Check、record type 及其冻结 declaration
surface；它只影响 policy evidence，不删除 Record，也不在 quality config 中建立第二份 accepted input。

## Human status

Output 从 final snapshot 与 decision evidence 纯投影 `Quality check status` 和 verification status。任一
unavailable Check 为 `failed`；没有 completed Check 为 `warning`；有 completed quality-failed verdict 也为
`warning`；其余为 `passed`。verification 只额外检查 policy 的 `all-current` view 中未被 acceptance 覆盖的
Records。Output 在 publication model 构造阶段核对并冻结 projection；report、console 与 structured result
不接受第二份 status 事实。

machine v3 只从同一 validated model 发布 Check、Record rows 与必要运行证据。精确 artifact DTO、schema identity
和 publication lifecycle 由 [Output](output.md) 证明；本 owner 不复制其字段规则。

## 验证

当前测试覆盖 Definition normalization/Run resolution、static Task graph、scope cap、Core session capability、三种
Check outcome、direct/TaskPlan/zero-child mapping、dependency/mutex、cancellation、record identity/conflict/retention、
built-in exact inputs、reference evidence、policy validation/evaluation、acceptance、readiness 与 human status projection。
machine bytes 和 publication 由 [Output](output.md) 证明。
