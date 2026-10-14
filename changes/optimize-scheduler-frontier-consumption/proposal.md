# Proposal

在保持 Scheduler 选择语义与不可变 Core 的前提下，降低宽就绪集和共享 mutex 的规模增长成本。

## Why

本轮起点的 Core 已统一状态与查询，候选每轮物化和 mutex 整组广播仍形成二次工作。
起点结构计数中，1024→2048 个独立任务的候选访问约由 105 万增至 419 万；
另有静态、无输出的公开 Run 测量：共用单 mutex 的 2048 个空任务约耗时 8.9 秒。
潜在复杂度本身是优化依据，不要求真实消费者先发生故障。

## Outcome

真实执行、公开推演和观察仍消费同一 Core 事实；静态选择不为未消费的完整候选 DTO 付费，
共享 mutex 不因每次 occupancy 变化广播全部 Task。复杂度、端到端成本和维护代价分别取得采用证据。

## Scope

### Intended Change

- 将 relation readiness 与动态 mutex 判断分离，在 Core 内建立约束等价组及 persistent ordered frontier。
- 静态选择按既有 tightening、continuation、ordinary 层级读取必要 head；完整候选与观察明细按需求投影。
- 同一编译入口为每 scope 建 activation ID Set，按 Task 的 scope-slot lookup 查 membership，避免逐 Task 重复搜索 activation 列表。
- 保留实时 scope/resource/capacity、真实 activation/settlement effects 和 immutable predecessor/fork。

### Resulting Impacts

分组、排序、seed、取消和 forced reconciliation 必须同时验证；custom/public/diagnostic 的完整消费义务不削减。
同步 Scheduler 内部 owner 和 Case；不改变公开 API、策略、依赖、预算或 Shell/collector 归属。

## Success Criteria

- 宽图与共享 mutex 图的已确认重复工作减少，不以合并循环的常数改善冒充降阶；G=N 的剩余边界如实说明。
- 与原选择/投影独立 oracle 逐 boundary 等价，覆盖两类 tie order、scope 生命周期与动态约束。
- 分规模计时、结构证据、目标校验、独立反查和完整 Gate 支撑采用；小图有限代价按既有取舍原则判断。

## Affected Owners

[Scheduler](../../docs/development/scheduler.md)、[调度指南](../../docs/guides/scheduling.md)、
[模拟分支](../../docs/guides/simulating-admission.md)、[测试策略](../../docs/testing/strategy.md)及
[编码规范](../../docs/development/coding-style.md)。公开行为不变时不机械改写用户指南。
