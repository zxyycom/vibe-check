# Design

以 evidence-gated immutable semantic selection index 消除 current admission core 的 repeated parent-chain/full-graph legality work，同时只让 public consumers 看见既有 lazy projections。

## Context

- Current implementation is `src/project-run/task-scheduler/admission-core.ts`; `taskStatusFor` walks an unbounded parent+delta chain, while `isMutexHeld`, `runningCount`, `isCoreComplete`, scope lifecycle and `forcedBlockedTaskFor` scan tasks or scopes. `catalogForCore` and `admissionCandidatesForCore` repeat the same selection work independently.
- `docs/investigations/assess-admission-state-performance-and-selection-index.md` is AI-ready formation evidence, not current behavior owner. It establishes a same-host real Scheduler regression signal and the static `O(D)`/repeated-scan risks, but explicitly leaves representation and budgets for a next profile.
- `changes/archive/provide-admission-strategy-simulation/readiness/admission-state-benchmark.*` is historical formation evidence only. It selected shipped parent+delta for predecessor retention but did not profile current multi-scale selection or time the high-fanout settlement that creates B forced blocks.
- Current aligned Decisions require opaque immutable public state, one shared reducer/effect source, Scheduler-only control/execution/measurement, synchronous custom result-only proposals and a post-callback hard guard. Private representation, dense IDs and indexes remain implementation choices.
- `readiness/current-admission-core-baseline.{manifest.json,ts,raw.json,summary.md}` is this Change's current before owner. It records seed/environment/warmup/samples and closes static/custom/learned unused-public-state, public/core operation, T=64/256/1024/4096, multiple depth, independent/layered/mutex/scope/high-fanout and B-forced-settlement coverage (the intentionally bounded high-fanout row reaches T=256/B=255). Its 4096 depth boundary is an observation limit, not a claim that high D is acceptable.

## Goals / Non-Goals

### Goals

- One private semantic selection index for each immutable `AdmissionCoreState`; all selection consumers project it rather than recomputing facts.
- Preserve current primary-reason precedence exactly: `state-complete`, unknown task and non-pending are validation guards; pending tasks then evaluate `dependsOn`, `observes`, mutex, scope capacity and root capacity, with the first failure as reason.
- Remove parent-chain lookup from steady-state selection and settlement work; replace repeated graph scans with compiled reverse/static indexes, immutable dynamic aggregates and a canonical forced-block queue.
- Keep catalog DTO formation lazy and private: an unused public state does not allocate its catalog array/rejection DTOs.
- Make before/after comparison reproducible and representative rather than use an isolated data-structure microbenchmark as a performance claim.

### Non-Goals

- No public API, schema, ordering, callback grammar, Task execution, cancellation API, scheduler policy default, global cache/interning or public persistent-state format change.
- No guaranteed cross-host timing budget, retained-byte target, algorithmic priority change, graph compile optimization, background compaction, generic cache layer or mutable state view.
- No shortcut that optimizes catalog/validate but leaves Scheduler candidate, global capacity or B forced blocks on current scans.

## Decisions

### Intended Change

**Candidate representations — no representation is selected before the gate.** All candidates compile one private task-slot/public-order view, reverse `dependsOn`/`observes` occurrence lists, mutex occurrence lists, scope activation/terminal facts and original declared-graph priority for forced effects. Those static indexes must retain every repeated relation/mutex occurrence and the original declaration order. Compact counters may decide eligibility, but must never erase the occurrence list needed to materialize the existing public payload.

The semantic selection index records existing precedence stages. `validateSelection` and `select` retain `state-complete`/unknown/non-pending guards, then read the same indexed pending fact; Scheduler candidate projection reads the same relation/mutex fact and capacity gate without creating a catalog DTO; `catalog` walks canonical public order and serializes frozen DTOs only when its getter is read; a synchronous custom callback's returned `select(taskId)` is hard-revalidated by Scheduler through the current core-state index. A different core-state identity never reuses an earlier index.

A candidate transition writes only affected immutable chunks/aggregates and reverse-neighbor counters. A private state-identity cache may lazily resolve one index for a legacy Scheduler snapshot seed, but must resolve at most once, remain unexported, and cannot create catalog DTOs. Normal successors carry their own incremental state. No consumer may fall back to an unbounded parent-chain legality scan once its index exists.

