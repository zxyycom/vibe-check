# quality-metrics delta

本 spec delta 定义 `integrate-rust-jscpd-adapter` 新增的 duplicate warning / gate 行为；归档前，主规范仍以当前仓库状态为准。

## ADDED Requirements

### Requirement: Duplicate code warning rule
Core SHALL 在 gate calculation 前，从 normalized pairwise duplicate findings 生成 warning findings。第一版 rule `duplicate.code_fragment` MUST 为每个 pair 生成一条 `medium`、non-blocking warning。warning MUST 让用户定位 primary fragment，并识别另一处 duplicate fragment。

#### Scenario: Duplicate finding 生成 warning
- **WHEN** duplicate scanning 返回一个 normalized duplicate finding
- **THEN** report warnings 包含一条 `duplicate.code_fragment` finding
- **AND** warning severity 为 `medium`
- **AND** warning 的 `blocking`、`accepted` 和 `suppressed` 均为 `false`

#### Scenario: Duplicate warning 标识两个 locations
- **WHEN** duplicate scanning 返回一个包含 `src/a.rs` 和 `src/b.rs` locations 的 finding
- **THEN** warning `file` 使用 normalized ordering 中的 first location path
- **AND** warning `location` 使用 primary fragment 的稳定 line range
- **AND** warning message 标识另一处 fragment path / line range 和 token count

#### Scenario: 没有 duplicate finding 时不告警
- **WHEN** duplicate scanning 没有返回 normalized duplicate findings
- **THEN** report warnings 不包含 `duplicate.code_fragment`

### Requirement: Warning ordering remains deterministic
Core SHALL 在合并 LOC 和 duplicate warnings 后按 `(file, location, rule, message)` 排序。相同源码、相同 scan scope 和相同内置 profile MUST 产生相同的 warning 数量、内容和顺序。

#### Scenario: LOC 和 duplicate warnings 组合稳定
- **WHEN** report 同时包含 `file.too_many_lines` 和 `duplicate.code_fragment` warnings
- **THEN** Core 按统一 deterministic key 输出 warnings
- **AND** Output 不重新排序或重新分类 warnings

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

### Requirement: Duplicate scanning preserves LOC compatibility metrics
Duplicate findings and warnings MUST NOT 改变 LOC metrics totals。`metrics.supported_scanner_findings` MUST 继续等于 `metrics.files_measured`，并只统计成功产生 LOC file metrics 的 supported files。

#### Scenario: Duplicate warning 不改变 metrics counters
- **WHEN** scan 产生一个或多个 duplicate warnings
- **THEN** `metrics.supported_scanner_findings` 仍等于 `metrics.files_measured`
- **AND** duplicate finding 数量不加入该 compatibility counter
