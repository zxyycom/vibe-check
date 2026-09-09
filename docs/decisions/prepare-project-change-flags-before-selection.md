---
title: 在 Project preparation 中派生 change flags
id: 260909-prepare-project-change-flags-before-selection
status: active
alignment: unaligned
createdAt: 2026-09-09T11:43:21Z
purpose: 以可选根配置一次准备文件变更，并复用统一 flag expression 在调度前选择 Check
background: provider Check 与独立 enabledByChanges 都增加使用和契约重叠，而运行中由普通 Check 修改 flags 会破坏静态选择与显式关系
decision: 根 changes 配置在 selection 前派生保留 flags，并向 preflight/execution 提供同源 change 查询
tags:
  - configuration
  - performance
  - product-contract
relations:
  - type: 修订
    target: 260828-drive-run-from-check-owned-inputs-and-explicit-providers
    summary: 为显式根 changes 增加唯一 project-wide 例外
  - type: 替代
    target: 260909-provide-file-change-marker-context
    summary: 以根级动态 flags 取代 provider/wrapper
---

## 目的

- 让项目按需配置一次文件变更来源和 markers，并让所有 Check 使用同一个 flag selection 入口。
- 在 Scheduler 前排除确定无关的高成本 Check，同时为完整运行和不可信输入提供安全退化。
- 让声明式选择、preflight 和 execution 读取同一 invocation snapshot。

## 背景

- 既有边界把 Check-specific options 留在 owning Check，并把 caller flags 作为 immutable invocation controls；当时 changed-file facts 没有显式的 project-wide source 与 baseline contract。
- 后续 provider Check 与 execution wrapper 方案要求每个 consumer 接线 relation、解析 dependency 并在 execution 内自行跳过，也无法影响调度前 selection。独立 `enabledByChanges` 则会复制 predicate、dependency propagation、control settlement 和 aggregation 语义。
- Change marker 与 caller flag 在 selection 层都是调度前 token，但来源和可信状态不同。Project 内置 preparation 可以先形成 marker 状态，再复用既有 Project-file selection、config-glob matcher 和 effective-selection owner。

## 决策

- 采用: Project Definition 提供可选根 `changes`，拥有一个 project-wide source、baseline、path 和 marker contract。Product 在完整 Definition/graph validation 后、flag control settlement 与 Scheduler admission 前准备一次 snapshot。省略配置时保持当前 Run 和 callback context；V1 只提供一个 view。
- 采用: Change owner 规范化 paths，并以现有 `ProjectFileSelection` include/exclude 语义和唯一 config-glob matcher 计算 markers。可信 snapshot 的 markers 投影为 Product-owned reserved flags，与 caller flags 在来源可辨的冻结 selection input 中组合；RunControls 拒绝 caller 使用保留命名空间。
- 采用: Check 通过扩展后的 `enabledByFlags` 表达 caller-flag 与 change-marker 条件。公共值是封闭、可序列化、可规范化的 expression AST，builder 只构造同一 AST；现有 `{ flags, mode }` 是 shorthand。Definition 引用 change marker 时必须配置根 `changes`。
- 采用: Change-marker atom 使用 true/false/unknown。可信 snapshot 决定 true/false；不可信 acquisition、baseline 或 normalization 形成可观察的 unavailable/unknown。Effective selection 只排除明确为 false 的 Check，并继续驱动 `dependsOn` closure、control settlement 与 effective aggregation。
- 采用: 配置 `changes` 时，preflight 和 execution 获得同一冻结、可辨别 unavailable/available 的 `change` query。Preflight 通过向后兼容的可选 context 参数读取，并可结算 `not-applicable`；其现有 admission 和 hard-prerequisite 时机保持不变。
- 采用: 实施以模块化测试 lane 作为首个 workload，观测 preparation、selection、query、memory 和端到端 wall time，再确定索引与性能 guard。该场景证明通用能力，但不限制其它 Check 使用。
- 不采用: 普通 Check 修改 invocation flags、package-level changed-files provider、execution wrapper、独立 `enabledByChanges`、第二套 glob matcher，或尚无现实 consumer 的多 baseline/view。普通 Check 的结果继续通过显式 relation 组合。
