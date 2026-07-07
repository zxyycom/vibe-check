本 tasks 清单把 `add-basic-quality-metrics` 拆成可审计、可验证的实现步骤；目标是在真实 scan scope 后产出基础 LOC 指标、warning 和 gate 结果。

当前 change 只在 `openspec/changes/add-basic-quality-metrics/` 下形成待审计临时计划，不影响现有其它文档或主规范。

## 1. 实现前审计门禁

- [ ] 1.1 阻塞级审计 proposal、design、`quality-metrics` delta spec、`output-contract` delta spec 和 tasks 是否都围绕“基础 LOC 指标、warning 和 gate 结果”展开；审计未完成前不得执行任何实现任务。
- [ ] 1.2 审计 capability ID 是否正确：新增能力只能使用 `quality-metrics`，输出投影变更只能使用既有 `output-contract`，不得把 change name 当作长期 capability。
- [ ] 1.3 审计 `design.md` 的 Decisions 与 specs 是否一致，特别是 `tokei` LOC adapter、`file.too_many_lines` 阈值、warning `blocking` 字段、file-level location、gate policy 和 `metrics` JSON 字段。
- [ ] 1.4 审计 `## Open Questions` 是否没有未回答问题或已收敛歧义；如发现问题，先更新 proposal/design/spec/tasks，不进入实现。
- [ ] 1.5 审计验证路径是否覆盖 owner docs、dependency、Core metrics、warning/gate、Output schema/examples、warning `blocking` projection、CLI exit code 和 OpenSpec strict validation。

## 2. Owner 文档与导航

- [ ] 2.1 新增 `docs/quality-metrics.md`，记录指标 owner、LOC adapter 边界、聚合字段、warning rule、默认阈值、blocking policy、gate policy、diagnostics 和验证要求。
- [ ] 2.2 更新 `docs/navigation.md`，让质量指标、warning、gate 和报告数据任务能定位到 `docs/quality-metrics.md`。
- [ ] 2.3 检查 `docs/architecture.md`、`docs/output.md` 和 `docs/scanner-dependencies.md` 是否只需要摘要或引用同步；保持 owner 边界，不重复定义完整规则。
- [ ] 2.4 用 `docnav outline` 或等价方式检查新增/更新文档结构，并用局部 diff 确认只改目标范围。

## 3. 依赖与 Core 模型

- [ ] 3.1 添加 `tokei` workspace dependency，并确认版本、license、编译和 default features 与 Rust-first scanner dependency 基线兼容；若不可用，先更新 design/tasks 再实现替代方案。
- [ ] 3.2 定义 Vibe Check-owned file metrics 和 language metrics 模型，表达 file path、normalized language、total/code/comment/blank lines。
- [ ] 3.3 扩展 report metrics summary，加入 `files_measured`、line totals 和稳定排序的 `languages`，并定义 LOC-only 阶段 `supported_scanner_findings = files_measured`。
- [ ] 3.4 扩展 warning finding 模型，加入 Core 设置的 `blocking: bool`，并保留 accepted/suppressed 字段不引入配置语义。
- [ ] 3.5 保留测试用 seam，允许 unit tests 注入 metrics adapter 成功、recoverable diagnostic 和 fatal failure。

## 4. LOC Metrics Adapter

- [ ] 4.1 从 scan scope 暴露 supported file iteration，不让 unsupported、ignored、generated/vendor/cache 文件进入 metrics adapter。
- [ ] 4.2 用 `tokei` 实现 LOC adapter，并把第三方结果归一化为 Vibe Check file metrics、language identifiers 和 diagnostics。
- [ ] 4.3 实现 recoverable metrics diagnostic 映射，使部分文件测量失败时仍能产生 partial report。
- [ ] 4.4 实现 fatal metrics adapter failure 映射，使无法初始化或无法产生 report data 的 metrics failure 返回 scanner fatal error 且不写 stdout report。
- [ ] 4.5 添加 fixture 覆盖 Rust、TypeScript、JavaScript、Python 和 Go supported files 的 LOC 指标与语言归一化。

## 5. Warning 与 Gate

- [ ] 5.1 实现 `file.too_many_lines` warning rule：`400 <= total_lines < 800` 产生 non-blocking `medium` warning。
- [ ] 5.2 实现 `file.too_many_lines` blocking 分支：`total_lines >= 800` 产生 blocking `high` warning，且同一文件只产生最高适用等级的一条 warning。
- [ ] 5.3 为 `file.too_many_lines` warning 填充 project-root-relative file path、`location = "file"`、包含实际行数和阈值的 message、accepted=false、suppressed=false 和正确 `blocking` 值。
- [ ] 5.4 从 warning 的 `blocking` 值填充 `summary.warning_count`、`summary.blocking_warning_count`、`gate.status` 和 `gate.blocking_warnings`。
- [ ] 5.5 确认 recoverable diagnostics 只影响 `summary.status = partial` 和 diagnostic count，不直接导致 gate failure。

## 6. Output、Schema 与 Examples

- [ ] 6.1 更新 `docs/schemas/vibe-check-report.schema.json`，在现有 `vibe-check.report.v1` envelope 内声明新增 `metrics` 字段、language summary 结构和 warning `blocking` 字段。
- [ ] 6.2 更新 JSON examples，至少包含 passing metrics report 和由 `file.too_many_lines` 导致的 gate-failing report，并覆盖 warning `blocking` true/false。
- [ ] 6.3 更新 human output，显示 measured file count、aggregate line totals、per-language summaries、metrics empty state，并让 blocking warnings 可区分。
- [ ] 6.4 确认 human/json output 只投影 Core report data，不重新计算 metrics、warning 或 gate。
- [ ] 6.5 更新 schema example validation tests，使新增或更新的 examples 都通过 owner schema。

## 7. 测试与验证

- [ ] 7.1 新增 Core unit tests 覆盖 metrics aggregation、per-language summaries、unsupported file 不测量和 `supported_scanner_findings` 语义。
- [ ] 7.2 新增 diagnostics tests 覆盖 recoverable metrics diagnostic partial report 和 fatal metrics failure exit code `3`。
- [ ] 7.3 新增 warning/gate tests 覆盖 small file no warning、medium non-blocking warning、high blocking warning、file-level location、warning `blocking` 字段和 gate failure。
- [ ] 7.4 更新 CLI contract tests，覆盖 metrics report、gate failure 退出码 `1`、stdout/stderr 边界和 output format 不改变业务语义。
- [ ] 7.5 运行 `cargo fmt`、`cargo clippy --all-targets --all-features` 和 `cargo test --all`。
- [ ] 7.6 运行 `openspec validate add-basic-quality-metrics --type change --strict --no-interactive`，并在涉及 docs 时运行对应 `docnav outline` 验证。
- [ ] 7.7 用局部 diff 确认实现只改 quality metrics、output projection、schema/examples、测试和必要文档范围。
