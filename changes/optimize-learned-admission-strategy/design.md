# Design

本设计定义一个可证伪的 private algorithm comparison：先固定 strict baseline、唯一候选、corpus 与接受门槛，再决定 adopt 或 not-adopt；当前仍不授权 production wiring。

## Context

- 现行 `learned-critical-path` 实现位于 `src/project-run/task-scheduler/learned-critical-path-admission-policy.ts`。strict baseline 的 first nonempty layer 固定为 tightening、constrained continuation、ordinary；constrained comparator 为 scope cap 升序 → score 降序 → priority 降序 → Task ID 升序 → scope ID 升序 → Task ID 升序（最后一项是现实现 duplicate Task-ID fallback；unique Task ID 时不可达），ordinary 为 score 降序 → priority 降序 → Task ID 升序。每层只检查第一名；其 `canAdmit=false` 即提出 `wait`。
- Scheduler 先按 relation/mutex 建立 candidates，后以 `canAdmit`、lifecycle 和 running-drain 验证 select/wait。policy input 没有 running remaining duration、硬 duration bound 或 reservation；prediction 是 point estimate，不是执行时长承诺。因此 nontrivial backfill 不能保证不延迟 protected preferred Task。
- [`learn-check-task-durations-for-critical-path-admission`](../../docs/decisions/learn-check-task-durations-for-critical-path-admission.md) 已确认：static 默认、learned 为显式 local repeat-run capability、没有 `expectedDurationMs`，priority 仅为 score 同分 tie-break；模型细节可观察但不承诺固定兼容 order/performance。
- [`use-stateless-admission-policies-with-hard-scheduler-guards`](../../docs/decisions/use-stateless-admission-policies-with-hard-scheduler-guards.md) 已确认 policy 无状态且 Scheduler 独占 hard guards。不得为本实验引入 reservation 或另一个状态机。
- [`docs/change-execution-order.md`](../../docs/change-execution-order.md) 将本 Change 列为 1D：可先冻结证据；production strategy implementation 硬依赖 1A `separate-duration-learning-from-admission-strategy` 的 stable seam。simulation public API 非依赖。fail-fast 与 named capacity 仍是 Draft 条件分支，若先落地则 rebaseline。

## Goals / Non-Goals

**Goals**

- 将 strict baseline 和唯一候选隔离在同一 private comparison harness，并由可回滚的 Change-local script/evidence custom adapter 捕获 Gate variant，使 algorithm 是唯一 variant。
- 在不声称 safety guarantee 的前提下，定量暴露 same-layer backfill 的 benefit 与 protected-delay risk，并只按预注册门槛采用。
- 用 deterministic trace facts 证明 layer/comparator、hard guard、terminal outcome、failure/blocked/cancel 与有限进展；用同 host 交错 Gate 对比检验真实 profile。

**Non-Goals**

- 不改 production runtime、production policy、public API、registry、state/history/model/statistics、clock 或 reservation，直到 adopt 后另获授权；private comparison harness、其 direct tests、script/evidence custom adapter、temporary runner 和 evidence 可在本 Plan 产生，但不得成为无独立价值的候选专用抽象。没有 public config/env switch、hidden env/runtime selector 或 registry；runner 不临时改 `src/**` 或 package inputs。
- 不新增 `expectedDurationMs`；不把 priority 升为 override；不把模型或 order 细节升为兼容承诺。
- 不把 Gate advisory threshold、跨机器 wall milliseconds、单次运行或 simulation public API 当作 acceptance 证据或预算。
- 不把 fail-fast/named-capacity Draft 设为本实验 feature；它们若改变环境，只触发 rebaseline。

## Decisions

### Intended Change

