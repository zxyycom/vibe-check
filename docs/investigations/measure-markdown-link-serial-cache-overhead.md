---
title: "Markdown Link 严格串行 cache 开销测量"
formedAt: "2026-09-03T06:55:56+00:00"
question: "在不跳过 source bytes 且 source I/O 严格串行的 Markdown Link validation 中，当前 explicit parse-facts cache 的可复现基线是什么；哪些低风险解释与实施边界应由后续 before/after 证据检验？"
tags:
  - "markdown-link-validation"
  - "performance"
  - "serial-io"
relations: []
---

## 形成时背景

活动 Decision [`enable-explicit-markdown-link-parse-cache.md`](../decisions/enable-explicit-markdown-link-parse-cache.md) 已确认 persistent parse-facts cache 与 invocation-local target memo 的长期语义：cache 默认关闭、启用必须指定 caller-owned absolute directory，identity 必须来自当前授权 source 的 exact bytes，hit 只跳过 parse-facts computation，不得跳过本次 source collection、授权、endpoint validation 或 Check settlement。

此前支持采用的组合性能数据含已移除的 8 路 source read-ahead；该 Decision 明确禁止将其用于声称当前严格串行实现达到 runtime 性能门槛。本轮形成时，用户要求 source I/O 保持纯串行，不得使用 Git/revision/metadata 在 source bytes 读取前跳过内容，并要求 explicit cache 继续 default-disabled。

形成报告时实际读取的 `/tmp/cache-markdown-link-serial-result.json` 生成于 `2026-09-02T11:35:17.361Z`。该临时文件不是本仓库受管资源；本报告保存其复核所需摘要，而不声称该 `/tmp` 路径长期可用。

## 调查目的

记录当前严格串行基线、可确认的语义边界、尚未归因的候选解释与已授权的低风险优化范围，为 `changes/optimize-markdown-link-serial-io/` 的实现和同 workload before/after 验收提供可独立复核的形成时认识。本报告只拥有该轮认识；当前 contract 仍由 Markdown Link owner 和活动 Decision 拥有。

本轮不判断具体优化已经有效，不把 aggregate duration 推断为单一根因，也不改变长期 Decision、产品 owner 或 public contract。

## 调查范围与依据

- **代码/规则边界：** 阅读 `docs/checks/markdown-link-validation.md` 与活动 Decision `docs/decisions/enable-explicit-markdown-link-parse-cache.md`；前者是 current consumer/I/O owner，后者拥有长期 cache 语义。二者共同要求 exact bytes、default-disabled explicit branch、best-effort fresh-parse fallback 与 current settlement。
- **测量输入：** 上述临时 JSON 指向 repository-owned benchmark command `bun changes/cache-markdown-link-safe-facts/evidence/benchmark.ts --output changes/cache-markdown-link-safe-facts/evidence/results/latest.json`。其 environment 为 Bun `1.3.14`、Linux x64、AMD Ryzen AI 7 H 450、6 CPUs；每组 5 个 samples，wall-clock 使用 median，cold 定义为 application cache directory empty 且不强制清除 OS page cache。
- **workload：** deterministic fixture 的 seed 为 `1592639710`，有 1,000 个 generated sources、160 个 normal targets（normal corpus 合计 1,160 Markdown files）、source size 512/2,048/8,192 bytes，并为每个 source 生成 deterministic 1..5 target links。incremental 运行在独立预热 cache 后只向 `guides/guide-0500.md` append 一个 heading。
- **比较方式：** 同一 formal runtime direct `executeMarkdownLinkValidation` envelope 比较 cache disabled baseline 与 enabled candidate；cold/warm/incremental 各以 5 个交错顺序 samples 的 median 计算。formal runtime 不暴露 physical read/parse counters，因此本轮不能用该文件将 wall time 归因到某一次系统调用或 parser 操作。
- **语义范围：** 文件记录 `resultRecordOrderParity: true`，并记录 logical target-limit、cancellation、source-too-large、target-unavailable、nonempty finding、invalid payload、cache I/O failure、exact-byte mutation、hostile payload 与 parser-version invalidation 的 parity 结果为 true。该项是该 benchmark 的具体 semantic coverage，不替代全部产品测试。

## 调查结果与边界

### 已确认事实

- 当前严格串行临时复测的 median cold baseline 为 `3406.46 ms`，enabled 为 `4637.46 ms`，即 enabled 比 baseline 慢 `36.14%`。该组未通过活动 Decision 背景中提到的原 cold `<= 5%` regression gate。
- warm baseline 为 `3491.10 ms`，enabled 为 `2577.58 ms`，enabled 快 `26.17%`，节省 `913.52 ms`；incremental baseline 为 `3421.53 ms`，enabled 为 `2555.62 ms`，enabled 快 `25.31%`，节省 `865.91 ms`。
- 上述文件的 normal-corpus semantic parity 为 true，且 baseline/candidate 的 normal result 都为 `passed`，final data 中 `sourceFileCount` 为 `1160`、`occurrenceCount` 与 `targetReadCount` 为 `2955`、无 findings。
- benchmark 文件明确说明其 formal runtime 没有 physical I/O 或 parser counter；因此它证明了外部 timing 与列出的 parity case，**没有**证明 cold 退化由某一个已识别内部操作造成。

### 候选解释（尚未确认）

cold enabled 运行可能同时承担 current source-byte digest、cache lookup、payload validation、miss parse-facts publication、目录/文件系统行为以及其它 cache-branch bookkeeping；aggregate wall time 与 CPU deltas不足以区分它们。warm/incremental 改善与 cache hit 避免 parse-facts computation 一致，但不能单独证明哪个成本主导 cold。后续实现必须以局部代码证据及同 workload before/after 复查候选，而不是把这些可能性写成已确认根因。

### 已授权边界与不采用方案

后续实现可在 Link-owned parse-facts cache 内减少已证明冗余的本地工作，但不得恢复并发/read-ahead、不得以 Git/metadata 替代 exact source-byte read、不得改变 disabled branch 或绕过 current Check settlement。

用户提出的“最后集中写入”在本轮不采用：延后多个独立 entry 的写入本身不减少 entry 数量或必需 I/O；改为单一 packed file 会引入全量重写、并发合并、损坏域和增长管理。此为工程取舍，不是 benchmark 已证实的性能根因。

### 待补的 after evidence

本报告形成时尚未实施本 Change 的优化，因而没有 after 计时、cold gate 结论、实现 diff 审核或新增/更新测试结果。实现完成后必须以新的一轮调查报告或（仅为修正本轮记录错误时）更正本报告来保存 before/after；按报告契约，实质新证据通常应形成新的完整后继报告。当前计划将此作为未完成验证任务，不能把 Plan、checkbox 或 baseline parity 当作优化已经完成的证明。
