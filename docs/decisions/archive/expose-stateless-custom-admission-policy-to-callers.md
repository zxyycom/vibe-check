---
title: 向调用方公开无状态 custom admission policy
status: archived
alignment: aligned
createdAt: 2026-09-01T14:55:23Z
purpose: 让调用方以最小 trusted synchronous callback 表达无状态准入偏好，同时不取得 Scheduler 的状态机、执行或硬合法性所有权。
background: 完整 Graph 与无状态 select/wait 已是 private policy 边界；公开契约必须投影所需事实并明确 trusted callback 的故障收束。
decision: 采用 closed static/custom、冻结 context 与 select/wait；非法 policy 以 fatal fault 收束。
tags:
  - configuration
  - product-contract
relations: []
---

## 目的

- 让 Project Definition 作者为 Product 无法统一解释的、基于完整静态图和当前运行事实的准入偏好提供最小 trusted authoring surface。
- 保持 Scheduler 对 readiness、mutex、capacity、cancellation、blocked settlement、执行、等待与结算的唯一 owner，并避免公开 private engine types 或第二状态机。
- 为 custom callback 的输入、结果、身份、故障、diagnostic 与并发闭包边界建立可验证的首版 public contract，而不预置没有消费者的 registry、状态或 telemetry 抽象。

## 背景

- 无状态 admission policy 每轮以 immutable full graph、relation/mutex candidates、capacity 和 runtime facts 重新计算 `select(taskId)` 或 `wait`；priority 只存在于 Graph 的 Task metadata，Scheduler 只验证下一运行选项的 hard legality。
- 仅交给调用方 Task ID 选择会隐藏后继与完整拓扑；直接暴露 private Scheduler inspection、planned Task 或 imperative capability 则会泄漏实现状态并复制状态机责任。
- Check functions 已是调用方 trusted code；callback 的源码与 closure 不能安全序列化或进入 declarative fingerprint，也不能由 Product sandbox、timeout 或全局锁可靠约束。
- callback throw、thenable、closed result 外形错误或返回当前无法合法执行的选择，不能静默切回 static policy，否则会掩盖调用方声明的调度语义；但已经启动的 trusted work 必须仍在同一次 Run 生命周期内完成结算。

## 决策

- 采用: `ProjectDefinition.scheduler.admissionPolicy` 是 closed `static | custom` union。省略该字段与显式 `static` canonical 等价；`defineAdmissionPolicy(...)` 只提供类型推断，和同形 inline Definition value 完全等价。首版不提供 `policyId`、`policyVersion`、brand、registry、plugin discovery、composition 或 policy lifecycle hook。
- 采用: `custom` 的 callback 名为 `proposeAdmission(context)`。它是 trusted 的同步纯函数：每次调用只依据 context 返回结果，不读写 Product-managed mutable state，也不返回 Promise/thenable。Product 不 sandbox、timeout、隔离或锁住调用方代码；同一 Definition 的 overlapping Runs 共享 caller closure，调用方负责 closure 的可重入性。
- 采用: context 是 documented deep-frozen public DTO：完整 normalized graph projection、Graph Task metadata 中唯一的 priority/topology、Scheduler 形成的 relation/mutex eligible candidates、每项当前 capacity fact，以及解释这些候选所必需的 immutable invocation-local runtime facts。它不暴露 private `SchedulerDecision`、inspection、planned Task、execution state、Check options/functions、final data、Records、messages、logger、clock、signal、mutable collection 或 imperative Task capability。
- 采用: callback 的精确 public result 仅为 `select(taskId)` 或 `wait`，不带 reason、reservation、历史 state、identity 或版本字段。Scheduler 仍只接受当前 pending relation/mutex candidate、当前 capacity 可 admission 且未越过 lifecycle/cancellation cutoff 的 select；wait 只在 running work 能推进下一状态变化时合法。callback 不能定义 readiness、mutex、capacity、cancellation、blocked settlement、Task 启动、等待或结算。
- 采用: declarative fingerprint 只区分 `static` 与 `custom` discriminant；callback identity、source 和 closure 全部排除。callback 是 invocation 时保留的 trusted function，而不是 declarative identity 或可发布配置数据。
- 采用: callback throw、thenable、malformed result、non-candidate select、capacity-invalid select 或 undrainable wait 都是 fatal admission-policy fault。fault 后停止新的 admission、取消 pending Tasks、drain 已启动 Tasks，并以专用 `admission-policy-failed` execution result 完成本次 Run；不 fallback 到 static policy，也不让 running trusted work 脱离 Run 生命周期。此结果码是调用方可行动的 execution-fault owner，不是 Check terminal status、timing telemetry、事件流或新的通用结果框架。
- 采用: diagnostic 只记录有界 fault category，不输出 raw thrown value、raw callback result、stack 或 caller data。custom callback 不建立 policy console capture、Check ownership、`checkMessages`、timing telemetry、public diagnostic parser/schema 或稳定 event grammar。
- 不采用: async selector、reservation/sticky/fairness/starvation state、graph/priority side channel、Task-ID-only local selector、公开 private engine objects、imperative callback、static fallback、全局 callback lock、console attribution、per-policy timing、registry 或 composition framework。
