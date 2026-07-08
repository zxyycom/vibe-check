本 delta spec 扩展 `output-contract`：让基础质量指标、warning 和 gate 结果稳定投影到 human output、JSON schema 和 examples。

当前 change 只在 `openspec/changes/add-basic-quality-metrics/` 下形成待审计临时计划，不影响现有其它文档或主规范。

## ADDED Requirements

### Requirement: Basic metrics JSON projection
JSON output metrics SHALL include the basic quality metrics produced by Core report data. MVP `metrics` MUST include `supported_scanner_findings`, `files_measured`, `total_lines`, `code_lines`, `comment_lines`, `blank_lines`, and `languages`; each language summary MUST include `language`, `file_count`, `total_lines`, `code_lines`, `comment_lines`, and `blank_lines`. `metrics.languages` MUST use stable ordering by language identifier.

#### Scenario: JSON includes aggregate metrics
- **WHEN** a completed scan measures supported files
- **THEN** JSON output includes aggregate line totals and `files_measured` under `metrics`

#### Scenario: JSON includes language metrics
- **WHEN** a completed scan measures supported files in multiple languages
- **THEN** JSON output includes one language summary per measured language under `metrics.languages`
- **AND** language summaries are ordered by language identifier

### Requirement: Basic metrics human projection
Human output SHALL render the basic quality metrics from Core report data without recomputing them. Human output MUST show measured supported file count, aggregate line totals, and per-language summaries when metrics are present, and MUST render an explicit metrics empty state when `metrics.files_measured` is `0`.

#### Scenario: Human output includes metrics summary
- **WHEN** a completed scan measures supported files
- **THEN** human output displays measured file count and aggregate line totals from report data

#### Scenario: Human output includes metrics empty state
- **WHEN** a completed scan measures zero supported files
- **THEN** human output explicitly states that no supported files were measured

### Requirement: Warning and gate projection
Human and JSON output SHALL project warning findings and gate result exactly from Core report data. JSON warning items MUST include `blocking` as provided by Core. Human output MUST make blocking warnings distinguishable from non-blocking warnings. Output MUST NOT reclassify warning severity, recompute blocking status, or infer gate status from rendered text.

#### Scenario: Gate-failing report is projected consistently
- **WHEN** report data contains a blocking `file.too_many_lines` warning and `gate.status` is `failed`
- **THEN** JSON output shows the warning with `blocking` set to `true`
- **AND** human output marks the warning as blocking
- **AND** both outputs show the failed gate result

#### Scenario: Non-blocking warning keeps passing gate
- **WHEN** report data contains only non-blocking warnings and `gate.status` is `passed`
- **THEN** JSON output shows each warning with `blocking` set to `false`
- **AND** human output does not mark those warnings as blocking
- **AND** both outputs show the passing gate result

### Requirement: Basic quality schema and examples
JSON schema and examples SHALL validate the basic quality metrics, warning `blocking` field, and gate projection for `vibe-check.report.v1`. Examples MUST include at least one passing metrics report and one gate-failing report caused by `file.too_many_lines`.

#### Scenario: Metric examples validate against schema
- **WHEN** validation checks JSON examples
- **THEN** examples containing basic quality metrics pass the owner schema

#### Scenario: Gate-failing warning example validates against schema
- **WHEN** validation checks the gate-failing JSON example
- **THEN** the example contains a `file.too_many_lines` warning and passes the owner schema
