# Proposal

本 Change 以可审阅的局部重构清除当前仓库质量扫描中的未接受告警；只允许经过逐项证实的误报使用精确、带理由的单项接受规则。

## Why

`bun run quality` 在恢复 Lizard 函数指标后报告 33 条未接受记录：11 条文件代码行数、19 条函数行数或圈复杂度、3 条参数数量。它们覆盖 Product 定义、运行、质量 Core、输入解析、调度和测试材料。简单提高全局阈值、扩大排除范围或批量接受会掩盖真实可维护性问题，不能满足当前用户目标。

## Outcome

当前告警逐条得到可复核结论：可维护性问题通过职责清晰的重构和现有行为证据修复；只有确实不代表可维护性风险且无法以合理局部重构消除的项目，才以稳定记录选择器、精确谓词和说明理由获得单项接受。质量报告不再包含未解释的遗留告警。

交付前，当前 Change 的文档改动按 AI-ready 阅读路径复审，代码改动按 `docs/coding-style.md` 复审；相邻代码只用于恢复接口事实，不能成为偏离规范的理由。

## Scope

- 审阅并处理当前 `file-metrics` 与 `function-metrics` 的 33 条记录，覆盖定义/Run、quality-core、输入与调度三个互斥工作区。
- 保持公开 Check、Record、Run、scanner、输出和调度契约不变；重构时同步相邻测试、Case 和当前 owner 文档。
- 如确有误报，使用现有 `DecisionPolicy` 的精确 record selector 和 path/metric 谓词记录单项 acceptance 与可审计理由。
- 对本 Change 的文档与代码 delta 进行最终 standards review：默认值只在其 owner 完整表达，新增模块、helper、类型和错误路径必须符合编码规范，而非沿用临近代码的偶然形式。

不纳入范围：

- 提高全局阈值、排除整个 code area、禁用 scanner、批量或模糊 selector 接受告警。
- 实施历史 `add-file-policy-overrides` Change、替换 Lizard backend，或改变质量扫描的 Record 语义。
- 归档本 Change 或其他既有 Change。

## Success Criteria

- 每条初始记录都有“已重构修复”或“经证实的单项接受”之一；没有无理由的剩余记录。
- 没有全局阈值、scope exclusion 或 broad acceptance 用于掩盖该批告警。
- 所有重构保持相应 Product 可观察行为，并完成目标测试、测试证据闭合、quality 入口和 required workspace 验证。
- 任何 acceptance 都可由报告中的 acceptance ID、精确 selector/predicates 和理由追溯到具体误报。
- 文档读者能从实际 owner 文本恢复 scanner 默认值、命令字段关系和 adapter 边界；代码 reviewer 能说明每个新增单元的单一职责与验证依据。

## Affected Owners

- `docs/coding-style.md`：局部可推理、职责拆分和验证原则。
- `docs/architecture.md`、`docs/configuration.md`、`docs/quality-metrics.md`、`docs/scanner-dependencies.md`：Definition、Run、质量记录、default option owner 与 scanner adapter 不变量。
- `docs/testing.md`、`docs/testing/cases/**`：测试实体和语义 Case 闭合。
- `src/product/**`、`scripts/quality/project-definition.ts`：告警目标模块及可能的精确 policy acceptance。
