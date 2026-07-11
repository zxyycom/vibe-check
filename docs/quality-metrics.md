# Quality Metrics

本文是 Vibe Check 基础质量指标、warning 和 gate policy 的 owner 文档。它维护 Core / Scanner 在 scan scope 后如何生成 LOC metrics、聚合 report metrics、产生 warning findings、处理 metrics diagnostics，并计算 gate result。

Output 只投影本文定义的 report data；CLI 只映射已完成 scan 的 gate result 和 fatal error。本文不拥有 CLI 参数、JSON envelope、schema 示例排版、scan scope 文件收集规则或未来 Config 配置入口。

## 实施状态

Rust CLI 已实现本文的 duplicate scanning contract：adapter 归一化 pairwise findings，
Core 生成 non-blocking warnings，并由现有 report schema 投影。当前行为以 adapter / Core
unit tests、fixture-backed CLI contract tests 和 workspace verification 为实现证据；
`integrate-rust-jscpd-adapter` 继续记录本次接入的验收与归档状态。

## Pipeline Boundary

基础质量指标和 duplicate scanning 在 scan scope collection 之后、warning 生成之前运
行：

```text
collect scan scope
  -> measure LOC metrics + scan pairwise duplicates
  -> aggregate metrics + normalize duplicate findings
  -> generate warnings
  -> calculate gate
  -> report data
```

LOC metrics adapter 和 duplicate scanner adapter 的输入只能来自 normalized scan scope 中
已收集的 supported files。Unsupported ordinary files 计入 `scope.file_count`，但不进入任
一 adapter。被默认排除目录、ignore 规则、generated/vendor/cache 边界或其它 scan scope
规则排除的文件不进入 metrics 或 duplicate scanning。

## LOC Adapter

默认 LOC adapter 使用 `tokei`。`tokei` 负责读取文件并识别 code、comment、blank 和语言统计；adapter 负责把第三方结果归一化为 Vibe Check-owned models。

`tokei` 的语言 taxonomy、report structure、错误类型和私有配置不进入 Core 外部契约、Output schema 或 examples。若 `tokei` 因编译、license、平台、API 或 fixture 验证不可接受，必须先更新 scanner dependency 和本 owner，再实现替代 adapter。

## File Metrics

Core 接收的文件级 metrics 使用 Vibe Check-owned model。MVP 字段为：

- `file`: project-root-relative path using `/` separators.
- `language`: stable lowercase Vibe Check identifier, currently `go`, `python`, `rust`, or `typescript`.
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

每个 language summary 包含 `language`、`file_count`、`total_lines`、`code_lines`、
`comment_lines` 和 `blank_lines`。`supported_scanner_findings` 与 `files_measured` 必须相
等。该字段继续只兼容表示成功产生 LOC file metrics 的 supported files；duplicate
finding 或 warning 数量不得加入该计数，也不得改变 LOC totals 或 language summaries。

## Duplicate Scanner Profile

第一版 duplicate scanner 使用 adapter-owned、用户不可变的内置 profile：

- `cpd-finder = "=0.1.8"`，调用 jscpd v5 Rust API；
- `min_tokens = 50`、`min_lines = 5`；
- audited default tokenization mode；
- formats 只包含 `typescript`、`go`、`rust` 和 `python`；
- `no_gitignore = true`、empty ignore / code-ignore / pattern；
- `follow_symlinks = false`、`blame = false`，其它 audited defaults 保持不变。

adapter 只接收 scan scope 已收集的 exact supported file paths，不扫描 project root。每个
upstream clone pair 归一化为一个 Vibe Check-owned finding，不做 graph coalescing。pair
内 locations 先按 `(path, start line, start column, end line, end column)` 排序，再以归一
化 locations 和 token count 形成内部 deterministic identity；finding 也按归一化结果稳
定排序。路径必须是 project-root-relative `/` path。

## Warning Rules

Core 定义以下 warning rules：

| Rule / Condition | Severity | Blocking |
| --- | --- | --- |
| `file.too_many_lines`: `400 <= total_lines < 800` | `medium` | `false` |
| `file.too_many_lines`: `total_lines >= 800` | `high` | `true` |
| `duplicate.code_fragment`: one normalized pair | `medium` | `false` |

同一个文件最多生成一条 `file.too_many_lines` warning，并使用最高适用等级。Finding 必须包含：

