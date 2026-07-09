本 change 定义把 jscpd v5 Rust engine 接入为 Vibe Check 重复代码 scanner adapter 的执行计划；实现完成并归档前，现有主规范和实现仍以当前仓库状态为准。

## 为什么做

Vibe Check 当前 Rust CLI 已经有真实 scan scope 和 LOC metrics，但重复代码检测仍只存在于 TypeScript 开发观测脚本中，核心 CLI 无法报告 copy/paste 风险。项目 scanner 依赖文档已经把 jscpd v5 Rust engine 列为 duplicate scanner adapter 候选；本 change 负责接入其 Rust API、fixture 行为、诊断映射和输出边界。

本 change 已在 `source-audit.md` 前置探索并固定 jscpd Rust 接入事实：实现入口是 `cpd-finder = "0.1.8"` 的 `cpd_finder::orchestrate::{RunConfig, run}`，当前相关 crate metadata 显示 `cpd-finder 0.1.8`、`cpd-core 0.1.6`、`cpd-tokenizer 0.1.7` 均为 MIT 且 rust-version 为 `1.87`。后续实现直接消费这份 source audit；只有 Cargo resolution、编译或 fixture 行为与 audit 冲突时才回写 change 文档。

结论：可以接入，方便程度中等偏方便。API 本身直接，但稳定接入成本集中在 scan scope 对齐、MSRV `1.87`、path normalization、pairwise clone model 和 upstream silent skip 的诊断补齐。

## 变更内容

- 新增 Rust duplicate scanner adapter 能力，优先接入 jscpd v5 Rust engine 的 Rust API，而不是继续依赖 Node.js CLI wrapper。
- 将 jscpd / `cpd-finder` 原生结果归一化为 Vibe Check-owned duplicate finding model，第三方结构不进入 Core / Output 稳定契约。
- 在 Core 中让 duplicate findings 进入 warning generation 和 gate calculation，使用现有 `WarningFinding` 输出形状投影重复代码风险。
- 明确 recoverable duplicate scanner diagnostics 与 fatal duplicate scanner failures 的映射，不把 scanner unavailable、parse/API mismatch 或 unsupported input 静默当作无重复。
- 增加 checked-in duplicate-code fixtures 和 adapter / CLI contract tests，证明跨文件重复、同文件重复、阈值过滤、scan scope 排除和诊断行为。
- 不在本 change 中引入 JavaScript / JSX / TSX supported source classification，不暴露 jscpd 原始 report structure，也不把 TypeScript quality observability script 的 schema 迁入 Rust CLI。

## Capabilities

### New Capabilities

- `duplicate-scanning`：Rust CLI duplicate-code scanner adapter 行为、normalized duplicate finding model、scanner diagnostics，以及 jscpd v5 Rust engine 的 adapter boundary。

### Modified Capabilities

- `quality-metrics`：Core warning / gate behavior 增加 duplicate-code findings，同时保留现有 LOC-only `file.too_many_lines` rule。
- `test-fixtures`：checked-in project fixtures 增加 duplicate-code proof targets，用于 adapter 和 CLI contract tests。

## 影响范围

- Rust code：`crates/vibe-check/src/core/**`、`crates/vibe-check/src/runtime.rs`、新增 scanner adapter modules、消费 `WarningFinding` 的 output tests，以及 Cargo dependency metadata。
- docs / specs：`docs/scanner-dependencies.md`、`docs/quality-metrics.md`、`docs/testing/**`，以及本 change 下的 OpenSpec deltas。
- validation materials：Rust unit tests、fixture-backed CLI tests；如果扩展 warning examples，还需要 JSON schema / example validation。
- external dependency：jscpd v5 Rust engine，具体通过 `cpd-finder = "0.1.8"` 接入；source-audited details 记录在 `source-audit.md`。
