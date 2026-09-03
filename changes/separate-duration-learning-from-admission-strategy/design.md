# Design

本 Plan 用一个 invocation-scoped private strategy provider 组合“有状态 duration model”和“纯 learned critical-path algorithm”：`prepare` 每 Run 一次、`decide` 为 `0..N` 次纯选择；只有现有 execution 返回 terminal sequence/context 时才在既有 terminal Hook delivery 后一次 `complete`。invocation 运行该生命周期而不拥有学习实现。

## Context

现行稳定 owner 已确认：

- [`docs/architecture.md`](../../docs/architecture.md) 规定 learned mode 的时序为 pre-admission history load/prediction、pure Scheduler、post-closure history record/write；history 是 caller-managed、untrusted optimization state，不是 quality fact 或 public result。
- 两条 aligned Scheduler Decision 仍拥有 history 位于 Scheduler 外、immutable prediction、synchronous/stateless/pure `select | wait` 与 Scheduler hard-guard 边界；它们不是本 Plan 可改写的 lifecycle owner。
- Plan baseline 的 `scheduler-history/**` 拥有 bounded history、prediction、recording 和 storage，但也含 graph-derived `critical-path.ts`；`invocation.ts` 的 `SchedulerLearning` 混合 history、prediction、score 与 state directory，且 invocation 手工安排 prepare/create/record。
- 当前 public union、normalization 与 declarative fingerprint 保持 `{ kind: "learned-critical-path", stateDirectory }`；custom 仍是 synchronous `proposeAdmission` 加独立 terminal `measurementHooks`。本 Plan 不修改这些 public contracts。
- [`introduce-invocation-scoped-admission-strategy-lifecycle`](../../docs/decisions/introduce-invocation-scoped-admission-strategy-lifecycle.md) 现为 `active + aligned` 的 stable direction：它确认 private outer strategy lifecycle / inner Scheduler-facing pure policy 的分层；它不闭合或开放 public custom grammar、context、failure 或 compatibility contract。

本 Plan 的消费任务是：不从归档或对话推断时，也能明确知道谁实例化一次策略、谁作多轮 decision、谁在终态提交，以及 complete 的数据能流向哪里。上文的 `scheduler-history/**`、`SchedulerLearning` 与手工 handoff 是**Plan baseline** owner；下表记录本 Change 已实现的 **post-change owner topology**。当前稳定事实由相应的产品架构文档拥有。

| Owner | 输入 | 输出 | 不得承担 |
| --- | --- | --- | --- |
| Scheduler duration model | canonical prediction input、state capability、terminal measurement | prediction、read/record observation、record capability | graph ranking、candidate selection、Task lifecycle |
| Critical-path algorithm | immutable graph、prediction、decision DTO | score snapshot、frozen private policy whose decide is synchronous/pure | filesystem、history schema、sample update、logger、cross-Run state |
| Private strategy provider | effective policy、graph、model/algorithm owner | prepared strategy with full frozen `admissionPolicy` and closed terminal-measurement requirement | Scheduler hard guards、public generic registry |
| Invocation | normalized policy、provider、Run controls、existing outputs/Hooks | lifecycle sequencing plus collector condition | learning/statistics/score implementation、public requirement field |
| Resolved Check execution / Scheduler | prepared strategy's private `admissionPolicy`、dynamic Scheduler facts | admission, wait, settlement, terminal measurement | provider lifecycle, history I/O, model training |

## Goals / Non-Goals

**Goals**

- 分离 duration model 和 pure algorithm 的唯一 private owner，并以 provider 承接它们的 invocation-scoped composition。
- 固定有效策略每 Run 一次 `prepare`、Scheduler 内 `0..N` 次同步、result-only `decide`；仅在现有 terminal sequence/context 返回、measurement seal 和既有 terminal Hook delivery 后一次 `complete`。
- 用 prepared private requirement 加既有 outputs/Hooks 保持现有 measurement 启用矩阵：plain static 无额外 requirement；custom 保留 per-decision + terminal；learned ready/static-fallback 保留 terminal；logging/configured Hooks 独立启用。static无duration-model I/O且不因此额外读取clock。
- 让 `resolved-checks` 仅 hand off private `AdmissionSelectionPolicy`，保留 Scheduler hard-guard owner。
- 以当前实现为 oracle 保持配置、fingerprint、prediction、score、admission、diagnostic、settlement 与 storage 行为等价。
- 为算法 Draft 提供固定 prediction seam，同时为 public custom lifecycle Draft 提供私有生命周期的已验证实现基础。

