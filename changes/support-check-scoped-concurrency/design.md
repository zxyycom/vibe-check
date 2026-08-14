# Design

本 Design 让每个 resolved Check 在其真实执行窗口内暂时收紧同一个 invocation-wide shared scheduler，而不把 concurrency metadata 泄漏到 CheckDefinition、TaskDefinition 或第二个调度器。

## Context

### Upstream Input and Authority

`adopt-composable-check-tree` 是本 Change 的直接前置：它定义 Task-like `checks` tree、group authoring-only flattening、leaf selection、parent-to-child `dependsOn`/`mutex` append-dedupe、default concurrency，以及 flat Core catalog/private bindings。该 Change 尚未被本 Change 修改、重开或归档；本 Design 只消费它完成后提供的 normalized resolved Check metadata boundary。

既有 root `scheduler.maxParallel` 是 invocation-wide shared scheduler 的唯一固定预算。existing Task scheduler 已拥有 ready detection、dependency、named mutex、bounded admission、completion与 failure propagation。CheckDefinition 仅表达 stable Check/Record metadata；TaskDefinition 仅表达 Task graph metadata。Check-scoped cap 既不是新的 Check/Record identity，也不是每个 Task 的 authoring field。

### Stable Terms

| Term | Meaning in this Change |
| --- | --- |
| **root budget** | 顶层 `scheduler.maxParallel`；整个 invocation 的硬上限。 |
| **declared cap** | group 或 leaf authoring node 上可选的 `maxParallel` scalar。 |
| **resolved Check cap** | 从 root → group(s) → leaf 得到的单一 cap；每个 Check 只有一个值。 |
| **active Check** | 从其首个 executable direct task 或 TaskPlan leaf 被 admit 起，到 direct/terminal completion settlement 完成为止的 resolved Check。 |
| **effective cap** | root budget 与全部 active Check caps 的最小值；shared scheduler 在下一次 admission 前遵守它。 |
| **reservation** | 一个低 cap、ready、尚未 active Check 的 deterministic admission claim；它阻止无关 work 继续占用使该 Check 无法以其 cap 进入的 slot，并等待非抢占 drain。 |
| **drain** | reservation 生效后不再接纳阻碍目标 cap 的无关 ready work，直到现有 running work 自然结束且可 admit reserved Check。 |

## Goals / Non-Goals

### Goals

- 让 Check tree 以一个简单 scalar 表达 Check active window 内的 invocation-wide concurrency cap。
- 保持 root budget 为唯一顶层 scheduler owner，并让 all active constraints 以 `min` 组合。
- 保持 task graph、dependencies、mutex、unavailable/failure 和 Check/Record identity 的现有职责；phase-boundary cooperative cancellation 继续由 Run owner 观察，不扩张为 scheduler 中途取消协议。
- 提供无饥饿、non-preemptive 且 deterministic 的低 cap admission/drain 规则。
- 让 direct Check work 与 custom static TaskPlan 具有同一 Check lifecycle。

### Non-Goals

- 为 Check 或 Task 添加 `parallel` / mode boolean、优先级数值、独立 concurrency queue、worker 或 nested scheduler。
- 让 parent cap 与 child cap 取最小；tree inheritance 对 scalar 的规则是 child override。
- 以 array order 作为 execution order、tie-break以外的 priority，或隐式串行化。
- 取消、暂停、迁移或抢占已运行 work；在 execution 中动态创建/删除 Check、Task 或 cap。
- 把 resolved cap 放进 CheckDefinition、TaskDefinition、policy、Record、machine output 或 public TaskPlan metadata。

## Decisions

### 1. Authoring and Resolution Use a Single Scalar

`CheckGroup` 和 every Check leaf 允许 optional `maxParallel`。缺省时该 node 继承父级 effective scalar，根默认是 `scheduler.maxParallel`。child 明确给出的 scalar 覆写父级，而不是相加、取最小或用 null 清除。normalization 把每个 leaf 解析成一个 required `resolvedMaxParallel`。

每个 declared/resolved value 必须是 positive safe integer，且不得大于 root budget；例如 root 为 `4` 时 leaf/group 值只能是 `1..4`。超出 root 或无效值必须在任何 Check work、dependency probe、cache/output effect 前 fail fast，返回 definition validation diagnostic。`1` 的含义是该 Check active 期间 shared scheduler 至多运行一个 work Task；没有额外 boolean 或 mode。

### 2. Cap Applies to the Whole Shared Scheduler While Its Check Is Active

resolved Check cap 不是“该 Check 内部允许多少 Task”的局部计数。它是该 Check active 时对整个 invocation shared scheduler 的 temporary cap。每次 admission 前：

```text
effectiveCap = min(rootBudget, ...activeResolvedCheckCaps)
```

没有 active Check cap 时 effectiveCap 等于 root budget。多个 active caps 共同存在时取最小值；某个 Check 的 group/leaf inheritance 已在 normalization 收敛为一个 cap，因此不会以 parent/child values 再次取最小。

这使 `maxParallel: 1` 的语义明确：一旦该 Check 进入执行窗口，整个 shared scheduler 不再同时运行第二个 work Task，直到该 Check completion settle。

### 3. Activation and Release Follow Check Execution, Not Selection or Tree Shape

