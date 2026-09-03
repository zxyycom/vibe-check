# Design

本 Draft 将“模拟器”收敛为 public immutable admission graph/state 协议。独立初始状态和真实 decision-boundary 状态共享同一 public handle；真实 shell 与非执行探索共享同一私有 compiled machine、pure transition 和 canonical effects。

## Context

### Current facts

- `AdmissionPolicyContext` 当前提供 frozen `SchedulerGraphSnapshot`、relation/mutex candidates、capacity、active scope IDs、running/settled IDs、measurement prefix 和 cancellation facts；它没有完整 pending catalog、single-task validator 或可分支 state。
- `SchedulerGraphSnapshot` 包含 Task topology、mutex、priority 和 scope capacity，但不包含 root `maxParallel`。独立初始入口若只接收该 graph，无法重现 capacity legality，因此 root `maxParallel` 必须是另一个静态输入。
- private `decideScheduler` 从 immutable `SchedulerSnapshot` 判断 terminal、blocked、relation、mutex、capacity 与 scope；imperative execution state 另行维护 pending、running、mutex、scope 和 settlement。cancellation 仍有独立 mutation path。实施时必须把这些相邻规则收敛到一个 transition owner，而不是在 public API 复制它们。
- `dependsOn` 只在 upstream scheduler settlement 为 satisfied 时满足；`observes` 在 upstream 有任意 settlement 时满足。pending Task 只有在全部 direct `dependsOn` 已 terminal 且至少一个 unsatisfied 时才 forced-block。
- current candidates 不是全部 pending：relation/mutex 不满足的 Task 不出现，relation/mutex 已满足但 capacity 不足的 Task 以 `canAdmit: false` 出现。现有 blocker summary 不能解释单个 pending Task。
- custom policy 是 trusted synchronous callback；真实 Scheduler 在 callback 返回后继续验证 lifecycle、candidate、capacity 和 cancellation。任何 public state 都不是 reservation。
- 当前实现会在 decision boundary 复制多个数组、重建 ID `Map`，并以 `find`/`includes` 查询 settlement、mutex、scope 和 relation。这是待测结构事实，不是性能结论。

### Related changes and decisions

- [已归档的 custom lifecycle Change](../archive/support-invocation-scoped-custom-admission-strategies/proposal.md) 已交付 simple/prepared authoring 与 Invocation lifecycle。当前 runtime、Architecture、API mechanics 及 aligned Decisions 是现行 owner；本 Change 只扩展 decision-time state contract。
- private provider lifecycle/model-algorithm seam 不交付 public state 或 shared transition core；与本 Change 共享 task-scheduler/invocation owner 时串行实施。
- `optimize-learned-admission-strategy` 可以复用 future private core 和 deterministic harness，但其算法比较不替代本 Change 的 public compatibility、correctness 或 performance evidence。
- `add-invocation-fail-fast-policy`、`add-named-resource-capacity` 若先实施，会改变 lifecycle、capacity 和 reason facts；本 Change 在进入 Plan 或实现前必须按当时 current runtime 重新基线。
- 现有 aligned Scheduler/custom authoring Decisions 不包含 public branchable state。进入 Plan 前需要建立独立的长期 Decision，明确 state 是 immutable、non-authoritative、non-control capability，并保留 Scheduler hard guards。

### Contract overview

```text
SchedulerGraphSnapshot + maxParallel
              │
              ▼
       createAdmissionGraph ──────► AdmissionGraph.initialState()
              │                               │
              │                               ▼
              │                         AdmissionState
              │                               │
real Scheduler boundary                       │ queries / hypothetical transitions
              │                               │
              └────► AdmissionPolicyContext.admissionState
                                              │
                                              ▼
                                  accepted successor | rejection
```

两个 seed 来源返回同一种 `AdmissionState`。public handle 只读取事实或产生 hypothetical successor；private machine/reducer 同时服务 real shell，但只有 real shell 执行 canonical effects。

## Goals / Non-Goals

### Goals

