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
