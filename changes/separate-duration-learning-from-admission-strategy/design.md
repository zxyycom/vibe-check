# Design

本 Plan 以“有状态 Scheduler duration model + 无状态 learned admission strategy factory”重组当前实现；下文固定 owner、数据流、private contract 和行为等价出口，使实施者无需从已归档 Change 或对话恢复设计。

## Context

现行稳定 owner 已确认以下事实：

- [`docs/architecture.md`](../../docs/architecture.md) 规定 `learned-critical-path` 的运行顺序为 Definition → pre-admission local history load/prediction → pure Scheduler → post-closure history record/write；history 是 caller-managed、untrusted、cache-like optimization state，不是 quality fact 或 public result。
- [`learn-check-task-durations-for-critical-path-admission`](../../docs/decisions/learn-check-task-durations-for-critical-path-admission.md) 规定跨 Run history 位于 Scheduler 外，并只向 Scheduler 交付 immutable prediction；同一 selection layer 内先比较 estimated downstream critical-path score，再比较 effective `admissionPriority` 与 canonical task ID。
- [`use-stateless-admission-policies-with-hard-scheduler-guards`](../../docs/decisions/use-stateless-admission-policies-with-hard-scheduler-guards.md) 规定 private admission policy 是 synchronous、stateless、pure `select | wait` decision；Scheduler 独占 relation、mutex、capacity、cancellation、lifecycle guards、Task start 和 settlement。
- 当前 `src/project-run/scheduler-history/**` 已拥有 bounded history、prediction、recording 和 storage，但也包含 graph-derived `critical-path.ts`。`src/project-run/invocation.ts` 的 `SchedulerLearning` 同时保存 history、prediction、critical-path score 与 state directory；`resolved-checks.ts` 再根据 public policy kind 和该混合值构造 private policy。
- 当前 public authoring union、normalization 和 declarative fingerprint 已固定 `{ kind: "learned-critical-path", stateDirectory }`。已归档 [`schedule-checks-from-learned-durations`](../archive/schedule-checks-from-learned-durations/proposal.md) 只保存形成时证据，不是当前行为 owner 或本 Plan 的实施说明。

本 Plan 的 AI 消费任务是：在不改变任何调度语义的前提下，将上述职责迁入两个可独立理解和测试的 private owner。事实、责任和禁止依赖如下：

| Owner | 输入 | 输出 | 不得承担 |
| --- | --- | --- | --- |
| Scheduler duration model | canonical prediction inputs、caller-authorized state directory、terminal raw measurement | immutable prediction、bounded read/record observation、post-drain record capability | graph ranking、candidate selection、Task lifecycle、public result |
| Learned admission strategy | immutable `SchedulerGraphSnapshot`、duration prediction、每轮 `AdmissionPolicyInput` | immutable score snapshot、pure `select \| wait` policy | filesystem、history schema、sample update、logger、跨 Run state |
| Invocation | normalized policy、controls、两个 private owner 的结果 | prepare → strategy → execute → record 顺序与 diagnostic presentation | 重算统计或解释 Scheduler legality |
| Resolved Check execution | 已形成的 private selection policy、normalized Checks | terminal Check/Scheduler facts | public policy dispatch、history、prediction、critical-path construction |
| Task Scheduler | graph、dynamic inspection、private policy proposal | accepted admission、wait、settlement | history I/O、模型训练、policy intent 或性能最优解释 |

## Goals / Non-Goals

**Goals**

- 让跨 Run 有状态 duration model 和 invocation 内 pure admission strategy 各有唯一、可从目录和命名恢复的 owner。
- 让 invocation 局部连续呈现 prepare、strategy creation、execute 和 post-drain record 的顺序、fallback 与提交点。
- 将 critical-path score 与 learned comparator 一起归 Task Scheduler strategy owner。
- 让 `resolved-checks` 只接收 private `AdmissionSelectionPolicy`，不再认识 public policy kind 或 learned model internals。
- 以当前实现为 oracle，保持配置、fingerprint、prediction、score、admission、diagnostic、settlement 和 storage 行为等价。
- 为后继算法 Change 提供固定 prediction input，而不预先建立 public composition 或 generic strategy framework。

**Non-Goals**

- 不改变 public `AdmissionPolicy` union、Definition validation、normalized snapshot、fingerprint 或 `stateDirectory` 解释。
- 不改变 32-sample window、4096-series bound、identity digest、mean、median project prior、cold `1`、p90、history envelope、model version 或 atomic write。
- 不改变 critical-path formula、selection layers、`canAdmit`/`wait` 行为、priority/ID tie-break、measurement trigger、diagnostic facts 或 static fallback。
- 不增加 backfill、lookahead、variance/risk weighting、全局优化器、policy-owned mutable state、public model DTO、per-Check estimate 或第二种 configurable algorithm。
- 不建立 `strategies/` registry、generic `PerformanceModel` interface、算法注册协议或公共 model/algorithm 组合矩阵。

