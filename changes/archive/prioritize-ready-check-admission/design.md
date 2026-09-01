# Design

本设计把 priority 限定为静态、声明式的准入 tie-break，使其与既有 reservation 分工而不合并成一个更复杂的调度状态机。

## Context

Project Definition 按递归 Check 顺序生成稳定的 normalized declarations 和 task graph。当前 `decideAdmission` 先过滤 dependency/mutex eligible tasks，再按以下顺序决策：

1. 已存在且仍 eligible 的 reserved tightening task；
2. 新的 tightening-scope task；
3. constrained continuation；
4. `eligibleTasks[0]`，即当前稳定 task order。

其中 tightening 与 constrained selector 当前先比较 `scope.maxParallel`，再比较 `scope.id` 和 `task.id`；ordinary selector 才直接保留 pending/Definition order。priority 必须插入这些既有比较链，而不是顺便统一或替换它们。

`maxParallel` 可以在 Check tree 中形成更紧的局部 scope。当 tightening task 已 ready 但暂时不能安全准入时，scheduler 记录 `reservationTaskId` 并等待运行任务排空，以保证该局部 cap 最终能被激活。这个机制解决的是合法性和有限进展，不是业务优先级；删除它或每轮按 priority 重选 reservation 都可能造成局部 scope 长期无法启动。

因此本 Change 不构造“priority scheduler + reservation scheduler”两套算法。它只为现有纯选择函数提供一个 immutable 比较键，所有 capacity、dependency、mutex、scope activation 和 reservation transition 继续由当前 owner 决定。

## Goals / Non-Goals

**Goals**

- 让 author 明确表达 ready Check 的相对准入偏好，而不改变 Check tree 的阅读顺序。
- 保留 scheduler 的确定性、非抢占、有限进展与默认行为。
- 把 priority 与 reservation 的组合规则写成一个闭合选择阶梯，避免跨函数隐式竞争。
- 让本仓库只依据可复现的 critical-path 证据调优 Gate。

**Non-Goals**

- 不根据历史耗时、当前 elapsed time、CPU/IO 分类或运行反馈自动调权。
- 不实现 aging、deadline、抢占、priority inversion 解决器或 dependency/mutex priority inheritance。
- 不新增 heap/priority queue、第二个 pending 集合、scheduler service 或持久化历史。
- 不改变 Check result、aggregation、machine publication、progress rendering 或 final output 排序。
- 不承诺所有 consumer 通过提高长任务优先级都能缩短 wall time。

## Decisions

### Intended Change

#### 1. Authoring 与继承

`CheckBase` 增加可选 `admissionPriority?: number`。closed parser 只接受 `Number.isSafeInteger(value)`；省略时 effective value 为 `0`。字段允许负数，使项目可以降低一组任务的相对偏好而无需为其余任务统一改号。

容器和 executable Check 都可以声明该 scalar。resolution 沿 Check tree 传递 nearest explicit value；子节点未声明时继承父节点 effective value，声明时完整覆盖。该行为与 `maxParallel` 的 scalar inheritance 同类，不使用只适用于集合字段的 `inherit({ add, remove })`。

每个 normalized executable declaration 都显式携带 effective `admissionPriority`，包括默认 `0`。它进入 declarative snapshot/fingerprint 并 deep-freeze；省略和显式 `0` 得到相同 fingerprint。trusted execution/preflight 不读取或修改它。

#### 2. 单一 immutable task metadata

Check execution plan 将 normalized value 原样投影为 task graph 的 `admissionPriority`。generic task graph authoring 也接受该字段，默认 `0`，验证为安全整数，并在 `PlannedTask` 上冻结。

priority 不是 task lifecycle state。scheduler 不维护 current priority、age、历史 duration 或独立 priority queue；现有 pending task 稳定数组仍是唯一候选顺序，`reservationTaskId` 仍是唯一与该选择相关的持久状态。

#### 3. 闭合准入选择阶梯

每个 decision cycle 先按现有规则过滤 dependency/mutex eligible tasks。未进入该集合的高优先级 task 不参与本轮比较，也不阻塞 eligible tasks。

候选按以下阶梯选择；后一个层级不能越过前一个层级：

1. **Reserved task**：若当前 reservation 仍指向 eligible pending task，只评估该 task。能通过 `canAdmit` 就准入并清除 reservation，否则继续等待且不重排。
2. **Tightening scope**：沿用当前 tightening 候选条件；多个候选先按 effective scope cap 升序，再按 `admissionPriority` 降序，最后沿用 scope-id/task-id 升序。选中 task 若不能准入，建立 reservation。
3. **Constrained continuation**：沿用当前 continuation 候选条件；按 effective scope cap 升序、priority 降序，再沿用 scope-id/task-id 升序。
4. **Ordinary ready**：其余 eligible tasks 按 priority 降序、稳定 task order 选择。

