# Proposal

本 Change 降低 learned/static fallback 的候选选择与索引重复成本。

## Why

learned/static fallback 只需 comparator 首项却排序全部候选，fallback 还会在每次 decision 重建静态 graph 索引。
2026-10-15 普查及同输入操作量证据支持在现有 helper 内消除这些重复工作。

## Outcome

在保持 learned/static fallback 每次相同 proposal、observation 与公开可调用函数形状的前提下减少计算。

## Scope

### Intended Change

T02 按原 comparator 线性取首，在 preparation 复用 immutable graph/activation 索引，并单次分类候选。
factory 的 prepare/decide 继续是公开可调用函数，保留其 full context 成本。

### Resulting Impacts

同步内部成本 owner、相邻行为测试与有界操作量证明，不改变公开契约、机器输出、安全边界、调度层/比较器/wait/backfill/公平策略；未成立候选记录不采用理由。

## Success Criteria

采用候选具有相同工作负载的操作量依据；窄功能测试通过；每个候选均有采用/不采用说明；独立 reviewer 审查精确语义。

## Affected Owners

docs/development/package-tools.md、docs/guides/learned-scheduling.md、docs/guides/scheduling.md；docs/testing/strategy.md 与 docs/testing/case-maintenance.md。