1. **Strict baseline is executable, not descriptive.** Harness 原样实现 current first-nonempty layer/comparator；baseline 在所选 layer 的 comparator 第一名 `canAdmit=false` 时立即返回 `wait`。
2. **Exactly one candidate.** `same-layer admissible-first backfill` 先找到 strict baseline 会选的 first nonempty layer并按同一 comparator 排序。首选可 admission 时选择首选；否则在该同层 ordered list 中取第一个 `canAdmit`；没有则 `wait`。不得检查较低 layer、改变 comparator、利用外部状态，或改变 Scheduler validation。
3. **Private before production.** Candidate 先只存在于 private comparison harness。scope unsafe-backfill witness 一旦显示 protected admission delay 退化，即 mandatory not-adopt 并停止后续 Gate candidate sampling；此候选不能保证 non-delay，Plan 不预判它会 adopt。只有 deterministic adopt path 仍开放、1A seam 已验收、corpus/A-B gates 全通过且获得 production-wiring authorization，才可将其接入 production。失败、缺证据或无授权都保持 strict baseline，交付 not-adopt。
4. **Frozen comparison inputs.** 每一 corpus/Gate pair 固定 graph identity、prediction snapshot digest、prediction-derived critical-path score table及其来源/provenance、initial state、settlement/timing script、candidate receipt/version/input fingerprint、profile membership 与 expected terminal facts。两个 custom callback 只读同一 frozen score table，不使用或更新 live history。comparison 使用 no-record mode；若不可用，使用 each-variant isolated state with identical frozen prediction，不允许记录污染后续 variant。
5. **Script custom adapter and safe capture, not production wiring.** production learned binding 保持 strict。comparison-only adapter/score fixture 位于 script/evidence owner，且用 deterministic corpus 逐 trace 对照 private strict/candidate harness，证明没有重写 Scheduler legality；未来 private production candidate 也必须对同一 oracle。runner 只能在目标 Change 独占 worktree 运行：启动时记录 `scripts/project/gate/definition.ts`（及必要的一条 direct assertion）的 base bytes/hash 和预期 variant bytes/hash；两个 variant 都临时将 central Gate Definition 设为现有 `{ kind: "custom", proposeAdmission }`，strict callback 按 current first-layer/comparator/first-only wait，candidate callback 按 same-layer admissible-first。现有 public custom context 提供 graph、`candidates.canAdmit`、capacity、activeScope 和 running facts，足以作这两个 callback projection；adapter 仍只是逐 trace 对照 private harness 的 evidence projection，不成为 Product algorithm owner。restore 前当前 bytes 非预期 variant bytes/hash 时 fail 并保留现场；只有匹配才在 `finally` 原子恢复 base bytes 并验证 hash。绝不以 `git reset`/`git restore` 覆盖共享工作，不改 `src/**` 或 package inputs。每个 sample 记录 script base/variant bytes/hash、base/variant tracked-diff fingerprint、完整 experimental custom Definition fingerprint、exact reused installed package candidate/receipt 和 raw log。callback identity 不进 fingerprint，所以两 custom variants 应有相同 experimental custom fingerprint；它不同于 production learned fingerprint，不能作最终 fingerprint。
6. **Corpus and assertions.** 每项 corpus 由 task-scheduler harness owner 保存 serialized input、prediction digest、variant decision trace、admission/settlement timing trace 和 terminal summary。详细清单在 `tasks.md`；任何 trace/membership/outcome/fingerprint mismatch 均使该 sample 无效而非静默丢弃。
7. **A/B protocol.** 只有 deterministic adopt path 仍开放才执行 runner。required/full 的每个 variant 各 warm-up 一次并排除。严格采五组：奇数组（1、3、5）为 baseline-required→candidate-required→baseline-full→candidate-full；偶数组（2、4）为 candidate-required→baseline-required→candidate-full→baseline-full。每组内的唯一顺序固定，避免 profile 漂移全归因一个 variant。正式 `bun run verify:vibe-check-workspace:required|full` 的 outer wall 是 primary；`elapsed-to-initial-result` 与 Scheduler metrics 仅作 attribution。两个 variants 都是 custom，承受同一 per-decision measurement overhead；因此 custom 与 production learned 的绝对成本不可混同，而两 variant 的 outer-wall delta 可比较。Gate 由 installed package central Scheduler 调 callback；reused package candidate 内的 nested consumer 在两 variant 相同，A/B 主要测 central Gate Scheduler。保存 raw logs/trace/membership/outcome/fingerprint/summary；variant only changes algorithm。adopt 后另 build candidate 并做 learned production full installed-consumer 验收。
8. **Pre-registration.** 在任何 candidate result 前冻结 designated benefit、protected cases、measurement extraction、outlier/exclusion rule 与 timing threshold。所有 correctness/hard guard/terminal facts 必须 pass；designated benefit 至少一项改善；每个预注册 protected case 的 protected admission delay 不得高于 strict baseline。Gate primary endpoint 是 matching formal-command outer wall：each profile candidate paired median ≤ baseline，至少一个 profile ≥5% improvement，至少 4/5 pairs candidate 不差，candidate nearest-rank p95 ≤ 105% of baseline。`elapsed-to-initial-result` 与 Scheduler metrics只解释 observed deltas，不替代主指标；advisory threshold不是 budget。same-host pure decision/control cost 不得出现未解释的复杂度或明显回归；如需要数值界，Readiness 以 strict per-decision/control baseline、candidate-count/input-size 与 repeat method 为依据，在收集 candidate result 前冻结推导和阈值。
9. **Conditional rebaseline.** `add-invocation-fail-fast-policy` 或 `add-named-resource-capacity` 先落地、1A seam 与 frozen input 不等价、candidate preparation changes，都会废弃当前 corpus timing comparison并要求重新采集；simulation public API 不构成依赖。

