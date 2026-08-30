---
title: 保持 public inventory 由 package materials tooling 拥有
status: active
alignment: aligned
createdAt: 2026-08-30T17:34:11Z
purpose: 让 docs、package 与 candidate tooling 共用 public-root inventory，而不赋予普通 Product Check 特权。
background: public materials inventory 服务交付与消费者验证，不属于任一 runtime Check 的领域事实。
decision: 项目 tooling 拥有 public inventory；Product Checks 只通过正式契约处理自己的输入。
tags:
  - workflow-policy
relations:
  - type: 拆分
    target: refine-project-run-and-settlement-owners.md
---

## 目的

- 为 README、declarations、package contents 与 exact candidate acceptance 提供一个明确的项目级材料 owner。
- 防止某个普通 Check 因消费文档或文件而取得 package public surface 的控制权。

## 背景

- Docs validation、package assembly 和 candidate acceptance 都需要一致识别 consumer-reachable public roots。
- 该 inventory 描述交付材料，不是 Product runtime 的 Check applicability、Finding 或 Record catalog。

## 决策

- 采用: 项目拥有的 docs/package/candidate tooling 共同消费一个明确的 public-root inventory，用于文档覆盖、package material 与 exact candidate 验收。
- 采用: inventory 的维护和失败由 package materials/tooling owner 承接；Product public API 仍由正式 declarations 与 package exports 定义。
- 采用: 普通 Product-provided 或 custom Check 不因读取 public materials 获得 inventory 特权，也不把该 inventory 变成通用 file policy。
- 不采用: 将 package inventory 放入任一格式 Check、Core settlement 或 Project Run 的 public configuration。
