---
title: 项目分支使用无前缀的语义名称
id: 260908-use-unprefixed-project-branch-names
status: active
alignment: aligned
createdAt: 2026-09-08T16:34:44Z
purpose: 让分支名称表达项目工作而非执行工具或命名空间
background: Change 分支已有独立工作区约定，工具前缀不能表达正式项目的工作身份
decision: 新增项目分支直接使用语义名称，Change 分支使用 Change 名称
tags:
  - workflow-policy
relations: []
---

## 目的

让分支名直接表达项目工作，使人工与代理执行采用同一命名规则。

## 背景

项目已经按 Change 隔离分支和活跃实现工作区。分支属于项目，创建它的工具不构成工作身份；发布分支也应按同一规则命名。

## 决策

- 采用: 新增项目分支直接使用无前缀的语义名称；普通 Change 分支使用 `<change-name>`，发布 Change 分支例如 `release-0-0-2`。
- 采用: 不附加工具名称或分类命名空间；实际分支、worktree 与合入规则由[Change 协调](../governance/change-coordination.md#worktree-与合入规则)承接。
- 采用: 本规则约束后续创建，不自动重命名已有分支或改写 Git 历史；具体 Git 操作继续按任务授权执行。
