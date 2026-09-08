# Proposal

本 Change 调整文档责任与用户阅读路径，保留现有产品行为。

## Why

公共机制长页混合独立任务，导航未明确读者、发布与规则归属，用户材料混入内部维护说明。

## Outcome

用户仅凭随包材料即可定位并使用所需能力；维护者可从导航定位同一公开契约及对应实现 owner。

## Scope

### Intended Change

明确导航中的受众、随包范围和契约 owner；拆分输出、依赖与 learned 调度专题；精简 README，前置 Check 最小用法并清理不服务用户任务的说明。

### Resulting Impacts

同步内部 owner 引用、文档治理、发布 inventory、managed example targets、其漂移测试目标、Case owner 和当前链接；独立审阅语义保真并验证 exact candidate 的包内消费。

## Success Criteria

- 导航区分公开行为定义、内部实现规则、入口摘要与证据，不创建重复契约或发布 registry。
- 新专题可从 README 直达且随包自足；原有示例和用户边界完整保留，已确认的自然语言偏差修正。
- 投影、链接、独立语义审查和完整 Project Gate 通过。

## Affected Owners

[导航](../../../docs/navigation.md)、[知识治理](../../../docs/governance/knowledge-maintenance.md)、[包材料](../../../docs/tooling/documentation.md)、README、API 与 Check 指南，以及对应 development 实现 owner。
