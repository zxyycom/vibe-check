# Scheduler admission 与终态交付

本文拥有 `src/project-run/task-scheduler/**` 的 admission reducer、real shell、measurement collector 与终态 handoff 不变量；[Architecture](architecture.md#execution-boundary)说明它在 Run 中的位置。公开配置、custom callback 和 measurement 语义由[调度指南](../guides/scheduling.md)定义，独立模拟见[模拟调度分支](../guides/simulating-admission.md)，用户输出状态由[输出指南](../guides/run-outputs.md#输出状态与失败处理)定义。

## Admission state 与 real shell

`admission-core/**` 编译 immutable graph、named-resource slots 和 persistent parent+delta state，以同一 pure reducer/canonical effects 完成 selection transition。running seed、admission 与任意 settlement 都经过它更新 occupancy，使 static/custom proposals、standalone simulation 和 real shell 使用同一 legality。

`createAdmissionGraph` 从独立 static input 建立 initial state；custom callback 的 `admissionState` 从 live boundary 建立同型 seed。二者只投影 frozen inspection/catalog/validation 和 hypothetical `select` / binary `settle` successor。静态 capacities/claims 用 canonical `{ resourceId, units }[]`；inspection 投影 occupancy，不提供 mutable counter 或资源操作 capability。同一 callback 重读保持 handle identity；旧 state 不随真实调度变动。

real shell 独占 Task/Promise、signal、actual value/error、diagnostic、measurement 与 RunResult；应用 reducer effects 后仍执行 callback-return hard guards。只有实际读取 `admissionState` 才构造 public catalog/search projection，普通运行不为未消费的推演视图付出构造成本。

Scheduler 负责 graph validation、readiness、dependency/mutex admission、root/scoped budget、atomic named-resource accounting、cancellation、blocked settlement 与 Task lifecycle。每次 proposal 后重检 pending/candidate membership、capacity 与 lifecycle cutoff；`wait` 仅在 running work 可 drain 时合法。priority 是 immutable graph metadata，不存在旁路 map/list；static policy 在相同 priority 规则下优先考虑 `canAdmit` candidate，避免被资源阻塞的 Task 浪费 root slot。

policy 只返回决定，Scheduler 不解释公平、防饥饿或等待理由；static tightening/continuation 每轮重算，不保存 reservation、sticky target 或策略状态。Task engine 不解释 Check terminal grammar、Records、scanner payload 或 aggregation。

## Public prepared admission-strategy lifecycle

完整 graph 已验证且未在 pre-work/planning 取消时，调用顺序如下：

```text
Invocation: graph ready → simple closure | await prepared prepare once
                                        │
                                        ▼
Scheduler: receives frozen synchronous policy → decide 0..N times → stops admission → drains
                                        │
                                        ▼
Scheduler: seals terminal measurement → internal summary → configured generic Hooks
                                        │
                         terminal context returned? ── no → no completion delivery
                                        │ yes
                                        ▼
Invocation: public prepared complete once → aggregate output
```

Invocation 为每 Run 解析一次 simple closure 或 prepared result；prepare failure 在 Scheduler 前形成 `admission-strategy-preparation-failed`。Scheduler 只收到 frozen synchronous policy，不接触 public prepare/complete。它停止 admission 并 drain started work，交付 sealed context 后，Invocation 才至多一次调用 complete。跨 Run 学习由[learned helper](architecture.md#learned-critical-path-helper-owner)承接，不获得 Scheduler 特权。

在任何 admission 前，Invocation 先处理 cancellation precedence，再完成[唯一 flag selection/control](project-definition.md#flag-enabled-checks)。这些 pre-admission settlements 留在同一 graph；Scheduler 仍负责 dependent blocking 和 observation readiness，不另建传播图。

custom throw、thenable、malformed proposal、illegal select 或不可 drain wait 都是 policy fault：停止新 admission、受控取消 pending Tasks、drain started work，最后以 `admission-policy-failed` 结束，绝不 fallback static。诊断仅记录 bounded fault category 与 hard-guard facts，不接收 raw callback value、stack 或 caller data。public callback 虽收到 frozen context，仍是 trusted host code，不是 sandbox。

## Measurement collector 与 immutable context

存在 effective diagnostics、nonempty generic Hook list、custom per-decision measurement 或 prepared terminal demand 时才创建 invocation-local collector。它通过 private handoff 接收 clock 和已有 declarative fingerprint；无 demand 的 plain static 不创建 collector 或读取额外 clock。

每次实际 custom callback 前，collector flush open interval、append 已完成 action observation，再创建 captured-prefix reader。一个 Run 只冻结一次 graph DTO；context 的 `measurementCount` 固定 end-count，`measurementAt(index)` 同步读取此前 prefix，越界返回 undefined，旧 context 不能看见以后 append。cumulative view 只含 bounded scalar/peak/discrete facts，避免每轮复制 graph、完整 per-Task table 或 history。

每条 observation 从 accepted select/wait 的 post-state 延续到下次实际 custom callback 前，包含期间 admitted/settled effects，只描述占用状态而不宣称 action causality。interval 使用 closed timing union：available 才有数值 contribution，unavailable 只有 reason；合法 zero span 不等于 timing fault。

collector 在 admission、pending/running settlement、accepted wait 和 terminal boundary 采样，独占 interval attribution、mutex/capacity/admissible 分类、slot/capacity integral、wait accumulator、per-Task admission table、peaks 和 tail active sequence。它不创建第二套 Scheduler state 或 boundary event ledger。clock throw、non-finite/backward sample、invalid interval/integral 只令 raw timing unavailable，不改变 admission、取消或 settlement。

terminal raw facts 保留 declarative fingerprint、离散 lifecycle、queue peaks；timing 可用时另含 shell/slot/capacity/wait accumulations、每个 admission-viable Task 的分类 delay table 与 admission/settlement boundaries。Task value/error/callback、clock、mutable collection 和 human summary projections 不进入 raw facts。summary 的 top-N、ratio、queue total 与 tail contributor 由[人读输出 owner](human-output.md#scheduler-summary-projections)推导。

## Terminal Hooks 与 completion

停止 admission 且全部 started work drain 后，Scheduler 一次递归冻结 context，包含 canonical graph、admitted/settled kind-only observation 和 raw measurement。diagnostic-enabled internal summary wrapper 与 caller Hooks 使用同一 ordered runner 和**同一 context object identity**；summary wrapper 包含 projection/writer failure，runner 只执行各 wrapper 的 failure policy，不识别 summary identity。

sync/async Hooks 逐个 await，Hook elapsed 不计 raw measurement；一个 caller Hook throw/reject 不阻止后续 Hook，也不改写 sealed facts。Scheduler 返回完成 delivery 的 context 后，Invocation 才调用 complete；成功 complete 不能覆盖已记录的 generic Hook failure。

nonempty caller Hooks 或 successful prepared result 实际含 complete 才启用 measurementHooks output；无 sealed context 时 enabled output 保持 not-run。所有实际 participants 成功才 succeeded，任一失败即 failed。无 primary failure 时按输出指南形成保留完整 facts 的 output failure；已有 cancellation、policy fault 或其它 primary failure 时只记录 Hook status，不覆盖 primary kind/diagnostic。pre-work/planning 没有 context，不交付 Hooks；summary writer failure 属于 diagnostic writer containment，不是 caller Hook failure。

Hook identity/source/closure 不进入 fingerprint；该 seam 不创建 Hook registry、machine/progress/Check facts 或自动学习。修改此链路时核对相邻 scheduler、invocation 与 output tests；capacity/hard-guard 变动还须同步审查[summary denominator、queue 分类与 boundary](human-output.md#scheduler-summary-projections)。

## 验证边界

Scheduler diagnostic Case 只证明 shell-owned human observation。scripted clock 分别证明 timing unavailable 与有效 zero span、single terminal summary attempt、writer containment、declarative-configuration matching、离散 facts，以及 capacity/wait/queue/delay/tail 投影。

queue evidence 使用同一 admission-viable pending 集合，证明 mutex/capacity/admissible 三类互斥 task·ms 与各自 peaks；named shortage 与 root/scoped shortage 共用 capacity 分类。graph/core/shell evidence 另证明 claims validation、atomic accounting、无关 work 可填充 root slot 和 settlement release。delay 三类 breakdown 必须完整组成 delay；tail 证明 last-admission post-state active count 与有界 contributors，不把结果解释为 policy 原因或 critical path。

formula/state-boundary tests 属于 Scheduler；logger formatting tests 只证明 bounded safe rendering，machine/public/progress tests 证明 summary 不扩张原契约。future fail-fast 或 capacity/hard-guard 变化后，须重审 denominator、queue classification、boundary 和 wait evidence。

learned helper 的 history/model tests 单独证明 local-state read、closed parser、prediction、record/atomic write 的 empty-model 与 persistence-failure 边界；无法预测时单次 static fallback 以[helper owner](architecture.md#learned-critical-path-helper-owner)及公开指南为准。模型参数不因此变成稳定 API，也不扩张 Check/Record/machine/progress/RunResult 契约。
