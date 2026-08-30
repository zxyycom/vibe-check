---
title: 让函数指标输入范围与 Lizard 支持语言对齐
status: active
alignment: aligned
createdAt: 2026-08-30T14:43:39Z
purpose: 让 functionMetrics 对 Lizard 1.23.0 正式支持的源文件类型提供完整而受控的 exact-input eligibility。
background: 决策形成前 adapter 只将 TypeScript 与 Rust 路径交给 Lizard，任意未知文本又可能被 Lizard 的 CLike fallback 误测。
decision: 将 functionMetrics 的受支持扩展名集合对齐 Lizard 1.23.0 官方语言范围，同时继续在交给 adapter 前拒绝不受支持输入。
tags:
  - configuration
  - product-contract
relations: []
---

## 目的

- 让 functionMetrics 的 source eligibility 反映其私有 measurement backend 实际正式支持的语言，而不是保留只覆盖 TypeScript/Rust 的人为子集。
- 继续避免把 Markdown、任意文本或其它 Lizard 未正式支持的路径交给 CLike fallback，从而产生错误的函数 measurement。
- 让升级 Lizard 基线时，支持范围和对应验证随 adapter capability 一起重新核对。

## 背景

- functionMetrics 的 Lizard adapter 是 Check-owned private dependency；既有 adapter-protocol 决策已固定 executable、version probe、exact paths 和 CSV protocol，但未将输入语言人为限制为 TypeScript/Rust 作为长期政策。
- Lizard 1.23.0 官方列出多种正式语言和对应扩展名；决策形成前 local eligibility 仅允许 `.ts` 与 `.rs`，使其余已支持语言不能形成可信 measurement。
- Lizard 对显式传入的不受支持文本可能采用 CLike fallback，因此“将所有 files 交给 backend”并不等同于“只使用正式支持输入”。

## 决策

- 采用: functionMetrics 在 exact-input handoff 前使用 adapter-owned、可测试的扩展名 eligibility 集合，覆盖 Lizard 1.23.0 官方支持语言及其官方扩展名；不再只限定 `.ts`/`.rs`。
- 采用: 保留对不受支持扩展名的拒绝，而不是将任意显式文件交给 Lizard；unsupported path 不得通过 CLike fallback 形成 function metric finding。
- 采用: 继续由 functionMetrics 拥有 language eligibility 与 adapter tests，不将该集合提升为 Project-wide source-language registry、public scanner args 或新的 consumer authoring policy。
- 采用: Lizard 版本或官方支持范围变化时，重新核对 extension mapping、fixtures、exact-input behavior 和本决策的 alignment；不从单个当前扩展名推导永恒支持承诺。
