# Design

本 Draft 将“为 custom callback 增加几个 hook”视为一项 public lifecycle contract，而不是把 private learned provider 或 Scheduler internals 直接暴露给消费者；在范围、failure 和兼容性闭合前不创建 `tasks.md`。

## Context

- 当前 custom public API 是 trusted、synchronous `proposeAdmission(context)`：每次实际 Scheduler callback 接收 detached/deep-frozen graph、dynamic candidate/capacity/runtime facts 和 bounded measurement prefix，并精确返回 `select(taskId)` 或 `wait`；Product不sandbox或限制其自身closure/reentrancy/host-side effect，但不提供imperative Scheduler capability。
- Scheduler 对 throw、thenable、malformed/illegal proposal执行 admission-policy fault：停止新 admission、取消 pending、drain started work，并以受限 execution diagnostic结束；它不 fallback 到 static。
- `scheduler.measurementHooks` 是独立的 terminal side effect，已有独立 output status 和 failure delivery；Product 不把它与 custom policy 绑定为同一策略实例。调用方可以在两个分别 author 的 callback 中手工共享 closure，但其组合与生命周期属于调用方，不是 Product contract。
- [`separate-duration-learning-from-admission-strategy`](../separate-duration-learning-from-admission-strategy/proposal.md) 已在 private scope验收 effective strategy 的 conditional terminal completion 和 Scheduler-only decide handoff（17/17 tasks、correctness review 与 required/full Gate 通过，active Plan 尚未归档）。这提供稳定 private seam，不开放或预设 public surface。
- [`introduce-invocation-scoped-admission-strategy-lifecycle`](../../docs/decisions/introduce-invocation-scoped-admission-strategy-lifecycle.md) 当前为 `active + aligned`：它确认 private outer lifecycle / inner pure-policy 分层，仍不闭合 public grammar、context 或 complete/failure 语义；本 Draft 的开放问题必须独立闭合。

## Goals / Non-Goals

**Goals**

- 评审一个最小、可公开声明和 installed-consumer 验收的 invocation-scoped custom strategy lifecycle。
- 保持 Scheduler-facing decision 同步、result-only `select | wait`，并保留 Scheduler hard guards 与 fault classification；不把当前custom trusted callback误升级为Product可强制的pure contract。
- 明确 prepare、decision measurement、complete terminal context的时间边界，特别是 complete 仅看到已 sealed terminal facts。
- 分别定义 public lifecycle failure、现有 policy fault、existing measurement-hook failure、cancellation和overlapping Runs的兼容与可观察结果。

**Non-Goals**

- 不公开 duration history、state-directory storage、critical-path score、logger、clock、private Scheduler object或 mutable engine state。
- 不预建策略 registry、generic learning/model API、event bus、per-Task online-learning hook、background worker、任意 filesystem capability或 automatic persistence。
- 不将 custom lifecycle 与现有 `measurementHooks` 静默合并，不把 asynchronous decide 交给 Scheduler，不把 callback side effect误称为 sandbox。
- 不在本 Draft 修改 public Definition、schema、fingerprint、package declaration、runtime、tests或稳定 documentation。

## Decisions

### Intended Change

尚未采用具体 public shape。若进入 Plan，候选必须同时满足以下固定边界：