**Non-Goals**

- 不改变 public `AdmissionPolicy` union、Definition validation、normalized snapshot、fingerprint 或 `stateDirectory` 解释。
- 不将现有 custom callback 迁为 provider，不合并或改变 `measurementHooks`，也不公开 prepare/complete context。
- 不改变 sample window、statistics、history envelope/model version、critical-path formula、selection layers、priority/ID tie-break、measurement trigger 或 fallback。
- 不增加 backfill、lookahead、可变 policy state、public model DTO、per-Check estimate、策略 registry、generic `PerformanceModel` 或算法注册协议。

## Decisions

### Intended Change

#### 1. Provider 是每次 Run 的策略实例化边界

新增一个 closed、product-private provider dispatch，而不是让 invocation 手工理解 learned model 的各部分：

```ts
interface PreparedAdmissionStrategy {
  /** Frozen full private contract; Scheduler receives this, never lifecycle hooks. */
  readonly admissionPolicy: AdmissionSelectionPolicy;
  /** Closed private requirement, resolved by invocation with existing outputs/Hooks. */
  readonly requiresTerminalMeasurement: boolean;
  readonly complete: (context: AdmissionStrategyCompleteContext) => void | Promise<void>;
}

interface PrivateAdmissionStrategyProvider {
  prepare(
    context: AdmissionStrategyPrepareContext
  ): PreparedAdmissionStrategy | Promise<PreparedAdmissionStrategy>;
}
```

这是 private closed dispatch，不是面向消费者的 registry 或 generic extension protocol。每次 effective strategy 只产生一个新的 prepared instance；并发 Run 不共享 closure。`admissionPolicy` 必须是完整 frozen private policy，而非裸 `decide`：它保留现有 per-decision measurement requirement metadata，特别是 custom adapter 的 `requiresMeasurement: true`、decision-boundary prefix reader与 accepted action interval attribution。`requiresTerminalMeasurement` 是另一个最小、closed private requirement；invocation 将它与既有 diagnostic logging/configured measurementHooks 合并，按当前条件启用collector/clock。矩阵固定为 plain static `false`、custom `true`、learned ready `true`、learned static-fallback `true`；logging/Hooks不依赖这些值而独立启用。static/custom provider 的 no-op completion 不请求、创建或伪造额外 terminal measurement：它们只消费已有 handoff，不能为了统一接口全局开启collector。现有 custom adapter 仍只包装 trusted synchronous callback，保留其 closure、reentrancy和host-side-effect边界；它不获得新的 public lifecycle。

prepare context 只含本次 Run 已稳定的图、normalized/effective strategy 所需的稳定 facts、已授权 capability 和 cancellation signal；不含 dynamic candidates、running/settled state 或未来 measurement。返回对象可以以 closure 保存本次准备得到的 immutable prediction、score、历史快照和算法参数，但 `decide` 不得通过隐藏可变状态改变选择结果。

#### 2. 生命周期和测量边界严格固定

```text
graph ready
  → provider.prepare(context)                         once
  → Invocation combines prepared terminal requirement with existing outputs/Hooks
  → Scheduler receives prepared.admissionPolicy
      → policy.decide(context)                         0..N, synchronous/result-only
  → Scheduler stops new admission, drains, seals measurement
  → existing Scheduler terminal measurement Hooks deliver
  → executeResolvedChecks returns terminal sequence/context?
      yes → prepared.complete(terminalContext)       once
      no  → no complete delivery
```

- `prepare` 可异步读取或验证 caller-managed history，并在 Scheduler measurement 开始前完成；它不选择 Task 或读取 Scheduler dynamic facts。
- Product-owned static/learned `admissionPolicy.decide` 只读取 immutable prepared data 与本轮 Scheduler DTO，精确返回 `select | wait`。现有 custom callback仍为trusted synchronous result-only callback，可使用自己的closure、reentrancy和host-side effect；Product不提供imperative Scheduler capability。Scheduler只消费完整 frozen policy，继续验证提案并拥有所有hard guards；它不接触prepare/complete。full policy上的per-decision measurement metadata必须逐项原样hand off。
- `complete` 只在 `executeResolvedChecks` 已返回 terminal sequence/context 时调用一次，且一定晚于 Scheduler 已停止 admission、drain、terminal measurement seal 与既有 terminal measurement Hook delivery；normal、cancelled 与 admission-policy-failed 若返回该 context 都 delivery，task-engine/pre-terminal failure 不返回它就不 delivery。它可异步记录学习样本或清理 provider resource，但不得再次调度、修改 terminal facts 或触发 decide。
- `prepare` 与 delivery 后的 `complete` 耗时不计入 Scheduler performance measurement。provider 只消费既有 terminal handoff。invocation 以 `admissionPolicy` 的既有per-decision requirement、`requiresTerminalMeasurement` 与独立 diagnostic logging/configured measurementHooks形成collector condition：plain static不因provider启用，custom保留per-decision+terminal，learned ready/static-fallback保留terminal；no-op completion不得为统一接口全局启用collector或读取clock。prepare failure、static fallback 和 complete recording/write failure继续映射到当前有界诊断/结果路径。

