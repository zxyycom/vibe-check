---
title: 为翻译的 analyzer 保留适用 upstream 许可与声明
status: active
alignment: aligned
createdAt: 2026-09-02T08:10:12Z
purpose: 让忠实翻译 Lizard 的代码可随 MIT 产品发布，同时准确携带衍生部分的来源、修改和许可材料。
background: 产品 owner 允许直接翻译；Lizard 1.23/Pygments provenance 与独立 legal inventory 已由 package/Gate 验证。
decision: 原创部分继续使用 MIT，翻译或衍生 analyzer 按逐文件 provenance 保留 upstream 条款并进入独立 legal inventory。
tags:
  - dependency-policy
  - product-contract
  - workflow-policy
relations:
  - type: 修订
    target: license-package-under-mit.md
---

## 目的

- 允许按产品 owner 选择忠实翻译 Lizard analyzer，同时不把“注明来源”误作完整的 redistribution 条件。
- 保持 Vibe Check 自有实现的 MIT 方向，并让消费者可以从 package 内独立 legal materials 检查翻译部分的实际许可与修改声明。
- 避免把详细 third-party license 正文塞入 README、Check guide 或主要使用流程。

## 背景

- 实施前 package manifest、root `LICENSE` 和发布验收只表达 Vibe Check 的 MIT 许可；当前 source tree 与 package legal inventory 形成 `THIRD_PARTY_NOTICES.md`、`licenses/**`、source headers 与 provenance closure，并已通过 candidate/installed 和 workspace Gate 验证。每次运行的 candidate 标识仍只属于 Change evidence，不是本记录的长期事实。
- Lizard 1.23 distribution 顶层许可说明适用于未另行说明的部分，而核心 `lizard.py` 具有 Apache-2.0 file header；固定 Pygments 2.18.0 ErlangLexer 来源为 BSD-2-Clause。接近上游结构和表达的 TypeScript 翻译因此具有逐文件而非单一来源的 provenance。
- Apache-2.0 redistribution 对适用衍生部分要求提供 license、标明修改、保留有关声明，并在上游存在 NOTICE 时携带相应 attribution；仅写“来源于 Lizard”不能替代这些材料。

## 决策

- 采用: Vibe Check 独立原创代码与材料继续使用 MIT；从 Lizard 文件直接翻译或形成衍生表达的 analyzer 文件保留该来源适用的 MIT 或 Apache-2.0 条款，不把它们重新表述为仅受 Vibe Check MIT 许可。
- 采用: source/range ledger 记录 exact upstream tag/revision、target 或 exclusion、适用 header/license、状态及 notice obligation；状态只可为 `translated`、`deferred-extension-body` 或 `excluded-entry-surface`。无可解释 provenance 的 in-range source 不得进入 hard-cut candidate。
- 采用: 每个 translated source range 的承载文件以简短 header 指向来源、upstream revision、适用 SPDX identifier 和本项目修改事实；完整第三方 attribution、修改说明与所需 notice 进入 package-root `THIRD_PARTY_NOTICES.md`，完整附加许可文本进入 package `licenses/` inventory。deferred body 与 excluded entry surface 保留 ledger 理由，不能因“当前没用”无记录消失。
- 采用: root MIT `LICENSE`、generated manifest、third-party inventory 与 package-wide license expression 由 artifact tooling 按 ledger 保持一致；不预断言最终只需 MIT，也不让 main README 或 Check guide 承担详细法律正文。
- 采用: candidate、tarball、installed consumer 与 public inventory tests 证明 legal materials 完整、路径稳定且与实际 shipped analyzer source 对应；upstream 后续同步同时更新 ledger、headers 和 package materials。
- 不采用: 省略适用许可证、只在提交消息或普通文档中笼统致谢，或者因翻译成 TypeScript、修改名称或改写每一行就删除 upstream provenance。
