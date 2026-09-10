# Design

本设计以现有 callback 和 adapter 边界为输入，建立一份生命周期扩展职责矩阵，并让公开导航、内部 owner 和配置组合共享同一分类。

## Context

- [`docs/api-mechanics.md`](../../docs/api-mechanics.md) 拥有 Product Run 的公共主生命周期，[`docs/guides/callbacks.md`](../../docs/guides/callbacks.md) 按使用位置路由公开 callback。
- [`docs/development/project-definition.md`](../../docs/development/project-definition.md)、[`docs/development/project-run.md`](../../docs/development/project-run.md) 和 [`docs/development/scheduler.md`](../../docs/development/scheduler.md) 分别拥有 Definition、Invocation 和 Scheduler 的实现边界；[`docs/tooling/project-gate.md`](../../docs/tooling/project-gate.md) 拥有 Product `RunResult` 之后的项目私有 `afterGate`。
- 当前粗粒度边界是 `Product authoring → invocation/scheduling → sealed terminal callbacks → RunResult → Project Gate post-processing`。本 Change 需要从实现和测试核对其中的精确顺序，而不是从函数名称推断。
- prepared strategy 的 `prepare / decide / complete`、Check 的 `preflight / execution`、terminal `measurementHooks`、progress formatter 和 Gate `afterGate` 具有不同 context、控制权和失败结算，应按角色分类。
- 生命周期矩阵需要分别标记 Current 实现与 `active/unaligned` 的 Future 方向；后者只有在对齐后才能作为当前 package 行为说明。本 Change 不重复设计或实施由其它 Change 拥有的具体扩展点。
- [`add-composable-feature-config-packages`](../add-composable-feature-config-packages/) 是首个下游消费者；它进入 Plan 前需要本 Change 固定可组合、独占和 root-owned 的扩展槽位。

## Goals / Non-Goals

### Goals

1. 建立 Definition authoring、Run preparation、selection/admission、Check execution/settlement、terminal callbacks、outputs/result 和 Gate post-processing 的端到端时序。
2. 对每个正式扩展点记录角色、owner、调用条件、输入事实、控制范围、错误映射、并发和取消边界。
3. 区分配置工厂、策略、结果生产函数、observer Hook、formatter、completion/finalizer 与 Gate result policy。
4. 将依赖归类为配置 capability、Check `dependsOn` / `observes` 数据关系和 owner 内部步骤顺序。
5. 向配置组合 Change 交付有序累加、独占、按 key 合并和 root-owned 四类槽位。

### Non-Goals

- 范围只覆盖 Product 与 Project Gate 的正式扩展点；功能配置包实现、Git hooks、release workflow 和普通工具脚本由各自 Change 或 owner 承接。
- 本 Change 维护类型化槽位，不建立任意 phase/priority 事件系统，也不实施任何具体扩展点。

## Decisions

### Intended Change

以下是进入 Plan 前需由实现、测试和当前 owner 验证的暂定方向，不表示新 API 或长期判断已经采用：

1. 形成一份 lifecycle × responsibility 矩阵，并指定一个公开导航入口；各 owner 保留自己的完整契约，其它位置只提供摘要和直接引用。
2. 按实际调用链审计每个 callback 的顺序、调用条件、输入冻结、返回作用、并发、取消与 failure precedence。正文与事实不一致时修正对应 owner；真正缺失的阶段先形成长期判断。
3. 按角色分类扩展点：策略提出受限选择，execution 形成领域结果，observer 消费已封闭事实，formatter 改变呈现，completion 完成 strategy-owned 状态，Gate policy 形成最终 Gate result。
4. 配置 capability、Check graph relation 和 owner 内部步骤分别承接三类依赖。声明顺序只确定同槽位交付顺序；需要共享中间结果的步骤由同一 owner 封装。
5. 将矩阵映射为配置贡献分类；未证明合并语义的字段保持 root-owned。

### Resulting Impacts

- 公开 callback 导航、API lifecycle、调度指南和内部 owner 需要对齐交叉引用、术语及顺序，同时保持单一规则 owner。
- 源码级命名或公共阶段发生变化时，需要同步类型、JSDoc、declarations、示例、changelog 和对应行为测试。
- 已建立但尚未对齐的扩展方向需要标注为 Future，并在实现对齐后再进入 Current 生命周期；相关实现继续由各自 Change 承接。
- 配置组合验收使用本 Change 的槽位分类，但本 Change 不依赖具体配置包语法。
- 行为、使用方案或职责变化需要按文档影响审查，由非实施代理基于实际 diff 反查。

## Risks / Trade-offs

- 统一阅读路径不能抹平 Check、Scheduler、output 和 Gate 的失败与控制差异；矩阵需要保留这些稳定变体。
- 文档整理必须连接直接源码和最窄测试，否则时间线可能与实现偏离。
- Project Gate 是仓库工具而不是 package API；公开材料需要明确 Product 生命周期的结束位置。

## Open Questions

| Topic | 进入 Plan 前需固定的选择 |
| --- | --- |
| Canonical entry | 由 `guides/callbacks.md` 承接完整选择矩阵，还是由 `api-mechanics.md` 承接完整时间线并让 callbacks 只做任务路由。 |
| Exact ordering | aggregation、machine/diagnostic/progress completion、terminal measurement、prepared `complete` 与 `RunResult` construction 的精确顺序和并行边界。 |
| Future slots | 如何在同一阅读路径标注 `active/unaligned` 方向，并在对齐后切换为 Current，而不复制其事件和失败契约。 |
| Terminology | 哪些公共名称保留 Hook，哪些应明确为 strategy、formatter、observer、completion 或 policy；是否需要源码级改名。 |
| Configuration output | 向配置组合 Change 交付文档矩阵和内部类型分类，还是另需可执行的 contribution-slot schema。 |
