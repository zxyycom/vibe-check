# Proposal

以唯一源事实、typed 多维索引和统一变化传播重构 Scheduler，降低已请求观察数据的维护与计算成本。

## Why

Scheduler 已有 immutable Core 与增量 membership，但 transition、ready frontier 和 static frontier
仍分别发现同一变化；分类统计与逐 Task delay 又反复扫描 pending。局部消重之后，需要按实际消费义务
重新组织状态，而不是继续为每层增加一套相近索引。

[结构普查](../../docs/investigations/audit-scheduler-incremental-state-model.md)已区分重复影响发现、
同事实多 backing 和独立有序视图。它提供源码与操作量证据，不提供本次重构的性能 baseline。

## Outcome

Core transition 统一维护源事实并传播 typed delta；成员查询、有序选择和按需统计各自消费必要变化，
保留执行合法性、顺序与不可变分支。对已请求的统计，以增量分类和惰性等待结算降低重复维护，
保持统计定义并证明数值可靠性。采用依据同时解释规模收益、内存、局部开销和维护成本。

## Scope

### Intended Change

- 重组 `src/project-run/task-scheduler/admission-core/**` 的源事实、成员索引、聚合与 frontier 更新链。
- 让 shell、query/projection 和 measurement 消费同源变化，明确完整输出与动态 gate 的必要读取成本。
- 优化已开启统计的分类、积分、逐 Task 等待和快照读取；以固定 trace 验证计算，以真实重复运行评价性能。

本项以上下文 API、需求开关和消费者迁移已完成为前置条件，使用
[声明式 callback context](../../docs/api-mechanics.md#声明式-callback-context)的固定需求，
优化被请求数据的维护方式。实施前复核稳定源码基线，独立完成本项验收。

### Resulting Impacts

- Core 与真实执行、独立推演、diagnostics 必须继续共享 legality；新表示须证明旧 snapshot 和 fork 隔离。
- 更换统计算法允许舍入结果不同，须保持分类、单位、采样归属和确定的 availability；公开快照不受读取顺序影响。
- 更新 Scheduler 内部说明、受影响的调度/推演指南、统计投影说明和测试证据；learned 消费者与终态交付做回归验收。
- 与其它 Scheduler 工作串行修改共享源码、Case 和稳定文档；采用开始时的稳定提交建立性能 baseline。

## Success Criteria

1. 一个 transition owner 产出精确变化；ready/static/观察消费者直接消费它，不重新发现同一 membership 或 scope diff。
2. 每项保留的 backing 都有 lookup、enumeration、count、order 或 snapshot 义务；动态共享约束不会仅为维持标签而全量 retag。
3. 固定 action/effect trace 证明执行、排序、rejection、取消、资源与快照语义；数值参考计算和边界测试证明统计定义及误差处理。
4. 无需求路径不承担新增观察维护；有需求路径的分类与 delay 成本按实际变更、消费和输出量解释。
5. 同基线对照记录操作量、分配、内存与分规模计时；采用结论说明接受的代价，不以所有输入都更快为门槛。
6. 稳定 owner、测试与 Case 同步，完整 Gate 和独立 diff 审查通过；不存在待用户裁决才能收尾的行为变更。

## Affected Owners

| Owner | 本项责任 |
| --- | --- |
| [Scheduler](../../docs/development/scheduler.md) | Core、shell、collector、交付及成本不变量。 |
| [调度](../../docs/guides/scheduling.md)、[模拟分支](../../docs/guides/simulating-admission.md) | 已交付的公开需求、快照与推演契约。 |
| [Human output](../../docs/development/human-output.md#scheduler-summary-projections) | 分类、积分、delay、peaks 与 tail 的解释。 |
| [随包工具](../../docs/development/package-tools.md)、[learned scheduling](../../docs/guides/learned-scheduling.md) | terminal statistics 的实际消费与顺序回归。 |
| [测试策略](../../docs/testing/strategy.md)、[Case 维护](../../docs/testing/case-maintenance.md) | 测试 owner、语义 Case 与验收闭合。 |
| [Change 协调](../../docs/governance/change-coordination.md) | 上下文先行、共享 owner 与独占性能测量窗口。 |
