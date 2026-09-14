---
title: 在 Project preparation 中派生 change flags
id: 260909-prepare-project-change-flags-before-selection
status: active
alignment: unaligned
createdAt: 2026-09-09T11:43:21Z
purpose: 以文件区域派生受保护的 change flags，并通过统一 DSL 在调度前选择 Check
background: caller flags 不能表达项目文件区域变化，provider Check 或 execution 内跳过也无法缩小调度前工作集
decision: 根 changes 配置一次匹配 Git changed paths、派生受保护 flags，并以统一 DSL 和可判别 context 驱动安全选择
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
    summary: 以根级 change flags 取代 provider/wrapper
---

## 目的

- 让 Project author 声明“change flag ID → 文件区域”，由 Product 在 selection 前一次生成本次 flags。
- 让普通 caller flags 与 change flags 通过同一个声明式 DSL 驱动 effective selection。
- 在检测失败时保守运行，同时让 callback 明确区分可信文件 records 与 unavailable。

## 背景

当前 `RunControls.flags` 只表达 caller intent，`enabledByFlags` 只能应用扁平集合 mode。由普通 Check 提供 changed files 会晚于 selection；独立 change enablement 又会复制 dependency propagation、control settlement 和 aggregation。Project-owned preparation 可以先取得 changed paths、匹配既有 path/glob 语义，再复用同一 effective selection。

## 决策

- 采用: `ProjectDefinition.changes` 声明一个 Git comparison 与 change flag regions。每个 flag ID 生成 `vibe-check:change:<id>`；RunControls 拒绝 caller 提供该保留前缀。V1 使用一个 project root 与一个 comparison view。
- 采用: Product 在完整输入与 graph validation 后、effective selection 和 Scheduler admission 前至多准备一次 changed paths。新增、修改、删除与 rename 的相关路径参与所有 regions；一个 path 可以产生多个 flags。
- 采用: `enabledByFlags` 扩展为 closed recursive DSL，直接提供 flag、all、any、none、not-all、exactly-one 与 unary not。当前 `{ flags, mode, propagateDependsOn? }` 保持合法；shorthand tokens 维持既有去重排序，raw DSL 保留 child 顺序与 multiplicity，避免 normalization 改变 exactly-one 语义。
- 采用: Caller flags 与 derived flags 只形成一次 effective selection，并继续驱动 `dependsOn` propagation、control settlement、progress 与 effective aggregation。`project.flags` 保留 caller input；change evidence 使用独立 context。
- 采用: 成功 context 以稳定 file-centric records 直接关联每个命中 path 与其全部 flags。可信零命中返回空 records；检测不可用时 context 返回 reason 且没有 records，selection 则把全部声明 change flags 视为 present。
- 采用: `prepare` 与 `execute` 读取同一冻结 change result。Preparation 保持 task-local admission 时机，不重新检测 changes；change context 不自动进入 machine、diagnostic、cache 或跨 Run state。
- 采用: Project Gate 的 product-runtime test lane 是首个 consumer；其 region 保守覆盖 `src/**`，默认 required selection 结合对应 change flag，显式 test/full flags 独立强制运行。用 region completeness、unchanged、changed、unavailable 和 force workloads 验证正确性与固定成本。
