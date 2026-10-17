# Proposal

在真实 Scheduler 中以有限共享关系条件连接 readiness discovery 与 measurement，形成可采用的正式候选。

## Why

当前 source settlement 按 Task occurrences 写 relation counters，并在 ready crossing 再逐 Task 写 membership/heap 和 collector entry。共享 typed relation 与 A+Bi 都存在可减少的同义传播；历史模型只证明有限切片，尚未兑现生产选择、逐 effect post-state 与精确 measurement。

## Outcome

保持公开 API、选择/结算顺序、每个 canonical effect post-state、精确时间与 immutable snapshot/fork 的同时，让高复用完整关系及单公共条件加个体残差减少逐 Task 传播；以同条件真实 Core/collector/Run 的增长、时间、内存与维护成本决定采用。

## Scope

### Intended Change

仅调整 `src/project-run/task-scheduler/**` 的关系编译、事实、发现索引及 queue collector。完整 typed multiset signatures 共享计数；对不同完整签名中的高复用单 typed source 使用一层公共因子加 exact residual，不构造通用 AND-DAG。persistent 队列支持整组 root 共享发布，质量 delta 与共享进入时钟贯穿 collector。必要测试、Scheduler Case 与稳定 owner 同步。

### Resulting Impacts

关系计数与 ready membership 的私有表示、delta 和结构测试需要迁移。保留两种 tie、三层 frontier、scope/resource/mutex、重复 occurrences、preseed、failure/cancel 与旧分支。编译预建队列、低复用及 full-read 成本必须纳入比较。性能证据保存在本 Change；临时构建/测量在专属 tmp，历史报告和资源只读。不新增依赖、公开配置、永久双实现或 overlay。

## Success Criteria

- raw-graph oracle 在 action、rejection、effects 及每个 effect-state 级别一致，snapshot/fork 独立。
- scripted clock 与独立逐 Task oracle 保持 counts、peaks、delay、history、availability 与精度。
- 同固定图与轨迹比较基线 c45e5499 和最终候选；含 compile/seed、真实 Core+collector、Run、小中大、共享/A+Bi/unique/overlap/H=N、完整读取与保留状态；正式计时无 instrumentation/profile 且独占。
- 采用建议明确实际收益、退化、内存和维护成本；不要求每个小图更快，不把模型收益称为 Run 收益。
- 局部测试、Case closure、type/lint/dependency 与最终完整 Gate 按风险串行完成；未完成项明确交接。

## Affected Owners

- [Scheduler](../../docs/development/scheduler.md)：关系事实、选择、delta 与 collector。
- [调度](../../docs/guides/scheduling.md)、[模拟](../../docs/guides/simulating-admission.md)：保持公开承诺不变。
- [测试策略](../../docs/testing/strategy.md)、[Case](../../docs/testing/case-maintenance.md)：直接证据与全树闭合。
- [Change 协调](../../docs/governance/change-coordination.md)：由 root 串行维护；Git 也由 root 独占。
