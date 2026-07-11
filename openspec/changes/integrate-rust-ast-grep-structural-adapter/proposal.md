## Why

本 change 计划为现有四种 supported source 接入 Rust 内嵌结构扫描器，使 Rust CLI 能从函数 / 方法结构产生第一条用户可见的函数级质量 warning。当前材料只在 `openspec/changes/integrate-rust-ast-grep-structural-adapter/` 下形成临时变更计划；阻塞级实现前审计已完成，可以按 tasks 进入 source audit，但在归档前不修改现有主规范，也不表示当前 binary 已实现目标能力。

Vibe Check 已通过 `ignore`、`tokei` 和 `cpd-finder` 完成 scan scope、LOC metrics 与 duplicate scanning，但 scanner 依赖基线中的 `ast-grep-core` / `ast-grep-language` 尚未进入 Rust CLI。补齐这个边界可以复用现有 warning、gate 和 output envelope，在不等待 CLI/config 参数汇聚工作的前提下验证函数级扫描闭环。

## What Changes

- 前置审计并固定兼容的 `ast-grep-core` / `ast-grep-language` 版本、features、license、MSRV、语言映射和 parser 行为；dependency characterization 通过后才实现 Vibe Check adapter。
- 新增 structural scanner adapter，只接收 normalized scan scope 已收集的 TypeScript `.ts`、Go `.go`、Rust `.rs` 和 Python `.py` exact file paths，不重新扫描 project root。
- 将可稳定命名的函数、方法和构造器归一化为 Vibe Check-owned `FunctionMetric`，包含 project-relative path、language、kind、display name、line span 和 parameter count；第三方语法树与语言枚举停留在 adapter 内部。
- 固定第一版参数计数语义：按调用者显式传入的参数槽计数，排除语言特有 receiver / `this` 槽；variadic、default 和 destructured parameter 各计一个参数槽。
- 新增 `function.too_many_parameters` warning：normalized parameter count 大于等于 `5` 时生成 `medium`、non-blocking finding，并复用现有 warning、summary 和 gate contract。
- 将单文件读取、UTF-8 或 parse 问题映射为 `STRUCTURAL_SCAN_PARTIAL` diagnostic；adapter 初始化、语言映射或 normalization invariant 失效时映射为 scanner fatal，避免问题被表示为 clean result。
- 增加 checked-in characterization / project fixtures、adapter tests、Core warning tests 和 CLI contract tests，覆盖四种 supported language、稳定排序、receiver 语义、syntax error、UTF-8 路径及 human / JSON warning 投影。
- 保持现有 CLI/config surface、supported extension 集合、report schema shape、LOC compatibility counters 和 duplicate scanning behavior 不变。
- 第一版不纳入 JavaScript / JSX / TSX、匿名 closure / callback、圈复杂度、function NLOC、可配置 threshold、accepted/suppressed、baseline、cache 或 scanner registry 重构。

## Capabilities

### New Capabilities

- `structural-scanning`: 定义 Rust structural scanner 的 exact-input contract、normalized function model、支持的函数形态、参数计数、deterministic ordering 和 diagnostic / fatal 边界。

### Modified Capabilities

- `quality-metrics`: 增加 `function.too_many_parameters` warning、summary 计数、non-blocking gate policy，并保持 LOC compatibility metrics 不变。
- `test-fixtures`: 增加 structural dependency characterization 与用户可见 warning 所需的 checked-in、离线、确定性 proof targets。

## Impact

- Rust code：`crates/vibe-check/src/core/**`、structural scanner adapter modules、`runtime.rs` 的 adapter handoff、warning generation 与相邻 tests。
- Dependencies：workspace Cargo metadata 和 lockfile将新增经 source audit 固定的 `ast-grep-core` / `ast-grep-language` 依赖及必要 features。
- Docs / specs：后续实现需同步 `docs/scanner-dependencies.md`、`docs/quality-metrics.md`、`docs/testing/**`，以及本 change 的三个 capability delta。
- Validation：dependency characterization、Rust unit / integration tests、schema compatibility、OpenSpec strict validation 和 workspace required verification。
- Public contract：不新增 CLI 参数、配置字段或 JSON schema 字段；新增行为通过现有 warning / diagnostic envelope 可见。
