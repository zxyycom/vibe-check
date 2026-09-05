---
title: 保持 Package 质量默认 advisory 并使 Project Gate 的质量 Finding 阻断
status: active
alignment: aligned
createdAt: 2026-09-05T08:49:10Z
purpose: 保持 Package 默认 advisory，同时让 Project Gate 的未豁免质量 Finding 通过所属 Check status 阻断。
background: Package 默认已改为 advisory，而 Gate 仍显式使用严格阈值和 non-blocking policy。
decision: 保留 Package 默认 advisory；将 Gate 四项质量 Check 显式改为 blocking，并由现有 all aggregate 自然失败。
tags:
  - configuration
  - product-contract
  - product-priority
  - repository-automation
  - workflow-policy
relations:
  - type: 修订
    target: default-package-quality-findings-to-advisory.md
  - type: 替代
    target: keep-repository-quality-findings-advisory-through-release.md
  - type: 修订
    target: require-selected-repository-quality-remediation-in-active-cleanup-changes.md
---

## 目的

- 保持 package-provided duplicate、file metrics、function metrics 与 Markdown link Check 在 consumer 省略 `findingPolicy` 时提供完整的 advisory quality evidence。
- 让本仓 Project Gate 在既有 selection 范围内，把每条未豁免的 normal repository-quality Finding 作为所属 Check 的阻断性结果，而不是仅作为 warning。
- 继续由 producing Check 结算 Finding，并由 Gate 的普通 eligible-status aggregation 形成调用级结论；不创建第二套 Gate 质量判断。

## 背景

- `default-package-quality-findings-to-advisory.md` 已将四项 package constructor 的省略 policy 定为 `non-blocking`，以避免 consumer 无意继承仓库的严格质量要求；它同时记录了 Gate 当时显式的 `non-blocking` 配置。
- `keep-repository-quality-findings-advisory-through-release.md` 使日常与发布验收中的 repository quality Finding 都保持提示，因而不要求 normal Finding 清零。
- `require-selected-repository-quality-remediation-in-active-cleanup-changes.md` 保留了已选清理记录必须实际处置的责任，但以 Gate advisory 为前提，并拒绝将所有未豁免 Finding 升格为 Gate failure。
- Project Gate 已以 `checkAggregation.mode = "all"` 聚合同次 eligible Check 的 settled terminal status；该机制不读取 Records、messages 或 Finding 文本，也不应为质量 Check 建立例外。

## 决策

- 采用：package-provided duplicate、file metrics、function metrics 与 Markdown link Check 的 constructor 默认 `findingPolicy` 继续为 `non-blocking`；不改变其 defaults、公开契约、阈值、scope、exclusion、waiver、flag、required 配置、聚合或 Record shape。
- 采用：Project Gate 对同四项 repository-quality Check 的顶层显式 `findingPolicy` 统一为 `blocking`。在既有 Gate selection 内，未被该 Check 的既有 waiver/exclusion 语义消除的 normal Finding 令 owning Check failed；zero Finding 仍令它 passed。
- 采用：四项 quality Check 都属于 required 与 `--quality` selection，完整 `--all` selection 也包含它们；只有 Markdown link validation 还属于 `--docs`。这些与其它 effective Gate selection 继续只消费 eligible Check 的 terminal status，并使用既有 `all` aggregation。任何上述 failed quality Check 都由这条普通链路令 Gate aggregate failed；Gate 不从 Records、messages 或 Finding 重新计算结果。
- 采用：scanner、source、parse、I/O、containment、limit 和其它 unavailable/failure 路径继续由 owning Check 的既有语义结算；本决策不把它们降级为 quality warning，也不新增 Gate-level waiver 或 release-only policy。
- 采用：活动 repository-quality remediation Change 仍须消除其明确选定的记录，并保存 deferred inventory；严格 Gate 不授权以抬高阈值、改变 selection 或新增 waiver 代替实际修复。
- 不采用：把 package constructor 默认改回 `blocking`、只对 release 或部分质量 Check 提升 policy、改变 strict thresholds 或 selection 边界、从 Gate 的 presentation facts 重算 outcome，或维持未豁免 normal Finding 仍能通过 Project Gate 的过渡基线。
