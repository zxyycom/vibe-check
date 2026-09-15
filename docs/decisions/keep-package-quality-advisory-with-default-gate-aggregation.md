---
title: 保持 Package 质量 advisory 与默认严格 Gate 聚合
id: 260915-keep-package-quality-advisory-with-default-gate-aggregation
status: active
alignment: aligned
createdAt: 2026-09-15T10:33:21Z
purpose: 让 Package 默认 quality evidence 保持 advisory，同时由 Product 默认严格聚合传播 Gate blocking Check 的结果。
background: Gate 已移除显式 effective/all aggregation policy，但质量 Check 的 blocking 责任和 selection 范围不变。
decision: 保留 Package advisory 与 Gate blocking，使用默认有效列表的 strict-all 聚合而非 Gate policy。
tags:
  - configuration
  - product-contract
  - product-priority
  - repository-automation
  - workflow-policy
relations:
  - type: 修订
    target: 260905-keep-package-quality-defaults-advisory-and-make-project-gate-strict
    summary: 以默认严格聚合替换 all policy
---

## 目的

- 保持 package-provided duplicate、file metrics、function metrics 与 Markdown link Check 的默认 advisory quality evidence。
- 让本仓 Project Gate 在既有 selection 内，以 owning Check 的 blocking outcome 和 Product 默认严格聚合阻断未豁免 normal repository-quality Finding。
- 不建立第二套 Gate 质量判断、Finding-to-aggregate 转换或 aggregation policy。

## 背景

- package constructor 省略 `findingPolicy` 时仍是 `non-blocking`，避免 consumer 无意继承仓库严格质量要求；Gate 对四项 quality Check 仍显式使用 `blocking`。
- Gate 不再传入 `checkAggregation.checks: "effective"` 或 `mode: "all"`。完成结算后，Product 对同一 effective selection 的严格默认折叠只有在非空且全部 `passed` 时返回 `passed`；其它终态与空选择均为 `failed`。
- 因此旧记录中“既有 all aggregation”这一机制说明不再是当前事实，但 Package advisory、Gate blocking、quality selection 与 owning-Check 结算的长期取舍仍须独立恢复。

## 决策

- 采用: package-provided duplicate、file metrics、function metrics 与 Markdown link Check 的 constructor 默认 `findingPolicy` 继续为 `non-blocking`；不改变 defaults、公开契约、阈值、scope、exclusion、waiver、flag、required 配置、Check outcome 或 Record shape。
- 采用: Project Gate 对同四项 repository-quality Check 的顶层显式 `findingPolicy` 统一为 `blocking`。在既有 Gate selection 内，未被该 Check 的 waiver/exclusion 语义消除的 normal Finding 令 owning Check failed；zero Finding 令它 passed。
- 采用: 四项 quality Check 属于 required 与 `--quality` selection，完整 `--all` 也包含它们；仅 Markdown link validation 还属于 `--docs`。Gate bound Run 省略 aggregation controls，消费 Product 默认严格 aggregate；任何 failed、unavailable 或 not-applicable effective quality Check，以及空 effective selection，均由该普通链路使 aggregate failed。Gate 不从 Records、messages 或 Finding 重算 outcome。
- 采用: scanner、source、parse、I/O、containment、limit 和其它 unavailable/failure 路径继续由 owning Check 的既有语义结算；本 Decision 不将它们降级为 quality warning，也不新增 Gate-level waiver 或 release-only policy。
- 采用: 活动 repository-quality remediation Change 仍须消除其明确选定的记录，并保存 deferred inventory；严格 Gate 不授权以抬高阈值、改变 selection 或新增 waiver 代替实际修复。
- 不采用: 将 package constructor 默认改回 `blocking`、只对 release 或部分质量 Check 提升 policy、恢复显式 Gate aggregation policy、改变 strict thresholds 或 selection 边界、从 Gate presentation facts 重算 outcome，或维持未豁免 normal Finding 仍可通过 Gate 的过渡基线。
