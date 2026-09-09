# Design

本设计依次回答三个问题：effective workload 是否有可调度空间、prediction 是否可信、预期收益是否覆盖策略成本；再据此比较 deterministic、exact-search 与 learned/heuristic 路径。

## Context

- **Effective selection:** [`add-project-change-flags`](../add-project-change-flags/design.md) 计划在 Scheduler admission 前用 change-derived flags 缩小 effective Check 集；当前普通 flags 已通过 [`project-definition.md`](../../docs/development/project-definition.md#flag-enabled-checks) 形成一次 selection。
- **Current preparation order:** public prepared strategy 当前在完整静态 graph 上准备，effective flag selection 随后在 Check execution owner 内形成。[`provide-learned-admission-through-public-strategy.md`](../../docs/decisions/provide-learned-admission-through-public-strategy.md) 将 learned helper 的输入限定为普通 public graph/context。
- **Scheduler responsibility:** [`scheduler.md`](../../docs/development/scheduler.md) 继续拥有 relation readiness、mutex/resource/root capacity、cancellation、settlement 和 proposal hard guards；算法只选择下一合法 admission。
- **Existing evidence tools:** [`evaluate-admission-heuristics-with-seeded-virtual-workloads.md`](../../docs/decisions/evaluate-admission-heuristics-with-seeded-virtual-workloads.md) 与 `scripts/project/admission-workbench/**` 已用 public `AdmissionState`、虚拟时间和 seeded workload 比较策略，可以承接穷举与混合路由的前置证据。
- **Evidence status:** 当前没有 change-aware effective graph 的分层 baseline；策略开销、cache 命中与算法收益仍是待测假设。

## Goals / Non-Goals

### Goals

1. 建立覆盖低数据、低选择空间和被缓存掩盖路径的可复现 baseline。
2. 用 effective graph 而不是完整 authored graph 判断策略的可调空间。
3. 比较最小确定性路径、有界穷举剪枝与 learned/heuristic，并限制路由和规划自身成本。
4. 让不确定、超预算或无收益场景确定性退回安全策略。

### Responsibility Boundaries

| Owner | Responsibility |
| --- | --- |
| Effective selection | 形成 algorithm-neutral 的有效 Task membership。 |
| Strategy router | 根据有界的 opportunity 与 prediction-confidence facts 选择算法。 |
| Exact-search candidate | 在明确模型和预算内搜索合法 admission 计划，只承诺 model-relative 结果。 |
| Learned/heuristic candidate | 在历史覆盖和 prediction 可信时提供 admission 排序。 |
| Scheduler | 验证 proposal，并继续拥有全部 admission hard guards 与真实 lifecycle。 |
| Evidence owner | 分层保存 workload、cache/profile、图、预测、策略成本、结果和排除理由。 |

Change acquisition 和 Scheduler lifecycle 保持由现有 owner 承担；策略输入限于 source-neutral facts。Exact search 只表达模型内结果，具体算法、阈值和公共 API 留到 baseline 后决定。

## Decisions

### Intended Change

1. **Selection-aware readiness.** 先冻结当前及 change-derived flags 下的 invocation 顺序，再判断 strategy preparation 应后移，还是由通用 context 提供等价 effective membership。策略输入保持 source-neutral，只包含算法所需的 Task IDs、graph 和置信事实。
2. **Stratified workload baseline.** 固定 `zero / narrow / wide / full / source-unavailable / manual-force` selection strata，并分别覆盖 warm/cold cache、简单链、少数独立链、强约束小图和宽图。记录 effective Task 数、graph fingerprint、命中来源、环境、runtime/profile、重复样本和 outer wall；不同 strata 不用一个平均值互相抵消。
3. **Opportunity and data facts.** 候选事实包括 effective graph 规模、合法分支宽度、约束后的状态数、可重排 boundary、history coverage/freshness、prediction uncertainty，以及 strategy preparation/decision/history I/O 成本。进入 Plan 前用 workload 证明它们能区分无机会、有界搜索和启发式场景。
4. **Bounded hybrid candidates.** 无有效分支时走最小 deterministic path；状态空间有界时比较 branch-and-bound；较大且预测可信时比较 learned/critical-path heuristic。Router 成本纳入测量，数据不可信、搜索超限或 candidate failure 时确定性 fallback。
5. **Model-relative exact search.** 穷举复用 public `AdmissionState` legality，并由 evidence-owned virtual clock/prediction 计算目标；在真实 admission/settlement boundary 以 rolling horizon 重规划。它只承诺模型内结果，并受 deterministic tie-break、state-expansion、time、memory guard 和可复跑 fallback 约束。
6. **Rare-path protection.** Narrow/warm 证明日常 fixed cost 被节省覆盖；wide/full/cold、history-missing/stale、source-unavailable 和 manual-force 分别证明图规模、模型缺失及恢复路径没有被常见缓存样本掩盖。Timing 在 baseline 建立前只作 observation；进入 Plan 时再预注册 comparison、噪声处理与 adoption/non-regression 门槛。
7. **Downstream reconciliation.** Workload、facts 和 candidate family 收敛后，再以证据重写、拆分或 not-adopt [`optimize-learned-admission-strategy`](../optimize-learned-admission-strategy/proposal.md)；[`add-scheduler-performance-reference`](../add-scheduler-performance-reference/design.md) 仅承接有独立判断价值的指标。

### Resulting Impacts

- **Invocation and strategy contract:** effective selection 与 strategy preparation 的顺序可能调整；公共输入保持 closed、frozen、source-neutral，lifecycle 仍有单一 owner。
- **Duration model:** 高频 narrow samples、低频 wide/full samples 和 workload-dependent duration 可能要求 freshness/confidence 或粗粒度 workload class；不能按 exact change set 制造无界 history series。
- **Scheduler workbench:** 虚拟模型需要增加 bounded-search driver、state deduplication、branch bounds、router cost 和 fallback trace，同时继续复用 public AdmissionState legality。
- **Performance evidence:** 每个 stratum 保存同一 build/profile、fixture、cache state、prediction provenance、strategy setup/decision cost、outer wall 和 Scheduler attribution；真实运行只校准模型，不由模拟替代。
- **Delivery and downstream:** 同步受影响的 Decision、public API/JSDoc、owner docs、指南、installed-consumer evidence、Semantic Cases 与 observations；相关 Changes 保持各自 Outcome 和采用门槛。

## Risks / Trade-offs

- 约束剪枝效果随图结构变化；router 必须使用实测状态空间，而非只看 Task 数。
- Exact search 对错误 duration prediction 只能得到模型内最优，并可能比简单 heuristic 更稳定地作出错误选择。
- 过细 workload class 会稀释 history，过粗 class 会混合 full 与 incremental duration；需要用预测误差和样本覆盖收敛粒度。
- Router、confidence 计算和多策略维护会增加 fixed cost 与认知负担；若 baseline 不能证明独立收益，本 Change 应选择更简单路径。
- Rare-path workload 成本较高，仍需独立覆盖发布、恢复及首次运行路径。

## Open Questions

| Topic | 进入 Plan 前必须确定 |
| --- | --- |
| Effective input | Strategy preparation 接收 effective graph、effective Task IDs，还是在首个 boundary 从通用 state 恢复等价 membership。 |
| Opportunity model | 哪些 branching、capacity pressure 和 reorderable-boundary facts 足以区分无机会、有界搜索和启发式场景。 |
| Data confidence | History coverage、freshness、prediction error 和 workload class 如何形成有界且不泄露 change details 的判断。 |
| Search objective | Makespan、资源占用与 planning cost 的优先级，以及 unknown outcome 下 rolling-horizon 的模型假设。 |
| Search budget | State expansion、wall time、memory、deduplication key 和 deterministic fallback 的门槛如何从 baseline 推导。 |
| Workload matrix | 哪些真实项目规模、cache 状态和 selection strata 足以代表常见与被掩盖路径。 |
