# Design

以一个 private immutable semantic selection index 消除 admission core 的重复 legality work；public consumers 继续仅接收既有 lazy projections。

## Context

当前 shipping path 是每个 immutable `AdmissionCoreState` 使用一份 private semantic selection index；它消除 repeated legality work，同时保留既有 public API、Scheduler lifecycle 和 lazy public catalog。形成期 A/B/C artifacts 与 library Investigation 只提供选择的 provenance；当前实现、可重跑证据和 package boundary 由本 Design 及其链接的 evidence owners 定义。

## Goals / Non-Goals

### Goals

- 让 candidates、inspection、catalog、validate、select 与 callback hard guard 共享同一 private selection facts。
- 保留 public reason/payload/order、scope/root precedence、legacy mutex additivity、forced effect order 与 predecessor immutability。
- 为 dense state、forced frontier 和 reverse indexes 分配直接承接其语义的 persistent/native representation。

### Non-Goals

representation 不扩展 public API、configuration 或 release surface；Scheduler/control ownership、Decision lifecycle 和 public DTO identity/shape 也不在本 Change 中改变。

## Decisions

### Intended Change

**Ship `immutable@5.1.9` `List` for dense private stores, retain the project-specific persistent leftist max-heap, and keep reverse indexes/counters native.**

每个 immutable `AdmissionCoreState` 持有一份 private selection index。该 index 是 candidates、inspection next boundary、catalog、validate、select 及 synchronous custom callback 后 hard guard 的共同事实来源；reducer 是唯一 legality/transition owner，Scheduler 继续拥有 execution、diagnostics、measurement、cancellation 和 effect replay。

Stable Decisions continue to require opaque immutable public state, one reducer/effect source, Scheduler-owned control/execution/measurement, synchronous custom result-only proposals and the post-callback hard guard.

### Resulting Impacts

#### Representation Responsibilities

| Concern | Shipping representation | Responsibility boundary |
| --- | --- | --- |
| dense statuses and dynamic counters | `immutable@5.1.9` `List` | persistent indexed `get`/`set` backing; `Immutable.List` supplies internal structural-sharing mechanics. |
| forced ready frontier | project-owned persistent leftist max-heap | preserves the required persistent `push` + `pop-max` predecessor pair and task-slot/effect order; heap operations path-copy their spine. |
| compiled reverse indexes and occurrence/counter deltas | frozen native arrays plus `Map`/`Set` | owns declaration-order occurrences, primitive slots and affected-neighbor deltas. |

`List`, heap, slots and indexes are private implementation details; they do not alter public graph/state DTOs, rejection union, catalog order, frozen/opaque surface, settlement API or callback contract.

#### Data Flow and Semantics

`compilePreparedAdmissionGraph` owns task slot/public order, task mutex slots, scope slots and reverse dependency/observation/mutex **occurrence** arrays. `AdmissionCoreState.selection` owns List-backed statuses/counters, `runningTotal`, active-scope facts, legacy external mutex input and the forced heap. A normal transition updates the status and reverse-affected counters only.

Candidates and `inspection.nextBoundary` read the payload-free blocker stage (`pendingDependencies`, `pendingObservations`, `heldMutexBlockers`) and then the capacity gate. Catalog, validation and rejected select build a public payload only after that stage is selected, preserving duplicate relation/mutex occurrences and existing sorted public payloads. Catalog construction remains lazy.

The scope gate compares `runningTotal` with the selected active or activating scope cap. Thus an active scope can block inside, outside and unscoped tasks, while an activating scope participates before root capacity. Terminal-scope filtering produces a successor array and leaves its predecessor unchanged.

Legacy `runningMutexes` are an external contribution to `heldMutexBlockers`; dynamic holder settlement decrements only its own reverse-mutex deltas. Forced work uses reverse dependency occurrences to identify newly ready forced blocks. The max-heap removes the greatest task slot, preserving reverse declared-graph priority; dependency IDs are re-read in declaration order, including duplicates, and each effect retains its corresponding immutable effect state.

#### Complexity Boundary

- Compilation is one graph pass over tasks, scopes and declared relation/mutex occurrences.
- Candidate projection is `O(P)` over pending/public task slots with O(1) stage/count and capacity queries per eligible slot; it does not build relation/mutex payload arrays.
- Catalog is `O(P + output)` because it serializes public DTOs; validate/rejected select materialize only the selected task's declared payload.
- Normal transitions update changed `List` entries and reverse-affected slots; `Immutable.List` owns their structural-sharing implementation.
- Forced enqueue/pop path-copy leftist-heap spines rather than cloning the remaining frontier or sorting it again.

#### Correctness and Evidence Owners

- [`current-admission-core-semantic-oracle.md`](readiness/current-admission-core-semantic-oracle.md) owns the exact selected-versus-before correctness contract, command and persisted cases. Timing never substitutes for oracle equality.
- [`representation-gate.md`](readiness/representation-gate.md) owns the final go/no-go conclusion, selected source fingerprint, same-command matrix/profile/retention observations, package/license acceptance, artifact links and measurement limits.
- Read-only before artifacts remain unchanged. parent+delta, chunked-COW and full-clone raw files remain formation provenance: they explain the selection process but do not provide a current runtime abstraction or rerunnable shipping alternative.
- The library Investigation supplied only a qualified persistent-vector baseline at formation time. The selected path was admitted only after full-product oracle, workload, retained-branch and package acceptance evidence.

## Risks / Trade-offs

- Timing and CPU/heap observations are same-process evidence; they are not cross-host SLOs, allocation guarantees or retained-byte measurements. Heap-profile raw dumps are intentionally not retained because their module/runtime retainers cannot attribute memory to admission state; only their method and process-level totals remain in the manifest/comparison evidence.
- The before matrix lacks the two Change-added observations, so no before ratio is assigned to them.
- A future representation change requires a new full-product gate and new evidence; it cannot reuse a formation prototype as a current option.

## Open Questions

No open question blocks this Plan. The selected path and package/legal boundary are verified by the current source-fingerprinted evidence.
