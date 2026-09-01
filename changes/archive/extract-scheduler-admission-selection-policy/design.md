# Design

本设计把“什么 Task 可以被考虑”和“候选之间选择谁”放在相邻但不同的 owner 中，让一个纯 policy 承接准入偏好，同时保留 Scheduler 对合法性与执行的最终控制。

## Context

当前 `runTaskGraph` 的 imperative loop 从 mutable execution state 生成 immutable `SchedulerSnapshot`，再调用纯 `decideScheduler`。后者依次处理取消、dependency failure 后的 blocked settlement、完成和 admission；admission 分支过滤 dependency/mutex eligible Tasks，然后在有效 reservation、tightening scope、constrained continuation 和 ordinary ready 中选择。

现有实现已经接近策略边界，但 selector 分布在 inspection helper 与 admission decision 中。`admissionPriority` 又在三个不同 comparator 中参与，导致后续预测分数若继续局部插入，会难以回答“哪个规则优先”。本 Change 只重构这一既有责任，不改变它所依据的事实或结果。

本文件描述目标实现契约，不证明 runtime 已经抽取 policy。实施者应先恢复以下固定层次：

```text
mutable execution state
  -> immutable Scheduler inspection
  -> hard lifecycle handling: cancellation / blocked settlement / completion
  -> relation/mutex eligible candidates + per-candidate capacity facts + immutable full graph / dynamic inspection
  -> admission-selection policy: select or wait, each with reservation update
  -> guarded SchedulerDecision
  -> imperative shell: start / await / settle
```

## Goals / Non-Goals

**Goals**

- 用一个可独立测试的纯边界承接 reservation、准入层级和候选排序。
- 让 static-priority、后续 custom policy 与 learned-duration policy 复用同一输入、输出和 guard，并可读取全图拓扑。
- 保持 Scheduler 的确定性、有限进展、非抢占、容量正确性和默认 trace。
- 让 policy 名称、输入和输出足以由后续 AI 恢复责任，不依赖 helper 所在文件位置猜测。

**Non-Goals**

- 不增加或改变依赖、观测、mutex、scope、resource、fail-fast 或 cancellation 语义。
- 不在本 Change 中公开策略 callback、comparator、plugin、policy composition DSL 或 scheduler lifecycle hook；受约束的公共 selector 由独立 Change 使用本边界实现。
- 不在本 Change 中读取历史、预测时长、改变静态 priority 语义或启用自动学习。
- 不让 policy 启动 Task、等待 Promise、写诊断、修改 mutable state 或结算 Check。

## Decisions

### Intended Change

#### 1. Policy 只拥有一次准入选择

新增内部 contract，以现有实际类型命名为准，但语义固定为：

```ts
type AdmissionPolicyDecision =
  | Readonly<{
      kind: "select";
      taskId: string;
      reason: SchedulerAdmissionReason;
      reservationUpdate: ReservationUpdate;
    }>
  | Readonly<{
      kind: "wait";
      reason: SchedulerAwaitReason;
      reservationUpdate: ReservationUpdate;
    }>;
```

输入包含 immutable `SchedulerInspection`、本轮 relation/mutex eligible candidates（每项携带当前 `canAdmit` capacity fact）、已计算的 decision context，以及同一份 immutable `PlannedTaskGraph`。候选不会因当前 capacity 不足而被预先移除，使 policy 能返回可 drain 的 `wait`。Graph 是完整拓扑交接单元，Task 内置 `admissionPriority`、relations、scope 与 canonical order；不得再传 priority map/list 或局部图副本。policy 可以读取 capacity、scope 与 reservation，并可利用已知后继和全貌推导偏好，但不能获得 executor、logger、clock、signal object、Promise、history store 或 mutable collections。

只返回 `taskId | undefined` 无法区分 reservation deliberate wait、capacity wait 与实现遗漏，也无法维持当前 diagnostic reason。结构化 union 是本边界需要的最小结果，不扩展为通用 command language。

#### 2. Scheduler 在调用前后保留 guard

`decideScheduler` 继续在 policy 之前处理 cancellation、blocked settlement 和 completion。`decideAdmission` 形成候选后调用 policy，并在形成 `admit` 前重新确认：

- `select.taskId` 唯一对应本轮 candidate；
- `select.taskId` 当前仍可 admission；Scheduler 自己保留 capacity guard，policy 不自行重解释 readiness、mutex 或容量；
- `set` reservation 的 target 仍属于本轮 relation/mutex eligible candidates；`clear`、`unchanged` 与替换 reservation 的策略语义属于 policy；
- `wait` 时至少有一个 running Task，否则抛出既有 invariant failure；
- policy result 的 reason 与 reservation update 属于闭合 union。

