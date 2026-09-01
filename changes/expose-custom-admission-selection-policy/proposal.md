# Proposal

本 Plan 先把现有 private Scheduler 的 reservation/sticky 实现收敛为无状态 policy 与硬 guard，再以最小 trusted callback 将同一边界公开给 Project Definition 作者。

## Why

调用方可能知道后继关系、外部成本或一次 invocation 的 immutable 预测模型；这些偏好不能通过重排 Definition 或伪造 relation 表达。但直接公开 Scheduler 状态机会让调用方取得 dependency、mutex、capacity、cancellation、执行或 settlement 的所有权。

当前源码仍保存 `reservationTaskId`、`ReservationUpdate` 及相应 decision/diagnostic trace。这是已归档上游 Change 形成时的 current implementation，不是要保留的长期 contract：它把某一种防饥饿算法的记忆置入 Core，违背 policy 每轮只根据完整静态图和当前 immutable facts 重算的边界。本 Change 必须先删除该机制；防饥饿若有需要，只能是 future policy 自己的算法，而不是 Core 的保留协议。

## Outcome

`ProjectDefinition.scheduler.admissionPolicy` 提供 closed `static | custom` authoring contract。省略与显式 `static` canonical 等价；custom 使用同步的 `proposeAdmission(context)`，或使用只改善类型推断、与 inline value 等价的 `defineAdmissionPolicy(...)`。它从独立、deep-frozen 的完整 Graph 投影及最小动态事实提出精确的 `select(taskId)` 或 `wait`，但不能控制 Task 的执行或硬合法性。

private static、public custom 和后续 learned policy 都是无状态函数：每个 admission cycle 从同一 frozen full graph、relation/mutex candidates、capacity 与 runtime facts 重算。Graph Task metadata 是 topology 与 priority 的唯一来源。Scheduler 只验证 selected 下一运行选项的 pending/readiness/mutex/capacity/lifecycle hard conditions，或验证 wait 能由 running work 推进；它独占 cancellation、Task 启动、等待、结算与结果聚合。

custom callback 的 throw、thenable、malformed result、non-candidate/capacity-invalid select 或 undrainable wait 是 fatal admission-policy fault：停止新的 admission、取消 pending、drain 已启动 Task，并以专用 `admission-policy-failed` execution result 结束 Run；绝不 fallback 到 static。diagnostic 只记录有界 category，不泄漏 raw callback value、stack 或 caller data。

## Scope

### Intended Change

- 从 private Scheduler state、inspection、decision model、static policy、adapter、trace 和相关 tests 中删除 `reservationTaskId`、`ReservationUpdate`、`keep/set/clear`、sticky reservation 和 policy-order/reason trace。static tightening 每轮以完整 frozen graph 与当前 facts 重算；不会保留任何跨轮策略记忆。
- 在 `ProjectDefinition.scheduler.admissionPolicy` 增加 closed `static | custom` union。custom 不含 `policyId`、`policyVersion`、reason、reservation、registry 或 composition；callback function/closure 仅为 invocation trusted function，declarative fingerprint 只包含 variant `kind`。
- 从 prepared normalized graph 构造 public、ordinary、独立且 deep-frozen DTO。它以 canonical arrays 交接完整 tasks/scopes/relations 和 Task metadata 中的 priority；动态部分仅交接 relation/mutex candidate `{ taskId, canAdmit }`、running/settled IDs、active scopes 与 capacity/runtime facts。DTO 不泄漏 private types、`Set`/`Map`、Check options/functions、data、Records、messages、logger、clock、signal 或 imperative capability。
- 将 `proposeAdmission(context)` 的 exact `select(taskId) | wait` adaptation 接入 private policy。Scheduler 不重演公平、防饥饿、priority 或选择理由，只守 selected 下一运行选项的 hard conditions 与可推进 wait。callback 必须同步；overlapping Runs 共享 caller closure，由 caller 保证 reentrancy。
- 实现 fatal fault 收束与有界诊断：不建立 policy console capture、Check ownership、`checkMessages`、policy timing telemetry、public diagnostic parser 或 event grammar。
- 同步定义、normalization、fingerprint、package declarations/root export、public inventory、installed-consumer materials 与稳定 Configuration/Architecture/API/testing owners，使公开 authoring contract、private guard 和 execution-fault boundary 可共同验证。

