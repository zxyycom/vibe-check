# Proposal

本 Draft 为 API-only Product Run 建立两种同源的 execution feedback：项目 adapter 可消费的 lifecycle events，以及最终 structured RunResult 中每个 Check 的 product-measured duration summary。它让进度与完成后的耗时摘要都基于真实执行，而不把时间附加到 QualityRecord、Core quality facts 或 machine artifact。

## Why

当前 progress effect 只输出 <code>execution</code>、<code>effects</code> 两个固定文本阶段。项目若要显示并行 Check 的开始、完成和耗时，只能观察不完整的 console output，或在 Product 外复制执行流程。Check 的 elapsed duration 是一个有用的运行信号：它能说明工作仍在前进、在完成后解释瓶颈，并让项目 renderer 提供可信摘要。

这个信号不要求把时间当作质量 verdict。Check terminal outcome 表达质量/可用性，QualityRecord 表达命名质量发现；它们都不需要为每条 record 保存执行时间。Product 应在唯一的 Check execution boundary 测量 duration，再分别向 live feedback 和最终 RunResult 暴露它。

## Outcome

完成后，observer 可接收 invocation、Check admitted/settled、Record accepted/rejected 的 lifecycle events。每个 settled Check event 带 Product 测量的 <code>durationMs</code>；项目 renderer 因而能显示真实并行进度与已完成 Check 的可信耗时。若需要显示运行中的已耗时，可从 admitted event 的本地接收时刻启动自己的单调显示计时，并在 settled 后以 Product duration 收敛；这不是新的 Product wall-clock contract。

任何带 final Check snapshot 的 structured RunResult 都带 canonical-order 的 per-Check execution summary。每项以 <code>checkId</code> 关联现有 outcome，包含 <code>durationMs</code>：实际进入 callback/settlement 的 Check 为非负数字，未启动而由 prerequisite/cancellation 关闭的 Check 为 <code>null</code>。summary 不重复 outcome，也不改变 Check callback 返回的 <code>CheckResult</code> grammar。

首轮不在最终结果、Record、Core 或 machine output 中加入 <code>startedAt</code> / <code>endedAt</code>。observer 的 admitted/settled events 已足以让项目 renderer 自行决定是否记录本地 wall-clock 时间；Record 也不获得独立 timing 字段。

## Downstream handoff

完成后，它交付 lifecycle feedback 与 final per-Check duration summary contract。下游 [build-candidate-backed-project-gate](../build-candidate-backed-project-gate/) 可据此实现项目 renderer 和完成摘要；它不因此获得改变 Product quality facts、exit policy 或自动把 duration 变成性能失败的权限。完整交付顺序见 [Vibe Check package 与 Project Gate 交付导航](../vibe-check-package-and-gate-delivery.md)。
