# Proposal

本临时计划落实全量普查确认的 56 个测试质量调整目标，以实际使用和维护价值决定删除、合并或改写。

## Why

[全量普查](../audit-test-evidence-quality/summary.md)已找到无增量断言、重复输入、被吞掉的失败信号及无区分力的 fixture。用户授权先删无价值和重复内容，再调整仍保护真实风险的低质量测试；不为维持原数量或名义覆盖硬留。

## Outcome

56 个问题目标逐项闭合。原审计预计 42 个质量改写、9 个局部清理、1 个条件合并、3 个 fixture 回收、1 个名称收窄；这是问题分类，不是必须保留或改写的配额。保留独立且实际有价值的验收，最后执行完整 Gate 并交付同次结果与失败现场。

## Scope

### Intended Change

按[既有审计](../audit-test-evidence-quality/coverage.md)确认项实施，不重新扩张可选覆盖。三个互斥源码分区分别拥有 repository/package/Markdown 的 17 个、Run/Definition/scheduler/output 的 19 个、tools/analyzer/data/JSON/scanners 的 20 个目标。合并的承接测试另需调整，不把它重复算成问题目标；两篇文档示例的同类独占目录回收一并处理。

### Resulting Impacts

- 子代理承担主要实现，先统一完成删除/合并阶段，再进入低质量证据改写；共享 Case、协调页和交付材料由主线程串行维护。
- 保留当前 main 上未提交的 Gate 阻断策略、预算和其它工作。测试不足不自动授权产品重构、新公开接口、依赖或验收弱化。
- 按 owner 跑最窄测试、类型/格式/材料检查和全树 Case 闭合；最后运行 `bun run check -- --all`，保留非零结果，不重试求绿、不放宽预算。
- 本计划承接实施与验证；版本保存与 Change 退出按各自授权办理。

## Success Criteria

- 每个确认目标有实际动作和证据；移除内容没有独立实际价值，保留内容能观察相关使用/维护风险。实现发现审计建议不成立时记录事实并采用更小正确动作。
- Gate 合并先保留 exact entry keys 和完整 raw required-set，正确迁移 Case；名称收窄保持语义 Case 连续性。
- 关键假绿路径有稳定外部见证，所有被修改测试通过最窄验证，全部 Case 前后闭合。
- 代码符合编码规范，文档可恢复范围/依据/边界，独立审查完成；完整 Gate 实际运行，成功与失败、未验证边界分别报告。

## Affected Owners

[测试策略](../../docs/testing/strategy.md)、[Case 维护](../../docs/testing/case-maintenance.md)、[编码规范](../../docs/development/coding-style.md)、[Project Gate](../../docs/tooling/project-gate.md)，以及各分区报告关联的当前 Product / package / tooling owner。
