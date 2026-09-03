# Proposal

在真实 `functionMetrics` 消费者选择的前提下，评估并仅实施一个最小、closed 的 Lizard extension-derived Product capability；若没有该选择，则以不扩张完成。

## Why

Lizard 1.24.0 的 optional extensions 不等于 Vibe Check 已有的用户价值或实施授权。当前 Product 只发布 NLOC、standard CCN 和 parameter count，且 private port boundary 禁止把 source extension 名称、数组或 generic plugin surface 公开。先完成真实消费者和语义选择，才能避免将上游存在、翻译可行或 deferred provenance 误写为默认功能。

## Outcome

本 Change 在 Draft 阶段取得真实消费者选择：默认 `none`；只有选定一个具体、closed outcome 时，才在完整 Change 名 `sync-lizard-typescript-port-to-1-24-0` 的 1.24 stable commit 进入实施基线后，于同一 Change 实现、验证并交付最小 Product capability。选择 `none` 时记录不扩张结论且不改 runtime。任何结果都不公开 Lizard extension names/array，也不创建 generic plugin API。