### Resulting Impacts

- **Task-scheduler owner:** 提供 private harness，保留 strict behavior，新增候选只在 comparison boundary。direct test traces必须证明提名、hard-guard accepted/rejected behavior、terminal status和有限进展，不能让 harness 绕过 Scheduler。
- **Duration-model/provider owner:** 形成 provenance-addressable frozen prediction，并为 comparison 提供 no-record 或 isolated state；该 owner 不调整 predicted values以帮助候选。
- **Gate/evidence owner:** 仅在 deterministic adopt path 仍开放时，用 Change-local script runner 对同一个 exact reused installed candidate/receipt 按唯一五组顺序执行 two-profile AB/BA；runner只切换 experimental custom Definition script bytes，且仅在 current bytes 匹配预期 variant 时原子恢复 base/hash，否则 fail 并保留现场。以 formal outer wall 判断、以 initial/Scheduler metrics 归因，并保存每次原始目录、script bytes/hash、base/variant diff fingerprint、完整 experimental custom Definition fingerprint而非只保存 aggregate；membership/outcomes/fingerprints 不匹配时报告不可比较。
- **No-adopt impact:** harness、direct tests、adapter、runner 和 evidence 可能已经产生；not-adopt 不改 production runtime、public API 或 Decision，移除没有独立价值的 adapter/runner/candidate code/abstraction/wiring，并保存可复核 evidence。仅当 neutral harness 能独立证明 strict baseline/hard guard 且无多余抽象时保留。
- **Decision owner:** 当前 Decision 继续拥有 long-lived public/compatibility rules；adopt 不自动修改 Decision。只有 proposed production semantics越过既有边界时再创建/演进 Decision。
- **Conditional owners:** fail-fast/named-capacity 仍不在 corpus；若它们成为当前事实，算法证据 owner 必须先 rebaseline capacity/contention/protected-delay evidence。

## Risks / Trade-offs

- same-layer admissible-first 可能填补当前空闲，却也可能占用随后需要的 capacity；没有 remaining-time bound/reservation 就不能把某个 trace 的未退化推广为 safety guarantee。
- strict baseline 的 `wait` 是现有 policy preference 而不是 Scheduler fault；候选的 `select` 仍会被 existing hard guard 复核。吞吐改善不能抵消 hard-guard、terminal或 protected-delay退化。
- rolling local history会污染比较；因此 no-record 或 isolated-state 和 frozen prediction digest 是 validity 条件，不是可选诊断。
- Gate timing受 host/tool/cache 影响。same-host paired distributions支持当前接受判断，但不是跨机预算，checked-in advisory threshold也不是此 Change 的 budget。
- 1A 未验收时，任何直接 production wiring 都会把 lifecycle refactor 与 algorithm effect 混淆；此阶段只允许 evidence preparation。

## Open Questions

无阻塞范围或方案的开放问题。Readiness 中尚未完成的工作是冻结 corpus fixtures、prediction provenance、same-host control-cost measurement definition以及确认 1A stable seam 是否已进入实施基线；在这些任务未完成前，不进入 Implementation 或 production wiring。
