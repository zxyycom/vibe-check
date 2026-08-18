---
title: 在调用方 runtime 中执行 Check functions
status: active
alignment: aligned
createdAt: 2026-08-17T15:28:19Z
purpose: 让 Package Run 直接调用 Project Definition 中的 Check functions，并由唯一 Task system 管理调度。
background: Functions 已随项目 import 存在于调用方 Bun runtime；跨进程重载会复制配置和改变 closure 语义。
decision: 每个 Check function 在调用方 runtime 中作为独立 Product Task 执行，不建立 TaskPlan 或整次运行隔离层。
tags:
  - product-contract
relations:
  - type: 修订
    target: execute-project-functions-through-task-system-in-caller-runtime.md
---

## 目的

- 让项目 Check functions 与 closures 可以由 Package Run 直接调用，并复用 shared scheduler 的依赖、互斥、并行和取消能力。
- 让 Task system 只承接已展开的独立 Check Tasks，不增加 per-Check planning protocol。

## 背景

- Project Definition 已由项目运行脚本普通 import，functions 已存在于调用方 Bun runtime。
- Function 与 closure 不能通过普通 worker/process message 保真传递；重新按文件加载会改变 module evaluation 和调用方已经绑定的 value。
- 当前 Check model 每项 execution 只形成一个 Task；TaskPlan factory、leaf Tasks 和 completion 是未纳入当前范围的后期扩展。

## 决策

- 采用: Package Run 在调用方 Bun runtime 中验证 definition，并把每个 execution-bearing Check function 投影为 shared scheduler 管理的独立 Product Task。
- 采用: Task dependency、named mutex、effective `maxParallel`、root capacity 与 cancellation 继续由唯一 Task system 管理；recursive containment 不增加 Task edge。
- 采用: Check function 作为普通 caller-supplied code 在同一 runtime 执行；同步死循环、`process.exit`、global mutation 与不协作取消可能影响调用方 runtime，文档必须准确说明。
- 采用: 单个 Check implementation 可以按自身 owner 使用 subprocess、worker 或 thread，但这只是该 Task 的私有实现，不形成 public TaskPlan 或整次 invocation isolation。
- 不采用: per-Check TaskPlan factory、execution-time Task registration、Product-owned worker 包裹整次 invocation、function serialization 或配置 source loader。