- direct Check：它的 direct task 被 admit 时激活；direct task 执行后的 Check settlement 完成时释放。
- TaskPlan Check：其首个 executable leaf task 被 admit 时激活；所有 plan leaves 完成后，terminal completion task 的 Check settlement 完成时释放。
- selection、catalog resolution、applicability resolution、TaskPlan construction、skipped Check、not-applicable Check 和没有 executable work 的 Check 不单独激活 cap。

cap 在 terminal settlement 前保持 active，即使该 Check 最后一个 leaf 已返回；这防止同一 Check 的 completion/availability transition 与 budget release 不一致。dependency、unavailable与 failure的既有 terminal settlement路径保持；cap 不改变它们的判定，只以同一 lifecycle cleanup 释放自身。

### 4. Admission Uses Existing Readiness Plus Deterministic Reservation and Drain

scheduler 首先照既有规则判断 ready：dependencies 已满足且 mutex 不冲突。cap 不会使 blocked task 变 ready，也不绕过 unavailable/failure handling。cooperative cancellation 仍只在 Product 拥有的 phase boundary 被观察，不改变 scheduler eligibility。

在每个 admission turn，scheduler 按以下固定步骤工作：

1. 从 current active Checks 计算 effective cap；如果 running count 已达该值，先检查是否需要为更低 cap drain，不直接补充新 work。
2. 已有 reservation 仍 ready 时优先兑现；如果 running count 尚不能容纳它，不 admit 其它 task，让既有 work 自然 drain。reservation 已不再 eligible 时清除并从当前 ready set 重算。
3. 若一个 ready、尚未 active Check 的 cap 低于 current effective cap，建立 reservation。多个候选按较低 cap、再 `(checkId, orchestrationTaskId)` 选择；当前 running count 已能容纳它时立即 admit，否则进入第 2 步的 drain。
4. 没有待兑现或新建的更低 cap reservation 时，在 ready tasks 中找 active constrained Check 的 task。当前最小 active cap 的 continuation 优先于 non-active 或更宽 cap Check；同类以 stable `(checkId, orchestrationTaskId)` lexical order 选择，避免 Check tree array order 影响。
5. admission 后重算 active caps，并从第 1 步继续；没有 reservation 或 active constrained continuation 时，才按照既有 deterministic ready order。

“能容纳 reservation”指 admit reserved Check 后 running count 不超过其 cap。reservation 只在其 Check 仍 ready、eligible且尚未 active 时存在；dependency、mutex、unavailable 或 failure 改变 eligibility 时立即重新计算。reservation 的优先级高于当前较宽 active Check 的 continuation，否则后者可以在 slot 释放时反复补位而阻止 drain。该规则既不为低 cap Check抢占现有 work，也不允许无关持续 ready work 无限填满 root budget而饿死它。

### 5. Scheduler-only Data Travels Through Private Handoff

Check tree normalization 产生 frozen `checkId → resolved cap` private orchestration map；Project Run 将它与 flat Core catalog 分开交给 Check orchestration。orchestration 再把 cap 与 generated task IDs 关联，scheduler 接收 private task-to-Check lifecycle context，维护 active caps、reservation和drain。该 context 不写入 `ResolvedCheckCatalog`、CheckDefinition、TaskDefinition、TaskPlan return、Record、policy或 machine output。

直接 work 和 TaskPlan leaf work在首个 admit时 activate。TaskPlan terminal completion使用同一 private Check context release。TaskPlan自身的 local `dependsOn`、`mutex`与 group-derived Check `dependsOn`/`mutex`继续通过既有 mapping进入 Task graph；cap 只附加在 scheduler admission层，不复制这些规则或新建第二 scheduler。

### 6. Determinism Does Not Create an Authoring Order

Tree flattening、Task plan validation与 scheduler ready state可以保留已有 deterministic normalization。新增 tie-break明确用 resolved `checkId`和 generated orchestration task ID，而不是 source array position；它只在同一时刻可 admit的多个 task之间选择，不产生 dependency、serial semantics或长期 priority API。

## Risks / Trade-offs

- **temporary global throttle。** 一个低 cap Check active 时会限制其他 Check；这是已确认的 invocation-wide语义，而不是内部局部 worker limit。
- **drain 延迟。** low cap 不抢占长任务，开始时间可能延后；reservation防止新无关 work进一步推迟它。
- **lifecycle precision。** cap若在 leaf完成而非 terminal settlement时释放，会破坏 completion/availability的一致性；需要 direct与 TaskPlan双路径测试。
- **scheduler complexity。** reservation增加状态，但仍在唯一 existing scheduler owner内；不用第二队列/调度器，状态必须可重算并在 failure/terminal settlement 清理。
- **compatibility surface。** `maxParallel` 是 Project Definition authoring contract；validators、docs、types、fingerprint、dogfood和npm projection需要同步，但 Core metadata/output不变。

## Open Questions

无。当前 Design 已收敛为：此 Change 独立依赖 `adopt-composable-check-tree`；cap是每个 resolved Check 的 invocation-wide `maxParallel`；默认root scheduler；`1`表示串行且无mode/parallel boolean；值必须是正安全整数且不大于root；group scalar child override；active window从首个 executable direct/leaf admit到direct/terminal settlement；active caps取最小；low cap使用deterministic reservation与non-preemptive drain；active constrained Check ready task优先；dependsOn/mutex/unavailable/failure保持；不污染Core catalog、CheckDefinition或TaskDefinition，不建第二 scheduler。
