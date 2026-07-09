本 spec delta 定义 `integrate-rust-jscpd-adapter` 需要新增的 duplicate warning / gate 增量；归档前，主规范仍以当前仓库状态为准。

## ADDED Requirements

### Requirement: Duplicate code warning rule
Core SHALL 在 gate calculation 前，从 normalized duplicate findings 生成 warning findings。第一版 duplicate-code rule `duplicate.code_fragment` MUST 为每个 duplicate group 生成一条 `medium`、non-blocking warning，并使用 project-root-relative file path 和能识别 duplicate group locations 的 location value。

#### Scenario: Duplicate finding 生成 warning
- **WHEN** duplicate scanning 返回一个 normalized duplicate finding
- **THEN** report warnings 包含一条 `duplicate.code_fragment` finding
- **AND** warning severity 为 `medium`
- **AND** warning 的 `blocking` 为 `false`

#### Scenario: Duplicate warning 标识 locations
- **WHEN** duplicate scanning 返回一个包含 `src/a.rs` 和 `src/b.rs` locations 的 finding
- **THEN** warning 使用 deterministic primary location 中的 project-root-relative file path
- **AND** warning location 或 message 标识两个 duplicate fragment locations

#### Scenario: 没有 duplicate finding 时不告警
- **WHEN** duplicate scanning 没有返回 normalized duplicate findings
- **THEN** report warnings 不包含 `duplicate.code_fragment`

### Requirement: Duplicate warnings preserve gate policy
Core SHALL 将 duplicate-code warnings 计入 `summary.warning_count`，同时保持 gate 只由 blocking warnings 决定。第一版 non-blocking duplicate-code rule MUST NOT 单独导致 gate failure。

#### Scenario: Non-blocking duplicate warning 保持 gate passed
- **WHEN** scan 完成后存在一条 `duplicate.code_fragment` warning，且没有 blocking warnings
- **THEN** `summary.warning_count` 包含这条 duplicate warning
- **AND** `summary.blocking_warning_count` 为 `0`
- **AND** `gate.status` 为 `passed`

#### Scenario: Duplicate warning 和 blocking warning 正确组合
- **WHEN** scan 完成后存在一条 non-blocking `duplicate.code_fragment` warning 和一条其它 rule 的 blocking warning
- **THEN** `summary.warning_count` 统计两条 warnings
- **AND** `summary.blocking_warning_count` 只统计 blocking warning
- **AND** `gate.status` 为 `failed`
