# Proposal

本 Change 把 Product-private Scheduler 中分散的准入候选排序与 reservation 等待规则收敛为一个纯 admission-selection policy，使后续静态和学习型策略共享同一约束边界，而不增加公共调度 DSL。

## Why

当前 `decideScheduler` 已经是纯 decision owner，但“下一项启动谁”仍由 `scheduler-admission-decision.ts` 与 `scheduler-decision-inspection.ts` 中的 reservation、tightening scope、constrained continuation 和 ordinary-ready helper 共同决定。静态 `admissionPriority` 已插入这些比较链，结果依赖、fail-fast、named resource 和预测调度又分别需要读取或影响候选选择；继续在每个 feature 中局部加排序条件，会让同一轮准入出现互相竞争的隐式优先级。

Scheduler 仍必须独占依赖、互斥、容量、取消和 settlement 正确性。未经约束便调用项目函数会允许它返回未 ready 或不可准入的 Task，并把内部状态机变成公共 workflow DSL。因此本 Change 先建立受约束的内部策略边界；公共 custom selector 由独立 `expose-custom-admission-selection-policy` Change 复用该边界，并且仍只能从 Scheduler 提供的候选中选择。

## Outcome

纯 Scheduler decision 在每个 admission cycle 向一个明确的内部 admission-selection policy 提交 同一份 immutable 完整 graph、当前动态 inspection 与本轮候选。Graph 已内置每个 Task 的 `admissionPriority` 与拓扑，不另交接 priority map/list。策略返回“选择一个候选 Task”或“因明确原因等待”、两者均带 reservation update 的结构化决定；Scheduler 校验该决定、形成现有 `SchedulerDecision`，imperative shell 继续独占启动、等待和 settlement。

默认 static-priority policy 完整复现当前 reservation、tightening scope、constrained continuation、priority 与 canonical tie-break 顺序。省略新内部 policy input 时，Task admission trace、decision reasons、terminal settlements、public Definition、fingerprint 和输出保持兼容。

## Scope

### Intended Change

- 建立 Product-private `AdmissionSelectionPolicy` 输入与决定类型。输入交接同一份 immutable 完整 normalized Task graph（其中内置 priority、relations、scope 和 canonical order）、Scheduler 已验证的动态 inspection、relation/mutex eligible candidates 与每个 candidate 的当前 capacity fact；候选不因当前 capacity 已满而从集合移除，因此 policy 可形成可 drain 的合法 `wait`。不另设 priority map/list 或图外拓扑输入。输出是选中 Task ID、选择原因和 reservation update，或带 `SchedulerAwaitReason` 与 reservation update 的等待决定。
- 将当前四层选择阶梯收敛为唯一 `static-priority` policy：有效 reservation、tightening scope、constrained continuation、ordinary ready。现有 effective-cap、priority 和稳定 ID/order tie-break 均原样保留。
- 让 `decideAdmission` 只负责构造 relation/mutex eligible candidates 与 capacity facts、调用 policy、验证 `select` 的 Task 仍属于本轮 candidate 且当前可 admission、`set` reservation 的 target 仍属于本轮 candidate、以及 `wait` 有 running Task；随后把 policy result 投影为现有 `admit` / `await-running` decision。Scheduler 不重演 reservation、公平或防饥饿策略：policy 可按自己的策略保留、clear 或替换 reservation；取消、blocked settlement、graph validation、readiness、mutex、capacity 和 imperative execution 不进入 policy。
- 允许 private Task engine 调用方传入由 Product runtime 构造并冻结的 policy value，为紧随其后的 custom-selector 与 learned-duration Changes 提供真实 consumer；本 Change 自身不从 package root 导出 policy、factory、callback 或 author-defined comparator。
- 保持 pure decision 无 clock、logger、filesystem、历史或 executor capability。需要跨运行数据的策略必须在 Scheduler 外先构造 immutable snapshot，policy 只读取该 snapshot。

### Resulting Impacts

- `src/project-run/task-scheduler/**` 的 inspection、admission decision、decision model 与 tests 需要移动选择责任并增加 policy result guard；policy 获得完整 immutable graph 但不获得 mutable state；imperative `scheduler.ts` 不解释排序算法。
- result dependency/observation Change 会改变 eligible relation；本 Change 实施前必须以其最终 graph/settlement 模型重审候选输入，不能复制旧 dependency 判断。
- fail-fast 继续在 admission 之前形成 invocation cutoff；named resource capacity 若落地，资源合法性由 Scheduler inspection 提供，resource fairness 才进入 policy。两个 Draft 不阻塞本次边界，但后续不得绕过它另建 selector。
- scheduler performance diagnostics 继续观察最终 `SchedulerDecision`。抽取前后 event names、reason vocabulary 和已有 detail fields 保持一致，除非对应 owner 的独立 Change 已正式演进。
- [`docs/architecture.md`](../../docs/architecture.md) 与 scheduler tests 需要说明完整 graph 的 private handoff、policy 只选择候选而不拥有执行或公共 authoring；测试证据需要证明默认 trace 等价和非法 policy result 被拒绝。

## Success Criteria

- 默认 static-priority policy 对现有 ordinary、priority、dependency、mutex、tightening、constrained、sticky reservation、capacity wait、cancellation 和 blocked-settlement fixtures 产生相同 decision kind、Task ID、reason、reservation update 与 settlement order。
- policy 接收 immutable 全图拓扑、当前动态 inspection、relation/mutex eligible candidates 与 capacity facts；它只能选择本轮 candidate，且 Scheduler 在启动前拒绝 unknown、已 settlement、blocked、非 candidate 或当前 capacity 不可 admission 的 `select`。
- `select` 与 deliberate `wait` 都使用闭合 vocabulary 并携带 reservation update；policy 可 clear 或替换 reservation，`set` target 必须是本轮 candidate。`wait` 使用闭合 `SchedulerAwaitReason`，Scheduler 拒绝“无 running Task 却等待”；默认 static policy（而非 Scheduler guard）保留既有 sticky-reservation trace。
- `decideScheduler` 与 policy 都是同步纯函数；两者不获得 clock、logger、filesystem、Promise、executor 或可变跨 invocation state。
- public package exports、Project Definition grammar、declarative fingerprint、Check/Record facts、machine schema、progress 与 RunResult 不因本 Change 改变。
- 本 Change 没有增加公共策略函数、通用 policy composition framework、priority queue、第二 pending 集合或与现有 Scheduler 并行的状态机；公共 selector 的范围、错误和 caller-runtime 风险由独立 Change 验收。

## Affected Owners

- [`docs/architecture.md`](../../docs/architecture.md)：Project Run、private Task Scheduler 与 admission policy 的责任方向。
- [`docs/testing.md`](../../docs/testing.md)、`docs/testing/cases/**`：Scheduler decision 与默认行为等价证据。
- `src/project-run/task-scheduler/scheduler-admission-decision.ts`：候选构造、policy 调用和 result guard。
- `src/project-run/task-scheduler/scheduler-decision-inspection.ts`：只读 inspection 与硬约束查询。
- `src/project-run/task-scheduler/**`：policy contract、static implementation、decision model 与共置测试。
- [`docs/decisions/separate-admission-policy-from-scheduler-state-machine.md`](../../docs/decisions/separate-admission-policy-from-scheduler-state-machine.md)：记录跨 Change 的 private policy、完整 Graph handoff、Graph-owned priority 与 Scheduler guard 边界。
