# jscpd Rust adapter 设计

本 change 定义把 jscpd v5 Rust engine 接入为 Vibe Check duplicate scanner adapter 的执行方案；实现完成并归档前，现有主规范和实现仍以当前仓库状态为准。

## Context

Vibe Check 当前 Rust CLI 已经通过 `ignore` 收集 scan scope，并通过 `tokei` 产生 LOC metrics、`file.too_many_lines` warning 和 gate result。重复代码检测目前只在 `scripts/tools/quality-core` 中参与开发质量观测，不属于 Rust CLI release contract。

前置探索记录在 `source-audit.md`。当前实现 target 是 `cpd-finder 0.1.8` 的 `cpd_finder::orchestrate::{RunConfig, run}` API；相关 crates 为 MIT，upstream MSRV 为 Rust `1.87`。项目工具链独立选择当前环境默认 stable Rust `1.96.0`，不把依赖 MSRV 当作项目版本选择依据。

## 用户体验目标

第一版完成后，用户应观察到以下行为：

1. supported source 中达到内置默认阈值的重复片段出现在 human 和 JSON report 的 `duplicate.code_fragment` warnings 中。
2. 每条 warning 能定位 primary fragment，并指出另一处重复片段；相同源码重复扫描得到相同 warning 数量、内容和顺序。
3. duplicate warning 为 `medium`、non-blocking，会增加 `summary.warning_count`，但不会单独让 gate failed。
4. unsupported files、excluded paths 和低于默认阈值的相似文本不产生 duplicate warning。
5. 局部文件问题形成带 `DUPLICATE_SCAN_PARTIAL` diagnostic 的 partial report；无法信任 duplicate scan 结果时，CLI 使用 scanner fatal exit code `3`，而不是报告 clean。
6. scan scope 没有 supported files 时，duplicate scanner 被跳过，scan 正常完成且不产生 duplicate diagnostic。

## Goals / Non-Goals

Goals：

- 在 scan scope collection 之后新增 Rust duplicate scanner adapter path，通过 `cpd-finder` 调用 jscpd v5 Rust API。
- 只扫描 Vibe Check 已收集的 `.ts`、`.go`、`.rs` 和 `.py` supported files。
- 将 pairwise clone output 归一化为 Vibe Check-owned findings，再生成用户可见 warnings。
- 使用不可变内置扫描 profile，固定 threshold、mode、scope 和 error behavior。
- 保留 scanner diagnostics 和 fatal failure 边界。
- 用 checked-in fixtures 证明用户可见行为和跨平台 path normalization。

Non-Goals：

- 不新增、解析或修改 duplicate scanner 的 CLI / config-file settings；可变 threshold 和 scanner profile 由后续 change 处理。
- 不把 JavaScript、JSX、TSX、Markdown、Vue、Svelte、Astro 加入 Rust CLI supported source classification。
- 不迁移 TypeScript quality observability schema、cache format、baseline comparison 或 code-area model。
- 不在 stable JSON output 中新增 raw duplicate list，也不暴露 jscpd native structs 或 reporter output。
- 不新增 accepted / suppressed warning configuration semantics。
- 不实现 pairwise clone 的 graph coalescing，也不增加 external process fallback。

## Decisions

### Decision 1：使用 exact `cpd-finder 0.1.8` Rust API

Cargo manifest 使用 `cpd-finder = "=0.1.8"`，adapter 调用 `cpd_finder::orchestrate::{RunConfig, run}`。`Cargo.lock` 记录 resolved source，`cpd-core` 和 `cpd-tokenizer` 仅在实现必须命名其 public types 时才成为 direct dependencies。

编译、Cargo resolution 或 public API mismatch 属于 apply-time blocker，不属于运行时 diagnostic。发生冲突时先更新 `source-audit.md`、本 design 和相关 spec delta，再决定继续或停止实现。

### Decision 2：输入只来自 normalized supported scan scope

adapter 接收 Vibe Check 已收集的 exact supported file paths，不扫描 project root。第一版 formats 为 `typescript`、`go`、`rust`、`python`，jscpd 不重复应用 gitignore、ignore pattern 或 positive glob filtering。

scan scope 没有 supported files 时，runtime 跳过 duplicate adapter，并返回正常 completed report。该状态不是 unsupported，也不产生 diagnostic。

### Decision 3：每个 pairwise clone 对应一个 finding

每个 upstream `CpdClone` 归一化为一个 Vibe Check `DuplicateFinding`，第一版不执行 graph coalescing。两个 fragment locations 先按 `(path, start line, start column, end line, end column)` 排序；排序后的 location tuple 与 token count 构成内部 deterministic identity。

路径统一映射为 project-root-relative `/` paths。无法映射回 project root、location 无效或 clone 缺少两个可信 fragment 时，adapter 返回 fatal failure，因为该结果不能安全投影为用户报告。

### Decision 4：使用不可变内置扫描 profile

第一版 profile 固定为：

- `min_tokens = 50`
- `min_lines = 5`
- default tokenization mode，即当前 audited `Mode::Mild`
- `max_lines = None`、`max_size = None`
- `skip_local = false`、`ignore_case = false`
- `workers = None`、`blame = false`
- `follow_symlinks = false`，与当前 scan scope collector 行为保持一致
- `formats = ["typescript", "go", "rust", "python"]`
- `ignore = []`、`code_ignore_patterns = []`、`pattern = None`
- `no_gitignore = true`

这些值由 adapter constants / constructor owning，第一版不提供用户覆盖入口。实现可以从 `RunConfig::default()` 构造配置，但必须显式覆盖 scope ownership 所需字段。

### Decision 5：warning 以用户定位和确定性为核心

每个 normalized pair 生成一条 `duplicate.code_fragment` warning，severity 为 `medium`，`blocking = false`，`accepted = false`，`suppressed = false`。

