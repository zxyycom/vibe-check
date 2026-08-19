# Proposal

本 Draft 为 API-only Product Run 建立一条通用、一次调用且 immutable 的 project invocation input path，使项目拥有的 adapter 能把本次运行意图安全传给 Check callback；它为部分运行提供基础，但不替项目选择任务或定义 CLI。

## Why

当前 <code>RunControls</code> 只承载固定 shared input，Check callback 看不到项目 CLI 或 CI 对本次运行的意图。项目若要按 profile/tag 让某个 Check 自行变为不适用，只能在 Product 外重建一条控制路径，或错误地把调用意图伪装成 Definition-owned static <code>options</code>。

这不是本仓 workspace gate 独有的需求：任意 project-owned adapter 都需要把一次调用的上下文传入同一个 bound Run。它应先作为一个小的 public Run contract 收敛，之后由 repository Gate consumer 定义 profile、tags 和 CLI。

## Outcome

完成后，<code>run(definition, controls)</code> 可把 project-defined invocation snapshot 传给 <code>context.project.invocation</code>。Product 验证并冻结这条调用边界，但不解释其内部项目 keys；Check 保持自己的 static configuration，并可依据本地 eligibility 与 invocation 自行返回现有 <code>not-applicable</code>。

本 Change 不改变 static Task graph、dependency、mutex、capacity 或 cancellation 语义，也不迁移本仓门禁、实现进度 renderer 或定义 execution telemetry。

## Downstream handoff

完成后，它只交付 Product Run 的 invocation-control contract。下游 [build-candidate-backed-project-gate](../build-candidate-backed-project-gate/) 可据此让项目 Check 解释本地 profile/tag eligibility；该下游使用不改变本 Change 的通用边界。完整交付顺序见 [Vibe Check package 与 Project Gate 交付导航](../vibe-check-package-and-gate-delivery.md)。
