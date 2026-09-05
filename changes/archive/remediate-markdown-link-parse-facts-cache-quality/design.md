# Design

本 Change 通过明确 Link-private codec 与 per-invocation session 的职责边界，兑现 proposal 的质量与 Check-transparent compatibility Outcome。

## Context

`docs/checks/markdown-link-validation.md#parse-facts-cache-的生命周期与可见性` 与 `docs/decisions/enable-explicit-markdown-link-parse-cache.md` 规定 cache 只能加速 parser facts，不能改变 Check output。此前 `parse-facts-cache.ts` 同时实现 closed/frozen codec 和 session 的 read-once、dirty dedupe、finalize publication，产生 320 code lines 与 `parse` CC 14 的质量 Records。

## Goals / Non-Goals

目标：把 persistent envelope/payload projection、strict restoration 与 identity codec 放入独立 owner-local module；令 session 只负责 invocation lifecycle/I/O；保持内部调用行为与既有 JSONL bytes contract。

非目标：不改变 Markdown Link options、resolver traversal、admission、Check settlement、cache format/version、cache location、并发/lock 语义或其他 Check owner；不以本 Change 的局部验证声明全局 Gate、package 或 release 验证已经运行。

## Decisions

### Intended Change

`parse-facts-cache-payload.ts` 作为 cache envelope/payload codec，拥有 closed/frozen projection、version/identity validation、SHA-256 identity 和 parser-facts restoration。`parse-facts-cache.ts` 保留为 `MarkdownLinkParseFactsSession` 的 I/O/lifecycle owner，以具名步骤处理 fatal UTF-8、restore-once、hit/dirty lookup、fresh parse、deduplication 与 finalize-once publication。

### Resulting Impacts

- codec 与 lifecycle 的唯一交换面是 immutable `ParsedMarkdownLinkFacts` 及 digest/envelope 操作；上游调用面仍是 session `parse`/`finalize`。
- JSONL 的 complete-line、last-valid-wins、partial-tail isolation 与 exact newline append 必须保持；直接 cache tests 继续证明这些存储边界。
- cache read/write failure、cancellation、fatal UTF-8 与 stale/hostile state 必须只导致 fresh-parse/miss 或跳过 publication，不能改变 Check output。
- 直接测试的 entity identity 保持不变；只在既有语义 Case 中增加 finalize-once 的可观察证据，并以 Case ledger 检查其映射。

## Risks / Trade-offs

模块拆分可能改变 JSON serialization、validation，或把 cancellation 移到 append 已开始之后。通过保留版本/constants、严格 decoder bounds、既有 JSONL fixture assertions、最窄 cache tests 和 focused quality Record 比较控制这些风险。

## Open Questions

无。

## Implementation Observations

- 当前实现已将 envelope/payload codec 放入 `parse-facts-cache-payload.ts`，并将 `parse-facts-cache.ts` 限定为 per-invocation read/dirty/finalize lifecycle；两个文件均低于 file-metrics 300-line threshold。
- focused `--quality` 比较的基线为 39 条、结果为 37 条；目标文件的 file-metrics 与 `parse` cyclomatic-complexity Records 已消失，对两个 cache module 的后置 machine-record 筛选为空。
- 既有 cancellation entity 现在第二次调用 `finalize`，仍断言恰有一个 complete JSONL line；这直接证明 publication 开始后再次 finalize 不会重复发布，且没有改变 Case entity identity。
- default Project Gate 已通过（31 passed、5 个未选择的 package-acceptance checks、无 failed/unavailable）；package 与 release verification 未运行，不能从该 Gate 或局部 checks 推断为已完成。
