# integrate-rust-jscpd-adapter

本 change 定义把 jscpd v5 Rust engine 接入为 Vibe Check 重复代码 scanner adapter 的执行计划；实现完成并归档前，现有主规范和实现仍以当前仓库状态为准。

## Why

Vibe Check 当前 Rust CLI 已经有真实 scan scope 和 LOC metrics，但重复代码检测仍只存在于 TypeScript 开发观测脚本中，核心 CLI 无法向用户报告 copy/paste 风险。项目 scanner 依赖文档已经把 jscpd v5 Rust engine 列为 duplicate scanner adapter 候选；本 change 负责接入其 Rust API、fixture 行为、诊断映射和输出边界。

本 change 已在 `source-audit.md` 前置探索并固定接入事实：实现入口是 `cpd-finder 0.1.8` 的 `cpd_finder::orchestrate::{RunConfig, run}`。实现阶段使用 exact Cargo requirement `cpd-finder = "=0.1.8"`，并直接消费 source audit；只有 Cargo resolution、编译或 fixture 行为与 audit 冲突时才回写 change 文档。

结论：可以接入，方便程度中等偏方便。API 本身直接，稳定接入成本集中在 scan scope 对齐、path normalization、pairwise clone model 和 upstream silent skip 的诊断补齐。

## What Changes

- 新增 Rust duplicate scanner adapter，通过 jscpd v5 Rust engine 的 Rust API 扫描 Vibe Check 已收集的 supported files。
- 使用不可变的第一版内置扫描 profile；本 change 不新增、读取或修改 duplicate scanner 的用户可变配置。
- 将每个 jscpd pairwise clone 归一化为一个 Vibe Check-owned duplicate finding，第三方结构不进入 Core / Output 稳定契约。
- 在 Core 中生成 `duplicate.code_fragment` warning；用户能在 human 和 JSON report 中看到重复片段位置，同时该 warning 第一版保持 `medium`、non-blocking。
- 显式区分正常无重复、partial scanner diagnostic 和 fatal scanner failure，避免 scanner 问题被表现为 clean result。
- 增加 checked-in duplicate-code fixtures 和 adapter / CLI contract tests，证明跨文件重复、同文件重复、默认阈值、scan scope 排除和诊断行为。
- 以当前环境默认 stable 工具链为项目基线，计划通过 `rust-toolchain.toml` 固定 Rust `1.96.0`；该版本由项目环境选择，不由第三方依赖 MSRV 决定。
- 保持现有 Config surface、supported source classification、report schema shape 和 LOC compatibility metrics 不变。

## Capabilities

### New Capabilities

- `duplicate-scanning`：Rust CLI duplicate-code scanner adapter 行为、normalized duplicate finding model、scanner diagnostics，以及 jscpd v5 Rust engine 的 adapter boundary。

### Modified Capabilities

- `quality-metrics`：Core warning / gate behavior 增加 duplicate-code findings，同时保留现有 LOC warning、gate 和 compatibility counter 语义。
- `test-fixtures`：checked-in project fixtures 增加 duplicate-code proof targets，用于 adapter 和 CLI contract tests。

## Impact

- Rust code：`crates/vibe-check/src/core/**`、`crates/vibe-check/src/runtime.rs`、新增 scanner adapter modules、消费 `WarningFinding` 的 output tests，以及 Cargo dependency metadata。
- toolchain：新增 `rust-toolchain.toml`，固定当前环境默认 stable Rust `1.96.0`，并包含现有验证需要的 `rustfmt` 与 `clippy` components。
- docs / specs：`docs/scanner-dependencies.md`、`docs/quality-metrics.md`、`docs/testing/**`，以及本 change 下的 OpenSpec deltas。
- validation materials：Rust unit tests、fixture-backed CLI tests、OpenSpec consumer smoke checks 和 workspace required verification。
- external dependency：jscpd v5 Rust engine，具体通过 exact requirement `cpd-finder = "=0.1.8"` 接入；source-audited details 记录在 `source-audit.md`。