- project-root-relative `file`.
- `location = "file"`.
- `severity`.
- `rule = "file.too_many_lines"`.
- message containing the actual total lines and triggered threshold.
- `accepted = false`.
- `suppressed = false`.
- Core-set `blocking`.

每个 normalized duplicate pair 生成一条 `duplicate.code_fragment` warning：

- `file` 使用排序后的第一个 location path；
- `location` 使用 primary fragment 的稳定 `lines START-END`；
- message 包含 token count 和 secondary fragment 的 `path:START-END`；
- `severity = medium`，`blocking = false`、`accepted = false`、`suppressed = false`。

LOC 和 duplicate warnings 合并后按 `(file, location, rule, message)` 排序；Output 不重新排
序。第一版不实现 accepted/suppressed 配置、comment ratio、zero-code file 或 function
complexity warnings。

## Gate Policy

Gate 只从 warning findings 的 `blocking` 值派生：

- `summary.warning_count` 等于 warning findings 总数。
- `summary.blocking_warning_count` 等于 `blocking = true` 的 warning 数。
- `gate.blocking_warnings` 等于 `summary.blocking_warning_count`。
- 存在 blocking warning 时 `gate.status = failed`，否则 `gate.status = passed`。

Recoverable metrics diagnostics 不直接导致 gate failure；只有同一 report 内存在 blocking warning 时 gate 才失败。Gate failure 表示扫描已完成但质量门禁未通过，CLI exit code 为 `1`。

`duplicate.code_fragment` 会增加 `summary.warning_count`，但不会增加
`summary.blocking_warning_count`，也不会单独让 gate failed。

## Diagnostics

Metrics adapter 问题分为两类：

- Recoverable diagnostic: 单个或部分 supported files 无法测量，但仍能产生 report data。诊断进入 `diagnostics`，`summary.status = partial`，`summary.diagnostic_count` 递增，`metrics.files_measured` 只统计成功记录。
- Fatal failure: adapter 无法初始化或无法在 scan scope 后产生 report data。CLI 映射为 scanner fatal exit code `3`，stdout 不写 human 或 JSON scan report。

Diagnostic code 使用稳定大写前缀。LOC adapter 的 recoverable diagnostic 使用 `METRICS_LOC_PARTIAL`；fatal failure 使用 scanner fatal error message，不进入 stdout report。

Duplicate scanner 在调用 upstream 前检查输入仍存在、是 regular file、可读且是 UTF-8：

- 部分文件 preflight 失败但至少一个输入仍可扫描时，每个失败文件产生 warning-severity
  `DUPLICATE_SCAN_PARTIAL` diagnostic，report status 为 `partial`；
- scan scope 原本包含 supported files，但所有 duplicate inputs 都失效时，返回 scanner
  fatal；
- `FinderError`、panic unwind、project root 外 source id、无效 location 或 normalization
  invariant failure 均返回 scanner fatal，不能投影为 empty duplicate result；
- scan scope 没有 supported files、低于 threshold 或没有 clone 属于正常 no-finding，不
  产生 duplicate diagnostic。

Scanner fatal 由 CLI 映射为 exit code `3`，stdout 不写 human 或 JSON report。

## Verification

修改本文 owner 行为时，最低验证包括：

- `tokei` dependency 版本、license、default features 和编译验证。
- TypeScript `.ts`、Go `.go`、Rust `.rs` 和 Python `.py` supported files 的 LOC fixture；`.d.ts` 按 TypeScript supported input 处理。
- Unsupported file 不进入 metrics adapter。
- Metrics aggregation、per-language sorting 和 `supported_scanner_findings = files_measured`。
- Duplicate adapter exact supported inputs、内置 profile、pair normalization 和 deterministic
  ordering。
- Cross-file / same-file duplicate、token / line-span threshold、unsupported / excluded input
  和 zero-supported-input fixture。
- `duplicate.code_fragment` 的两个 locations、token count、summary 计数和 non-blocking gate
  policy。
- Duplicate partial diagnostic、all-input fatal、upstream failure 和 invalid normalized result
  fatal。
- Recoverable metrics diagnostic 产生 partial report。
- Fatal metrics failure 使用 exit code `3` 且 stdout 为空。
- `file.too_many_lines` small、medium non-blocking 和 high blocking 分支。
- Warning `blocking` 投影到 JSON 和 human output。
- Gate failure exit code `1`。
- JSON schema、examples、CLI contract tests 和 OpenSpec strict validation。
