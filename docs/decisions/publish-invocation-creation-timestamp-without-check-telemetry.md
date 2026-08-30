---
title: 发布 invocation 创建时间而不建立 Check telemetry
status: active
alignment: aligned
createdAt: 2026-08-30T17:34:09Z
purpose: 让 machine invocation timestamp 稳定表示 Run 创建时刻，并与每项 Check 的执行时间边界隔离。
background: publication timestamp、Run 创建时间和 Check chronology 是不同事实，混用会造成错误审计含义。
decision: output 启用时一次捕获 Run 创建 instant；machine 与 diagnostic logging 共享该值。
tags:
  - product-contract
relations:
  - type: 拆分
    target: preserve-release-gate-readiness-with-invocation-creation-time.md
---

## 目的

- 为 machine invocation 提供可复现的创建时间语义，而不把它误读为 publication、Check 执行或 Record 报告时间。
- 避免未启用相关 output 时产生不必要的 wall-clock effect。

## 背景

- Diagnostic logging 需要一个 instant 命名 invocation log path，machine v4 需要 `invocation.timestamp`；两者描述的是同一次 Run 创建。
- Gate-private phase elapsed 和 per-Check monotonic duration 是不同观察，不改变 machine timestamp 的含义。

## 决策

- 采用: diagnostic logging 或 machine publication 至少一项启用时，在 Run 创建阶段捕获一次 immutable UTC wall-clock instant；两项都禁用时不读取或序列化 wall clock。
- 采用: diagnostic logging 使用该 instant 命名 log path，current v4 machine publication 将同一值投影为 `run.json` 的 `invocation.timestamp`。
- 采用: `invocation.timestamp` 不是 machine publication completion time、per-Check start/end、Record report time、performance budget 或跨 invocation telemetry identity。
- 不采用: 由每个 Check 捕获 wall-clock 时间，或为 invocation 创建时间新增 Check/Record chronology 与 public lifecycle API。
