本 design 说明 `add-basic-quality-metrics` 的实现方案：在真实 scan scope 后接入基础 LOC 指标、文件体量 warning 和 gate 判定。

当前 change 只在 `openspec/changes/add-basic-quality-metrics/` 下形成待审计临时计划，不影响现有其它文档或主规范。

## Context

当前 `vibe-check scan` 已经完成 CLI 解析、project root 归一化、真实 scan scope 文件收集、human/json 投影和退出码映射。Core 的 `scanner_report` 仍将 `metrics.supported_scanner_findings` 固定为 `0`，`warnings` 固定为空，`gate.status` 固定为 `passed`。

`docs/architecture.md` 要求 core scan pipeline 执行 `collect -> scan -> aggregate -> warn -> report -> gate`，并且 Output 不重新计算 metric、warning 或 gate。`docs/scanner-dependencies.md` 已将 `tokei` 作为 LOC、注释行、空行和语言统计的默认 adapter 基线。

## Goals / Non-Goals

**Goals:**

- 新增 `quality-metrics` owner 能力，定义基础指标、warning 和 gate 语义。
- 使用已收集的 supported files 作为指标输入，避免 output mode 改变扫描语义。
- 产出文件级 LOC 指标、聚合 totals、语言聚合和 `file.too_many_lines` warning。
- 让 warning finding 显式携带 `blocking`，并让 `summary.warning_count`、`summary.blocking_warning_count`、`gate.status` 和 `gate.blocking_warnings` 从 warnings 派生。
- 同步 Output schema、examples、human output 和测试，使 JSON report 可验证。

**Non-Goals:**

- 不实现 AST 复杂度、函数级指标、重复代码检测或 accepted/suppressed warning 配置。
- 不新增 CLI 参数或配置发现语义；默认阈值先由 quality metrics owner 记录。
- 不把 `tokei` 原生结构、语言枚举或私有错误作为 public contract 暴露。
- 不在 JSON 中输出逐文件 metrics 列表；文件级 metrics 只作为 warning 生成和局部测试输入。
- 不改变 `schema_version`，除非实现前审计确认新增 `metrics` 子字段无法在 `vibe-check.report.v1` 内兼容表达。

## Decisions

### Decision 1: Add `quality-metrics` as the owner capability

本 change 新增 `quality-metrics`，负责 Core/Scanner 的基础指标模型、聚合、warning policy 和 gate policy。`output-contract` 只修改投影、schema、examples 和 human section 要求，不拥有业务阈值或 warning 规则。

备选方案是把指标字段直接定义在 `output-contract`。这会让 Output owner 同时承担业务语义，违反 Output 不重新计算指标和 gate 的架构边界。

### Decision 2: Use `tokei` as the LOC adapter baseline

后续实现接入 `tokei`，只把 `tokei` 输出归一化为 Vibe Check 的 `FileMetrics`、`LanguageMetrics` 和 diagnostics。输入限制为 scan scope 中的 supported files；unsupported、ignored、generated/vendor/cache 文件不进入指标 adapter。若实现前审计证明 `tokei` 版本、license、编译或 API 不可接受，先更新本 design，再进入替代实现。

备选方案是先手写简单行计数。该方案短期依赖更少，但会绕开 `docs/scanner-dependencies.md` 的默认依赖基线，并且容易在语言分类、注释行和空行语义上产生后续迁移成本。

### Decision 3: Keep stable JSON compact and aggregate-focused

JSON `metrics` 在现有 envelope 内扩展为聚合字段：`supported_scanner_findings`、`files_measured`、`total_lines`、`code_lines`、`comment_lines`、`blank_lines` 和 `languages`。在本 LOC-only change 中，`supported_scanner_findings` 是兼容字段，必须等于成功生成的文件级 metrics 记录数；`files_measured` 是同一计数的语义化名称。文件级 metrics 留在 Core 内部，用于 warning 生成和测试，不在本 change 中作为稳定 JSON 数组输出。

