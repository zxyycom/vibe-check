---
title: 收敛 Project Run 与 Check settlement owner
status: active
alignment: aligned
createdAt: 2026-08-26T08:52:11Z
purpose: 让结算、项目运行、progress rendering、JSON document 与 package tooling 路径表达其实际责任。
background: 第二轮审计发现先前的 Check facts、Run output/cache、JSON document 与 public inventory 路径保留过渡命名或错误共享边界。
decision: 采用 Check settlement、Project Run、Check-owned cache 和明确 package/tooling owner，删除泛化 effect 语义。
tags:
  - configuration
  - workflow-policy
relations:
  - type: 修订
    target: refine-product-module-boundaries.md
---

## 目的

- 使 Check settlement、Project Run 与随包 Check 能从路径和契约恢复其独立生命周期。

## 背景

- cache 只服务 duplicate detection，却曾被建模为全局 Run capability。
- strict JSON document 同时服务 JSON 与 JSON Schema Check，不能属于任一 sibling。

## 决策

- 采用: `check-settlement/` 与 `project-run/` 表达结算和项目运行 owner；progress rendering 是 Project Run 的明确子 owner。
- 采用: duplicate-detection 独占 cache 配置、读写和失败；machine publication 与 progress 分别拥有配置和失败语义。
- 采用: JSON document 与 public inventory 归其共同 package capability 和 docs/package/candidate tooling owner；普通 Check 不获得特权。
