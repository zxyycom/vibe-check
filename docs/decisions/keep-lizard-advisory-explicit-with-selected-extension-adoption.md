---
title: 在采用指定扩展时保持 Lizard advisory 显式
status: active
alignment: aligned
createdAt: 2026-09-03T14:38:09Z
purpose: 让 upstream maintenance advisory 持续只提示稳定版，并把 selected extension adoption 保持为独立、显式的 Product 决策。
background: 原 advisory Decision 以 19 项 deferred 为 1.24 baseline；selected pair 只更新 count，不扩大 advisory owner。
decision: advisory 继续 explicit-only 且不自动采用；仅 complextags+ND 可由独立 Change 私有采用，其余 17 项和 Halstead 保持 deferred。
tags:
  - configuration
  - dependency-policy
  - product-contract
  - workflow-policy
relations:
  - type: 修订
    target: track-lizard-supported-languages-with-upstream-advisory.md
---

## 目的

- 让 repository-owned maintenance advisory 持续只提示 Lizard upstream stable release，并与 ordinary Product Run、default required/complete `--all` Gate 及已发布 analyzer facts 隔离。
- 让当前 Lizard `1.24.0` 27-reader/55-suffix support surface 只随 explicit Change 演进，不被 latest label、network state、tag discovery 或 internal extension inventory 自动改变。
- 让 selected `complextags` 与 ND adoption 保持独立、私有且证据闭合的 Product decision，同时明确其余 optional bodies 的 deferred boundary。

## 背景

- 当前 analyzer source identity 是 Lizard `1.24.0` tag `308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec`；Product-owned analyzer 在 normal execution 不以 runtime version probe 读取 upstream state。
- 前序 advisory direction 的 1.24 baseline 将全部 19 个 legacy concrete bodies 设为 deferred/no registration。已授权 Change `adopt-selected-lizard-extensions` 只选择 `lizardcomplextags` 与 `lizardnd`；该 Change 的 implementation、Product docs、tests、oracle、performance 与 required/complete `--all` acceptance 已闭合，本更新已成为 current fact，且 advisory owner 不扩大。
- real-time network lookup 可独立于 Product invocation 失败或变化。advisory 只服务 explicit maintenance work；它不能为 normal quality outcome、reader capability、extension availability 或 source adoption 提供运行时依据。

## 决策

- 采用：保持 current full enabled Lizard reader surface（27 readers / 55 suffixes），并用 explicit-only repository advisory 比较记录的 baseline 与固定 official release source。advisory 只输出安全、non-blocking maintenance prompt；不自动修改 code、dependency、Decision、reader support surface、source mapping 或 Product result；它不是 package-provided Check，也不是 default offline Gate dependency。
- 采用：仅在独立 Change 完成 fixed-tag source/provenance/oracle parity、private port/Product adapter boundary、closed Product contract、docs/tests/performance 与 workspace acceptance 后，私有采用 `complextags` 与 ND。`complextags` 仍只是 CCN Finding explanation；ND 仍是默认 `7` 的 closed nesting-depth metric。advisory 发现或成功 network query 不是 adoption authorization 或 parity evidence。
- 采用：selected pair 外的其余 **17** legacy concrete optional bodies 与 Halstead source 继续 `deferred-extension-body`、默认 no registration/no runtime behavior。advisory、upstream release、reader change 或 internal protocol 不会自动翻译、注册或公开这些 bodies；未来 adoption 需要单独 explicit Change 与完整 Product evidence。
- 采用：advisory network failure 只影响 explicit maintenance invocation，且不得伪造“没有更新”。ordinary required/complete `--all` Gate、Product outcome 与已发布 analyzer facts 不依赖实时 network。每次 future upstream upgrade 仍须独立审阅 source/range mapping、legal/deviation inventory、core/extension lifecycle、reader parity 与所需 Product behavior，再决定是否发布。
- 不采用：将 advisory 用作 runtime version probe、默认 Gate input、自动 source/extension adoption trigger、public extension discovery API，或 selected pair 外 bodies 的默认恢复机制。
