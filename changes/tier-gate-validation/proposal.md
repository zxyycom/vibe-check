# Proposal

本计划将快速反馈、受影响验收与完整验收分开，并以版本化策略统一性能阻断。

## Why

实施前的默认 required 已按变更选择，但仍包含慢扫描和多组行为验收；本轮起点运行 32 项，反馈 32.1 秒且三项性能预算超标。日常反馈与交付验收混用，同时 ignored 本机预算不适合作为统一工程约束。

## Outcome

`check` 默认快速反馈，`check -- --changed` 执行全部受影响验收，`check -- --all` 保留独立完整兜底。三档使用仓库版本控制的强制性能策略，超标保留同次现场并退出失败。

## Scope

### Intended Change

调整 Gate 参数、manifest、region、摘要、预算与测试；同步当前规则、Case 与长期判断。不修改 Product API、依赖、测试 runner 分区或质量阈值，不加入超时强杀。

### Resulting Impacts

- 快检有明确资格清单，并按原输入 region 选择；不能代替交付验收。
- changed 纳入相关 artifact/consumer，未知路径或 Git 证据不足保守扩大；all 不依赖变更命中。
- 性能策略由受版本控制的 TypeScript 文件单独拥有；运行时事实用于诊断，不选择本机预算。不读取或迁写旧缓存文件。
- 实施阶段保留既有测试质量清理和性能失败现场；版本保存与 Change 退出按各自授权办理。

## Success Criteria

- 参数、互斥、help 无副作用、三档选择和依赖闭合有可证伪测试；全部现有验收仍可由 all 执行。
- 策略完整、异常测量和预算超标 fail closed，三档各自报告事实，未自动重试或放宽阈值。
- 最窄测试、Case 全树闭合、类型/lint/材料/质量检查通过，实际运行 fast/changed/all 并区分 Checks 与最终结果。
- 独立审查代码职责、文档使用路径与既有工作保护；比较实际反馈范围和耗时，不把少跑检查当作全量性能优化。

## Affected Owners

[Project Gate](../../docs/tooling/project-gate.md)、[工具入口](../../docs/tooling/workspace.md)、[导航](../../docs/navigation.md)、[编码规范](../../docs/development/coding-style.md)、[测试策略](../../docs/testing/strategy.md)、[Case 维护](../../docs/testing/case-maintenance.md)与性能决策。
