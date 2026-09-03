---
title: 在 Lizard 私有 façade 使用可验证且可回退的 reader 快速解析
status: active
alignment: aligned
createdAt: 2026-09-03T07:15:30Z
purpose: 消除常规文件上的重复有序正则选择，同时保持翻译主体、异常文件名语义与 Product 边界。
background: Lizard 上游逐 reader 正则选择在 Bun 批量分析中成为首要热点，而翻译主体必须继续便于逐版本同步。
decision: 只在手写私有 façade 为已证明安全的完整文件名建立 source-order-derived 快速路径，其余输入回退上游对齐 registry。
tags:
  - dependency-policy
  - performance
  - product-contract
  - workflow-policy
relations: []
---

## 目的

- 在不改写 Lizard source-aligned registry、reader、shared、core 或 extension protocol 的前提下，消除常规已接纳文件重复执行 ordered filename regex scan 的主要成本。
- 让优化、上游同步与 Product adapter 各自保持单一 owner：优化只存在于唯一 Check-private port façade，不扩张 public API，也不把 reader internals 泄露给 Product。

## 背景

- Lizard 1.24 上游的 `get_reader_for` 按 source order 遍历 reader，并由每个 `match_filename` 执行 suffix regex；当前 TypeScript port 忠实保留了该结构。
- 固定 3,456-file representative batch 累计 48,384 次 filename regex test。profile 与输出等价的反事实实验将 reader dispatch 确认为首要热点；仅预编译 reader regex 收益很小，而 suffix-index 候选显示值得进入独立实施 Change 的回收方向。
- CPython 在 warmed operation 中通过 `re` cache 避免重复实际编译，Bun 路径仍为每次 candidate 构造 `RegExp` 对象并执行完整路径匹配。该事实说明 host/runtime 差异，但不授权修改上游对齐实现。
- 现有已对齐决策已经规定 `functionMetrics/analyzer/**` 是 Check-private port，port façade 是唯一目录外 production entry，Product adapter 不得访问 core、registry 或 readers。本决策不改变该边界。

## 决策

- 采用: 只在手写 `analyzer/port-facade.ts` 内建立一个私有、只读、source-order-derived reader index。index 从 `languages()` 的当前顺序构造；case-insensitive canonical suffix 重复时保持 first-match/first-wins，不复制第二份手工 extension 清单。
- 采用: `isLizardSourceSupported` 与 `analyzeLizardSource` 共用唯一私有 resolver，避免 capability 与 analysis 选择漂移。resolver 只对已有 differential/property evidence 证明安全的完整 filename grammar 使用 O(1) fast path；Unicode、line terminator 或任何未覆盖形状继续调用原 `get_reader_for`。
- 采用: 该 fast path 是 analyzer port 内的显式 host deviation，不冒充上游翻译。实施必须在 current deviation owner 记录该非机械差异；root provenance inventory 与 source-identity mapping 保持不变，并证明原 reader registry、`CodeReader.matchFilename`、readers、shared、core 与 extension protocol 零修改。
- 采用: 对齐证据必须覆盖 27 readers、56 declared extension entries、55 case-insensitive canonical suffixes、重复 precedence、mixed case、Unicode case-fold、line terminators、多点路径、路径分隔符、无 suffix 与 unknown suffix；同时保持完整 Lizard oracle parity、两个 façade API 的 resolver identity，以及固定 manifest 的正式 15-block ABBA before/after evidence。
- 采用: 只有实现、current deviation owner、未漂移的 root provenance/source identity 与上述 correctness/performance evidence 全部闭合后，本决策才可标记 aligned。性能未改善、任意 filename 语义无法闭合或需要触及 source-aligned core 时，保留原 registry 路径并停止该实施方向。
- 不采用: 不重排 readers，不修改 `get_reader_for` 或 `CodeReader.matchFilename`，不把 reader constructor 暴露给 Product adapter，不建立公共 plugin/parser API，不以切换 Node 或修改 translated tokenizer 作为本决策的一部分。
