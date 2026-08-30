---
title: 公开 Markdown Link 的 Finding Policy
status: archived
alignment: aligned
createdAt: 2026-08-30T04:05:35Z
purpose: 让 markdownLinkValidation 的 consumer 显式选择 link finding 是否阻断，同时保持默认兼容的 blocking 语义与完整 Check facts。
background: area quality Checks 已有 findingPolicy；Markdown Link 仍不能以自身 policy 表达非阻断 finding。
decision: Link 公开默认 blocking 的 findingPolicy；非阻断保留 passed、完整 facts/warning，unavailable 不受影响。
tags:
  - configuration
  - product-contract
relations: []
---

## 目的

- 让 `markdownLinkValidation` 作为普通 public Check 自己表达 link finding 的阻断性，不让 Project Gate 或 Record consumer承担该领域选择。
- 保持现有 consumer 的默认 blocking 兼容性，并让已确认 non-blocking 使用场景仍能获得完整可操作的 Check facts。
- 维持 Link Check 的 source selection、resolver、安全边界与 four-state unavailable 语义不被 finding policy 混淆。

## 背景

- `share-finding-policy-across-area-quality-checks.md` 已为三个 area-based quality Checks 确立 blocking/non-blocking policy、完整 Record 与 Check-owned status 的边界；它不自动把该 public option 扩展到 Markdown Link。
- 当前 Project Gate 的 all-eligible aggregation 要求质量 Check 的非阻断由 producing Check 形成 passed，而不是从 Gate aggregate 排除。Markdown Link 因此需要自己的明确 public policy。
- 当前两条 Markdown link findings 是 repository-quality 的已知事实；本记录不允许将它们隐藏、删除或称为已修复。公开发布前的处置属于独立 release-quality 决策。
- parser、decode、source/root/target I/O、canonicalization 与 parse failures 的 unavailable 语义不是 finding policy 的适用范围。

## 决策

- 采用: `markdownLinkValidation` 的 public closed options 接受 `findingPolicy: "blocking" | "non-blocking"`，省略时为 `blocking`；default/config validation、declarations、guide、examples 与 runtime 保持同一 contract。
- 采用: 可信 link finding 无论 policy 都完整生成 Link-owned final data 与 safe supplemental Records；non-blocking finding 不短路后续候选，Check 结算为 passed 并附 actionable warning，blocking finding 结算为 failed。
- 采用: source selection、decode、parser、project root、target resolution/canonicalization 与 I/O 出现 unavailable 时，Check 结算为 ordinary unavailable，不因为 `findingPolicy: "non-blocking"` 变为 passed 或仅 warning。
- 采用: Gate 只接收 Markdown Link Check 的 terminal status；它不解析 Link Records/messages/finding count，也不向 Link Check 注入第二套 outcome policy。
- 不采用: 默默改默认值为 non-blocking、以 Gate entry exclusion/Record reducer 表达 Link policy、公开 generic finding registry，或把 malformed/unavailable source/target 折叠为 non-blocking link finding。