## Decisions

### Intended Change

#### 1. Duration model 使用显式 prepared capability

实现采用一个 closed preparation result，而不是继续用 `SchedulerLearning | undefined` 混合 model 与 strategy：

```ts
type SchedulerDurationModelPreparation =
  | Readonly<{
      readonly kind: "ready";
      readonly model: PreparedSchedulerDurationModel;
    }>
  | Readonly<{
      readonly kind: "static-fallback";
      readonly reason: "canonical-input-unavailable" | "history-setup-failed";
    }>;

interface PreparedSchedulerDurationModel {
  readonly prediction: SchedulerPredictionSnapshot;
  readonly readObservation: SchedulerDurationModelReadObservation;
  readonly recordTerminalMeasurement: (
    input: SchedulerDurationModelRecordInput
  ) => Promise<SchedulerDurationModelRecordObservation>;
}
```

`prepareSchedulerDurationModel(...)` 只在 normalized policy 为 learned mode 时调用。它拥有 canonical prediction input、state-directory resolution、untrusted history load 和 prediction build：

- missing、malformed、incompatible 或 read-failed history 返回 `ready`，其中 prediction 使用 empty learned model；`readObservation` 保留当前有界分类。
- canonical input 无法形成，或 local setup/prediction 无法完成时返回 `static-fallback`；reason 只承接现有两种 bounded diagnostic category。
- `recordTerminalMeasurement` 只捕获 loaded bounded model、prediction identity mapping、resolved state directory 和写入所需 capability；它不得捕获 raw authored options、flags、Check callbacks/results 或 Scheduler mutable state。
- record capability 只在 Scheduler 已停止 admission 且 started work 已 drain 后调用，并返回有界 recording/write observation；invocation 继续负责把 observation 投影为当前 human diagnostic。

该对象拥有真实的 prepare/record 生命周期，不是只转发参数的 wrapper。最终命名可以按相邻类型作局部调整，但不得退回混合 strategy score 的 aggregate，也不得用 `undefined` 合并“非 learned mode”和“learned prepare fallback”两种状态。

#### 2. Duration model 使用独立模块 owner

目标模块为：

```text
src/project-run/scheduler-duration-model/
  bounded-history.ts
  prediction.ts
  preparation.ts
  recording.ts
  storage.ts
  scheduler-duration-model.test.ts
```

现有 `scheduler-history/**` 中的 history、prediction、recording、storage 和对应测试迁入该目录；`preparation.ts` 拥有上一节的 prepared capability。目录名使用 `scheduler-duration-model`，以区别公开 `RunResult.checkDurations` 和其它执行计时，同时表达该 owner 不只是文件存储。

不建立 barrel。文件继续按具体职责直接导入。若测试按证明责任需要拆成 preparation 与 persistence 两个文件，可以在实施时拆分并同步 Case；不得只因行数或迁移阶段增加测试 wrapper。

#### 3. Strategy factory 同时交付 pure policy 与只读 score

`critical-path.ts` 从 history 目录迁到 Task Scheduler owner，并以 `critical-path-ranking.ts` 表达 graph-derived ranking 职责。strategy factory 使用以下 private shape：

```ts
interface PreparedLearnedCriticalPathStrategy {
  readonly admissionPolicy: AdmissionSelectionPolicy;
  readonly criticalPath: SchedulerCriticalPathSnapshot;
}

function prepareLearnedCriticalPathStrategy(
  input: Readonly<{
    readonly graph: SchedulerGraphSnapshot;
    readonly prediction: SchedulerPredictionSnapshot;
  }>
): PreparedLearnedCriticalPathStrategy;
```

factory 接收 invocation 已按现有 `planStaticCheckGraph → prepareTaskGraph` 路径形成的 immutable `SchedulerGraphSnapshot`；它不接收或重建 history identity。factory 先创建一次 score snapshot，再返回封闭该 snapshot 的 pure `AdmissionSelectionPolicy`。`criticalPath` 只供 invocation 在既有 admitted-Check diagnostic 中查询 score；不得让 logger 或 diagnostic callback进入 policy。

本 Change 保留当前重复 graph validation/preparation 次数，不顺带建立新的 shared prepared-graph lifecycle；消除该重复如果具有独立收益，应另行证明。这样可避免 graph owner 调整与 model/strategy 解耦混在同一行为等价 Change。

#### 4. Invocation 是唯一组合点

invocation 按以下顺序组合：

```text
normalized policy dispatch
  ├─ static  → no private policy; Scheduler 使用现有 static default
  ├─ custom  → 现有 custom adapter 形成 private policy
  └─ learned → prepare duration model
                 ├─ static-fallback → no private policy
                 └─ ready → prepare learned strategy
                              ↓
executeResolvedChecks(private policy)
  ↓
if learned model ready: recordTerminalMeasurement(terminal raw measurement)
```

invocation 保留：

