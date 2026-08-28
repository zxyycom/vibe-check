---
title: 由 Check-owned 输入与显式 provider 驱动 Run
status: active
alignment: aligned
createdAt: 2026-08-28T10:36:57Z
purpose: 让 Check-specific 配置和领域输入留在 owning Check，并让 Run Controls 只承载 Product 能统一解释的 invocation 控制。
background: changed-file list 缺少统一的来源与 baseline 语义，作为默认 project context 会制造隐式公共契约。
decision: Check options 拥有执行配置；changed-file facts 由 producing Check 形成，不进入 Run Controls。
tags:
  - configuration
relations:
  - type: 归并
    target: drive-run-from-check-owned-execution-options.md
  - type: 归并
    target: let-check-options-own-execution-dependencies.md
---

## 目的

- 让 Project Definition 中的普通 Check values、各自完整 options 与 typed dependencies 共同拥有 execution behavior。
- 让 Run Controls 只表达 Product 能在所有 Checks 之间统一解释的 invocation controls，避免看似通用但没有统一语义的 payload。
- 让 changed-file acquisition、baseline 和数据 shape 有明确 owner，并能被依赖方显式发现和验证。

## 背景

- executable Check 已经同时拥有 `options`、`execution` 与可选 `parseData`；external executable、file selection 和其它 Check-specific inputs 不需要平行 operational binding。
- project root、canonical flags、cancellation、显式 aggregation 和 output override 都有 Product-wide 语义，可以由 closed Run Controls 统一验证和执行。
- changed-file list 的来源可能是 Git diff、调用方事件或其它系统；它还需要定义 baseline、rename/delete 表达、路径根与失败行为。Product 没有一套能对所有 Checks 成立的默认解释，package-provided Checks 也不消费该公共字段。
- typed dependency 已允许一个 producing Check 发布 versioned final data，并让 direct dependents 显式读取；这比把领域 payload 注入每个 callback 更清楚。

## 决策

- 采用: Project Definition value 拥有 recursive Check declarations、每个 Check 的完整 options、scheduler 与 outputs；Project-owned Run script 绑定 Definition，并决定向调用方暴露哪些 Run Controls。
- 采用: Check options 拥有 Check-specific execution configuration，包括 external executable、file selection、input acquisition 和相邻实现参数。Run 不维护平行 operational dependency map，也不按 Check 来源、ID 或 object identity 重建 binding。
- 采用: closed `RunControls` 只包含 `projectRoot`、`flags`、`signal`、显式 `checkAggregation` 和受支持的 output override。Check callback 的 `project` 只包含 normalized root 与 canonical flags。
- 采用: `changedFiles` 从 `RunControls` 和 `CheckProjectContext` 直接移除；旧字段作为 unknown control 在 callback work 前被拒绝，不提供 deprecated alias、兼容 reader 或双写期。
- 采用: 需要 changed-file facts 的项目定义 producing Check，由它显式拥有来源、baseline、options、失败语义与 final-data shape；下游 Check 通过 direct `dependsOn`、`dependencies.get` 和 provider parser 读取该数据。
- 采用: 未来可以提供 changed-files constructor，但它必须明确 source 与 baseline contract，并仍然形成普通 Check；Product 不预设一个无策略的通用 built-in。
- 不采用: shared changed-files callback context、Product-wide hidden file scope、Run Controls dependency override、Project-wide operational dependency map，或按 package-provided Check identity 注入领域输入。
