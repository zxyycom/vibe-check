# Proposal

本 Draft 设计可配置的 Product progress preview 方向；用户已明确本轮只先修文档，尚未批准公共 API 或 runtime 实施。

## Why

`src/project-run/progress-rendering/renderer-formatting.ts` 当前固定每类 preview 最多 5 条 Record 和 5 条 message，并把 terminal text 限为 240 code points。公共 `outputs.progressRendering` 目前只有 `enabled`，用户提出应可独立指定预览数量与截断 hook。

这与各 Core Check 生成何种 Finding facts 不同：Check 拥有 Finding、message 与 Record 事实；renderer 只拥有 terminal-safe、bounded presentation。

## Outcome

形成可供确认的公共 API 方案，明确是否分别配置 Record/message 数量及文本截断，以及 formatter hook 的输入、同步性、失败、privacy、fingerprint 和 Definition/RunControls 归属。确认后才可建立实施 Plan；未确认时维持现有 `{ enabled }` 行为。

稳定 owner 是 [`docs/development/project-run.md`](../../docs/development/project-run.md)、[`docs/api-mechanics.md`](../../docs/api-mechanics.md)、`src/project-run/progress-rendering/**` 与 Project Definition/Run tests。此 Change 不把此前文档修复或 Gate 结果表述为新 API 已完成。
