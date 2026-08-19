# Design

本 Design 将 Check execution duration 作为 Product 测量的运行信号，提供给 live lifecycle observer 和最终 RunResult summary；它保持 Check outcome、QualityRecord、Core snapshot 与 machine publication 的质量事实边界。

## Context

Run 已在 Check callback、Task settlement 与 Record reporter 的唯一执行边界上控制 admission、settlement 和 record acceptance，但 Product 的 progress effect 目前只写固定 console stage。它不能让 project-owned adapter 获得稳定 Check identity、真实并行 lifecycle 或完成后可复用的耗时结果。

至少有两类消费者需要这项能力：repository Gate 的 human/CI progress renderer，以及任何项目的 local diagnostic/summary。duration 的直接价值是告知执行进度与解释已完成 Check 的成本，不是自动产生质量 verdict。若将来真的有性能预算消费者，它还需要 threshold、baseline、aggregation、failure behavior 和 retention 等额外语义。

[在公开 package 发布前完成项目门禁](../../docs/decisions/complete-project-gate-before-public-package-release.md) 对当前 release path 的约束是：timing 不得仅为呈现而改写既有 outcome/record grammar。这个 Draft 满足该约束：duration 落在 structured RunResult 的 execution summary，而非 Core 或 Record。若未来要以 duration 形成 policy，仍须演进长期 Decision 并建立独立 Change。

## Goals / Non-Goals

### Goals

- 定义 project-supplied lifecycle observer，覆盖 invocation prepared/finished、Check admitted/settled 与 Record accepted/rejected 的最小必要事实。
- 在 Product Check execution boundary 用 monotonic clock 测量每个 Check 的 elapsed duration，并在 settlement event 与最终 per-Check summary 中暴露相同 <code>durationMs</code>。
- 让任何带 final snapshot 的 RunResult 提供 canonical-order execution summary；每个 resolved Check 恰好一项，且可通过 <code>checkId</code> 与既有 outcome 关联。
- 让项目 adapter 实现 progress、日志和耗时摘要，而不让 Product 拥有 spinner、line format、terminal capability、exit mapping 或 log persistence。
- 规定 observer failure、abort、effect status 与 Check/Record facts 的隔离边界，并以 focused tests 证明 event ordering、duration bounds 与 callback isolation。

### Non-Goals

- 不定义 Project CLI、profile/tag grammar、partial-run eligibility 或 invocation input；后者由 [add-project-run-invocation-controls](../add-project-run-invocation-controls/) Draft 处理。
- 不增加 dynamic Task graph、selected-task API、scheduler-level concurrency selection、per-Check runtime option override 或 task discovery。
- 不扩展 Check callback 的 <code>CheckResult</code> / <code>CheckOutcome</code> grammar，不把 duration 放入 QualityRecord、Core snapshot、machine output/report 或 policy input。
- 不在首轮输出 <code>startedAt</code>、<code>endedAt</code>、record-report time 或 durable execution trace；项目 renderer 可自行给 received events 记 wall-clock 时间。
- 不把 duration 自动解释为 performance failure、quality fact 或 release metric，也不替代 workspace verifier 或公开发布 package。

## Decisions

### 1. Product 测量一次，提供 live 与 final 两种视图

duration 的测量 owner 是 Product，而不是 Check callback、scanner 或 renderer。计时从一个 Check 被 Task admission 后、进入 callback/settlement path 时开始，到其 terminal settlement 完成时结束；这表示 Product 的 Check execution elapsed time，而不是某个 subprocess、scanner 或 UI 的私有耗时。

observer 在 Check settled 时得到最终的 <code>durationMs</code>，用于完成进度和耗时呈现。renderer 若要显示一个仍在运行的 Check 的 elapsed time，可在收到 admitted event 时启动本地单调显示计时，并在 settled 后以 Product duration 收敛；这不把 wall-clock 或中间 duration 变成 Product contract。带 final snapshot 的 RunResult 同时提供同一测量的 summary，避免 renderer 只能依赖 transient event 或重新计时。

### 2. duration 属于 per-Check execution summary，不属于 outcome

暂定 RunResult 的 final execution view 为 canonical-order 的 entries：

~~~text
{ checkId, durationMs }
~~~

<code>durationMs</code> 为非负 number 表示 Check 实际执行；<code>null</code> 表示该 Check 没有进入 callback/settlement path，例如 prerequisite unavailable 或 execution cancellation 前未启动。entry 不复制 <code>outcome</code>：消费者通过相同 <code>checkId</code> 从 final snapshot 读取质量/可用性结果。

该 view 属于 RunResult facts，而不属于 CoreSnapshot。它必须随着 completed、effect 与 execution-phase cancelled result 一起返回；没有 final snapshot 的 configuration/planning failures 不伪造 execution summary。

### 3. start/end 与 Record timing 保持 adapter-local

第一版 lifecycle contract 以 admitted/settled event kind 与 settled duration 说明进度，不承诺 wall-clock <code>startedAt</code> / <code>endedAt</code>。renderer 可把 admitted event 的本地接收时刻用于运行中显示，但必须将它视为 adapter-local display state，而非可持久化的 Product execution fact。这避免为本地 terminal UX、log formatting 或时区需求扩张 Product output contract。

Record 没有独立 execution timeline：它由 owning Check 的 reporter 接受。renderer 若需呈现 record 的相对时机，只能消费 event order 或关联 Check；不把 timing 写入 QualityRecord identity、fields 或 machine record row。

### 4. observer failure 不能伪造执行事实

observer throw、renderer cancellation 或 output effect failure 的精确处理是这个 public contract 的一部分。它必须不会伪造、吞掉或重新分类已确定的 Check/Record facts；Plan 需选择 fail-open/fail-closed 行为并做 focused evidence。

### 5. 性能 policy 是后续独立选择

<code>durationMs</code> 是公开的 execution signal，但不是当前 DecisionPolicy operand 或 quality failure。若实际消费者需要 budget，候选路径是：(a) 明确 performance Check 用既有 Record grammar 报告阈值违反；或 (b) 新建独立 canonical performance/execution model。两者都需要长期 Decision、schema/identity/policy/retention/test evidence，且不应塞入 progress Change 或 repository Gate renderer。

## Risks / Trade-offs

- **测量对象误读：** callback、scheduler 和 subprocess 的 duration 不同；文档与 renderer 必须称其为 Product Check execution elapsed time。
- **未执行语义：** <code>null</code> 不是零耗时，而是没有实际 Check execution；renderer 必须与 outcome 一起呈现。
- **observer 干扰：** 一个 renderer 的错误若影响 gate truth，会使 UI 成为不可预测的执行控制面。
- **过早 policy 化：** duration 本身有观察价值，但没有 budget/baseline 的阈值会制造伪失败。

## Open Questions

- public declaration 是否需要额外导出命名 execution-summary type，还是由 RunResult 的结构化字段满足真实 consumer；Plan 时以 Gate/外部 consumer import evidence 决定。
- observer callback throw、abort 和 output effect 的精确关系是什么；需要先确定 consumer 可恢复性与 exit behavior。
- 若将来出现性能预算，应该采用 performance Check 还是独立 canonical model；必须另行决定，不能阻塞本 Draft 的 progress/result signal。
