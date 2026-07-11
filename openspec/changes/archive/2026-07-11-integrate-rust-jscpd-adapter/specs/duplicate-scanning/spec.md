# duplicate-scanning delta

本 spec delta 定义 `integrate-rust-jscpd-adapter` 新增的 duplicate scanner 用户行为；归档前，主规范仍以当前仓库状态为准。

## ADDED Requirements

### Requirement: Duplicate scanner adapter input
Core scan pipeline SHALL 从 Vibe Check normalized scan scope 运行 duplicate scanning。duplicate scanner adapter MUST 只接收已收集的 supported files，MUST NOT 扫描被 scan scope rules 排除的文件，也不能扫描 Rust CLI supported source set 判定为 unsupported 的文件。

#### Scenario: 接收 supported files
- **WHEN** scan scope 包含 supported files `src/a.rs` 和 `src/b.rs`
- **THEN** duplicate scanner adapter 接收这些 exact supported file paths 作为 scan input

#### Scenario: 不扫描 unsupported files
- **WHEN** scan scope 包含 supported file `src/lib.rs` 和 unsupported ordinary file `README.md`
- **THEN** duplicate scanner adapter 接收 `src/lib.rs`
- **AND** duplicate scanner adapter 不接收 `README.md`

#### Scenario: 遵守 excluded paths
- **WHEN** generated、vendor、cache、target 或 ignored paths 下的 project files 已被 scan scope collection 排除
- **THEN** 这些 excluded files 不进入 duplicate scanner input

#### Scenario: 没有 supported files 时正常完成
- **WHEN** normalized scan scope 不包含 supported files
- **THEN** runtime 跳过 duplicate scanner adapter
- **AND** scan 正常完成，不产生 duplicate warning 或 duplicate diagnostic

### Requirement: jscpd Rust engine integration boundary
duplicate scanner adapter SHALL 通过 Rust API 接入 jscpd v5 Rust engine。adapter MUST 将 jscpd 或 `cpd-finder` native result types、reporter output 和 private configuration 限制在 adapter boundary 内，并且 MUST 向 Core 返回 Vibe Check-owned duplicate results 或 diagnostics。

#### Scenario: Rust API result 被归一化
- **WHEN** jscpd Rust engine 报告 duplicate clone pair
- **THEN** Core 接收 Vibe Check duplicate finding，而不是 jscpd-native result structure

#### Scenario: Reporter output 不是 stable contract
- **WHEN** adapter 使用任何 jscpd reporter 或 raw summary 调试 scanner behavior
- **THEN** raw reporter output 不作为 stable JSON output field 暴露

### Requirement: Normalized pairwise duplicate finding
Duplicate scanner results SHALL 在 warning generation 前归一化为 Vibe Check-owned duplicate finding records。每个 upstream clone pair MUST 产生一个 duplicate finding，第一版 MUST NOT 对多个 pairs 做 graph coalescing。每个 finding MUST 包含 deterministic internal identity、两个 project-root-relative locations、每个 location 的 line span，以及 scanner token count。

#### Scenario: Cross-file duplicate 被归一化
- **WHEN** jscpd 报告跨 `src/a.rs` 和 `src/b.rs` 的 clone pair
- **THEN** normalized duplicate finding 包含这两个 project-root-relative files 的 locations
- **AND** 每个 location 包含 line span

#### Scenario: Same-file duplicate 被归一化
- **WHEN** jscpd 报告同一个 supported file 内的两个 clone locations
- **THEN** normalized duplicate finding 将两个 locations 保留为独立 spans

#### Scenario: Pair 不被合并
- **WHEN** jscpd 返回两个相互重叠或共享 location 的 clone pairs
- **THEN** adapter 返回两个 normalized duplicate findings

#### Scenario: Duplicate finding 顺序确定
- **WHEN** 同一个 project 在源码未变化时重复扫描
- **THEN** pair 内 locations 和 duplicate findings 使用 normalized path / location deterministic ordering

### Requirement: Built-in duplicate scanning profile
duplicate scanner adapter SHALL 使用不可变的第一版内置扫描 profile。profile MUST 使用 `min_tokens = 50`、`min_lines = 5`、audited default tokenization mode 和 Vibe Check-owned scope overrides。

#### Scenario: 达到默认 token 和 line threshold
- **WHEN** supported source 包含 token count 至少为 `50` 且满足 `5` line-span 规则的 duplicate pair
- **THEN** duplicate scanner 返回 normalized duplicate finding

#### Scenario: 低于默认 token threshold
- **WHEN** 相似文本的 duplicate token count 小于 `50`
- **THEN** duplicate scanner 不为该文本返回 normalized duplicate finding

#### Scenario: 低于默认 line threshold
- **WHEN** 相似文本达到 token threshold 但不满足 `5` line-span 规则
- **THEN** duplicate scanner 不为该文本返回 normalized duplicate finding

### Requirement: Duplicate scanner diagnostics
duplicate scanner adapter failures SHALL 显式可见。部分输入失败但仍有可信 scanner data 时，adapter MUST 产生 `DUPLICATE_SCAN_PARTIAL` diagnostics 和 partial report；无法产生可信 duplicate result 的 failure MUST 映射为 scanner fatal error，MUST NOT 转换成 empty duplicate result。

#### Scenario: Recoverable duplicate scanner issue 产生 partial report
- **WHEN** 一个 supported file preflight 失败，但至少一个其它 supported file 仍可扫描
- **THEN** scan report 包含该文件的 warning-severity `DUPLICATE_SCAN_PARTIAL` diagnostic
- **AND** `summary.status` 为 `partial`

#### Scenario: 所有 collected inputs 失效时 fatal
- **WHEN** scan scope 原本包含 supported files，但所有 duplicate scanner inputs 都在 preflight 失败
- **THEN** CLI 以 scanner fatal exit code `3` 退出
- **AND** stdout 不包含 human 或 JSON scan report

#### Scenario: Adapter result 无法信任时 fatal
- **WHEN** adapter 收到 `FinderError`、panic unwind、project root 外的 source id、无效 location 或无法归一化的 clone
- **THEN** CLI 以 scanner fatal exit code `3` 退出
- **AND** scanner failure 不表现为 zero duplicate findings
