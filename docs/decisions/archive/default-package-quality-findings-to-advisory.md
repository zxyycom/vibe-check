---
title: 默认将 Package 质量 Finding 作为非阻断观察
status: archived
alignment: aligned
createdAt: 2026-08-30T11:39:49Z
purpose: 让普通 consumer 从完整质量证据开始，而不是无意继承本仓库的严格阻断政策。
background: 形成决策时，四项质量 Check 默认 blocking，数值型 package defaults 与本仓库 Gate 相同或接近。
decision: 四项质量 Check 默认 non-blocking，三项数值阈值略宽；Project Gate 显式保留自己的严格阈值与 non-blocking policy。
tags:
  - configuration
  - product-contract
relations:
  - type: 归并
    target: expose-markdown-link-finding-policy.md
  - type: 归并
    target: share-finding-policy-across-area-quality-checks.md
---

## 目的

- 让 package-provided quality Checks 的无参调用优先收集完整、可行动的 Finding evidence，而不是默认把普通质量提醒变成失败。
- 让 consumer 显式选择 blocking policy，并让本仓库 Gate 的严格阈值由项目配置直接拥有。
- 保持 Finding settlement、unavailable、Run aggregation 与 Gate exit 的责任分层。

## 背景

- `share-finding-policy-across-area-quality-checks.md` 与 `expose-markdown-link-finding-policy.md` 已建立 closed finding policy 和完整 evidence 语义，但为兼容当时行为选择默认 blocking。
- 形成决策时，Package 尚未正式发布，目标是让默认值接近项目实际用法且略宽松；本仓库 Gate 的四项质量 Check 本来就显式选择 non-blocking。
- 形成决策时，Gate 的 file/function thresholds 部分继承 package defaults；若只改变 Product values，项目质量政策会在没有直接 diff 的情况下变宽。

## 决策

- 采用：duplicate、file metrics、function metrics 与 Markdown Link 的省略 `findingPolicy` 统一物化为 `non-blocking`。可信 normal Finding 保留完整 Records/final data、附 warning 并结算为 passed。
- 采用：显式顶层或 area `blocking` 继续使对应 Finding 计入 blocking count 并令 Check failed；scanner、source、parse、I/O、containment、limit 与其它 unavailable 不受 finding policy 影响。
- 采用：duplicate public defaults 为 minimum lines `4`、tokens `100`；file defaults 为 code lines `360`、low-decision allowance `600/12`；function defaults 为 NLOC `60`、low-complexity `180` when CC `< 6`、CC `12`、parameters `6`。
- 采用：Project Gate 显式保留自己的 repository files、duplicate area thresholds、file `300 + 500/10`、function `50 + 150/below 5 + CC 10 + parameters 5` 与 non-blocking policy；Gate aggregate 仍消费每项 eligible Check 的 terminal status。
- 不采用：Gate 特判某个 Check、从 Records 重算 outcome、把 unavailable 降级为 warning、公开 strict/recommended preset，或从 Gate values 动态计算 package defaults。