所有分支在实际 admit 前仍调用现有 `canAdmit`。同优先级保持各 selector 当前的最终 tie-break，因此默认 `0` 不改变 admission trace。priority 不在不同层级间全局排序，避免普通高优先级 task 破坏正在收紧或维持的 capacity scope。

#### 4. Reservation 是单向实现机制

priority 决定“当前层级希望先尝试谁”；reservation 决定“一个已选择的 tightening task 如何等待到合法准入”。两者只在建立 reservation 的瞬间相接：候选可由 priority 打破同 cap tie，reservation 建立后 priority 不再介入。

若 reserved task 已取消、完成、失败或因依赖/mutex 状态不再属于可处理的 pending eligible 集合，沿用现有 stale-reservation 清理语义，再从完整阶梯重新选择。实现不得增加 reservation stealing、周期性重排或 aging 来补偿 priority。

#### 5. 可审计但不扩展结果协议

internal `admit` SchedulerDecision 增加 selected task 的 effective `admissionPriority`。现有 diagnostic logger 原样观察该 decision，因此人读记录可以同时恢复 task、selection reason、eligible count 与 priority；imperative scheduler shell 不计算或解释 priority。等待 tightening drain 时，既有 `reservationUpdate.taskId` 标识已选 task，Definition fingerprint 标识完整配置。不要把 priority 写入 Check/Record facts 或 machine v4 schema。

Definition fingerprint 已包含 effective priority，因此运行证据可以关联到准确配置。terminal Check 和 Record 的排序、status 与 data 不因准入先后变化。

#### 6. Gate 配置由测量决定

实施前先在可复用 exact candidate 上建立当前 required/full baseline。每个 profile 和配置 variant 先运行一次不计入样本的 warm-up，再按 AB/BA 交替顺序采集五组 default/tuned 配对样本。两种 variant 必须使用相同 Check membership、root capacity、runtime/toolchain、candidate identity 与 candidate reuse policy，并记录：

- total wall time 的中位数与离散度；
- candidate long task 的 ready-to-start delay 和 duration；
- dependency/mutex wait，尤其 package lifecycle provider 与 downstream consumer；
- admission trace，确认改善来自预期的启动顺序而非遗漏工作。

优先级是手工、静态配置，不从单次 duration 自动生成。只有同时满足以下条件，才在 `scripts/project/gate/definition.ts` 保留非零值：目标 ready-to-start delay 在至少四组配对样本中降低；required 与 full 的 tuned wall-time median 都不高于各自 default median；至少一个 profile 的 tuned median 更低；所有 task membership 与 terminal outcome 相同。原始样本、median 与 p90 全部保留，不能只报告最优值。未满足时，Product contract 仍可完成，但本仓库 Gate 保持默认 `0` 并记录未采用原因。

Gate Definition 改变后必须为新 declarative fingerprint 重新采集 checked-in advisory performance baseline；旧 fingerprint 的数据不能冒充新配置证据。

### Resulting Impacts

- pure decision helper 可以增加局部 comparator/selection helper，但 imperative scheduler shell 不应知道 priority 规则。
- 手写 task/normalized declaration fixtures 需要补充显式默认值或通过统一 normalization 获得默认值，避免测试临时绕过公共 grammar。
- semantic Cases 需要覆盖 authoring/inheritance/fingerprint 与 scheduler admission 两个 owner；性能 A/B 是 Gate 配置证据，不替代 deterministic unit tests。
- 实现前用 Decision Records 演进 [`retain-running-parallel-limits-and-order-ready-admission-by-priority.md`](../../docs/decisions/retain-running-parallel-limits-and-order-ready-admission-by-priority.md) 和 [`configure-project-gate-admission-priority-by-repeated-comparative-evidence.md`](../../docs/decisions/configure-project-gate-admission-priority-by-repeated-comparative-evidence.md)，不得让 Plan 单独成为长期规范 owner。

## Risks / Trade-offs

- 静态 priority 可能随 workload 演进而失真；通过默认 `0`、人工配置和 baseline fingerprint 隔离，不引入运行时自适应复杂度。
- 更早启动长任务可能推迟 mutex provider 或关键 downstream；Gate 的 dependency/mutex A/B 证据用于阻止直觉式配置。
- signed integer 给 author 足够排序空间，但过多层级会降低可读性；文档应建议少量相对档位，而不是唯一编号每个 Check。
- priority 不能消除 capacity 限制；reservation 的 drain 可能暂时让高优先级 ordinary task等待，这是维护 scope 正确性的有意结果。

## Open Questions

无。字段 grammar、继承、选择阶梯、reservation 关系、非目标与 Gate 证据规则均已确定。