complete 不可能影响同一 Run 先前的 decision。唯一允许的数据流是：

```text
Run N complete → caller-owned persistent store → Run N+1 prepare → immutable closure → Run N+1 decide
```

#### 3. 两个内部 owner通过 learned provider组合

`src/project-run/scheduler-duration-model/**` 拥有 history、prediction、preparation、recording 和 storage。其 preparation result 继续为 closed `ready | static-fallback`：history missing/malformed/incompatible/read-failed 仍形成 empty learned model；canonical input/setup 失败才为现有 static fallback。ready value 捕获 prediction identity、history snapshot 和终态 record capability，但不捕获 raw authored options、flags、Check data 或 Scheduler mutable state。

`critical-path.ts` 移入 `task-scheduler/**`（例如 `critical-path-ranking.ts`）。纯 factory 接收 immutable `SchedulerGraphSnapshot` 与 `SchedulerPredictionSnapshot`，一次形成 score snapshot 和封闭该 snapshot 的完整 frozen `AdmissionSelectionPolicy`；其 decide 不接触 history I/O 或 cross-Run mutation。

learned provider 的 `prepare` 调用 duration-model preparation；`ready` 时调用 pure factory 并形成 prepared strategy，`static-fallback` 时形成静态 prepared strategy。prepared learned strategy 的 `complete` 使用已封闭 terminal context 调用 duration-model record capability。admitted-check diagnostic 所需的只读 score lookup 保持 provider 私有的 observability companion，不能进入 Scheduler policy 或成为第四个 lifecycle hook。

#### 4. Invocation 仅运行生命周期

invocation 的唯一职责是：在 graph ready 后 resolve effective private provider，await 一次 prepare，将 policy保留的per-decision requirement、prepared `requiresTerminalMeasurement`与既有diagnostic logging/configured measurementHooks合并为当前collector condition，再将 `prepared.admissionPolicy`（而不是裸 decide）hand off 给 `resolved-checks`；只有后者返回既有 terminal sequence/context，才在其既有 terminal measurement Hooks 已 delivery 后 await 一次 complete，并把 provider observations 投影为现有 human diagnostic。没有该 handoff 的 task-engine/pre-terminal failure 不调用 complete。invocation 不单独调用 duration-model prepare、critical-path factory 或 record capability，也不计算 score/statistics。

`resolved-checks` 只接收 optional full frozen private `AdmissionSelectionPolicy`；它不导入 public `AdmissionPolicy`、duration model、provider lifecycle 或 critical-path snapshot。Scheduler 缺省 policy 仍是 static implementation。现有 custom fault、trusted callback closure/reentrancy/side-effect boundary与 private `requiresMeasurement`/decision-boundary measurement behavior必须仍在 Scheduler 的 policy adapter boundary形成，不能被invocation提前执行、剥离metadata或降级为static。terminal requirement只由prepared/provider private handoff提供，不能从public kind散落推断。

#### 5. 等价 oracle 与直接生命周期证明

实现前以当前 fixtures 固定：

1. 相同 Definition、controls、project root 和 history bytes 得到相同 history identity、prediction values/digest、serialized envelope 与 score。
2. `dependsOn ∪ observes` score formula、selection layers、priority/ID tie-break、不可 admission 的最高候选所产生的 drainable wait 均不变。
3. 返回 terminal sequence/context 的 normal、cancelled、admission-policy-failed Run 的 `prepare once → decide 0..N → complete once` 调用顺序；complete 观察到的 terminal measurement 已封闭且既有 Hooks 已 delivery。task-engine/pre-terminal failure 无 complete，且同一 Run 无 complete-to-decide 回流。
4. requirement matrix逐项等价：plain static无额外measurement；custom完整 private policy保留 `requiresMeasurement: true`、decision-boundary prefix、accepted action interval attribution及prepared terminal requirement；learned ready/static-fallback均保留terminal requirement；diagnostic logging/configured Hooks独立启用collector。static/default不I/O且no-op completion不全局启用collector/clock。custom仍保留trusted closure/reentrancy/host-side-effect边界，throw/thenable/malformed proposal继续走admission-policy fault，绝不static fallback。
5. learned empty history、prepare static fallback 与已 delivery complete 的 record/write failure 仍为不同分类，不扩张 Check/Record、aggregate、machine publication 或 `RunResult`。

