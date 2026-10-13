# Design

以一次 invocation 内的不可变、已验证中间产物承接阶段协作，不建立隐式全局缓存。

## Context

实施前 `validateProjectDefinition` 解析和 resolve tree 后 materialize authoring；`executeValidatedRun` 随后再次 normalize。
pre-Git planning、strategy prepare、resolved execution 与 Scheduler 分别准备静态图；flag-control 是动态 seed，不是另一套静态图。
当前基线为 main 的 `3f2aa722`。用户已授权推进成果复用；[性能取舍决策](../../docs/decisions/weigh-performance-costs-against-scaling-benefits.md)
允许以合理局部开销换取增长收益，语义与安全约束仍保持。

## Goals / Non-Goals

- 目标：让每阶段消费已校验的事实，消除丢弃成果后的重复处理，并明确私有 handoff 的来源和生命周期。
- 非目标：跨 Run memo、公开编译器 API、改调度策略、改变 mutable caller Definition 的读取约定，或取消既有验证边界。

## Decisions

### Intended Change

- `ValidatedProjectDefinition.validate` 关闭 authoring 后保存 parsed/resolved tree 与已关闭 fields；公开 Run 在 Controls 成功后从其构造 normalized facts，不再 materialize/reparse。既有 `validateProjectDefinition` 从同一 validated facts materialize authoring，既有 `normalizeProjectDefinition` 与 raw `executeValidatedRun` 继续完整处理输入。
- Invocation creation/effectiveOutputs 的输入收窄为 output-owned fields，移除无人消费的 whole Definition 保留；declarative snapshot 接受不含 authoring checks 的 fields，使用同一 resolved checks。
- graph owner 新增 private `ExecutableTaskGraph`（唯一 symbol brand），只由 `prepareExecutableTaskGraph(rawGraph, rootMaxParallel)` 构造，绑定 frozen PlannedTaskGraph 与 validated root cap；不改变 simulation/core 的 `PlannedTaskGraph` 和 raw `prepareTaskGraph`。
- Check execution owner 新增 private `PreparedCheckExecution` capability，绑定同一 normalized checks 与 executable graph。Invocation pre-Git 获得它后显式传给 strategy、resolved execution 和 Scheduler；flags/preAdmission results 只进入 runtime options，Scheduler 仍拥有动态 core seed。
- raw `executeResolvedChecks` 先准备能力再交接；private `executePreparedChecks` 不再另收 checks/cap/capacities。raw `runTaskGraph` 保留完整 validation，private `runPreparedTaskGraph` 从 executable graph读取rootcap，不允许独立替换它。
- 为 raw graph 和已准备 graph 建立明确入口/类型边界，不能以不受控布尔标记或任意类型断言绕过验证。
- 实施顺序为 Definition 成果交接、Invocation graph 交接、调用点与直接入口验证；同一 owner 串行写入。

### Resulting Impacts

- 未通过 Definition/Controls 或 pre-work/planning 取消时，仍不得提前执行 Git 或 author callback。
- graph、maxParallel、resource capacities 与 Check metadata 必须来自同一 validated invocation；standalone 输入继续独立关闭。
- 内部 owner 解释新的事实持有和交接；public contract 不变，不把本次优化写成用户必须使用的新工作流。
- Scheduler 需求声明 Change 同时触及交接文件，先固定接口再串行实施；两者不是需要对方完成才能成立的硬前置。

## Risks / Trade-offs

保留中间产物会延长少量静态事实的引用生命周期；减少构造次数不自动证明整体复杂度降低。
阶段重排、误认不同 cap 的图或让直接测试入口免验证会破坏契约，需专门覆盖。
历史阶段 profile 属于更早源码，不作为当前收益数字；本轮只以同一 workload 的新对照解释时长。

## Open Questions

无待用户决定的问题。具体方案已按当前消费者收窄，实施、独立审查和最终组合验收已完成；保留 Plan，不结项删除。

## Implementation Observations

- 已实施：public Run 在 Controls 成功后消费 `ValidatedProjectDefinition` 的 resolved tree；没有 caller identity cache。legacy raw validator/normalizer 和 raw Scheduler/Check execution 入口仍验证。
- pre-Git `PreparedCheckExecution` 持有 checks 与 branded executable graph/root cap，并交接到 strategy、execution 与 Scheduler。flag control 留在 dynamic pre-admission seed；新增能力不包含 measurement 或需求配置。
- 2026-10-13 pinned Node 24.18.0 / Bun 1.3.14：Definition+Run 197 tests 全部通过；product/scripts typecheck 和 product lint 通过。ambient Bun 1.4.2 的 24 null-prototype assert 差异在 before 镜像复现，不作为产品验收。
- root 已更新三个内部 owner 与两个现有 Case 的 entity/proof；完整 Case check 706 current entities、176 Cases、15 Topics 通过。独立 reviewer 未发现阻断，另跑 frozen 29 tests 全部通过。
- 可观察 identity 改进：一个 Run 的 preparation/decision/generic terminal/prepared terminal 现在共享同一 frozen graph DTO；旧路径各阶段重新准备、identity 不同。不是宣称所有 public object identity 不变，数据 shape、hard guards、结果和 lifecycle 继续保持。
- 同份完整 source 的 baseline/candidate 镜像只差本切面 15 修改、2 新增；唯一 owner manifest 与全 source 差分保存在 workspace `tmp/optimization-wave-20261013/prepared-facts/`。不含 Git repo，不进入 Bun discovery 或 Product。
- Manual CR: source 镜像的五个 private 函数入口计数（不新增 Product test seam）对 N=8/128/512、static/custom 证明 parse/resolve/materialize/plan/prepare 从 2/2/1/4/4 降为 1/1/0/1/1。独立完整 Run identity probe 从三个 false 变为三个 true。
- 正式测量在 root 独占窗口 05:02:17–05:09:03 UTC（406秒）成功执行唯一一轮：96 batches、480 timed/288 warmups，hash前后匹配。root独立复核通过；paired收益分cell，128custom-disabled与512custom-diagnostics只有两胜两负/噪声，不证明显著加速，部分p95更差保留。完整协议、raw/hash、取舍与边界见 [本轮性能证据](performance-evidence.md)。
- 共享接线已冻结交给 Scheduler 需求 Change 串行集成；本切面计时使用冻结镜像排除后续变化。组合 Gate 43/43 通过，含实际安装包验收；各次日志、告警与未覆盖边界见 [任务交付证据](tasks.md#delivery-evidence)。Plan 保留，Change 结项另行授权；提交状态以实际 Git 结果为准。
