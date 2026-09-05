---
title: 让仓库质量 Finding 在发布前仍为提示
status: archived
alignment: aligned
createdAt: 2026-09-02T06:42:07Z
purpose: 让同一 repository quality policy 在开发与发布验收中保持非阻断，不建立发布专用清零要求。
background: 已确认 file、function、duplicate 与 Markdown quality Finding 只提供维护提示，发布不改变其风险等级。
decision: 发布仍要求完整 Gate 与候选证据，但 non-blocking quality Finding 不成为额外发布阻断条件。
tags:
  - product-contract
  - product-priority
relations:
  - type: 替代
    target: require-known-repository-quality-remediation-before-public-release.md
---

## 目的

- 让质量 Finding 的阻断语义由 producing Check 的稳定 policy 决定，不因进入发布流程而隐式升级。
- 保留发布前完整 Gate、exact candidate、真实 consumer 和外部写入授权，同时避免建立只在 release owner 中存在的 Finding 清零规则。

## 背景

- Project Gate 对 file metrics、function metrics、duplicate detection 与 Markdown link Finding 显式采用 `non-blocking`，可信 Finding 保留 Records 与 warning，但所属 Check 可以结算为 `passed`。
- 既有发布决策把形成时 file/function/Markdown Finding 快照升级为发布前处置要求；用户现已确认发布前同样只需提示，没有特殊阻断语义。
- scanner/source/parse unavailable、失败的 Check status、candidate 不一致和发布授权缺失不是普通 quality Finding，继续由各自 owner 阻断。

## 决策

- 采用: 首次和后续公开发布不要求 repository quality Finding 数量为零，也不要求所有 advisory Finding 先获得 waiver；完整 Gate 如实保存 producing Check 的 status、final data、Records 与 messages 即可。
- 采用: `findingPolicy: "non-blocking"` 在日常与发布验收中保持相同含义；只有 producing Check 被明确配置为 blocking，或其执行形成 failed/unavailable 等既有阻断状态时，才通过普通 Gate aggregate 影响发布证据。
- 采用: applied、unused 与 overmatched waiver 继续按 owning Check 的公共契约提供审计信息，不新增 release-only waiver audit gate。
- 采用: exact candidate、真实外部 consumer、完整 machine evidence、registry authority、authentication、目标 version 与外部写入授权继续由各自发布决策独立要求；本决策不降低这些条件。
- 不采用: 从 Records 重新计算发布专用质量结论、仅在 release profile 提升 Finding policy，或把 non-blocking warning 误报为已修复事实。
