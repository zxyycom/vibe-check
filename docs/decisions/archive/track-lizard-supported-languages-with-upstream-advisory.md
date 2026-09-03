---
title: 以仓库提示持续跟随 Lizard 支持语言与 analyzer 修复
status: archived
alignment: aligned
createdAt: 2026-09-02T08:10:11Z
purpose: 让产品自有 function analyzer 及时发现 Lizard 稳定版变化，同时由显式 Change 决定何时采用。
background: 当前 baseline 固定为 Lizard 1.24.0；explicit-only advisory 发现上游变化，但不自动采用。
decision: 保持完整 Lizard 支持范围，并以显式启用的 repository advisory 提示新的稳定版；升级仍经独立 Change 验证后采用。
tags:
  - configuration
  - dependency-policy
  - product-contract
  - workflow-policy
relations:
  - type: 修订
    target: align-function-metrics-inputs-with-lizard-supported-languages.md
---

## 目的

- 让 `functionMetrics` 的语言与 analyzer 行为不会在移除外部 Lizard 后无意停留在一次迁移快照。
- 及时提示 upstream stable release，同时不让网络状态、版本发现或自动代码更新改变普通 Product Run 和 Project Gate 的可信结果。
- 让每次同步都能审阅 reader、extension、metric、provenance、性能与 public behavior 的真实变化。

## 背景

- 当前 analyzer baseline 固定于 Lizard 1.24.0 tag `308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec` 的 27 readers 和 55 suffixes；完整 source/package/Gate 验证已使本记录的方向对齐。任何升级仍须重新核对 mapping 与 fixtures。
- Product-owned analyzer 不通过运行时 version probe 得知上游变化；repository 现有 explicit-only maintenance advisory 才是稳定版发现入口。
- 自动采用 latest 会把未审阅的语言与测量变化直接变成 public behavior；在默认 Gate 中实时查询网络会引入暂时性失败和不可复现结论。
- advisory 的 source-level contract、direct tests 与完整 hard-cut workspace acceptance 已完成；它仍只是一条维护提示，不构成自动采用授权。

## 决策

- 采用: 当前 hard cut 保持 Lizard 1.24.0 的完整 enabled reader surface，并同时保留完整 internal extension protocol；19 个 deferred optional concrete extension body 默认不启用。之后继续把 Lizard stable releases 作为 analyzer 演进输入，而不是永久冻结或只维护高使用率语言。
- 采用: 保持 repository-owned upstream advisory，比较当前 analyzer 记录的 upstream version/revision 与固定官方 release source；发现更新时只形成安全、非阻断的维护提示，不自动修改代码、依赖、Decision 或支持范围。
- 采用: 该 Check 不作为 `@zxyycom/vibe-check` 的 package-provided public Check，也不进入默认离线 Gate；网络访问只能由专用维护 invocation 显式选择，并使用固定 HTTPS target、timeout、response bound、无 ambient credential 与安全诊断。
- 采用: 上游查询失败只影响显式选择的维护 Check，不伪造“没有更新”；普通 required/full Gate、Product outcome 和已发布 analyzer facts 不依赖实时网络结果。
- 采用: 每个 upstream upgrade 使用独立 Change，先更新 source/range mapping、deviation/legal inventory、core/extensions lifecycle corpus，再进行 reader/family fidelity review，最后决定新增 extension、行为修复和 release；版本提示本身不构成采用授权或 parity evidence。
