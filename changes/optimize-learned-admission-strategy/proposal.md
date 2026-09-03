# Proposal

本 Change 的 Plan artifacts 已收敛为可执行承诺：只比较 private learned admission 的 strict baseline 与一个同层 admissible-first backfill 候选；未授权任何生产接线或 metadata 变更。

## Why

当前 learned critical-path policy 在每个 admission boundary 先取第一个非空 selection layer：`tightening → constrained continuation → ordinary`。constrained layer 的现实现 comparator 为 scope cap 升序 → critical-path score 降序 → effective `admissionPriority` 降序 → Task ID 升序 → scope ID 升序 → Task ID 升序（最后一项是现实现的 duplicate Task-ID fallback；Task ID 唯一时不可达）；ordinary 为 score 降序 → priority 降序 → Task ID 升序。它只查看该层第一名；该 Task 的 `canAdmit=false` 时提出 `wait`，由 Scheduler 的 hard guard 只在 running work 可 drain 时接受等待。

这条 strict 行为是可比较的基线，但没有回答「在同层首选暂不可 admission 时，选择同层后续可 admission Task 是否值得采用」。当前输入没有 running work 的 remaining time、硬 duration bound 或 reservation；因此任何非平凡 backfill 都不能保证不延迟受保护首选，不能宣称 safety guarantee。duration model 与算法若同时变化，也会失去收益归因。

## Outcome

在 frozen graph、prediction、settlement/timing script 与同一 installed exact candidate 上，完成 strict baseline 与唯一候选的可重放对照。比较期间 production learned binding 保持 strict；Gate variants 只能经 Change-local/evidence-only script adapter 临时将 central Gate Definition 设为 experimental custom callback 后运行。候选仅为 comparison-only 的 **same-layer admissible-first backfill**：保留 first nonempty layer 与既有 comparator；首选可 admission 时照旧 `select`；否则仅在同一层按既有顺序选择第一个 `canAdmit` Task；该层没有可 admission Task 则 `wait`。它不跨层，不增加 state、reservation、clock、public field 或 registry。

候选先隔离在 private comparison harness。若 deterministic corpus 的 scope unsafe-backfill witness 使 protected admission delay 退化，mandatory gate 立即关闭 adopt path，停止后续 Gate candidate sampling；候选不能保证 non-delay，Plan 也不预判它会 adopt。只有所有 preregistered correctness、hard guard、terminal、protected-delay 与性能证据都通过后，才可在 1A seam 上取得另行授权的 production wiring；否则 production 保持 strict baseline，并交付可复核的 not-adopt 结论。无论分支如何，`expectedDurationMs` 不新增，`admissionPriority` 仍仅为算法 score 相同后的 tie-break；模型细节可观察但不构成 admission order 或 performance 的兼容承诺。

## Scope

### Intended Change

- strict/candidate algorithm owner 仍只位于 `src/project-run/task-scheduler/**` private comparison harness/1A 后 private provider；比较期间 production learned binding 保持 strict。comparison-only adapter 与 frozen score fixture 位于 `scripts/project/gate/**` evidence owner，不成为 Product API 或另一 Product algorithm implementation；它以同一冻结 prediction-derived critical-path score table 构造并逐 trace 验证 custom callback projection。现有 public custom context 提供 graph、`candidates.canAdmit`、capacity、activeScope 和 running facts，足以重放两种选择而不重写 Scheduler legality。
- 建立 Change-local、evidence-only script variant runner（无 public config/env switch/registry）：它只临时切换 `scripts/project/gate/definition.ts` 及确有必要的一条 direct assertion 的 script bytes，不改 `src/**` 或 package inputs。两个 variant 都把 central Gate Definition 设为现有 `{ kind: "custom", proposeAdmission }`：strict callback 按 current first-layer/comparator/first-only wait，candidate callback 按 same-layer admissible-first；它们均承受同一 custom per-decision measurement overhead。runner 不是 production wiring，也不得留下 hidden env/runtime selector。
- 实施前先完成 deterministic corpus、exact traces/timing assertions、A/B data contract、排除规则与预注册阈值。corpus 覆盖 ordinary score/priority/ID、tightening、continuation、`dependsOn`/`observes`、mutex/root capacity、scope unsafe-backfill witness、benefit/risk pairs、failure/blocked/cancel/finite progress 与 frozen prediction；unsafe witness 的 protected-delay 退化立即产生 not-adopt，且不再采 Gate candidate。
- 生产策略切换的硬 Readiness 是 `separate-duration-learning-from-admission-strategy`（1A）已验收并进入实施基线的 private seam；证据与 Plan 准备可先行。`provide-admission-strategy-simulation` 的 public API 不是依赖，如有实现只能复用 private machine/harness。
- `add-invocation-fail-fast-policy` 和 `add-named-resource-capacity` 仍是 Draft 条件分支，不进入本 corpus。若任一项先落地或改变现有 candidate/capacity/terminal facts，冻结结果失效，必须以新事实重新采 baseline、prediction、trace 与 A/B。

### Resulting Impacts

