本 delta 定义 structural metrics 进入 warning 与 gate 的增量契约；当前只在已完成阻塞级实现前审计的 change 目录中形成临时变更计划，归档前不修改现有 `quality-metrics` 主规范，也不表示当前 binary 已实现该契约。

## ADDED Requirements

### Requirement: Function parameter warning rule
Core SHALL 在 gate calculation 前从 normalized `FunctionMetric` 生成 function warning。第一版 rule `function.too_many_parameters` MUST 在 `parameter_count >= 5` 时为每个 function metric 生成一条 `medium`、non-blocking warning；`parameter_count < 5` 时 MUST NOT 生成该 rule。warning MUST 使用 project-root-relative file、稳定 source line range、function display name、实际 parameter count 和 threshold，并且 `accepted`、`suppressed` 与 `blocking` MUST 均为 `false`。

#### Scenario: 达到参数阈值时生成 warning
- **WHEN** normalized function metric 的 `parameter_count` 为 `5`
- **THEN** report warnings 包含一条 `function.too_many_parameters` finding
- **AND** warning severity 为 `medium`
- **AND** warning 的 `accepted`、`suppressed` 和 `blocking` 均为 `false`

#### Scenario: Warning 提供稳定定位信息
- **WHEN** `src/service.rs` 中 display name 为 `build_service` 的 function 在 lines `20-30` 具有六个 explicit parameters
- **THEN** warning `file` 为 `src/service.rs`
- **AND** warning `location` 为稳定的 `lines 20-30`
- **AND** warning message 包含 `build_service`、实际 parameter count `6` 和 threshold `5`

#### Scenario: 低于参数阈值时不生成 warning
- **WHEN** normalized function metric 的 `parameter_count` 为 `4`
- **THEN** report warnings 不包含该 function 的 `function.too_many_parameters` finding

### Requirement: Function warnings preserve gate and LOC compatibility metrics
Core SHALL 将 `function.too_many_parameters` findings 计入 `summary.warning_count`，同时保持 gate 只由 blocking warnings 决定。Function metrics 与 function warnings MUST NOT 改变 LOC totals、language summaries、`metrics.files_measured` 或 `metrics.supported_scanner_findings`；`metrics.supported_scanner_findings` MUST 继续等于 `metrics.files_measured`。

#### Scenario: Function-only warning 保持 gate passed
- **WHEN** scan 只产生一条 `function.too_many_parameters` warning 且没有 blocking warning
- **THEN** `summary.warning_count` 包含该 warning
- **AND** `summary.blocking_warning_count` 为 `0`
- **AND** `gate.status` 为 `passed`

#### Scenario: Function warning 与 blocking warning 共存
- **WHEN** report 同时包含一条 non-blocking function warning 和一条 blocking warning
- **THEN** `summary.warning_count` 统计两条 warnings
- **AND** `summary.blocking_warning_count` 只统计 blocking warning
- **AND** `gate.status` 为 `failed`

#### Scenario: Function findings 不改变 LOC compatibility counters
- **WHEN** structural scanning 返回一个或多个 function metrics 或 warnings
- **THEN** `metrics.supported_scanner_findings` 仍等于 `metrics.files_measured`
- **AND** function metric 与 warning 数量不加入 LOC compatibility counter

### Requirement: Warning ordering includes structural findings
Core SHALL 在合并 LOC、duplicate 和 function warnings 后按 `(file, location, rule, message)` 排序。相同源码、相同 scan scope 和相同内置 profiles MUST 产生相同 warning 数量、内容和顺序；Output MUST NOT 重新排序或重新分类 structural warnings。

#### Scenario: 三类 warning 使用统一排序
- **WHEN** report 同时包含 `file.too_many_lines`、`duplicate.code_fragment` 和 `function.too_many_parameters` warnings
- **THEN** Core 按统一 deterministic key 输出全部 warnings
- **AND** human 与 JSON output 消费相同顺序的 report data
