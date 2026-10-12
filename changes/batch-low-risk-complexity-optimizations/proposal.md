# Proposal

把已识别的低风险局部索引与分配优化作为同一批实施、测量和验收，不混入需要重新决定契约或调度策略的优化。

## Why

[复杂度调查](../../docs/investigations/audit-checks-core-algorithmic-complexity.md)中仍有重复 membership、线性 lookup 和累计数组分配。
[当前 Run 测量](../../docs/investigations/profile-post-optimization-run-stages.md)表明 R04 不是当前主要耗时，因而不以跨阶段复用或快照重构扩大本批风险。
用户已授权集中推进低风险项，并指定仅由 GPT‑6.1‑sol 子代理承担实施与独立审查；主线程负责范围、编排和验收。

## Outcome

在不改变公开行为、错误优先序、输出顺序或策略结果的前提下，集中减少本地重复查找和分配，并用同条件 before/after 证据限定收益及小规模成本。

## Scope

### Intended Change

- C01/C03：identifier 去重与 blocker 重复拒绝的局部 membership。
- R08：flags、direct relation 和 artifact directory 的同生命周期 lookup；R04：单次 prepare 内的 scope/task 分组。
- K04/K07/K14：code-area membership、SCC argv 滚动成本和 Finding 排序的临时对象分配。
- T01/T02：learned prepared closure 内不可变 graph、prediction、score 与 history 索引。
- C05：仅在保护常见小型 schema 的测量支持下采用；否则记录本批不采用。

R05、跨阶段 graph 复用、调度算法与策略、跨 Run 状态、缓存政策、文件系统安全和深度预算均不在本批。

### Resulting Impacts

- 建立局部索引会增加准备和内存成本，须同时测量小输入与放大输入，区分局部与端到端证据。
- 私有接线变化须守住现有 validation、顺序、first-match、duplicate-reject、权限和生命周期。
- 相邻测试与 Case 映射须语义闭合；公开文档与内部 owner 的影响判断须由非实施代理反查。
- 测量原始结果、脚本、复现入口和未采用项须在本 Change 中交接，避免只留下速度结论。

## Success Criteria

1. 每个采用项有实际 diff、对应 owner/可观察不变量及覆盖该边界的自测；不采用项有明确理由。
2. 同条件 before/after 比较先通过输出与错误/顺序等价检查，保留 small/scaled 原始测量与分布；不宣称未测收益。
3. 未引入 public API/schema、调度结果、跨 Run 状态或错误优先序变化；C05 不以大输入收益掩盖常见 schema 成本。
4. 指定模型子代理完成实施与独立审查，实质阻断清除；完整 Case 检查、受影响静态检查及跨 owner Gate 通过。
5. owner 交接、临时物归宿、未运行验证及剩余风险均有可恢复记录；未经本次删除授权不 finalize Change。

## Affected Owners

- [Project Definition](../../docs/development/project-definition.md)、[Check results](../../docs/development/check-results.md)、[Core 数据工具](../../docs/guides/data-boundaries.md)。
- [Project Run](../../docs/development/project-run.md)、[依赖指南](../../docs/guides/check-dependencies.md)、[Scheduler](../../docs/development/scheduler.md)。
- [Duplicate detection](../../docs/checks/duplicate-detection.md)、[File metrics](../../docs/checks/file-metrics.md)、[Markdown lint](../../docs/checks/markdown-lint.md)。
- [随包工具](../../docs/development/package-tools.md)、[learned 调度](../../docs/guides/learned-scheduling.md)。
- [测试策略](../../docs/testing/strategy.md)、[Case 维护](../../docs/testing/case-maintenance.md)、[Change 协调](../../docs/governance/change-coordination.md)。