锁定 deterministic prediction digest、score table、admission trace、terminal facts、diagnostic category/facts 和 history JSON bytes；不锁定 human diagnostic line format、timestamp、wall time、absolute temp path 或 import path。若现有证据没有直接证明上述生命周期，先在旧 composition 下补齐同一输入的 proof，再迁移。

#### 6. Lifecycle Decision 与 public custom lifecycle

[`introduce-invocation-scoped-admission-strategy-lifecycle`](../../docs/decisions/introduce-invocation-scoped-admission-strategy-lifecycle.md) 现在是 `active + aligned`。其方向是 private outer strategy lifecycle 与 inner Scheduler-facing pure policy 的分层；它不闭合 public grammar、context、failure 或 compatibility。既有 aligned Decisions 继续拥有 history、pure policy 与 hard-guard 边界。

[`support-invocation-scoped-custom-admission-strategies`](../support-invocation-scoped-custom-admission-strategies/proposal.md) 才评审 custom author 是否可获得 `prepare → decide → complete`，以及 public context、failure/output、compatibility 和 fingerprint。它依赖本 Plan 的 private seam 已被验证，但不反向要求本 Plan 先确定 public API。

### Resulting Impacts

- imports 必须验证：duration-model 不导入 task-scheduler；pure critical-path algorithm 不导入 history/preparation/recording/storage；provider 是二者的唯一组合者；invocation 不导入 learning implementation。
- `SchedulerLearning` 删除。每个 Run 的 provider/prepared instance、immutable closure 和 terminal commit点以局部控制流和测试可恢复。
- static、custom、learned 经同一 prepared strategy 的完整 frozen `admissionPolicy` handoff进入Scheduler；invocation以closed `requiresTerminalMeasurement`和既有outputs/Hooks形成collector condition。不把lifecycle挤入`AdmissionSelectionPolicy`或Scheduler，也不丢失/公开per-decision/terminal measurement requirements，或因no-op completion扩张现有collector/clock启用。
- critical-path tests 属于 Task Scheduler；history/prediction/persistence tests 属于 duration model；provider/invocation integration证明 hook顺序、failure分流、并发隔离和第二次Run读取history。
- architecture/API/testing 文档说明 private lifecycle与public未变；configuration只保留现有 custom/learned authoring行为，不承诺 private TypeScript shape。
- 后继算法和 public custom Draft 均不得在本 Plan 实施中提前改写源码或公共契约。

## Risks / Trade-offs

- provider 若暴露或捕获过多 invocation state，会重新耦合 owner；prepared closure只能保存 immutable model/algorithm data，动态 facts必须经 decide context传入。
- provider 如果被做成泛化 registry，会在没有真实第二个 consumer前扩大契约；本 Plan 保持 closed private dispatch。
- complete 的异常、cancellation 和 policy fault时机若没有精确测试，可能改变现有 failure containment；必须先以当前行为建立每个终态分支的 oracle。
- 迁移 graph ranking 时若 graph input、task order或freeze变化，会悄然改变score/tie-break；必须在同一graph输入上对照。
- 行为等价有意保留 head-of-line wait和现有重复 graph preparation；它们不是性能优化结论。

## Open Questions

无。已确认的当前行为等价边界是：prepare 是 effective strategy 每 Run 一次实例化，Product-owned static/learned decide 是 Scheduler measurement 内同步纯选择，custom仍是trusted synchronous result-only callback；prepared private requirement与既有outputs/Hooks保持plain static/custom/learned ready/learned fallback的collector矩阵。只有 `executeResolvedChecks` 返回 terminal sequence/context 的 normal、cancelled、admission-policy-failed Run 才在既有 terminal Hook delivery后一次 complete，task-engine/pre-terminal failure 不 complete。static/custom no-op completion不改变既有collector/clock启用。lifecycle Decision 已为 `active + aligned`；public custom lifecycle仍属后继 Draft。
