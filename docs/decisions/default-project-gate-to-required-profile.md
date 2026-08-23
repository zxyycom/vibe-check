---
title: 让默认 Project Gate 使用 required profile
status: active
alignment: unaligned
createdAt: 2026-08-23T16:30:16Z
purpose: 让无显式 profile 的正式 Gate 选择必须 assurance，并把 full 保留为显式全部选择。
background: 当前无参 Gate 默认 full；移除遗留 Foundation gates 后，required 与 full 可以暂时同集。
decision: 默认 Gate 选择 required；显式 full 选择当前全部 Checks，但不为维持差异创造虚假 full-only Checks。
tags:
  - configuration
  - workflow-policy
relations: []
---

## 目的

- 让日常未显式选择 profile 的 Project Gate 执行必须通过的 repository assurance，而不是隐式选择 full。
- 让 full 表达调用方显式要求当前全部 Checks；如果当前所有 Checks 都是必须项，允许 required 与 full 暂时同集。

## 背景

- 当前 `verify:vibe-check-workspace` root 不传 profile，Project Gate controls 把缺省 profile 解析为 full；`:required` 显式传 required，`:full` 显式传 full。
- Foundation 从历史子仓库迁入主仓后，其源码、格式与测试已由普通 workspace checks 和 Test Evidence 覆盖；不能仅为维持 required/full 数量差而保留独立 Foundation Checks。
- Profile 是 project-local selection，不应通过虚假 identity、重复执行或无行为差异的 branch 制造可见差异。

## 决策

- 采用: 无显式 profile 的 Project Gate adapter 默认选择 required。
- 采用: `verify:vibe-check-workspace` 与 `verify:vibe-check-workspace:required` 都选择 required；`verify:vibe-check-workspace:full` 选择 full。
- 采用: `--profile required|full` 继续允许调用方显式选择；显式值优先于缺省值，不从 ambient CI 或其它环境状态推断 profile。
- 采用: Full 选择 catalog 中当前全部 Checks并包含 required assurance；没有真实 full-only assurance 时，required 与 full 可以拥有相同 membership和行为。
- 采用: 只有新出现的独立非必须 assurance 才建立 full-only membership；profile label 本身不创建 Check identity、重复执行或空 mode branch。
- 不采用: 无参默认 full、为了让 full 与 required 数量不同而保留重复 Checks，或根据 host/CI 隐式选择 profile。
