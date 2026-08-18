---
title: 在私有运行边界内执行项目代码
status: archived
alignment: unaligned
createdAt: 2026-08-12T10:30:38Z
purpose: 让嵌入式调用方只依赖 public package API，而由 package 私有运行边界承接 Project Definition 与 custom runner 的执行故障。
background: 同进程项目代码可以退出、挂起或污染编辑器、服务和 agent 等长生命周期宿主；内部执行协议不应扩展成第二个公开入口。
decision: 项目代码在 package-private runtime 中执行；外部只调用 public package API，不公开内部协议或入口。
tags:
  - product-contract
relations:
  - type: 修订
    target: treat-project-definitions-as-trusted-code.md
---

## 目的
- 让程序化 API 可以安全嵌入长生命周期宿主，而不要求宿主直接承受 project-owned code 的进程退出、全局污染或不协作执行。
- 保持一个公开执行契约：消费者调用 public package API，Product 自行拥有内部 worker/process 生命周期与协议。

## 背景
- Project Definition module evaluation 和 custom runner 会执行项目拥有的代码；runtime validation 不能阻止 `process.exit`、同步无限循环、global mutation 或拒绝协作取消。
- CLI hard cut 后，调用方可能是编辑器、服务、agent 或自行包装的命令工具；让任意 project code 与这些宿主同进程执行会把内部实现风险变成公共集成风险。
- Worker 或 child process 可以限制故障传播并提供 termination boundary，但它不是权限 sandbox，也会要求 Product 明确 source loading、serializable handoff、cancellation、diagnostics 和 lifecycle。

## 决策
- 采用: Project Definition evaluation 与 custom runner execution 由 Product-owned package-private worker 或 child-process runtime boundary 承接；具体选择可以由实现根据 Bun 能力确定，但必须满足同一公开 failure-containment contract。
- 采用: 消费者只调用 public package API。Internal module、worker entry、IPC message、process arguments、exit code 和 bootstrap path 不进入 exports 或 `bin`，也不成为消费者必须包装或兼容的协议。
- 采用: Project Definition source、validated declarative metadata 和 execution binding 只以私有协议所需的最小形式跨越边界；不能跨越边界的 closure 或 host object 不得伪装成公开可序列化 input，loader 与 authoring contract 必须据此设计。
- 采用: Product 对 worker/process 的启动、取消、终止、资源回收、异常退出和 diagnostic normalization 负责；公开结果区分领域结果与 runtime containment failure，不泄漏内部协议。
- 采用: 该边界只提供进程故障 containment，不承诺 filesystem、network、environment、credential 或 OS 权限 sandbox。Project-owned code 仍按受信任代码处理，并使用 Product 明确授予内部执行环境的权限。
- 采用: 面向不可信项目的调用继续提供完全跳过 Project Definition import、runner registration 与其它 project-owned executable code 的显式路径；需要项目政策的 gate 不能在绕过模式下运行。
- 不采用: 让外部使用方自行启动或包装 Product CLI/worker，或把内部执行协议当作公开的第二种调用方式。
