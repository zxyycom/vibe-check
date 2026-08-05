---
title: 使用静态 Check TaskPlan 与共享调度器
status: active
alignment: unaligned
createdAt: 2026-08-05T10:31:36Z
purpose: 让自定义 Check 以简单任务图获得全局有界的并行、依赖和资源协调。
background: 每个 runner 自行并行会造成资源超卖，而执行中修改任务图又无法完整预检和稳定收敛。
decision: Check 在执行前贡献静态 TaskPlan，由 invocation 共享调度器统一安排；Task 保持私有执行单元，不进入政策或产品结果。
relations: []
---

## 目的
- 让多个内置和自定义 Check 共享一致的并行预算、任务依赖与互斥资源，而不要求每个项目重复实现调度器。
- 保持 Check 和 Record 是产品对象，避免把实现任务泄漏为新的政策、输出或兼容性身份。

## 背景
- 各 runner 独立使用 `Promise.all` 或局部队列不能协调 invocation-wide concurrency，容易过度占用 CPU、IO 或排他资源。
- 静态任务图可以在执行前验证身份、依赖和环；运行中追加任务会使完整计划、确定性输出和取消边界持续变化。
- Task 的拆分与合并是执行实现选择，不应改变 CheckRun coverage、QualityRecord identity 或门禁含义。

## 决策
- 采用: Check 可以在 resolution/planning 阶段贡献完整静态 `TaskPlan`；所有计划在执行前归一化、验证并冻结，执行期间不得注册、删除或重写 Task。
- 采用: 一个 invocation-scoped shared scheduler 统一实施有界并行、显式 task dependency 和 named resource 协调，使多个 Check 共同遵守声明的全局预算。
- 采用: Task 是 scheduler 私有执行单元，不是 Check、Record、policy operand 或 machine artifact identity；Task 只能通过所属 Check 的受控 ports 推进执行事实和提交记录。
- 采用: Scheduler 对任务 payload、领域 verdict 和 Record 语义保持 opaque，并将终态通过 Check execution boundary 交还 CheckManager；最终质量阻断仍由 DecisionPolicy 决定。
- 采用: Custom runner 仍可在函数内部自行并行，但这类未声明工作不获得 shared scheduler 的全局并发或资源保证，Core 也不尝试检查、拦截或强制接管它。
- 不采用: 执行中动态扩张任务图，或把每个 Task 自动提升为独立 Check 或公共 coverage 单元。
