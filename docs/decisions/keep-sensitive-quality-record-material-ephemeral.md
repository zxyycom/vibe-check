---
title: 让 QualityRecord 的敏感源材料保持临时
status: active
alignment: unaligned
createdAt: 2026-08-05T11:15:26Z
purpose: 防止秘密和 credential URL 在产生质量记录时扩散到持久产物与诊断边界。
background: Producing Check 必须短暂读取敏感值，但 Core Check outcome 的 diagnostic、QualityRecord 和输出不应成为新的秘密副本。
decision: Product-owned Check 只在调用期受限内存处理原始敏感材料；公共 Core Check outcome、QualityRecord 与 output 边界只接收安全身份和脱敏证据。
tags:
  - product-contract
relations:
  - type: 修订
    target: keep-sensitive-scan-material-ephemeral.md
---

## 目的
- 让 Product-owned Check 能发现敏感内容或完成必要请求，同时不把原始秘密传播到新的日志、缓存、记录和产物。
- 让 record identity、acceptance 和 comparison 只依赖可安全公开的语义证据。

## 背景
- Secret bytes、完整 credential URL、query value 和 userinfo 可能必须在 detector 或 transport boundary 内短暂存在。
- `QualityRecord`、Core Check outcome 的 diagnostic、machine/human output、cache 和 error path 都可能意外形成持久副本。
- 对敏感值做普通 digest 或 message matching 仍可能保留可关联、可猜测的信息。

## 决策
- 采用: Product-owned producing Check 只在 invocation-owned bounded memory 中处理原始敏感材料，并在 detector 或 request boundary 完成后释放；不得把原值或可与原值关联的 digest 交给公共 Core Check outcome、QualityRecord、output 或其它持久边界。
- 采用: `QualityRecord`、record identity、Core Check outcome 的 diagnostic、policy evidence、console、report、machine artifact、cache、log 和持久错误只接收安全语义身份与必要脱敏证据。
- 采用: Acceptance、comparison 和测试材料不得依赖真实 secret value、substring、regex、完整 credential URL 或可反推它们的匹配值；精确检测规则在 feature 实施前再细化。
- 不采用: 先把原始敏感值传播到公共边界，再依赖后处理日志清洗补救。