- normalized public policy dispatch；
- model/strategy prepare 的调用顺序；
- learned admission diagnostic 对 prediction source/sample/estimate 与 score 的组合；
- record observation 的 human diagnostic presentation；
- prepare fallback 和 post-drain failure containment。

`resolved-checks` 的输入改为 optional private `AdmissionSelectionPolicy`。它删除 public `AdmissionPolicy`、custom adapter、duration model 和 critical-path imports，不根据 policy kind 选择策略；Task Scheduler 缺省 policy 时继续使用现有 static implementation。

#### 5. 行为等价 oracle 固定为可观察事实

实现前先以当前 tests/fixtures 固定以下 reference：

1. 相同 Definition、controls、project root 和 history bytes 得到相同 history identity、prediction values/digest 和 serialized history envelope。
2. score 继续由 `dependsOn ∪ observes` graph 按 `estimatedDurationMs + max(downstreamScore)` 一次形成。
3. tightening、constrained continuation、ordinary layer 顺序不变；同层 score、effective priority、canonical ID comparator 不变。
4. 最高 rank candidate 的 `canAdmit=false` 仍产生可 drain `wait`，不执行 backfill。
5. static/default 不进入 duration-model I/O；custom throw/thenable/malformed proposal 仍使用现有 admission-policy fault path，绝不 static fallback。
6. learned empty history、prepare static fallback、post-drain record/write failure 保持三种不同分类，且都不扩张 Check/Record、aggregate、machine publication 或 `RunResult`。

锁定内容包括 deterministic prediction digest、score table、admission decision/trace、terminal facts、bounded diagnostic event category/facts 和 history JSON bytes。human diagnostic 的行格式、monotonic timestamp、wall time、绝对临时路径和文件 import path 不是等价 oracle。

若现有测试没有直接覆盖某项，先在旧 composition 下增加或提炼 fixture，再进行迁移；迁移前后不得用两套测试输入。原生 test node 的增加、移动或修改按 Test Evidence owner 更新 Case ledger。

#### 6. 本 Change 不建立或演进长期 Decision

现有两条 active + aligned Decision 已完整规定 Scheduler 外 history、immutable prediction、pure stateless policy 和 hard-guard owner。本 Change 只对齐 private implementation ownership，不改变 public、算法、失败或兼容方向，因此无需新增或演进 Decision。

如果实施发现必须公开 model/strategy composition、改变 selection order/fallback/history contract，或建立可供多个算法稳定消费的新扩展协议，应停止本 Change 的行为等价实施，先通过新的 Decision 和重新规划承接；不能在本 Plan 中暗中扩张。

### Resulting Impacts

- 源码移动必须让 dependency direction 可由 imports 验证：`scheduler-duration-model/**` 不导入 `task-scheduler/**`；strategy 可以依赖 prediction type/value，但不依赖 history、preparation、recording 或 storage。
- `invocation.ts` 将删除 `SchedulerLearning`，分别持有 prepared duration model 与 prepared strategy；局部命名必须区分跨 Run model capability 和本次 Run strategy result。
- `resolved-checks.ts` 的 private input 收敛后，static/custom/learned 均通过同一 optional `AdmissionSelectionPolicy` 进入 Scheduler；public policy fault mapping仍由现有 adapter和Scheduler边界证明。
- critical-path tests 迁入 Task Scheduler证明域；history/prediction/persistence tests 留在 duration model证明域；invocation integration继续证明三阶段failure分流和第二次Run读取history。
- architecture、API mechanics和testing owner需要说明两个private owner及唯一composition point；configuration只保留public行为摘要，不复制private TypeScript shape。
- 后继算法 Draft 保持 draft；它只能在本 Change完成并验收后派生算法实施tasks。

## Risks / Trade-offs

- prepared capability如果捕获过多 invocation state，会把分离后的owner重新耦合；类型和测试必须限制其输入、输出与diagnostic observation。
- 移动 critical-path ranking 时若graph snapshot来源、task顺序或freeze发生变化，可能悄然改变score或tie-break；必须使用同一graph输入做迁移前后对照。
- `resolved-checks` 接收已形成policy后，custom adapter的构造位置会移动；custom policy fault仍必须由原Scheduler调用边界处理，不能在invocation提前调用或捕获。
- 行为等价要求暂时保留head-of-line wait和重复graph preparation；这是隔离算法/性能变化的有意取舍，不代表它们是最终最优设计。
- 目录迁移会造成较大Git rename diff和Case路径调整；它只表达owner变化，不能顺带重写统计、算法或测试语义。

## Open Questions

无。Draft 中会改变 Plan 形状的问题已按以下方式闭合：prepare 使用显式 `ready | static-fallback` 与 prepared record capability；模块命名为 `scheduler-duration-model`；strategy factory 消费当前 immutable `SchedulerGraphSnapshot` 并交付 policy + score snapshot；等价 oracle只锁定确定性行为事实；现有长期 Decisions保持不变。若实施需要越过这些选择，必须返回 Draft或建立后继 Decision，而不是局部变更范围。