- 从静态 graph 与 root capacity 创建可独立使用的 `AdmissionGraph` 和初始 `AdmissionState`。
- 在每个真实 custom decision boundary 提供同一种 `AdmissionState`，使 offline exploration 与 live lookahead 不需要两套 API。
- 让 caller 直接读取完整 admission inspection，验证单个 Task，并通过 immutable `select`/`settle` transition 建立分支。
- 用唯一 private compiled machine/reducer/effect order 驱动 real execution shell 与 public state handle，消除 legality 和 transition 漂移。
- 使保留 predecessor 的分支成本不依赖 graph 大小，并以 baseline 决定 successor state 的内部结构。
- 保持 real shell 对 Task execution、signal、diagnostics、measurement、policy fault、settlement payload 和 `RunResult` 的唯一责任。

### Non-Goals

- `AdmissionGraph` 不决定哪个 Task 更优；static、learned 和 custom strategy 仍在 core 外选择合法 action。
- public state 不执行 Check/preflight/callback、Task/Promise、clock、signal、measurement/history、diagnostics、output 或真实 effects。
- public state 不是 mutable Scheduler、reservation、Run controller 或完整 execution snapshot；不公开 setter、cancel/start、arbitrary state seed/import、settlement value/error 或 state writeback。
- v1 不提供 `copy()`、batch/replay、public ordered effects、state serialization/hash、global cache/interning、mutable undo HOF 或固定 branch limit。
- 本 Draft 不新增 graph format、通用 graph executor、策略 registry、默认算法替换、`expectedDurationMs` 或 machine/schema revision。

## Decisions

### Intended Change

#### 1. 一个 public graph contract，一种 immutable state，两个 seed 来源

public surface 使用以下目标形态；精确 TypeScript exactness 和文档在 Plan 中按同一语义落地：

```ts
interface AdmissionGraphInput {
  readonly graph: SchedulerGraphSnapshot;
  readonly maxParallel: number;
}

interface AdmissionGraph {
  initialState(): AdmissionState;
}

interface AdmissionState {
  readonly inspection: AdmissionInspection;
  readonly catalog: AdmissionCatalog;

  validateSelection(taskId: string): AdmissionSelectionValidation;
  select(taskId: string): AdmissionTransitionResult;
  settle(taskId: string, outcome: "satisfied" | "unsatisfied"): AdmissionTransitionResult;
}

declare function createAdmissionGraph(input: AdmissionGraphInput): AdmissionGraph;
```

`createAdmissionGraph({ graph, maxParallel })` 完成 exact input validation 和一次 compile。`initialState()` 表示全部 graph Task 尚未运行、没有 active scope、没有 cancellation 的初始分支。它不接受 caller 构造的 pending/running/settled seed。

`AdmissionPolicyContext.admissionState` 表示真实 Run 当前 decision boundary。它可能已经有 running、settled、active/closed scope 或 cancellation facts，但使用与初始状态完全相同的 queries 和 transitions。context state 只允许 hypothetical successor，不能提交或写回真实 Scheduler。

`AdmissionState` 是 frozen opaque handle，不是可枚举内部 collection。它在内部持有同一 compiled graph 和 immutable state node 的身份；public getter 只返回 frozen DTO。独立入口和 context 入口的 public state 不因 seed 来源形成不同类型或不同 legality。

#### 2. 保留 predecessor 就是 fork；transition 返回 successor

state 没有 setter 或 `copy()`。accepted transition 返回新的 state；rejected transition 返回稳定 reason 且不携带变化后的 state。调用方从同一 predecessor 调用多次即可得到 divergent branches：

```ts
const root = graph.initialState();
const chooseA = root.select("A");
const chooseB = root.select("B");

// root 仍表示原状态；accepted result 各自携带 successor。
```

public result 是 closed union：

```ts
type AdmissionTransitionResult =
  | Readonly<{ readonly accepted: true; readonly state: AdmissionState }>
  | Readonly<{ readonly accepted: false; readonly reason: AdmissionRejectionReason }>;
```

普通 unknown Task、wrong lifecycle、not-pending、not-running、already-settled、relation/mutex/capacity blocker 和 closed state 都通过 typed rejection 表达。内部 invariant failure 才能 throw。真实 custom callback 使用 state 进行 lookahead 后仍只返回现有 `AdmissionProposal`，Scheduler 继续 hard revalidate。

#### 3. Inspection、catalog 和 primary reason

`inspection` 提供 state 级事实：

- `nextBoundary: "select" | "wait" | "complete"`；
- root/effective capacity；
- running 与 scheduler-relevant settled Task；
- derived scope lifecycle `inactive | active | closed`。

