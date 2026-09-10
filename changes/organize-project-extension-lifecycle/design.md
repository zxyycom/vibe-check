# Design

本 Draft 将现状核对、角色分类、生命周期重整和 Scheduler/Check effect 设计组织为一个顺序明确的 Change。

## Context

- [`api-mechanics.md`](../../docs/api-mechanics.md) 和 [`guides/callbacks.md`](../../docs/guides/callbacks.md) 是公共生命周期与 callback 路由入口；Definition、Invocation、Scheduler 和 Project Gate 的精确边界分别由相邻 development/tooling owner 维护。
- 当前扩展点至少包括 Check `preflight` / `execution`、admission strategy `prepare` / `decide` / `complete`、`scheduler.measurementHooks`、progress formatter 和 Gate `afterGate`。相似函数形态不代表相同角色。
- Scheduler measurement 是事实；summary、history recording 和当前 terminal Hooks 是这些事实的消费者。新模型需要区分 measurement owner 与 effect owner，同时把既有 terminal pipeline 视为 Current，直到 Future 方向完成实现与验证。
- private `CheckExecutionLifecycle` 当前混合 invocation-wide `flagControlCompleted` 与逐 Check `started` / `settled`。planned project-file input preparation 还会在 effective selection 与 Check-owned work 之间增加阶段和 Product-owned settlement。
- 直接约束包括：[Check lifecycle observation](../../docs/decisions/expose-check-centric-lifecycle-hooks.md)保持只读；[admission optimization](../../docs/decisions/select-admission-optimization-by-effective-opportunity.md)需要 selection 后的 effective graph；[配置组合](../add-composable-feature-config-packages/)需要稳定扩展槽位。

## Goals / Non-Goals

### Goals

- 建立一份从 Definition authoring 到 Project Gate post-processing 的 Current 时间线，并将已确认但尚未实现的方向标为 Future。
- 按权限和失败语义区分 strategy、effect、execution、formatter、finalizer 和 Gate policy。
- 为 Scheduler 与 Check 定义可验证的开始、结束和观察边界，并形成配置组合可依赖的槽位分类。

### Non-Goals

- 本 Change 不实现具体 Check、admission 算法、project-file acquisition 或 Gate workflow，也不建立任意 phase/priority event bus。
- 命名调整只覆盖生命周期角色和公共契约，不扩展为无关代码的统一改名。

## Decisions

### Intended Change

Draft 按以下阶段收敛；Current 核对完成前不进入公共 API 实施：

1. **核对 Current。** 从源码、测试和 owner 文档恢复每个正式扩展点的调用条件、输入、控制范围、顺序、并发、取消、失败及 output/result 映射，形成唯一 lifecycle × responsibility 矩阵。
2. **确定角色。** strategy 提出受限决定，execution 产生领域结果，effect 观察生命周期并产生受控副作用，formatter 只改变呈现，finalizer 关闭 owner-local 状态，Gate policy 在 Product `RunResult` 后形成项目结论。
3. **确定阶段。** 分别固定 Invocation、Scheduler 和 Check 的 start、finish、settled 与 terminal boundary；invocation-wide phase 和逐 Check transition 使用不同投影。
4. **设计 effects。** 保留 Scheduler measurement facts 的 owner，分别设计 Scheduler 与 Check observation effect。共享契约只包含只读观察和 failure containment；事件与 payload 差异由显式变体表达。当前 `measurementHooks`、内置 summary 和 strategy `complete` 的最终归类由 Current 矩阵决定。
5. **交付稳定入口。** 将扩展角色映射为有序累加、独占、按 key 合并和 root-owned 槽位；由一个公共入口维护完整时间线/选择矩阵，各领域 owner 保留精确契约。最终 Plan 再派生 API、迁移、文档和测试任务。

### Resulting Impacts

- 可能调整 Project Definition/public exports、Invocation/check-execution/Scheduler handoff、progress adapter、Run output/diagnostic 和 Project Gate callback documentation；精确文件集合在 Plan 前确定。
- 公共命名或角色变化需要通过长期决策演进，并同步 declarations、示例、changelog 和 external consumer evidence。
- project-input、effective-graph strategy 与配置组合继续拥有各自领域实现；本 Change 只交付它们共同使用的生命周期 seam 和扩展分类。
- 验证需覆盖 lifecycle 顺序、effect 调用次数、并发/取消、failure containment、primary result precedence，以及现有 Check facts/duration、Scheduler measurement 和 Gate boundary。

## Risks / Trade-offs

- 全局盘点只纳入正式 Product/Gate extension surface 和必要内部 seam，避免扩张为无边界 callback 清单。
- effect 采用共享核心加显式变体；不能仅因函数同形就合并 Scheduler terminal consumer、逐 Check observer 和 owner-local finalizer。
- start/finish 必须绑定已验证的状态转换，避免在 planning failure、未启动 Check 或 cancellation 上产生伪事件。
- 公共重命名需要在清晰术语和迁移成本之间取舍；Current 名称在迁移方案确定前仍保持有效。

## Open Questions

| Topic | 进入 Plan 前需要确定 |
| --- | --- |
| Owner | 哪个公共文档维护唯一时间线与选择矩阵，其他 owner 如何引用。 |
| Boundaries | Scheduler、Check 与 Invocation 的 start、finish、settled 和 terminal 对应哪些状态转换。 |
| Effect variants | 哪些职责共享只读 effect 核心，哪些使用 terminal-only、scoped start/finish 或独立 finalizer。 |
| Public contract | `measurementHooks` 等现有字段的命名、兼容、fingerprint、output、diagnostic 和 failure precedence。 |
| Integrations | Check effect 的最小事件/payload、配置槽位表示，以及 project-input/effective-graph seam 的实施顺序。 |
