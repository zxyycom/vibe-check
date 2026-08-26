---
title: 移除无消费者的 Product Option 能力
status: active
alignment: aligned
createdAt: 2026-08-26T07:35:30Z
purpose: 删除没有生产消费者或稳定 owner 的项目自制 Option，避免以预置能力维持无效抽象表面。
background: Option 及测试只引用自身；第三方预装能力不因当前 source consumer 数量而自动移除。
decision: 保留前序政策已选择的第三方能力和原生表达，删除 Product Option 及其文档、Case 与实现约束。
tags:
  - workflow-policy
relations:
  - type: 修订
    target: preinstall-selected-typescript-capabilities.md
---

## 目的

- 要求项目自制 Product source capability 具有当前 consumer 或稳定 owner；第三方预装政策仍是独立的长期判断。

## 背景

- Option 没有生产 consumer，继续保留会把历史迁移代码误写成项目默认能力。
- 现有 closed input 与失败边界已经通过显式 result union 与原生控制流表达。

## 决策

- 采用: 删除 Product Option、其单元测试、Case、coding-style 选择项和形成时依赖材料中的 current 约束。
- 采用: 保留 neverthrow、ts-pattern、Remeda 与 Mnemonist 的前序预装选择；新增 Option 需求必须按真实缺口重新决定。
