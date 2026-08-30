---
title: 保持 duplicate-detection cache 由 Check 拥有
status: active
alignment: aligned
createdAt: 2026-08-30T17:34:11Z
purpose: 让 cache 配置、读写、失效与失败只服务实际需要它的 duplicate-detection Check。
background: 当前没有其它 Check 共享该 cache，把它放在 Project Run 会制造不存在的全局 lifecycle。
decision: duplicate-detection 独占 cache owner；Project Run 不建立通用 cache capability。
tags:
  - configuration
relations:
  - type: 拆分
    target: refine-project-run-and-settlement-owners.md
---

## 目的

- 让 cache policy 与使用其内容的领域算法保持同一 owner 和失败边界。
- 避免为单一消费者建立推测性的全局 Run cache API。

## 背景

- Duplicate detection 是当前唯一 cache consumer，只有它能解释 cached payload、有效性和不可用时的 Check 结果。
- Project Run 可以调度该 Check，但不因此拥有其持久化格式或恢复政策。

## 决策

- 采用: duplicate-detection Check 独占 cache 配置、key、读写、失效、兼容性和失败结算。
- 采用: Project Run 只提供该 Check 运行所需的受控 effect/runtime 边界，不读取或解释 cache payload。
- 不采用: Product-wide cache manager、通用 Run cache contract，或让其它 Checks 隐式复用 duplicate-detection cache。
