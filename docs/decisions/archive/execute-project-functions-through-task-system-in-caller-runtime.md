---
title: 在调用方 runtime 中通过 Task 系统执行项目函数
status: archived
alignment: unaligned
createdAt: 2026-08-14T08:18:35Z
purpose: 让 Package Run 直接消费项目配置函数，并由既有 Task 系统统一管理依赖与并行。
background: 项目运行脚本已普通导入配置；整次运行再跨 worker 或进程会重复加载并阻断函数与 closure 的直接调用。
decision: Package Run 在调用方 Bun runtime 中调用配置函数并提交 TaskPlan；不为整次 invocation 强制建立 Product-owned 隔离进程。
tags:
  - product-contract
relations:
  - type: 替代
    target: contain-project-code-behind-private-runtime-boundary.md
---

## 目的

- 让项目配置中的 Check binding function、TaskPlan factory 和 closures 能被 Package Run 直接调用，并复用现有 Check/Record 与 shared scheduler owners。
- 让 Task 系统专注管理任务依赖、bounded parallelism 和 named resources，不让外层 worker/process lifecycle 复制执行模型。

## 背景

- 项目运行脚本和 Project Definition 都是项目持有的代码；运行脚本通过普通 import 获得配置值后，functions 已经存在于调用方 Bun runtime。
- Function 与 closure 不能通过普通 worker/process message 保真传递；重新按文件加载会改变 module evaluation、identity 和调用方已经绑定的配置值。
- TaskPlan/shared scheduler 已经拥有执行前验证、依赖、并行预算和资源协调；它与进程故障隔离是不同责任。

## 决策

- 采用: Package Run 在调用方 Bun runtime 中验证传入 definition，并通过每个 Check 相同的 trusted binding handoff 直接调用其中的 project function 与 TaskPlan factory；不序列化、反编译或跨 runtime 重新建立函数。
- 采用: 任一 Check 的共同 binding handoff 可以在 planning 阶段贡献完整静态 TaskPlan，由 invocation-scoped shared scheduler 统一实施 task dependency、bounded parallelism 与 named resource coordination；direct/TaskPlan 是 execution layout，不按 Check 来源区分，执行中不得动态注册 Check 或 Task。
- 采用: 单个 Task 或 scanner adapter 可以按自身 owner 使用 subprocess、worker、thread 或其它执行机制，但这只是该任务的私有实现，不把整次 Product invocation 移入另一 runtime，也不形成 public protocol。
- 采用: 项目函数作为项目运行脚本主动绑定的 trusted code 执行。同步死循环、`process.exit`、global mutation 与不协作取消可能影响调用方 runtime；public docs 和 result/cancellation contract 必须准确说明这一边界，不伪造 containment guarantee。
- 采用: Product 仍拥有默认 filesystem、Git、subprocess、cache、reporter 和 output implementations；“调用方 runtime”不要求调用方重写这些能力。
- 不采用: Product-owned worker/child process 包裹整次 invocation、配置 source loader、function serialization、IPC contract，或把 Task scheduler 等同于进程隔离层。
