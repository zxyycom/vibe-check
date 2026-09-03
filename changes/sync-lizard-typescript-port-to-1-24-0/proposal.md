# Proposal

将 Check-private、source-aligned Lizard TypeScript port 的正式 baseline 从 1.23.0 同步到 1.24.0；本 Draft 只定义同步边界，不授权实施。

## Why

当前 `functionMetrics` 已完成不依赖 Python/Lizard runtime 的 1.23.0 hard cut，但显式 maintenance advisory 与 2026-09-03 的上游调查均已确认 1.24.0 是最新正式 release。该 release 包含会影响 reader 的函数识别、范围和 complexity 语义修复。若持续采用该正式 release，必须在不混入 optional extension 或 Product contract 扩张的前提下，更新 source-aligned baseline、可审计 provenance 和 parity evidence。

## Outcome

完成后，`functionMetrics` 的 27 readers / 55 suffixes 在默认且不启用任何 optional extension 的 pipeline 中，对 Lizard 1.24.0 tag 的 oracle 保持 source-aligned parity；port 继续经 private façade 与 Product adapter 分层，且不引入 Python/runtime/CLI/public API、Product metric contract 或未发布 `master` 增量。