- `task-scheduler` owner 必须保持 Scheduler 对 readiness、relation/mutex eligibility、capacity、cancellation、settlement 与 select/wait hard guards 的唯一责任；候选不得绕过 `canAdmit`。
- duration-model/provider owner 只交付 frozen prediction；不修改本地重复运行、history schema、sample window、statistics、recording 或 storage。frozen prediction 的 provenance、no-record 或 isolated-state method 必须随 corpus 保存。
- Gate/evidence owner 必须以正式 `bun run verify:vibe-check-workspace:required|full` 命令的 outer wall 为主指标。每个 sample 保存 script base/variant bytes/hash、base/variant tracked-diff fingerprint、完整 experimental custom Definition fingerprint、exact reused installed package candidate/receipt、raw log、ordered trace、membership、terminal outcome 与 summary；`elapsed-to-initial-result` 与 Scheduler metrics 只作归因证据，advisory threshold 不是 budget。两个 variant 都是 custom，callback identity 不进入 declarative fingerprint，故应有同一 experimental custom Definition fingerprint；它不同于 production learned fingerprint，不能作为最终 fingerprint。
- Gate 由 installed package 的 central Scheduler 调用 callback，A/B 主要测 central Gate 调度；reused package candidate 内的 nested consumer 在两 variant 完全相同。custom measurement overhead 与 production learned 不同，但在两 variant 相同，所以 outer-wall delta 可比较。仅 adopt 后才将已对同一 oracle 通过的 private candidate 固定为 production binding、重新 build candidate，并以 learned production 的 full installed-consumer 验收；若未支持采用，不改 production runtime、public API 或 Decision，移除无独立价值的 adapter/runner/candidate code/abstraction/wiring，并保存可复核的 harness/tests/evidence。只有仍有独立 strict-baseline 证据价值且不引入多余抽象的 neutral harness 才可保留。

## Success Criteria

1. comparison harness 对 strict baseline 与唯一候选执行同 input、同 comparator、同 first-layer rule；候选不跨层、不增加 persistent or invocation state、reservation、clock、public field 或 registry。
2. 每个 deterministic corpus item 都有指定 owner、frozen prediction、精确 decision/terminal trace assertion 与 timing assertion；所有 correctness、hard guard、terminal 和 finite-progress assertions 通过。
3. 只有 deterministic adopt path 仍开放时才运行 Gate A/B：production learned binding 仍 strict；Change-local evidence-only runner 只临时切换 `scripts/project/gate/definition.ts`（及必要的一条 direct assertion），以同一冻结 score table 将 Definition 设为 strict/candidate custom callbacks。使用同一 exact reused installed package candidate/receipt、frozen prediction 与 no-record 或 isolated state；每 variant/profile warm-up 一次后，严格执行五组序列：奇数组为 baseline-required→candidate-required→baseline-full→candidate-full，偶数组为 candidate-required→baseline-required→candidate-full→baseline-full。每个 sample 保存 script bytes/hash、base/variant tracked-diff fingerprint、完整 experimental custom Definition fingerprint 和 raw evidence；callback identity 不进 fingerprint，两个 custom variant fingerprint 相同但不同于 production learned。variant 只改变 algorithm，且无 public/env/runtime selector。
4. 仅当以下 pre-registered gates 同时满足才 adopt：所有 correctness/hard guard/terminal facts 通过；至少一个 designated benefit 改善；所有 protected cases 的 protected admission delay 不退化；以正式命令 outer wall 为主指标，两个 profile 的 paired median 不高于 baseline、至少一个 profile 改善至少 5%、至少 4/5 pairs 不变差、nearest-rank p95 不超过 baseline 的 105%；same-host pure decision/control cost 没有未解释的复杂度或明显回归。`elapsed-to-initial-result` 与 Scheduler metrics只作归因。
5. scope unsafe-backfill witness 的 protected-delay 退化、任一其余 mandatory gate 不满足、1A seam 未验收，或条件分支要求 rebaseline 时，结论为 not-adopt，停止尚未开始的 Gate candidate sampling，strict baseline 保持生产策略；清理无独立价值的 adapter/runner/candidate code/abstraction/wiring，仅按独立证据价值保留 neutral harness。

## Affected Owners

- `src/project-run/task-scheduler/**`：private selection/comparison harness、hard guards、deterministic traces 与 direct tests。
- `src/project-run/scheduler-history/**`（1A 后的 duration-model owner）：frozen prediction provenance 与 isolated/no-record comparison preparation；不改变 model。
- `scripts/project/gate/**` 与 Change-local evidence runner：experimental custom Definition adapter/frozen score fixture、exact reused installed candidate/receipt、required/full profile execution、script-byte capture/restoration、raw evidence preservation；不把 advisory Gate threshold 当 budget。
- [`docs/decisions/learn-check-task-durations-for-critical-path-admission.md`](../../docs/decisions/learn-check-task-durations-for-critical-path-admission.md) 与 [`docs/decisions/use-stateless-admission-policies-with-hard-scheduler-guards.md`](../../docs/decisions/use-stateless-admission-policies-with-hard-scheduler-guards.md)：现有长期边界；本 Change 不修改 Decision，若最终改变稳定策略语义才另行演进。
- [`docs/change-execution-order.md`](../../docs/change-execution-order.md)：1D 的 coordination 说明；不替代本 Change 的 1A hard Readiness。
