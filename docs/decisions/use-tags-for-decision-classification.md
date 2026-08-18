---
title: 使用 tags 分类决策记录
status: active
alignment: aligned
createdAt: 2026-08-18T02:38:12Z
purpose: 让决策分类脱离目录和集中注册表，并在稳定 Decision ID 下支持灵活检索。
background: 当前上游契约以 tags 和稳定 basename 管理决策，旧 domain 目录及 catalog 已阻断最新 CLI 校验。
decision: 旧 domain 值一对一成为记录 tags；以根目录和 archive 表达位置，不保留 domain catalog。
tags:
  - workflow-policy
relations: []
---

## 目的

- 让每条长期决策的分类成为记录自身的显式、可查询属性，而不是由文件所在目录和集中注册表间接决定。
- 保持 Decision ID 在移动、归档和后续分类扩展时稳定，避免路径同时承担身份、生命周期和分类职责。

## 背景

- 更新后的 `decision-records` Skill 已以 Markdown basename 作为稳定 ID，以 root/`archive/` 位置表达 lifecycle，并以 tags 生成查询索引。
- 项目原有五个 domain 目录能提供单一分类，但会把位置、分类和注册表耦合，且不再满足当前上游契约。
- 本次迁移已核对所有既有记录 basename 唯一；每条原有记录的 domain 可以无歧义地保留为一个 tag。

## 决策

- 采用: 既有 `configuration`、`product-contract`、`product-priority`、`testing` 与 `workflow-policy` domain 值一对一成为各自记录的 tag。
- 采用: active 决策直接放在 `docs/decisions/`，archived 决策放在 `docs/decisions/archive/`；关系只引用稳定 Decision ID，不引用 source path。
- 采用: 删除 `decision-domains.json`，不提供旧 domain 布局、兼容读取或双写。
- 不采用: 用目录层级继续承担分类，或用派生索引反向补造记录的 tags。