warning 使用排序后的第一个 fragment 作为 primary location：

- `file` 为 primary project-relative path。
- `location` 使用稳定的 `lines START-END` 表达。
- `message` 包含 token count 和另一处 fragment 的 `path:START-END`。

Core 合并 LOC 和 duplicate warnings 后，按 `(file, location, rule, message)` 排序。具体 Rust 字段布局属于实现细节；测试证明用户可见语义和确定性，不把内部 pair identity 暴露为新 schema 字段。

### Decision 6：明确 recoverable 与 fatal 边界

preflight 在调用 upstream 前确认输入仍存在、是 regular file、可读并可按 UTF-8 处理。

- 部分输入失败且至少一个输入仍可扫描：跳过失败输入，为每个失败文件生成 warning-severity `DUPLICATE_SCAN_PARTIAL` diagnostic，继续产生 partial report。
- scan scope 原本含 supported files，但所有 duplicate inputs 都在 preflight 失败：返回 scanner fatal error。
- `FinderError`、panic unwind、越界 source id、无效 location 或无法归一化的 clone：返回 scanner fatal error。
- 低于 threshold、没有 clone 或没有 supported files：正常 no-finding，不产生 diagnostic。

fatal failure 在 report 完成前映射为 exit code `3`，stdout 不写 human 或 JSON report。静态 dependency / API 不兼容在 build verification 阶段阻止实现交付，不伪装成运行时 unsupported state。

### Decision 7：项目固定当前环境默认 Rust 工具链

当前环境默认 active toolchain 为 `stable-x86_64-pc-windows-msvc`，实际 `rustc 1.96.0`、`cargo 1.96.0`。实现新增 `rust-toolchain.toml`：

- `channel = "1.96.0"`
- `profile = "minimal"`
- `components = ["rustfmt", "clippy"]`

项目工具链版本由开发环境基线决定，独立于 `cpd-finder` 的 Rust `1.87` MSRV。依赖 MSRV 只作为兼容性检查：它必须不高于项目固定工具链。

### Decision 8：保持现有 report compatibility fields

`metrics.supported_scanner_findings` 继续等于 `metrics.files_measured`，只表示成功产生 LOC file metrics 的 supported files。duplicate findings 只增加 warnings，不改变该 compatibility counter、`scope.supported_file_count` 或 metrics totals。

本 change 不新增 report schema 字段。现有 warning、diagnostic、summary 和 gate 字段足以表达第一版用户体验。

### Decision 9：文档先行并设置 dependency characterization gate

实现顺序固定为 owner docs、dependency characterization、Vibe Check model / adapter、Core integration、contract evidence 和 final verification。`docs/scanner-dependencies.md`、`docs/quality-metrics.md` 与 testing owner / case materials 先记录目标契约和 planned proof targets，并在 change 归档前明确区分目标契约与当前 binary 实现状态。

owner docs 和 OpenSpec validation 通过后，才允许修改 Cargo manifest 或 Rust application code。加入 exact dependency 后先用 checked-in fixtures 直接验证 `cpd_finder` 的 individual-file paths、format mapping、threshold、scope ownership 和 source-id behavior；characterization gate 未通过时先更新 artifacts 并停止后续 model、adapter 和 runtime integration。

## Risks / Trade-offs

- [Risk] `cpd-finder` 为 `0.1.x`，API 可能变化。Mitigation：使用 exact `=0.1.8`，并通过 compile 和 fixture tests 验证 adapter boundary。
- [Risk] pinned Rust `1.96.0` 在新环境中可能尚未安装。Mitigation：checked-in toolchain file 让 rustup 给出明确安装行为；CI / release environment 必须提供该工具链。
- [Risk] upstream 会 silent skip 部分文件问题。Mitigation：Vibe Check preflight、partial diagnostics 和 fatal integrity checks owning 可观察结果。
- [Risk] pairwise warnings 可能对重叠 clone 产生多条告警。Mitigation：第一版保持上游 pair 语义和 deterministic ordering；需要聚合时另开 UX change。
- [Risk] built-in `50` tokens / `5` line-span threshold 可能需要校准。Mitigation：先以 fixtures 固定默认体验；可变配置和 threshold policy 后续独立演进。
- [Risk] `cpd-tokenizer` 带入 `oxc_*` 等 transitive dependencies。Mitigation：在 dependency docs 和 lockfile diff 中记录编译成本，不将 transitive types 泄漏到 Core。

## Migration Plan

1. 先更新 scanner dependency、quality metrics 和 testing owner / case 文档，记录目标契约、planned proof targets 与当前实现状态；运行文档和 OpenSpec validation。
2. 新增 `rust-toolchain.toml` 和 exact `cpd-finder = "=0.1.8"` dependency，确认 toolchain、Cargo resolution 和 compile API 与 source audit 一致。
3. 用最小 checked-in fixtures 直接运行 dependency characterization，证明 individual-file scan scope、format、threshold 和 source-id assumptions；失败时回到 artifacts，不继续实现。
4. characterization gate 通过后，新增 Vibe Check-owned duplicate model、adapter boundary、内置 profile、preflight 和 normalized pair implementation。
5. 把 duplicate findings 接入 warning generation、deterministic ordering 和现有 gate calculation。
6. 增加 adapter / CLI contract evidence，并将 `@case` markers、case ledger、schema examples 与 owner docs 对账。
7. 运行 Rust、OpenSpec、docs 和 required workspace verification；只有全部通过才完成 change tasks。

## Open Questions

无未回答开放问题。项目工具链、默认扫描 profile、pairwise 语义、用户可见 warning、诊断边界、gate policy 和 compatibility counter 均已收敛；实现阶段只需验证已记录事实，不再扩展配置范围。