`catalog` 完整划分 pending Task：selectable 与 non-selectable。每个 non-selectable Task 只公开一个 deterministic primary reason，避免把全部内部 blocker 组合固化为 public contract。canonical precedence 是：state lifecycle → Task identity/current status → `dependsOn` → `observes` → mutex → scope capacity → root capacity。调用方在 successor 上重新读取 catalog/validator，即可看到前一 blocker 消失后的下一个原因。

`validateSelection(taskId)` 与 catalog 的 selectable 分区及 primary reason 同义，但不得为了单项验证创建 full catalog。`wait` 与 `complete` 不作为 caller transition：当没有合法 select 且有 running Task 时 next boundary 是 `wait`；没有 pending/running 时是 `complete`。forced-block microsteps 在返回 public boundary 前由 core 推进。

#### 4. `select`、`settle` 和 scheduler-relevant outcome

`select(taskId)` 只接受当前 selectable Task，并在 successor 中占用 root/scope capacity、mutex，按规则激活 scope。它不执行 Task。

`settle(taskId, outcome)` 只接受当前 branch 的 running Task。v1 outcome 固定为：

- `satisfied`：满足 downstream `dependsOn`，同时满足 `observes` 的 terminal wait；
- `unsatisfied`：不满足 downstream `dependsOn`，但满足 `observes` 的 terminal wait。

settle 释放 capacity/mutex，按 terminal Task 关闭 scope，并执行 canonical forced-block microsteps，直到下一个 public boundary。它不携带真实 Check result、failure、cancellation、value、error 或 message。public v1 不提供 cancel；real shell 的 signal/policy-fault pending cancellation 必须作为 private core action，复用同一 state transition 和 canonical effect order。

#### 5. Public state protocol 与 private core representation 分离

public `AdmissionGraph`/`AdmissionState` 承诺 graph validation、queries、actions、result union、outcome 和 reason 语义。以下内容保持 private 并可由性能证据替换：

- dense numeric IDs、adjacency/index layout；
- pending/running/settled/mutex/scope 的 storage；
- structural-sharing node、delta chain、chunked bitset 或 copy-on-write representation；
- canonical microstep reducer 和 effect DTO；
- real execution ledger、Promise、Task payload、diagnostics 和 measurement；
- branch memo、eviction、compaction 和 profiling instrumentation。

getter-only 不能单独建立边界：opaque handle、无 public constructor、frozen DTO 和 successor-only transition 共同防止 caller 依赖或修改内部 core。v1 不支持 state serialization、hydration 或 arbitrary import，因为它们会把 private representation/versioning 变成 public storage contract。

#### 6. 性能 contract 与进入 Plan 前的 baseline

先冻结结构义务，再用 baseline 选择最简单的内部实现：

- graph validation/compile 只执行一次，并建立 ID、正反邻接、mutex、scope 和 canonical-order indexes；
- 保留 predecessor 作为 fork 是 `O(1)`，不复制 graph 或 state；
- select 只接触目标 Task 及其 mutex/scope/capacity facts，不扫描或 clone 全图；
- settle 只接触目标 Task、reverse-reachable affected set 与实际 forced effects；高 fanout 是显式成本；
- `validateSelection` 不构建 full catalog；
- catalog 是显式 `O(P)` 输出，只在读取时生成；同一 state 的重复读取是否 memoize 由 allocation/heap baseline 决定；
- 未创建 standalone graph、且 custom policy 不读取 `admissionState` getter 时，不构造 public catalog 或搜索专用结构。

正式 benchmark 在 Plan 前比较至少三种候选：current full-clone `Map`/`Set` baseline、parent+delta state、dense ID + chunked copy-on-write storage。使用同一 graph/workload 测量 compile、single path、同一 predecessor 大量 fork、DFS/BFS retained branches、catalog cold/warm、repeated validation、high-fanout settle，以及 static/custom/learned real hot path。

每次结果记录 Bun version、host/CPU/OS、seed、warmup、iterations、p50/p95、allocation 和 retained-heap 方法。没有 baseline 时不声明 bottleneck、不选择复杂 persistent collection、不冻结 numeric threshold。跨普通 host 的 timing 默认 advisory；结构复杂度和同 workload regression 可以成为 required acceptance。

#### 7. Compatibility、evidence 和长期边界

