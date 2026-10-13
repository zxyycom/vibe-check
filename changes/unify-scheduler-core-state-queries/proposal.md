# Proposal

Scheduler Core 状态与查询路径收敛的当前实施计划。

## Why

Shell 镜像与 DTO 回读残留使事实责任和初始化重复。

## Outcome

执行与公开模拟共同读取 Core 状态及判断，Shell 只保留执行负载与合法投影差异。

## Scope

### Intended Change

Core blocker facts 与共享 partitions/query；移除无用 scope/mutex 镜像；含 pre-admission 的单次 seed。

### Resulting Impacts

不可变旧状态、summary priority、forced effects、hard guards 和可选 instrumentation 成本边界保持；同步内部 owner。

## Success Criteria

- blocker summary 直接聚合 Core facts，保留与 primary rejection 不同的分类优先级。
- Shell 保留执行负载；scope lifecycle、mutex 与容量事实由 Core 提供。
- pre-admission 按原输入/callback 顺序完成，再单次 seed；forced effects 顺序保持。
- execution、public 与 measurement 共读增量 memberships 和同源 capacity 判断，暂时阻塞者仍可在资源释放后准入。
- source 路径审计与顺序、fork、release、取消、scope/资源变化测试支持上述结构与行为；工程校验、独立审查和完整 Gate 覆盖最终 diff。

## Affected Owners

- [Scheduler](../../docs/development/scheduler.md)：内部状态、查询、Shell 与 collector 职责，需同步。
- [调度指南](../../docs/guides/scheduling.md)与[模拟调度分支](../../docs/guides/simulating-admission.md)：反查公开承诺；本次内部重构不增加 API 或改变行为。
- [quality-runtime Cases](../../docs/testing/cases/quality-runtime.md)：查询、pre-admission 顺序和结算证明。
