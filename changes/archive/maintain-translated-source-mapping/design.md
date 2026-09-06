# Design

本设计复用现有 JSON 和 source-identity/provenance 验证边界；ledger 是 target inventory 的唯一编辑源，identity JSON 保留不能推导的人工选择。target closure 直接从 inventory 导出；只保留 package legal-material audit 实际消费的 provenance SHA-256 pin 投影。

## Context

`src/package-checks/function-metrics/analyzer/**` 是 source-aligned Lizard port；其移植来源、identity evidence 与行为测试已有各自 owner。`licenses/lizard-1.24.0-provenance.json` 已拥有 source/range/hash/SPDX 到 target inventory；identity JSON 已拥有 source→symbol/host-seam 选择。前一轮目录重组已完成，不能把本轮持续维护需求回写为已完成布局 Change 的新范围。现有长期 Decision 已要求 ledger、header 与 package materials 协同维护；本 Change 只提供该维护的当前实现和流程。

## Goals / Non-Goals

目标是降低来源到仓库路径映射的手工同步，并让 AI 和维护者能识别唯一编辑源、派生产物、显式写入步骤和验证边界。非目标是改变 Lizard 分析行为、重写上游来源、建立新来源 schema、把行为/parity 证据误作来源映射证据，或为 Gate 的局部类型修正扩大 Change 范围。

## Decisions

### Intended Change

`licenses/lizard-1.24.0-provenance.json` 承接上游来源到仓库路径的权威 target mapping。target closure 直接从 inventory 得出，未保留无独立消费者的 count。source-mapping command 的默认 `check` 只验证，不写工作树；显式 `sync` 仅把 provenance bytes 的 SHA-256 投影到 `scripts/package/package-contract.ts`，因为 package legal-material audit 消费该 pin，并清除 identity JSON 中遗留的派生 `counts.entries`/`counts.targets`。它先成功解析 ledger、identity JSON 和 package pin 并完成 source-identity audit，才写任何文件；失败的预验证零写入，后续写入失败则恢复先前已写内容。代码、JSON 与测试拥有具体格式、生成和校验实现。

`translatedTargetCount` 没有独立消费者，因此直接由 inventory 计算 closure；不把它持久化。package legal-material audit 的 provenance SHA-256 是独立消费者，故保留为唯一 pin 投影。目标测试分别覆盖预验证拒绝不写、后续写入失败恢复，以及成功同步的精确范围。

### Resulting Impacts

映射文件移动或来源调整必须更新唯一 ledger 并运行来源维护验证；`sync` 的写入范围仅为 package pin 和遗留 identity count 清理，不能成为修改 header 或 evidence 的通用途径。source identity 只证明 source→symbol/host-seam identity coverage；行为、oracle 和 parity 仍由其各自测试 owner 证明。

## Risks / Trade-offs

若把 JSON 的投影、真实编辑源或写入权限描述错误，维护者可能手改派生材料或漏掉映射更新。`sync` 会修改工作树，必须保持显式、先完成预验证，并在写入故障时尝试恢复；仅有映射闭合不能证明翻译语义正确。未持久化无独立消费者的 count，避免额外同步与恢复成本。

## Open Questions

当前无未决设计问题。后续若新增消费者要求持久 target summary，必须重新证明该消费者收益、写入范围与失败恢复边界，不能把本 Change 的结论外推。