**Scope is a global-running gate, not a per-scope capacity.** Existing `scope-capacity-reached` compares the global `runningTotal` against the selected active or activating scope's `maxParallel`; the active/activating scope chooses the applicable cap but does not define a membership-specific running count. Therefore an active limited scope blocks an inside, scope-outside and unscoped candidate at the same global running total. The index stores `runningTotal` plus scope lifecycle/activation facts; no per-scope running count may participate in the capacity gate. It retains scope-before-root precedence: choose reached active scopes plus an activating candidate's inactive scope by `(maxParallel, scopeId)` before falling back to root capacity.

For forced blocks, each non-completed direct dependency updates reverse dependent **occurrences** and enqueues newly forced tasks in a persistent queue whose pop order exactly matches current backward declared-graph scanning. When materializing a forced effect, its `dependencyIds` retain original `dependsOn` declaration order and duplicates; public relation/mutex reason payloads retain duplicate occurrences but sort them as current code does. `observes` participates in legality only, never forced blocking. Scheduler remains the sole execution/measurement/effect-replay owner; `admission-core.ts` remains the only legality/transition owner.

**Representation gate — semantic first, then complete A/B/C comparison.** Before any candidate is timed, persist and compare [`current-admission-core-semantic-oracle.before.json`](readiness/current-admission-core-semantic-oracle.before.json) using [`current-admission-core-semantic-oracle.ts`](readiness/current-admission-core-semantic-oracle.ts). Its comparison is exact JSON equality for primary reason/payload/order, including one pending target under competing `dependsOn → observes → mutex → active scope → root` blockers with each later blocker still present until its turn, plus the inactive-scope activating-candidate gate, candidate order/`canAdmit`, select/settle traces, forced IDs/order/effect projections, legacy snapshot, callback hard guard and cancellation. The trace retains the exact scope-before-root payload at the same global running count. Timing rows can never waive an oracle mismatch.

Only after a candidate passes that oracle may A, B and C be compared on the **same complete semantic workload**: real static/custom/learned unused-public-state paths; Scheduler candidates; public catalog/validate/select/settle/fork; T=64/256/1024/4096; required D/topologies; and independent B forced settlement. The same seed, command shape, runtime, warmup/measured samples, CPU/heap method and output-normalization must be used for all three. The development benchmark must additionally retain equivalent DFS and BFS branch arrays, record retained-state count, cache/index creation and lifetime per retained state, and use the same GC sequence (`Bun.gc(true)` before construction and after retaining strong branch references when available). If that GC capability is unavailable, retained-heap rows are explicitly unavailable and cannot decide the representation.

| Candidate                                                           | Design status before the gate                                                                                               | What the gate must establish                                                                                                                  |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| A. parent+delta plus lazy per-state derived index/cache             | Candidate only. It preserves cheap successor allocation but may defer O(D)/full-graph construction to first read.           | Complete oracle equality, full workload rows, retained DFS/BFS/cache observations and proof that repeated selection avoids parent-chain work. |
| B. dense IDs, chunked COW and incremental aggregates                | Candidate only. It can provide constant slot lookup and local reverse updates, but may trade CPU for chunk/cache retention. | Complete oracle equality, full workload rows, retained DFS/BFS/cache observations and proof that global capacity/forced order remain exact.   |
| C. full cloned Map/Set or other full dynamic snapshot per successor | Candidate only and a simple semantic control. It may copy O(T) state.                                                       | Complete oracle equality and the same workload/retention rows; it is not accepted merely for a small-case microbenchmark.                     |

**Go / no-go / revise conditions.** Go selects a representation only when all three candidates have comparable complete rows, the selected candidate exactly matches the persisted semantic oracle, uses exactly one private semantic index per state without eager public DTOs, and is non-dominated across the declared bottleneck wall/CPU p50/p95 and retained DFS/BFS observations (no other candidate is no worse in every compared dimension and strictly better in one). If candidates remain non-dominated only through an explicit CPU/retention trade-off, choose the simplest one only after documenting that trade-off in this Change; do not claim a numeric budget. No-go rejects any candidate with an oracle/structural mismatch, a stale callback hard guard, duplicate/order loss, a per-scope gate, or incomparable measurement method. Revise this Plan if any A/B/C row is missing, GC/retention method is not comparable, no candidate can meet the target structure, or no selection can be justified from the complete data. The gate may require substantial development prototypes and is therefore an explicit implementation gate, not completed Plan readiness.

**Complexity targets.** Let `T` be tasks, `E` relation edges, `M` mutex memberships, `S` scopes, `D` predecessor depth, `A` reverse relation/mutex neighbors changed by a transition, and `B` newly forced blocks. Excluding required public output bytes and pre-existing graph compilation:

