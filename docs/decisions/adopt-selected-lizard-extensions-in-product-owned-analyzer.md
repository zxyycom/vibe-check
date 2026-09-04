---
title: 在产品自有 analyzer 中私有采用指定 Lizard 扩展
status: active
alignment: aligned
createdAt: 2026-09-03T14:38:08Z
purpose: 保持 Lizard TypeScript hard cut 与完整支持范围，并以闭合 Product contract 私有采用 complextags+ND。
background: 原 hard-cut Decision 将 19 项 legacy bodies 均 deferred；已授权的 selected pair 需要改变该长期 extension boundary。
decision: 1.24 仅私有采用 complextags+ND；其余 17 项和 Halstead 继续 deferred；维持 hard cut 和无 public extension mechanism。
tags:
  - configuration
  - dependency-policy
  - product-contract
  - product-priority
relations:
  - type: 修订
    target: replace-lizard-runtime-with-product-owned-typescript-analyzers.md
---

## 目的

- 让 `functionMetrics` 继续以 Product-owned TypeScript analyzer 完整承接 Lizard `1.24.0` 的 27 readers / 55 个大小写不敏感 suffix，并只在有真实消费者和完整证据时私有采用 selected extension behavior。
- 让 `complextags` 的 CCN explanation 与 ND nesting-depth metric 分别经闭合的 Product contract 交付；不得把 upstream extension inventory 或 internal protocol 误作 public capability。
- 保持 source-aligned port、exact-input、resource/cancellation 与 normal Check settlement 的责任边界；selected adoption 不恢复外部 runtime，也不建立通用 scanner/plugin framework。

## 背景

- 当前 long-term baseline 固定 Lizard `1.24.0` tag `308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec`；Product-owned TypeScript analyzer 已取代 Python、Lizard command、version probe、CSV process adapter 与 public `scanner.executable`。
- 前序 hard-cut direction 用 `translated`、`deferred-extension-body` 与 `excluded-entry-surface` 管理每个 upstream source/range；19 个 legacy concrete bodies 在该 baseline 都是 deferred/no registration。完整 internal extension lifecycle 是 private source-aligned support seam，不是 Product plugin API。
- 已授权 Change `adopt-selected-lizard-extensions` 选择 `lizardcomplextags` 与 `lizardnd`。该 Change 的 implementation、Product docs、tests、oracle、performance 与 required/complete `--all` acceptance 已闭合；本方向已成为 current fact，并由本 active + aligned Decision 承接。

## 决策

- 采用：保留 Product-owned TypeScript hard cut 与固定 1.24 source identity。每个 enabled reader 继续维护 upstream tokenization、function boundary/name/range、NLOC、standard CCN 与 parameter-count semantics；每个 source/range 必须有 `translated`、`deferred-extension-body` 或 `excluded-entry-surface` mapping，必要 host difference 进入 deviation evidence 并有 differential proof。
- 采用：仅在独立 Change 完成 source-range/hash/SPDX/provenance、translated target、processor/lifecycle、27-reader/55-suffix oracle、resource/performance、Product docs/tests 与 workspace acceptance 后，私有采用 `complextags` 与 ND。`complextags` 只为 CCN-over-limit Finding 的 Record 增加完整有序 token/line contributors 和 bounded human explanation，不新增 metric、limit、waiver identity、settlement 或 final-data field。ND 是默认 `7` 的 `nestingDepth.maximum` closed metric，有独立 Finding/waiver/Record/message/final-data contract，并保留 `?` 与 condition 中第一个 `&&`/`||` 的 ND source semantics。
- 采用：selected pair 外的其余 **17** legacy concrete bodies 与 Halstead（含其 source files）继续是 `deferred-extension-body`、默认 no registration/no runtime behavior。upstream body、tag release、reader update 或 translated internal protocol 都不构成自动翻译、注册、公开或 Product adoption 授权；未来 adoption 必须另有 explicit Change 与完整 evidence。
- 采用：selected runtime composition 只能留在 Check-private port → unique Product adapter chain。port façade 是唯一目录外 production entry；adapter 独占 Lizard-domain facts 到 Product metric/Record 的 mapping。Worker、target selection、Check 和 port-external Product tests 不得 deep-import core/reader/extension internals。Product 不公开 extension name/string array/loader/plugin/parser API、backend selection、CLI/stdout/report surface 或跨 Check scanner framework。
- 采用：Product 不恢复 Python/Lizard runtime、subprocess、CSV/version probe、production fallback、public `scanner.executable`、deprecation shim、dual backend 或 public parser/backend plugin selection。analyzer 只消费 owning Check 的 approved exact inputs，并继续在 resource、cancellation、whole-input failure、Finding、waiver、Record 与 final-data settlement boundaries 内工作。
- 不采用：将 remaining optional bodies 当作默认功能或 selected pair 的附带恢复；用 `ns` 取代 ND semantics；将 private extension protocol 扩张为 public compatibility surface；或在 runtime/docs/tests/Decision evidence 不完整时将本 Decision 标记为 aligned。
