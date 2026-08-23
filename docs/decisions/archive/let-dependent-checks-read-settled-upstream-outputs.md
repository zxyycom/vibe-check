---
title: 让依赖 Check 读取上游 settled outputs
status: archived
alignment: unaligned
createdAt: 2026-08-21T07:32:25Z
purpose: 让静态 Check dependency 同时提供顺序和可审计的上游结果复用，而不建立第二事实源。
background: 多个 Check 需要复用前置数据，但纯调度 dependsOn 无法传递上游 outcome、Records 或领域类型。
decision: Declared direct dependency 在上游 settled 后提供其 Check outcome 与 Records；Check-owned parser恢复领域类型。
tags:
  - configuration
  - product-contract
relations:
  - type: 修订
    target: project-executable-checks-into-validated-task-graph.md
---

## 目的

- 让多个 downstream Checks 复用同一上游工作与 provenance，而不重复计算或把 Check-specific data 塞入所有 execution contexts。
- 让 dependency output 始终可记录、可审计并可供内部/外部消费者读取，同时保持 Check outcome 与 Records 为唯一 Core facts。
- 让 producing Check 通过一个或多个 parser拥有领域类型，避免 downstream 对 generic data 使用 unchecked cast。

## 背景

- 当前每个 executable Check 投影一个 Task，完整静态 graph 在 work 前验证 missing dependency、cycle、mutex 与 parallel limits；这些结构和调度责任仍然成立。
- 当前 `dependsOn` 只传递 Task order。Downstream callback 无法读取 upstream outcome/Records，因此 reusable preparation 要么重复运行，要么扩大 Product-wide context。
- Core 已为每个 resolved Check 保存一个 terminal outcome，并把零到多个 Records 绑定到 `checkId`；从这些 facts 可以派生 settled output，不需要第三类 Core entity。
- Generic canonical Record data不保留 producing Check 的 TypeScript type。Parser可以在 trusted caller runtime恢复领域值，但需要与 producing Check identity建立可验证类型关系。
- Supporting producer是否在人读输出中折叠，不应改变 Core/machine fact visibility或 dependency correctness。

## 决策

- 采用: 每个 execution-bearing Check继续恰好投影一个 Task；完整静态 Task graph在任何 work前统一验证 identity、direct dependencies、cycles、mutex与parallel limits，information-only container不成为 dependency target或alias。
- 采用: 一个 declared direct dependency既建立 Task order，也在 upstream terminal settlement和reporter closure后，授权 downstream读取该 upstream的 immutable Check outcome与完整 owned Records。
- 采用: Downstream不能读取 undeclared、transitive、live或partial outputs；runtime按 direct edge和`checkId`验证访问，非法读取fail closed。
- 采用: Settled output从现有 Core `checks`与`records`派生；runtime index、grouped view和external readback都不能成为不同内容的第二事实源，也不新增第三类 Core entity。
- 采用: Producing Check owner可以提供一个或多个不序列化的 parser，把 generic Record解析为领域类型；public authoring必须让parser identity、upstream Check identity与downstream inferred type形成可验证关系，exact TypeScript grammar由对应 Change prototype决定。
- 采用: Supporting Check无论是否completed/passed，都保留在structured RunResult与machine facts。Passed状态只能由presentation owner折叠；failed、unavailable或显式读取不能被隐藏。
- 采用: 首版只按`checkId`、`id`和ordinary iteration选择Records，不建立arbitrary custom-data search、query language或parser registry。
- 不采用: 以callback closure传递未记录结果、全局mutable output store、隐式transitive dependency、为每个shared value强制创建Check，或让presentation hiding删除事实。
