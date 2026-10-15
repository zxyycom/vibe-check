# Proposal

定位并减少既有 Gate 重项的实际工作成本，保持完整验收、并发、资源与预算。

## Why

解析器变更的提交前完整 Gate 两轮功能均通过，但 P95 为 6.94s / 6.71s，超过既有 5s 预算。
慢项集中在消费者类型验收、产物验收、函数指标及部分 Workbench 测试；用户确认纳入本轮性能优化后再提交。

## Outcome

已证明的重复或低效动作在所属 owner 内收敛，同口径测量能恢复成本变化，完整 Gate 保持验收覆盖并满足既有预算。

## Scope

### Intended Change

产物验收按文件一次收集相邻中文 JSDoc 的声明名，完整核验原公开清单；ESM 审计复用一次解析的 AST 与语法诊断，省去丢弃的转译 emit。

### Resulting Impacts

补强声明文档、ESM 语法和 Worker URL 的同目的测试与 Case，保持错误顺序、范围重写和损坏产物拒绝。
真实消费者编译与函数 tokenizer 工作继续执行；以串行局部测量和完整 Gate 验收实际收益。

## Success Criteria

1. 原公开声明清单、中文相邻规则、JS 语法、相对导入及 Worker URL 验收保持完整。
2. baseline/after 使用同一包源码和冻结函数输入，目标测试、类型、lint、文档与 Case 全树闭合。
3. 不改变并发、资源、预算、timeout、Check 粒度或验收选择，完整与 required Gate 满足既有预算。
4. ai-ready-docs、完整编码规范及非实施代理审查通过，最终改动按可独立回滚单元提交。

## Affected Owners

- [包产物](../../docs/tooling/package-artifact.md)：声明、ESM 和物理材料审计。
- [包生命周期](../../docs/tooling/package-lifecycle.md)：exact candidate 与隔离消费者。
- [编码规范](../../docs/development/coding-style.md)和[测试策略](../../docs/testing/strategy.md)：实现和证据质量。
- [Project Gate](../../docs/tooling/project-gate.md)：完整执行、时长和固定预算。