standalone factory 是新的 public export，不进入 Project Definition，也不改变 declarative fingerprint。`AdmissionPolicyContext.admissionState` 是 callback context 的新增 public capability；Definition authoring grammar、simple/prepared lifecycle、`prepare`/`complete` 和 output contract 保持不变。

Plan 必须同步 public types、exact validation、frozen/identity behavior、JSDoc、Architecture/API mechanics/Configuration、examples、installed-consumer acceptance 和 Test Evidence。shared-core trace oracle 要以同一初始 state/action sequence 对照 public successor 与 real shell effects，覆盖 relations、mutex、root/scope capacity、scope lifecycle、forced block、wait/complete 和 cancellation 的 private path。

进入 Plan 前建立新的 active + unaligned Decision，承接 public immutable graph/state、standalone + context-bound 双入口、non-control boundary 和 shared-core owner。只有 runtime、public declarations、docs、tests、consumer evidence 和性能验收全部成为 current fact 后才标记 aligned。

### Resulting Impacts

- `src/project-run/task-scheduler/**` 需要从现有 inspection 与 imperative mutation 中抽取一次 compile、pure core state/reducer、canonical effects 和 real execution ledger shell；real 与 public 两条路径不得复制 legality/transition。
- `src/project-definition/scheduler-policy.ts` 与 `src/index.ts` 需要新增 graph/state/query/action/result exports，并在 `AdmissionPolicyContext` 交付 current-boundary state；不新增 Definition 配置或 fingerprint 字段。
- Scheduler tests 需要用同一 trace oracle证明 initial/live seed、catalog/validator、divergent branches、select/settle、dependsOn/observes、mutex/capacity、scope、forced block、wait/complete、invalid action、private cancellation 和 callback-return hard guard。
- performance evidence 需要单独记录 graph fixtures、branch workloads、CPU/allocation/retained heap 和 real-path baseline；搜索树指数增长仍由 caller workload 决定，API 只约束单步和分支表示成本。
- stable docs、examples、package declaration tooling 与 Test Evidence 需要区分 public semantic state、private core、real execution 和 non-authoritative hypothetical successor。
- 本 Change 与 algorithm、fail-fast、named capacity 共享 Scheduler owner，默认串行实施；只有不写相同 runtime/public owner 的调查和 benchmark 工作可以并行。

## Risks / Trade-offs

- 新 public state protocol 比仅在 callback 中增加 helper 承诺更大，但 standalone deterministic tests、offline search 与 live lookahead 共享真实语义，能够证明这项公共成本。
- opaque handle 不是可序列化 DTO；这是保留 representation 和 performance 演进空间的主动取舍。需要跨进程/持久化 state 时应另建 storage/versioning Change。
- deterministic primary reason 简化兼容面，却不会一次展示所有 blocker；caller 必须在 successor 上重新验证。若真实 consumer 必须一次获得完整 blocker set，应在 Plan 前以用例修订，而不是增加可选内部细节。
- structural sharing 可以避免 branch 深拷贝，但不能消除搜索树指数增长。global cache 可能以无界内存换取 CPU，v1 不默认采用。
- 统一 core 会触及真实 Scheduler hot path；lazy public projections、trace equivalence 与 real-path benchmark 必须共同证明没有把模拟成本转嫁给不使用该能力的 Run。
- future fail-fast/named capacity 若改变 Scheduler rule，必须同步修改 core、public reason/state 和 tests，不能只修 real shell。

## Open Questions

1. 真实 lookahead 与 deterministic-test fixtures 是否证明 deterministic primary reason、`inactive | active | closed` scope lifecycle 和 binary settlement outcome 足以完成消费任务；不足时只在进入 Plan 前修订这些 public semantic fields。
2. baseline 中哪种内部 state representation 在 small single-path、high-branch DFS/BFS 和 high-fanout workload 间提供最小总成本；是否需要 branch-local catalog memo、compaction 或有界 diagnostics。
3. controlled-host baseline 能否形成稳定 numeric budget；不能时保留结构复杂度为 required、wall-clock/heap 数值为 advisory，并保存原始结果。
4. 新 public-state Decision 应作为独立新增判断，还是经 relation trace 证明需要修订某一现有 Scheduler Decision；该治理关系必须在建立记录前核对。
5. 在进入 Plan 或 implementation 前，fail-fast/named capacity 是否已经成为 current fact；若是，必须先更新 state/reason/action 与 benchmark matrix。
