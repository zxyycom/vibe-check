# Quality Metrics

本文是 Vibe Check 基础质量指标、warning 和 gate policy 的 owner 文档。它维护 Core / Scanner 在 scan scope 后如何生成 LOC metrics、聚合 report metrics、产生 warning findings、处理 metrics diagnostics，并计算 gate result。

Output 只投影本文定义的 report data；CLI 只映射已完成 scan 的 gate result 和 fatal error。本文不拥有 CLI 参数、JSON envelope、schema 示例排版、scan scope 文件收集规则或未来 Config 配置入口。

## Pipeline Boundary

基础质量指标在 scan scope collection 之后、warning 生成之前运行：

```text
collect scan scope -> measure LOC metrics -> aggregate metrics -> generate warnings -> calculate gate -> report data
```

LOC metrics adapter 的输入只能来自 normalized scan scope 中已收集的 supported files。Unsupported ordinary files 计入 `scope.file_count`，但不进入 LOC adapter，也不产生 file metrics。被默认排除目录、ignore 规则、generated/vendor/cache 边界或其它 scan scope 规则排除的文件不进入 metrics。

## LOC Adapter

默认 LOC adapter 使用 `tokei`。`tokei` 负责读取文件并识别 code、comment、blank 和语言统计；adapter 负责把第三方结果归一化为 Vibe Check-owned models。

`tokei` 的语言 taxonomy、report structure、错误类型和私有配置不进入 Core 外部契约、Output schema 或 examples。若 `tokei` 因编译、license、平台、API 或 fixture 验证不可接受，必须先更新 scanner dependency 和本 owner，再实现替代 adapter。

## File Metrics

Core 接收的文件级 metrics 使用 Vibe Check-owned model。MVP 字段为：

- `file`: project-root-relative path using `/` separators.
- `language`: stable lowercase Vibe Check identifier, currently `rust`, `typescript`, `javascript`, `python`, or `go`.
- `total_lines`: `code_lines + comment_lines + blank_lines`.
- `code_lines`.
- `comment_lines`.
- `blank_lines`.

文件级 metrics 是 Core 内部输入，用于聚合、warning 和 tests。本阶段不把逐文件 metrics 列表输出为稳定 JSON。

## Aggregation

Report `metrics` 汇总成功产生 file metrics 的 supported files：

- `supported_scanner_findings`: LOC-only 阶段的兼容计数字段，等于成功 file metrics 记录数。
- `files_measured`: 成功 file metrics 记录数。
- `total_lines`.
- `code_lines`.
- `comment_lines`.
- `blank_lines`.
- `languages`: per-language summaries sorted by `language`.

每个 language summary 包含 `language`、`file_count`、`total_lines`、`code_lines`、`comment_lines` 和 `blank_lines`。`supported_scanner_findings` 与 `files_measured` 在本阶段必须相等；后续新增非 LOC scanner finding 时需重新审计该兼容字段语义。

## Warning Rule

MVP 只定义 `file.too_many_lines`。

| Condition | Severity | Blocking |
| --- | --- | --- |
| `400 <= total_lines < 800` | `medium` | `false` |
| `total_lines >= 800` | `high` | `true` |

同一个文件最多生成一条 `file.too_many_lines` warning，并使用最高适用等级。Finding 必须包含：

- project-root-relative `file`.
- `location = "file"`.
- `severity`.
- `rule = "file.too_many_lines"`.
- message containing the actual total lines and triggered threshold.
- `accepted = false`.
- `suppressed = false`.
- Core-set `blocking`.

本阶段不实现 accepted/suppressed 配置语义，也不实现 comment ratio、zero-code file、function complexity 或 duplicate warnings。

## Gate Policy

Gate 只从 warning findings 的 `blocking` 值派生：

- `summary.warning_count` 等于 warning findings 总数。
- `summary.blocking_warning_count` 等于 `blocking = true` 的 warning 数。
- `gate.blocking_warnings` 等于 `summary.blocking_warning_count`。
- 存在 blocking warning 时 `gate.status = failed`，否则 `gate.status = passed`。

Recoverable metrics diagnostics 不直接导致 gate failure；只有同一 report 内存在 blocking warning 时 gate 才失败。Gate failure 表示扫描已完成但质量门禁未通过，CLI exit code 为 `1`。

## Diagnostics

Metrics adapter 问题分为两类：

- Recoverable diagnostic: 单个或部分 supported files 无法测量，但仍能产生 report data。诊断进入 `diagnostics`，`summary.status = partial`，`summary.diagnostic_count` 递增，`metrics.files_measured` 只统计成功记录。
- Fatal failure: adapter 无法初始化或无法在 scan scope 后产生 report data。CLI 映射为 scanner fatal exit code `3`，stdout 不写 human 或 JSON scan report。

Diagnostic code 使用稳定大写前缀。LOC adapter 的 recoverable diagnostic 使用 `METRICS_LOC_PARTIAL`；fatal failure 使用 scanner fatal error message，不进入 stdout report。

## Verification

修改本文 owner 行为时，最低验证包括：

- `tokei` dependency 版本、license、default features 和编译验证。
- Rust、TypeScript、JavaScript、Python 和 Go supported files 的 LOC fixture。
- Unsupported file 不进入 metrics adapter。
- Metrics aggregation、per-language sorting 和 `supported_scanner_findings = files_measured`。
- Recoverable metrics diagnostic 产生 partial report。
- Fatal metrics failure 使用 exit code `3` 且 stdout 为空。
- `file.too_many_lines` small、medium non-blocking 和 high blocking 分支。
- Warning `blocking` 投影到 JSON 和 human output。
- Gate failure exit code `1`。
- JSON schema、examples、CLI contract tests 和 OpenSpec strict validation。