policy 不是安全沙箱，但这些 guard 防止内部算法错误越过 Scheduler 的启动边界。imperative shell 仍只接受完整 `SchedulerDecision`，不直接接受 policy result。

#### 3. Static policy 迁移而不重写算法

第一项实现把当前选择阶梯按原顺序移动到 `static-priority` policy：

1. static policy 中仍 relation/mutex eligible 的 reserved Task 独占本轮选择；不能 admission 时返回 `reserved-tightening-scope` wait。
2. 没有有效 reservation 时选择最严格 effective cap 的 tightening Task；同 cap 按 priority 降序和既有 ID tie-break。
3. 没有 tightening Task 时选择 constrained continuation；沿用 cap、priority 与 ID tie-break。
4. 最后从 ordinary ready 中选择最高 priority；同 priority 保留 pending 稳定顺序。

本 Change 优先移动现有 helper 与 tests，不顺便统一 comparator、重命名 reason、改变排序或减少分支。默认等价证据通过后才允许删除旧 helper。

#### 4. Private policy value 为后续真实 consumer 服务

Task engine 可接收一个由 Product runtime 构造并冻结的 private policy value；每轮与该 value 一起交接 immutable full graph 和动态 inspection，省略时使用 static policy。该 value 不是 author callback，也不进入 `src/index.ts`、Project Definition、RunControls、declarative snapshot 或 fingerprint。

后续 custom-selector Change 可以把一个受信任同步函数适配为同一 private policy result；learned-duration Change 可以在 Check execution owner 中加载历史并构造只含 Task ID 与预测事实的 immutable snapshot，由 policy 结合全图选择对应内置策略。任何 filesystem read/write 都发生在 Scheduler 调用外；public custom adapter 可将其受约束的 select/wait/reservation result 投影到本 private contract，但本 Change 不为未知第三方策略预先设计注册表、lifecycle hooks 或 composition protocol。

#### 5. 与并行 Scheduler Changes 的顺序

实施前核对现行 `separate-passed-dependencies-from-settled-observations` Decision、Configuration 与 Architecture 已闭合的 directed readiness 与 blocked semantics；实现分支必须基于该最终模型，不得恢复已不存在的 `require-passed-dependencies-and-observe-outcomes` Change 名称或旧 `dependsOn` 语义。

`add-invocation-fail-fast-policy` 的 cutoff 属于 policy 调用前的 lifecycle handling。`add-named-resource-capacity` 若以后满足 Draft 证据，资源是否可 admission 属于 Scheduler inspection；大 claim 的有限进展规则才属于 policy。`add-scheduler-performance-diagnostics` 观察最终 decision，不直接依赖 policy 的文件结构。实施者需在 Readiness 中记录实际采用的顺序，不允许平行复制 selector。

### Resulting Impacts

- 部分现有 inspection helper 会移动到 policy owner；只服务硬约束或 blocker summary 的查询继续留在 inspection。
- `SchedulerAdmissionReason`、`SchedulerAwaitReason` 与 `ReservationUpdate` 成为 policy 和 guarded decision 的共同闭合 vocabulary，后续新增分支必须通过 exhaustive tests。
- 纯 decision tests 需要分别证明 policy selection 和最终 `SchedulerDecision` projection；imperative tests 继续证明 executor 只收到 admitted Tasks。
- `docs/architecture.md` 只记录稳定责任边界，不复制四层算法全文；精确选择阶梯仍由相邻源码、tests 和演进后的 Decision owner 承接。

## Risks / Trade-offs

- 若 contract 直接传入整个 mutable state，policy 会成为第二个 execution owner；因此输入必须是只读 inspection/snapshot。
- 若把所有 blocker filtering 都放入 policy，不同策略可能对“ready”产生不同解释；本设计让 directed readiness、mutex 与 capacity guard 继续由 Scheduler owner 形成。relation/mutex eligible candidates 和 capacity facts共同交接给 policy；reservation、公平/防饥饿只在策略需要时表达，Scheduler 不把 default sticky 行为重演为硬规则。
- 若只为后续能力预置大量 strategy interfaces，会违反无多余抽象要求；本 Change 只保留 static implementation 与 learned Change 确定需要的最小 private value。
- 抽取期间最容易出现“结构相同但 tie-break 漂移”；默认 trace 等价是实施门禁，不以单纯测试通过替代逐字段审阅。

## Open Questions

无。policy 的 private 边界、完整 Graph handoff（priority 内置、无旁路 priority 输入）、结构化 select/wait/reservation update、默认算法等价、Scheduler guard 与并行 Change 顺序均已确定；第三方 selector 的公共契约由 `expose-custom-admission-selection-policy` 独立承接。