### Resulting Impacts

- 已归档的 `extract-scheduler-admission-selection-policy` 提供形成时的 private reservation implementation；本 Change 以当前源码和 active Decisions 为准，移除该实现并留下无状态 private boundary，而不修改 archive 历史。
- `use-stateless-admission-policies-with-hard-scheduler-guards`、`keep-gate-run-evidence-complete-with-stateless-scheduler-context` 与 `expose-stateless-custom-admission-policy-to-callers` 共同约束 Core、Gate diagnostic evidence 与 public callback；实现、tests 与 stable owners 必须对齐三者。
- Definition validation/normalization/fingerprint、package declarations、installed consumer、scheduler adapter、fault lifecycle、diagnostic output 和 Test Evidence 都跨 owner 受影响。公开 custom 能力只有这些 owner 和证据同步后才成立。
- `add-scheduler-performance-diagnostics` 在本 Change 后只观察 selected/wait 与 hard-guard facts；`schedule-checks-from-learned-durations` 只把 Scheduler 外的 immutable prediction snapshot 交给同一无状态 policy boundary。fail-fast 与 named resource 仍是 Draft，不阻塞本 Plan。

## Success Criteria

- Core 不再保存或解释 reservation/sticky/fairness/starvation state；private/static/custom policy 的唯一结果为 `select(taskId)` 或 `wait`，static tightening 每轮重算。
- `admissionPolicy` 是 closed `static | custom` union；省略和显式 static canonical 等价；helper 只改善 inference；fingerprint 只区分 `kind`，不包含 callback identity、source 或 closure。
- custom context 是独立 deep-frozen ordinary DTO，完整 Graph 以 canonical arrays 交接且 priority 只在 Task metadata；没有 graph/priority side channel 或 private/mutable/capability leakage。
- Scheduler 只拒绝 select 的 pending/readiness/mutex/capacity/lifecycle hard-condition 违反和不能由 running work 推进的 wait；它不判断策略是否公平、是否饥饿、是否应等待或应选择其他 candidate。
- callback fault 不 fallback：pending 被取消、running 被 drain、Run 返回 `admission-policy-failed`，diagnostic 仅含有界 fault category，且不建立 console/check-message/timing/telemetry contract。
- package root、declarations、public inventory、installed consumer、Configuration、Architecture、API mechanics、testing owners、Decision Records 与 Test Evidence 共同证明公开能力；不增加 async callback、registry、composition、dynamic Task API、policy state protocol 或第二状态机。

## Affected Owners

- [`docs/configuration.md`](../../docs/configuration.md)：closed static/custom authoring、默认 canonicalization 与 callback input/output。
- [`docs/architecture.md`](../../docs/architecture.md)：无状态 policy、public projection、Scheduler hard guard、fault drain 与 execution owner。
- [`docs/api-mechanics.md`](../../docs/api-mechanics.md)：trusted callback、reentrancy、fault result 与 diagnostic boundary。
- [`docs/testing.md`](../../docs/testing.md)、`docs/testing/cases/**`：Definition/fingerprint、Scheduler guard/fault、public adapter 与 installed-consumer evidence。
- `src/project-definition/**`、`src/index.ts`：grammar、validation、normalization、fingerprint、declarations 和 root export。
- `src/project-run/task-scheduler/**`、`src/project-run/invocation.ts`：reservation removal、stateless static/custom policy、adapter、hard guard、fault cancellation/drain/result。
- `scripts/docs/package-api/**`、package examples 与 installed consumer：public inventory、declaration/runtime authoring evidence。
- [`docs/decisions/use-stateless-admission-policies-with-hard-scheduler-guards.md`](../../docs/decisions/use-stateless-admission-policies-with-hard-scheduler-guards.md)、[`docs/decisions/keep-gate-run-evidence-complete-with-stateless-scheduler-context.md`](../../docs/decisions/keep-gate-run-evidence-complete-with-stateless-scheduler-context.md)、[`docs/decisions/expose-stateless-custom-admission-policy-to-callers.md`](../../docs/decisions/expose-stateless-custom-admission-policy-to-callers.md)：长期边界与对齐检查。