备选方案是在 JSON 中输出每个文件的完整 metrics。该方案有利于调试，但会显著增加 schema surface 和 report 体积；当前 warning findings 已经提供需要定位的文件和位置。

### Decision 4: Make warning blocking explicit

Warning finding 增加 `blocking: bool`，由 Core 在生成 warning 时设置。Output 只投影该字段，不根据 severity 或 rule 重新推断 blocking。`summary.blocking_warning_count` 和 `gate.blocking_warnings` 均从 `blocking = true` 的 warning 数量派生。

备选方案是让 Output 根据 severity 推断 blocking。该方案会把 gate policy 泄漏到 Output，并且未来不同 rule 可能使用相同 severity 但不同 blocking 策略。

### Decision 5: Start warning policy with file size only

MVP warning rule 使用稳定 rule id `file.too_many_lines`。默认阈值为：`total_lines >= 400` 产生 `medium` warning 且 `blocking = false`；`total_lines >= 800` 产生 `high` warning 且 `blocking = true`。同一个文件只产生最高适用等级的一条 warning。该 rule 是 file-level finding，`location` 固定为 `file`，`file` 使用 project-root-relative path，message 包含实际 total lines 和触发阈值。

备选方案是同时加入 comment ratio、language totals 或 zero-code 文件 warnings。当前没有配置 owner 和更多 fixture 证明这些规则的误报成本，先用最容易解释和测试的文件体量规则建立 warning/gate 闭环。

### Decision 6: Gate derives only from blocking warnings

Gate 通过条件为 `blocking = true` 的 warning 数量为 `0`；只要存在 blocking warning，scan 完成但 gate 失败，CLI 退出码为 `1`。Recoverable metrics diagnostics 只把 summary status 变为 `partial`，不直接导致 gate failed，除非同一 report 也有 blocking warnings。

备选方案是让 diagnostics 参与 gate。该方案会混淆质量失败和扫描完整性问题；现有 CLI contract 已经区分 completed gate failure、scanner fatal 和 partial report diagnostics。

## Risks / Trade-offs

- `tokei` dependency 编译、MSRV 或平台兼容性不符合项目预期 -> 实现前审计确认 dependency 版本、license 和最小 fixture；若不可用，先更新 design/tasks，再选择替代方案。
- 默认文件行数阈值可能对小型项目偏严格 -> scan scope 已排除 generated/vendor/cache，配置阈值留给后续 Config change；当前阈值只作为无配置 MVP 默认。
- JSON `metrics` 和 warning `blocking` 扩展可能影响已有 examples -> schema、examples 和 tests 必须同步更新；若审计认为语义不兼容，先决策是否调整 `schema_version`。
- `supported_scanner_findings` 名称不够精确 -> 本 change 将其限定为 LOC-only 阶段的成功文件 metrics 记录数，并通过 `files_measured` 提供清晰名称；未来新增 scanner finding 类型时需重新审计该字段语义。

## Migration Plan

1. 新增或更新 `docs/quality-metrics.md`，并从 `docs/navigation.md` 指向该 owner。
2. 增加 `tokei` workspace dependency 和 LOC adapter seam，先用 fixture 覆盖 Rust、TypeScript/JavaScript、Python 和 Go supported files。
3. 扩展 Core report model、warning/gate 生成和 Output 投影。
4. 更新 JSON schema、examples 和 schema validation test，覆盖 aggregate metrics、language summaries 和 warning `blocking` 字段。
5. 更新 CLI/output integration tests，覆盖 passing metrics report 和 gate-failing warning report。
6. 运行 `cargo fmt`、`cargo clippy --all-targets --all-features`、`cargo test --all`、OpenSpec strict validation 和文档结构验证。

Rollback 策略：实现阶段若 `tokei` 接入无法满足验证，不保留半成品 adapter；回退代码改动，更新 design 决策后再选择替代 LOC adapter。

## Open Questions

无未回答开放问题，可以进入实现前审计。
