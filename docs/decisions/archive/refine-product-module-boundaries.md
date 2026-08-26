---
title: 收敛 Product 模块边界到实际 owner
status: archived
alignment: aligned
createdAt: 2026-08-26T06:48:56Z
purpose: 让 Product 源码路径直接表达 ordinary Check、Project Definition、Run 与 final facts 的实际 owner，并消除过渡布局留下的生产循环。
background: 先前布局决策正确移除了 product 包装层并建立 owner 命名原则，但其中 definition、core 和 scheduler 的具体一级目录仍混合不同变化原因或只服务单一消费者。
decision: 以明确 owner 收敛 Check、Definition、Run 与 terminal facts，并将 scheduler 收入 Run。
tags:
  - configuration
  - workflow-policy
relations:
  - type: 修订
    target: align-source-layout-and-naming-with-module-owners.md
---

## 目的

- 让 Product 源码的目录层级直接呈现 ordinary Check contract、Project Definition、Run invocation、Task scheduler 与 Check/Record final facts 的责任边界。
- 消除 Project Definition 与 facts 之间依赖彼此 owner 的过渡结构，同时保持 Product API 与行为不变。

## 背景

- `definition` 同时承接 ordinary Check contract、recursive Project Definition grammar 和 Run controls；这些职责有不同消费者和变化原因。
- `core` 实际只拥有 Check/Record terminal facts、validation 与 settlement session，却反向依赖 Definition 的 Check identity。
- 一级 `scheduler` 的外部生产消费者均在 Run，不能证明独立 Product owner。
- 历史迁入的 `foundation` 不因本次路径收敛自动拆散；只有无实际 consumer 的孤立残留可以在独立 caller audit 后删除。

## 决策

- 采用: `src/check/` 拥有 ordinary Check contract、authoring helper、minimal Check definition/validation、identity 与 options snapshot；`src/project-definition/` 拥有 Project Definition、recursive tree、definition defaults、validation、normalization 与 fingerprint。
- 采用: `src/run/` 拥有 RunControls、aggregation、invocation effects，以及其私有 `task-scheduler/`；`src/check-facts/` 只拥有 Check/Record terminal facts、validation、store 与 settlement session，且不得导入 `project-definition/`。
- 采用: 保留 `checks`、`output`、`project-files`、`contract` 与具有真实 Product 多消费者的 `foundation` 现有边界；不为路径整洁建立 compatibility re-export、额外 index、CLI/bin/subpath 或新的公共 API。
- 采用: 在迁移中保持 `src/index.ts` 的 public runtime/type inventory、ordinary Check semantics、machine v4 bytes/schema、package candidate 和 Project Gate 行为不变，并同步 current owner docs、layout validation、tests 与 Case 引用。
- 不采用: 仅移动文件却保留 Definition/Core production cycle、将 Run-only scheduler 继续作为一级模块、按文件数量机械拆分 Run/foundation，或以模块迁移改变公开兼容性与发布授权边界。
