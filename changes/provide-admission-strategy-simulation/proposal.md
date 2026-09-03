# Proposal

本 Draft 评审一套 public immutable admission graph/state 协议：独立调用方可以从静态图创建初始状态，custom strategy 可以从真实 decision boundary 读取同一种状态；两者都通过同一私有调度 core 查询和产生 successor，而不执行或改写真实 Run。

## Why

当前 `AdmissionPolicyContext` 只提供本轮 `select | wait` 所需的部分 snapshot。调用方不能从一个 Scheduler-owned surface 完成以下工作：

- 列出 selectable、其余 pending 及其不可选原因，并同时读取 running、settled、capacity 和 scope；
- 独立验证某个 Task 在当前状态是否可选；
- 从同一状态分别选择 A 或 B，再显式结算 running Task，以比较后续 boundary；
- 脱离真实 Run，从静态图构造初始状态并进行确定性测试或搜索。

调用方若自行重建 relation、mutex、capacity、scope 和 forced-block 规则，会形成第二套调度语义。另写一个只服务模拟的 Scheduler 也会产生同样问题。真实执行与非执行探索需要共享一次 graph compile、legality、state transition 和 canonical effects；差异只在 shell 是否执行 effects。

公共能力不应直接暴露 mutable Scheduler、内部 indexes、execution ledger 或 reducer 表示。它应公开 frozen opaque graph/state handle、只读查询和返回新状态的 transition。保留旧状态即可形成分支，不需要 setter 或深拷贝 `copy()`。

搜索型调用方可能保留大量分支并反复读取 catalog。若每个 successor 全量复制 graph、pending/running/settled collection，或每次 getter 都重新构造完整 DTO，该公共能力会成为算法瓶颈。因此进入 Plan 前必须先建立分支 CPU、allocation 和 retained-heap baseline。

## Outcome

本 Change 结束时，项目拥有一份可执行的 public admission graph/state Plan，并满足以下结果：

- `createAdmissionGraph({ graph, maxParallel })` 验证并编译一次静态调度输入，返回 public `AdmissionGraph`；`graph.initialState()` 返回初始 `AdmissionState`。`SchedulerGraphSnapshot` 当前不包含 root `maxParallel`，所以该值作为独立静态输入传入。
- `AdmissionPolicyContext.admissionState` 提供真实 decision boundary 对应的 `AdmissionState`。独立初始入口与 context-bound 入口使用相同 public state contract 和相同私有 compiled machine/reducer。
- `AdmissionState` 是 frozen opaque handle。它通过 inspection/catalog getter、single-task validator、`select(taskId)` 和 `settle(taskId, "satisfied" | "unsatisfied")` 暴露调度语义；transition 返回 typed accepted/rejected result，accepted result 携带 successor，predecessor 始终不变。
- 同一 predecessor 可产生多个 successor；保留 predecessor 引用就是保留分支，不提供 `copy()`、setter、任意中途 state 导入、序列化/恢复或真实 Run 写回。
- public inspection 明确 selectable、带一个 deterministic primary reason 的其余 pending、running、scheduler-relevant settled outcome、root/effective capacity、derived scope lifecycle，以及当前 next boundary `select | wait | complete`。`complete` 是状态，不是 caller action。
- 私有 compiled machine、pure reducer 和 canonical effects 是 real shell 与 public handle 的唯一 legality/transition owner。real shell 继续独占 policy 调用、Task/Promise、signal、diagnostics、measurement、settlement value/error 和 `RunResult`，并在 callback 后执行 hard revalidation。
- v1 不公开 cancel、internal effects、batch/replay、state hash、global interning/cache 或完整 Check outcome。上述能力只有出现独立 consumer 和证据时才另行评审。
- Plan 前建立可复现 benchmark/baseline，覆盖 compile、未使用 public state 时的 real hot path、getter/catalog、single validation、select/settle、从同一 predecessor 大量分支、高 fanout 和 retained heap；数值门槛只从该 baseline 形成。

## Change Boundary

- **公共语义 owner**：`AdmissionGraph` 表达一次验证后的静态 admission model；`AdmissionState` 表达一个不可变调度分支。它们公开稳定查询、action 和 typed result，不公开内部 storage、indexes、reducer、effect stream 或 execution ledger。Change 名称中的 simulation 表示使用场景，不要求 public 类型以 Simulator 命名。
- **共享 core owner**：`src/project-run/task-scheduler/**` 的 private compiled machine、pure state transition 和 canonical effects 是唯一 legality/transition 来源。real execution shell 执行 effects；public state handle 只返回假设 successor。
- **v1 action boundary**：public action 只有 hypothetical `select` 与 running-task `settle`；`wait`/`complete` 由 inspection 的 next boundary 表达。`settle` 只接受 scheduler-relevant `satisfied | unsatisfied`。普通非法 action 返回 rejection 并保留原状态，不以异常表达。
- **兼容边界**：standalone factory 不新增 Project Definition 配置，也不改变 declarative fingerprint。`AdmissionPolicyContext` 增加 state handle，public exports/docs/installed-consumer evidence 必须同步；真实 Scheduler 继续 hard revalidate，state 不是 reservation 或 Task control capability。
- **进入 Plan 的前置**：用真实 lookahead 与 deterministic-test consumer 验证 public contract；建立新的 simulation/public-state Decision；完成 shared-core trace oracle 设计；采集可复现 CPU、allocation、heap 与 real-path baseline。baseline 前不选择复杂 persistent structure，不冻结数值预算，不创建 tasks，不切换为 Plan。
- **依赖边界**：已归档 custom lifecycle 是 current authoring baseline，但不是本 Change 的组成部分。算法 Change 可以复用 private core/test harness，却不依赖 public state API。fail-fast 或 named capacity 若先落地，必须重新审阅 state、reason、transition 和 benchmark matrix。
- **非目标**：不新增 `expectedDurationMs`、public strategy registry、第二种 graph semantics、通用 graph executor、默认算法替换或 priority 规则；策略仍先按自身算法排序，`admissionPriority` 只在该策略同分后 tie-break。
