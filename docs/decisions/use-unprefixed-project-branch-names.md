---
title: 项目分支使用无前缀的语义名称
id: 260908-use-unprefixed-project-branch-names
status: active
alignment: aligned
createdAt: 2026-09-08T16:34:44Z
purpose: 让分支名称表达项目工作而非执行工具或命名空间
background: 日常开发只在 main 进行，发布或其它明确授权的分支仍需表达项目工作身份
decision: 对明确获准创建的项目分支使用无前缀语义名称，命名规则不授予创建权限
tags:
  - workflow-policy
relations: []
---

## 目的

让分支名直接表达项目工作，使人工与代理执行采用同一命名规则。

## 背景

日常开发与提交只在 `main` 进行，普通 Change 不对应新分支。发布分支及其它用户明确授权的分支属于项目，创建它的工具不构成工作身份；命名规则只约束这些获准的分支。

## 决策

- 采用: 明确获准创建的项目分支使用无前缀语义名称；发布 Change 分支例如 `release-0-0-2`。用户指定名称时遵从其明确要求，普通 Change 不因本命名规则取得分支授权。
- 采用: 不附加工具名称或分类命名空间；实际分支、worktree 与合入规则由[Change 协调](../governance/change-coordination.md#worktree-与合入规则)承接。
- 采用: 本规则约束后续创建，不自动重命名已有分支或改写 Git 历史；具体 Git 操作继续按任务授权执行。
