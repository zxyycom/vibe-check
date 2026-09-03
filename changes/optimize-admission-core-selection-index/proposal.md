# Proposal

以 current-runtime 证据将 immutable admission core 的重复 legality 计算收敛为每个 state 一份 private semantic selection index，并保持 public API 与 Scheduler lifecycle 不变。

## Why

`docs/investigations/assess-admission-state-performance-and-selection-index.md` 已将 admission mechanism 标为真实 Scheduler 回退信号，但明确要求下一轮先取得 current profile 与多规模完整语义 workload。当前 `admission-core.ts` 对 catalog、single-task validation、select、Scheduler candidate、scope/capacity 和 forced-block 反复扫描 parent+delta 或 graph；这使 immutable predecessor retention 的低 successor-copy 成本不能代表 selection/settlement 成本。

## Outcome

实现后，同一 immutable core state 仅形成并复用一份 private selection legality index；public catalog DTO 仍按 getter 惰性投影，Scheduler 仍是唯一 reducer/effect/execution owner，且 before/after 可以用同一 baseline command、fixture、seed、samples 与 CPU/heap 方法比较。

## Scope

### Intended Change

在 `src/project-run/task-scheduler/admission-core.ts` 及其直接 private scheduler integration 中，以 compiled static reverse relation/mutex/scope indexes 和 representation gate 选定的 immutable dynamic selection index 取代每次查询沿 parent chain、全图或排序 scope 的重复工作。index 以现有 primary rejection precedence 逐层形成 legality facts，供 Scheduler candidates、public catalog、validateSelection、select 和 custom callback 返回后的 Scheduler hard revalidation 共同投影。新增本 Change-owned semantic oracle 与 development benchmark；前者在 representation gate 前固化 current correctness，后者保留 current before 性能证据并为 A/B/C after 复测提供同形 harness。

### Resulting Impacts

- `AdmissionState`、`AdmissionGraph`、rejection reason union、catalog order、frozen/opaque surface、binary public settlement 与 public DTO identity 均不新增或改变；index 和 DTO cache 都是 private。
- 所有 core transition 继续由 shared reducer 产生 canonical effects；Scheduler 只 replay 已产生的 effects，不复制 relation/capacity/forced-block logic。
- `dependsOn`、`observes`、mutex、scope activation/lifecycle、root/global capacity、legacy Scheduler snapshot seed、cancellation 与 forced block 都必须转为同一 index 的增量更新或 query gate，不能留回 full scan fallback；static reverse index 必须保留 relation/mutex occurrence 与原声明顺序。
- 原生 scheduler tests 预计需要新增或修改以证明 index 与 trace/public behavior 等价；届时须按 `docs/testing.md` 和 `test-evidence-review` 维护 current Case closure。
- semantic oracle 与 benchmark 只属于 Change readiness/verification，不是 Product public API、runtime benchmark budget 或跨主机 SLO。

## Success Criteria

1. Current before artifact 记录可复现 command、commit、environment、seed、warmup/samples、p50/p95、CPU 与 heap-proxy 方法，并通过 static/custom/learned unused-public-state、public/core operation、T/D/topology/forced-block scenario closure。
2. representation gate 前持久化的 semantic oracle 必须逐项等价：primary reason/payload/order、candidate order/canAdmit、select/settle trace、forced IDs/order/effect projections、legacy snapshot、callback hard guard 与 cancellation；timing rows不能替代该证明。
3. 每个 immutable core state 只持有/解析一份 private semantic selection index；没有 consumer 会单独重算 legality，也不在 state construction eagerly create public catalog DTO。public primary rejection reason、catalog task order、unknown/non-pending/state-complete behavior、scope/root capacity payload、synchronous custom callback hard revalidation、forced effect/dependency-ID order 与 Scheduler settlement behavior 均不变。
4. A/B/C 三个 candidate 都在同一完整语义 workload、seed、warmup/samples、CPU/heap/GC method 下比较，并单独记录 retained DFS/BFS branches、cache lifetime/created-index count 与 retained-state count；除非证据支持，不设跨 host 数值 budget。
5. Plan 复杂度目标与结构约束均被代码/oracle/benchmark/test evidence 直接验证，不以 parent+delta successor allocation 或 microprototype 成绩代表 full Scheduler path。

## Affected Owners

- `src/project-run/task-scheduler/admission-core.ts`: compiled static graph facts、immutable dynamic state、selection/transition reducer 与 forced-block canonical effects。
- `src/project-run/task-scheduler/scheduler.ts`: Scheduler-owned candidate policy handoff、hard guard 和 reducer-effect replay，不能成为第二 legality owner。
- `src/project-run/task-scheduler/admission-selection-policy.ts`、custom/learned policy adapters: 仅消费 Scheduler-projected candidates，不能取得 index mutation/control capability。
- `src/project-definition/scheduler-policy.ts`、`src/index.ts`: current public state contract is an invariant, not an expansion target.
- `src/project-run/task-scheduler/*.test.ts` 与 `docs/testing/cases/**`: equivalence evidence and Case closure when test entities/bodies change.
- `changes/optimize-admission-core-selection-index/readiness/**`: persisted semantic oracle plus current before/future A/B/C benchmark/profile/retention evidence.
- Active Decisions `provide-immutable-admission-graph-state.md`, `retain-private-invocation-admission-strategy-lifecycle.md`, `adopt-invocation-scoped-custom-admission-strategy-authoring.md`, and `learn-check-task-durations-for-critical-path-admission.md`: applicable stable constraints; this Change does not alter their lifecycle or alignment.
