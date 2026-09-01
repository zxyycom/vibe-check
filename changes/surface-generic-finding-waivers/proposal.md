# Proposal

本 Draft 让使用内置或自定义 Finding producer 的调用方能从主要用户入口发现通用 waiver 对账能力，并准确理解其适用范围。

## Why

Package root 已公开 `reconcileFindingWaivers(...)`，长期 Decision 也明确它同时服务 custom 与 Product-provided Checks。当前详细契约位于深入 API 文档，README 只把 waiver 对账列为未命名的进阶能力；内置 Check 中只有 `fileMetrics` 直接提供 `findingWaivers` option。用户因此可能误以为没有精确 waiver 工具，或反过来误以为所有内置 Check 都已提供同名配置。

Waiver 不是静默忽略任意 warning。它在完整 Finding 集合形成后按 caller-owned semantic identity 对账，保留原 Finding，并把零次、一次和多次匹配分别审计为 `unused`、`applied` 与 `overmatched`。这个安全边界需要在用户首次选择 Finding policy 时即可发现。

## Outcome

README 与配置导航直接说明 `reconcileFindingWaivers(...)` 的公共用途、审计语义和最小调用路径，并用当前能力矩阵区分通用 helper、`fileMetrics` 原生 option 与尚未接入的内置 Finding producers。文档不把 waiver 描述为日志过滤、扫描前排除或所有 Check 自动具备的配置；后续内置 Check 可以在自己的领域 identity、Records、messages 和 settlement policy 明确后独立接入同一个 helper。
