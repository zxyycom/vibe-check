# quality-metrics Specification

## Purpose
Define how Vibe Check turns collected supported files into basic quality metrics, warning findings, diagnostics, and gate results before output projection.
## Requirements
### Requirement: Quality metrics owner documentation
Quality metrics behavior SHALL have a long-term owner document under `docs/` that records metric ownership, LOC adapter boundaries, aggregation semantics, warning rules, default thresholds, blocking policy, gate policy, diagnostics, and verification expectations. `docs/navigation.md` MUST reference this owner document.

#### Scenario: Navigation points to quality metrics owner
- **WHEN** reviewer uses `docs/navigation.md` to locate metrics, warning, or gate rules
- **THEN** the navigation document points to the quality metrics owner document

### Requirement: LOC metrics adapter input
Core scan pipeline SHALL run a LOC metrics adapter after scan scope collection and before warning generation. The adapter MUST receive only collected supported files from the normalized scan scope, and MUST NOT measure files excluded by scan scope rules or files classified as unsupported. MVP supported metric inputs are TypeScript `.ts`, Go `.go`, Rust `.rs`, and Python `.py` files.

#### Scenario: Supported files are measured
- **WHEN** a project root contains collected supported files in TypeScript, Go, Rust, or Python
- **THEN** the LOC metrics adapter produces normalized file metrics for those supported files

#### Scenario: Unsupported files are not measured
- **WHEN** a project root contains collected unsupported files such as Markdown, JavaScript, JSX, or TSX
- **THEN** unsupported files are included in `scope.file_count` but do not produce LOC metrics records

#### Scenario: TypeScript declaration files are measured as TypeScript
- **WHEN** scan scope provides collected supported file `src/types.d.ts`
- **THEN** the LOC metrics adapter treats it as TypeScript input

### Requirement: Normalized LOC metrics
LOC metrics SHALL be normalized into Vibe Check-owned models before aggregation. MVP file metrics MUST include file path, normalized language, total lines, code lines, comment lines, and blank lines for each measured supported file. MVP language identifiers MUST be `go`, `python`, `rust`, and `typescript`.

#### Scenario: File metrics use Vibe Check model
- **WHEN** the LOC adapter measures `src/lib.rs`
- **THEN** Core receives a Vibe Check file metrics record rather than a third-party native report structure

#### Scenario: Language names are normalized
- **WHEN** supported files are measured
- **THEN** their language values are normalized to stable Vibe Check language identifiers `go`, `python`, `rust`, or `typescript`

### Requirement: Metrics aggregation
Core SHALL aggregate normalized file metrics into report data totals and per-language summaries. In this LOC-only change, `metrics.supported_scanner_findings` and `metrics.files_measured` MUST both equal the number of supported files that produced successful file metrics records.

#### Scenario: Totals are aggregated from measured files
- **WHEN** two supported files produce LOC metrics records
- **THEN** report metrics totals equal the sum of their total, code, comment, and blank lines
- **AND** `metrics.files_measured` equals `2`

#### Scenario: Per-language summaries are aggregated
- **WHEN** measured files include Rust and Python files
- **THEN** report metrics include separate per-language summaries for `rust` and `python`

### Requirement: Metrics diagnostics
Recoverable LOC metrics problems SHALL be mapped into normalized diagnostics when report data can still be produced. Reports with recoverable metrics diagnostics MUST set `summary.status` to `partial` and increment `summary.diagnostic_count`. Fatal metrics adapter failures that prevent report data from being produced MUST be reported as scanner fatal errors and MUST NOT write a scan report to stdout.

#### Scenario: Recoverable file metrics failure produces partial report
- **WHEN** one supported file cannot be measured but other supported files produce metrics
- **THEN** scan completes with a diagnostic
- **AND** `summary.status` is `partial`
- **AND** `metrics.files_measured` counts only files with successful metrics records

#### Scenario: Metrics adapter cannot produce report
- **WHEN** the metrics adapter cannot initialize or cannot produce report data after scan scope collection
- **THEN** CLI exits with the scanner fatal exit code
- **AND** stdout does not contain a human or JSON scan report

### Requirement: Warning finding model
Core-generated warning findings SHALL carry all information needed by Output without reclassifying policy. MVP warning findings MUST include project-root-relative file path, location, severity, rule id, message, accepted flag, suppressed flag, and `blocking` flag.

#### Scenario: Warning carries blocking policy
- **WHEN** Core generates a warning finding
- **THEN** the finding includes `blocking` as a boolean value set by Core

#### Scenario: Output does not infer warning policy
- **WHEN** Output renders warning findings
- **THEN** Output can project severity, rule, message, accepted, suppressed, and blocking state from report data without recalculating policy

### Requirement: File size warning rule
Core SHALL generate warning findings from normalized metrics before gate calculation. MVP rule `file.too_many_lines` MUST emit at most one warning per measured file: a non-blocking `medium` warning when total lines are at least `400`, or a blocking `high` warning when total lines are at least `800`. Findings from this rule MUST use project-root-relative file paths and the file-level location value `file`.

#### Scenario: Medium file size warning
- **WHEN** a measured supported file has `400` or more total lines and fewer than `800` total lines
- **THEN** report warnings include one `file.too_many_lines` finding with `medium` severity
- **AND** the warning has `blocking` set to `false`

#### Scenario: High file size warning is blocking
- **WHEN** a measured supported file has `800` or more total lines
- **THEN** report warnings include one `file.too_many_lines` finding with `high` severity
- **AND** the warning has `blocking` set to `true`

#### Scenario: File size warning is file-level
- **WHEN** a measured supported file triggers `file.too_many_lines`
- **THEN** the warning uses the project-root-relative file path
- **AND** the warning location is `file`

#### Scenario: Small files do not warn
- **WHEN** all measured supported files have fewer than `400` total lines
- **THEN** report warnings do not include `file.too_many_lines`

### Requirement: Gate result from blocking warnings
Core SHALL derive report summary warning counts and gate result from generated warning findings. `summary.warning_count` MUST equal the number of warning findings, `summary.blocking_warning_count` MUST equal the number of warnings with `blocking = true`, `gate.blocking_warnings` MUST match `summary.blocking_warning_count`, and `gate.status` MUST be `failed` when blocking warnings are present.

#### Scenario: Blocking warnings fail the gate
- **WHEN** scan completes with one or more blocking warnings
- **THEN** `gate.status` is `failed`
- **AND** `summary.blocking_warning_count` and `gate.blocking_warnings` match the blocking warning count

#### Scenario: No blocking warnings pass the gate
- **WHEN** scan completes with no blocking warnings
- **THEN** `gate.status` is `passed`
- **AND** `gate.blocking_warnings` is `0`

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