- indexed status lookup and single-task indexed relation/mutex check: O(1) plus the selected reason's necessary payload members; no O(D) parent scan;
- public catalog: O(P + output bytes) for P pending slots; Scheduler candidate: O(P) traversal plus per-candidate O(1) gate queries; neither reruns all-graph running/mutex/scope scans;
- normal select/settle: O(1 + A + changed chunk count) with bounded chunk copies, plus effects/output; root/global-running scope gates use aggregates rather than update every pending task;
- forced settlement: O(A + B log B + output) for the persistent canonical priority queue (or a proven equivalent), not repeated O((B+1)(T+E)(D+B)) scan;
- branch retention: successor state copies bounded chunks and persistent queue/index roots, not O(T) whole dynamic state. Exact byte behavior remains measured, not promised.

These are target structural bounds, not wall-clock budgets. Any unavoidable payload sorting/serialization is stated in benchmark reporting rather than hidden in an O(1) claim.

### Resulting Impacts

1. **Dynamic representation:** Current `AdmissionCoreNode` parent scans become either a compatibility seed adapter or a bounded internal implementation detail chosen only after the A/B/C gate. No dense ID leaks to public types, errors, trace or catalog order.
2. **Static indexes:** graph compile validates exactly as now, then creates private reverse relation/mutex/scope/public-order indexes that preserve duplicate occurrence and original declaration order. Index creation must not make compile a second semantics owner or alter compile errors/output.
3. **Primary reason/output:** staged facts preserve only the first current reason. Counter/index storage may be compact, but relation/mutex payloads materialize lexical sorted values with duplicates, while forced `dependencyIds` materialize declaration order with duplicates; canonical public task order remains unchanged.
4. **Scopes and capacity:** active/inactive/closed lifecycle and activation choose the applicable scope cap; every candidate compares that cap to global `runningTotal`, not a per-scope count. Scope-before-root ordering must still produce a scope payload for scope-outside/unscoped candidates when active.
5. **Forced effects:** occurrence-aware reverse queues preserve current backward graph effect priority, duplicate declaration-order dependency IDs and post-effect immutable state snapshots consumed by `replayCoreForcedBlocks`.
6. **Scheduler hard guards/effect order:** pre-policy candidate projection and post-custom-callback revalidation both use current core identity; cancellation and real settlement remain core actions before shell effect replay. Task/Promise/diagnostic/measurement ownership stays shell-only.
7. **DTO/cache lifetime:** index cache may be weak/state-local/private and catalog DTO materialization remains lazy. Repeated getter identity is explicitly not a public contract; no per-branch eager catalog/cache makes retained memory an unmeasured hidden cost.
8. **Evidence:** the persisted semantic oracle is a hard representation gate. The A/B/C benchmark must distinguish cold legacy-seed index resolution, normal incremental successor, lazy catalog DTO creation, cache lifetime/created-index count and retained DFS/BFS branches. It records comparable CPU, heap proxy and native Bun CPU/heap/GC method; heap proxy never serves as allocation proof.

## Risks / Trade-offs

- Each candidate can improve one dimension while worsening another. A/B/C must use the same DFS/BFS retained-state/cache/GC method; otherwise representation selection is revised rather than inferred from a microbenchmark or process heap snapshot.
- Maintaining repeated `dependsOn`, `observes`, mutex occurrences, scope lifecycle/global capacity and forced-queue invariants together risks reason/effect drift. The persisted oracle, direct tests and new equivalence tests must cover every precedence boundary, duplicate/order shape and cascade order.
- A legacy Scheduler snapshot can contain `absent`/running external facts; lazy adapter construction must preserve it without treating any public `AdmissionState` as mutable or accepting a stale callback selection.
- Queue update order is correctness-sensitive. A FIFO queue or canonical public ordering would be wrong if it differs from current reverse declared-graph forced-block selection.
- CPU sample percentages and heap deltas are environment-sensitive. Same-command before/after p50/p95 are comparative observations, not release gates until a separately authorized budget exists.
- `T=4096,D=48` aggregate before measurement exceeded the bounded window. This is bottleneck evidence; it does not permit omitting high-depth semantics from implementation or claiming the full cross-product has been measured.

## Open Questions

No user decision blocks Plan creation. The A/B/C representation gate is intentionally unresolved and blocks selection/implementation of any one representation until semantic equality, comparable complete workload and retained-branch/cache evidence exist. If it does not produce a justified candidate, revise this Change's design and tasks rather than changing public behavior or creating an unreviewed persistent architecture.