1. **生命周期**：effective custom strategy 对每个 Run 只 prepare 一次，prepare完成后 Scheduler 才开始 measurement；Scheduler在 measurement lifecycle 内调用同步 decide 零至多次；停止 admission、drain并 seal terminal measurement后最多一次调用 complete。complete不能重启调度或改变terminal facts。
2. **责任层**：public strategy lifecycle由 invocation运行；consumer 视角只 author synchronous result-only decide，private adapter 负责把它形成完整 frozen `AdmissionSelectionPolicy` 并保留/决定 private measurement requirements。Scheduler只接收该完整 private policy，不接触prepare/complete；author不能伪造 `requiresMeasurement`、collector、clock、prefix或action-attribution metadata。prepare/complete可作为未来候选承载明确副作用；当前及候选decide不允许thenable、不能逃逸hard guard验证，但不以此限制custom作者自身closure/host-side effect。
3. **数据方向**：同一 Run 的 complete数据不能影响既已发生的decide。若consumer需要跨Run learning，必须通过它已经被授权的store/capability与下一次prepare，而不是通过共享global closure；是否提供任何 Product path/state capability由独立 owner和真实consumer决定。
4. **最小公约数**：prepare只获得 graph-ready和稳定 invocation facts；decide继续获得现有、bounded Scheduler decision DTO；complete只获得已 sealed terminal execution/measurement facts。private adapter 的 measurement requirement metadata不投影为public model field，author也不能伪造它。不得为了统一三个阶段而暴露所有内部输入或泛化 DTO。
5. **兼容性**：必须比较保留现有 `{ kind: "custom", proposeAdmission }`、新增显式 strategy kind、或带弃用周期的适配层。callback identity仍不得进入declarative fingerprint；任何新 authoring shape、normalization或fingerprint语义都必须由对应 public owner验证。
6. **失败与输出**：必须明确 prepare failure是否阻止Scheduler、complete failure如何影响Run result/output status、policy fault/cancellation是否仍delivery complete，以及与多个现有measurementHooks的顺序和独立失败归属。不得把未决语义默认为learned private fallback。

### Resulting Impacts

- 该契约若采用，会影响 public project Definition/normalization/fingerprint、package declarations、invocation lifecycle、Scheduler policy adapter、output status、API/configuration/architecture/testing docs、installed consumer与Test Evidence。
- `separate-duration-learning-from-admission-strategy` 的 private lifecycle seam 已满足 implementation prerequisite。本 Change 仍是 Draft：只有真实 consumer 证明现有 API 不足，并闭合 public shape、context、failure/output/cancellation/overlap、fingerprint、installed-consumer evidence 与必要 Decision 后，才可创建 implementation tasks 或修改运行时。
- 可能需要演进当前 stateless-custom-policy 和 measurement related长期 Decision；本 Draft 不修改它们。只有候选契约改变稳定责任、兼容或failure边界时，先按 Decision owner闭合。
- 与 `provide-invocation-path-context` 只有条件关系：纯 lifecycle 不需要新的 path；只有确认custom prepare/complete需要Product-provided writable workspace或cross-Run state capability时，再由path Change和真实consumer决定硬前置与owner。

## Risks / Trade-offs

- 把 private provider逐字公开会冻结学习与诊断内部结构；过度抽象又会建立没有真实consumer的框架。public context必须以consumer实际义务为最小公约数。
- complete failure若混同admission-policy fault或measurementHooks output，会改变既有Run result与failure containment；需要专门的兼容matrix和终态测试。
- prepare可有I/O，若对graph-ready、measurement start、cancellation和overlap没有明确顺序，consumer会得到不可重放的行为；必须把时序和per-Run isolation写入contract。
- 任何“提供stateDirectory”的捷径都会把filesystem权限和persistence责任偷渡入Scheduler API；它必须另有caller-authorized owner。

## Open Questions

1. 是否存在不能由现有 `proposeAdmission` 加独立 `measurementHooks` 完成的真实 consumer；其最小 prepare、terminal commit和persistence需求分别是什么？
2. public shape应是新 `kind`、兼容旧 callback的union，还是显式breaking replacement；迁移期、schema和fingerprint如何定义？
3. prepare context是否需要 project/invocation path事实，还是仅 graph、canonical flags、signal等稳定数据足够？任何writable store应由谁授权？
4. complete应看到哪些sealed terminal facts：完整raw measurement、精简observation、settlements，还是更窄projection？哪些数据会泄漏Check/private执行信息？
5. prepare失败、complete失败、cancelled Run和admission-policy fault分别是否调用complete，并如何映射到existing result/output status？
6. custom strategy complete与现有多个 `scheduler.measurementHooks` 的确定顺序、并发与failure isolation是什么；是否保留两者独立？
7. 哪些候选结论需要新增或演进Decision，哪些可由公共contract Change独立完成？
