# Design

本 Plan 以一个 public immutable `AdmissionGraph` / `AdmissionState` 协议交付 standalone simulation 与 live custom lookahead；两种 seed 和 real execution shell 共用一个 private compiled reducer/effect core，而不把 Scheduler control capability 暴露给调用方。

本文拥有本 Change 的 Intended Change、形成时推理和 readiness evidence；当前稳定 public contract 由
[`README.md`](../../README.md)、[`docs/configuration.md`](../../docs/configuration.md)、[`docs/api-mechanics.md`](../../docs/api-mechanics.md)
和 [`docs/architecture.md`](../../docs/architecture.md) 承接。Plan-time snapshot 不覆盖那些 owner，也不因 implementation task
勾选而改变 `provide-immutable-admission-graph-state.md` 的 active + unaligned 状态。

## Context

### Readiness-capture facts and long-term direction

- `SchedulerGraphSnapshot` 是当前唯一公开静态 graph DTO，含 Task topology、mutex、priority 和 scope，但 root `maxParallel` 不在该 DTO 中。因此 standalone factory 必须接收 `{ graph, maxParallel }`，且在一次 exact validation/compile 后才形成 `AdmissionGraph`。
- At readiness capture, `AdmissionPolicyContext` 是 detached/deep-frozen callback snapshot，只有 relation/mutex candidates、capacity、active/running/settled IDs、runtime cancellation facts 和 measurement prefix；它不能列出完整 pending catalog、验证一个 Task、保留 predecessor，或产生 hypothetical successor。`decideScheduler` 则把 immutable snapshot 映射到 private action，real shell 维护 pending/running/mutex/scope/settlement 与 Task/Promise lifecycle。
- `dependsOn` 只有 upstream settlement `completed` 时满足；`observes` 在 upstream 有任意 terminal settlement 时满足。direct `dependsOn` 已全部 terminal 且至少一项非 `completed` 的 pending Task 当前以 forced `settle-blocked` microstep 结算，而不是传给 policy。relation/mutex viable candidates 才出现；capacity remains a candidate fact.
- aligned Decision `adopt-invocation-scoped-custom-admission-strategy-authoring.md` continues to own closed simple/prepared authoring and result-only callback handoff. Aligned Decision `retain-private-invocation-admission-strategy-lifecycle.md` continues to own private provider/measurement/history lifecycle and Scheduler hard guards. The new Decision below does not revise either: public state is a new capability, not their prerequisite.
- `provide-immutable-admission-graph-state.md` is **active + unaligned**. It records the long-term direction—two same-type seeds, opaque successor-only state, private compiled reducer/effects, non-authoritative boundary, and no public cancellation/executor/storage format—but does not itself certify current runtime/docs/tests or grant alignment authority.
- `optimize-learned-admission-strategy` is independent: it may later reuse the private compiled graph and deterministic harness, but no algorithm selection/default change is part of this Change. `add-invocation-fail-fast-policy` and `add-named-resource-capacity` may change current lifecycle/capacity/reason facts. If either lands before implementation starts, the implementer must re-run the exact trace and benchmark matrix against that current owner before changing this Plan or runtime.

### Readiness evidence

`readiness/consumer-proofs.md` records two materially distinct consumers: a standalone retained-predecessor branch comparison and a live custom callback that reads a hypothetical successor but returns only existing `AdmissionProposal`. At readiness capture it did not claim a current public API; it remains the rationale for the two consumers, while tasks 1.5/1.6 and the stable docs own their current implementation evidence/contract.

`readiness/admission-state-benchmark.manifest.json` fixes the command, Bun profile, seed, fixtures, methods and limitations. Running:

```text
bun changes/provide-admission-strategy-simulation/readiness/admission-state-benchmark.ts
```

generated `readiness/admission-state-benchmark.raw.json` and `readiness/admission-state-benchmark.summary.md` on Bun `1.3.14`, Linux `6.18.33.2-microsoft-standard-WSL2`, AMD Ryzen AI 7 H 450, x64. It records 5 warmup and 17 measured samples, p50/p95 wall and CPU time, per-batch `heapUsed` delta as an allocation proxy, plus DFS/BFS retained-heap observations with their GC/process-wide limitation.

The baseline covers current real `runTaskGraph` compile plus static/custom/learned unused-state hot paths; public state is explicitly not instantiated in those real runs. It also compares full-clone Map/Set, parent+delta and dense ID + 64-cell chunked COW across inspection, cold/warm catalog, repeated validation, select/settle, same-predecessor forks, DFS/BFS retained branches and high fanout.

At readiness capture, the prototype parent+delta had the lowest transition/fork medians (`select/settle` 0.020 ms/64, same-predecessor fork 0.031 ms/512) and the lowest high-fanout median (0.891 ms/64), while its catalog cost was higher than full clone (warm 0.283 vs 0.187 ms/8). Dense COW was slower for same-predecessor forks (0.353 ms/512) and full clone violated the required no-full-collection successor transition. This snapshot selected the initial direction only: `heapUsed` retained deltas were all zero at this scale, which was **not** evidence of zero retained objects; no numeric gate/budget was adopted. The implementation-run measurements are recorded separately in the readiness summary.

### Shared-core boundary

```text
SchedulerGraphSnapshot + maxParallel ───► compile once ──► private CompiledAdmissionGraph
          │                                           │
          │                                           ├──► AdmissionGraph.initialState()
          │                                           │          │
real Scheduler decision boundary ─────────────────────┘          ▼
          │                                                opaque AdmissionState
          └──► AdmissionPolicyContext.admissionState                │
                  │                                              queries / successors
                  └── callback returns existing select | wait       │
                                                                    ▼
                            private core reducer ── canonical effects ──► real shell only
```

The compiled graph, immutable dynamic node, pure reducer and canonical effects are one private owner. The public handle may only read a projection or receive an hypothetical successor. The real shell alone owns Task/Promise, signal, cancellation, diagnostics, measurement, settlement value/error, policy fault drain and `RunResult`; it executes the canonical effects and repeats current callback-return hard guards.

## Goals / Non-Goals

### Goals

- Export one standalone `AdmissionGraph` factory and one opaque immutable `AdmissionState`; the standalone initial state and `AdmissionPolicyContext.admissionState` must have exactly the same public contract.
- Make full pending inspection/catalog, single-task selection validation, `select`, binary `settle`, divergent branches and frozen DTOs deterministic and independently usable.
- Extract one private compile/reducer/effect owner so public transitions and real Scheduler execution cannot copy legality or forced-block semantics.
- Preserve real Scheduler correctness and make no-cost-to-unused-state an explicit measured acceptance boundary.
- Choose only the simplest representation supported by the recorded comparison; preserve re-runnable evidence instead of creating a cross-host numeric budget.

### Non-Goals

- No new Project Definition scheduler field, declarative fingerprint field, graph grammar, default algorithm, priority rule, `expectedDurationMs`, strategy registry or generic graph executor.
- No mutable Scheduler view, reservation, Task/Promise control, setter, `copy`, batch/replay, state import/export/hydration, hash, public effect stream, public cancellation, cache/interning contract, telemetry or public branch limit.
- No public Check value/error/result/message/cancellation/policy-fault payload. Public binary settlement is not a full execution outcome.
- No dependency on the algorithm optimization Change. Future fail-fast/named-capacity behavior is not anticipated or silently encoded here.

## Decisions

### Intended Change

#### 1. Exact public API and opaque identity

The public declaration owner will export exactly these named values/types from `src/index.ts` through the Project Definition API owner:

```ts
export interface AdmissionGraphInput {
  readonly graph: SchedulerGraphSnapshot;
  readonly maxParallel: number;
}

export interface AdmissionGraph {
  initialState(this: void): AdmissionState;
}

export type AdmissionSettlementOutcome = "satisfied" | "unsatisfied";

export interface AdmissionState {
  readonly catalog: AdmissionCatalog;
  readonly inspection: AdmissionInspection;

  select(this: void, taskId: string): AdmissionTransitionResult;
  settle(
    this: void,
    taskId: string,
    outcome: AdmissionSettlementOutcome
  ): AdmissionTransitionResult;
  validateSelection(this: void, taskId: string): AdmissionSelectionValidation;
}

export declare function createAdmissionGraph(input: AdmissionGraphInput): AdmissionGraph;
```

`createAdmissionGraph` accepts an exact plain input record with only `graph` and `maxParallel`; it reuses current static graph validation and validates `maxParallel` as a positive safe integer. It compiles exactly once per successful factory call. `initialState()` has every graph Task pending, no running Task, no active/closed scope and no cancellation. There is no public constructor or arbitrary dynamic-state seed.

`AdmissionPolicyContext` gains `readonly admissionState: AdmissionState`. At every real custom callback it is detached from the mutable Scheduler shell but refers to the same compiled graph and current immutable core node; it cannot write back. The getter returns the same state object identity for repeated reads in a callback and callers cannot discover seed origin from the type or DTO. `AdmissionGraph`, `AdmissionState`, their methods, and all returned DTOs/results are frozen; their implementation storage is neither enumerable nor a public type.

An accepted transition constructs a successor without changing its predecessor. The predecessor need not be copied or kept by the Product: caller retention is the branch operation. A rejected transition returns no state, so callers cannot mistake a no-op as a new branch.

```ts
export type AdmissionTransitionResult =
  | Readonly<{ readonly accepted: true; readonly state: AdmissionState }>
  | Readonly<{ readonly accepted: false; readonly reason: AdmissionRejectionReason }>;

export type AdmissionSelectionValidation =
  | Readonly<{ readonly accepted: true }>
  | Readonly<{
      readonly accepted: false;
      readonly reason: AdmissionSelectionValidationRejectionReason;
    }>;
```

#### 2. Exact inspection, catalog, ordering and rejection contract

```ts
export interface AdmissionInspection {
  readonly capacity: Readonly<{
    readonly effectiveMaxParallel: number;
    readonly maxParallel: number;
    readonly running: number;
  }>;
  readonly nextBoundary: "select" | "wait" | "complete";
  readonly runningTaskIds: readonly string[];
  readonly scopes: readonly AdmissionScopeLifecycle[];
  readonly settledTasks: readonly AdmissionSettledTask[];
}

export interface AdmissionScopeLifecycle {
  readonly lifecycle: "inactive" | "active" | "closed";
  readonly scopeId: string;
}

export interface AdmissionSettledTask {
  readonly outcome: AdmissionSettlementOutcome;
  readonly taskId: string;
}

export interface AdmissionCatalog {
  readonly nonSelectableTasks: readonly AdmissionNonSelectableTask[];
  readonly selectableTaskIds: readonly string[];
}

export interface AdmissionNonSelectableTask {
  readonly reason: AdmissionSelectionRejectionReason;
  readonly taskId: string;
}
```

Every public task-ID array and `nonSelectableTasks` array is in ascending Unicode code-unit `taskId` order; `scopes` are in ascending `scopeId` order. `mutexIds` and reason `taskIds` use the same ascending order. The public ordering never follows hash/map iteration, current pending queue order, policy ranking or internal dense IDs. `settledTasks` contains only scheduler-relevant public binary outcomes, not private blocked/cancelled implementation settlements.

```ts
export type AdmissionSelectionRejectionReason =
  | Readonly<{ readonly kind: "depends-on-pending"; readonly taskIds: readonly string[] }>
  | Readonly<{ readonly kind: "mutex-held"; readonly mutexIds: readonly string[] }>
  | Readonly<{
      readonly kind: "root-capacity-reached";
      readonly maxParallel: number;
      readonly running: number;
    }>
  | Readonly<{
      readonly kind: "scope-capacity-reached";
      readonly maxParallel: number;
      readonly running: number;
      readonly scopeId: string;
    }>
  | Readonly<{ readonly kind: "observes-pending"; readonly taskIds: readonly string[] }>;

/** The complete failure surface of `validateSelection` and `select`. */
export type AdmissionSelectionValidationRejectionReason =
  | AdmissionSelectionRejectionReason
  | Readonly<{ readonly kind: "not-pending"; readonly status: "running" | "settled" }>
  | Readonly<{ readonly kind: "state-complete" }>
  | Readonly<{ readonly kind: "unknown-task" }>;

/** The complete failure surface of either public transition. */
export type AdmissionRejectionReason =
  | AdmissionSelectionValidationRejectionReason
  | Readonly<{ readonly kind: "invalid-settlement-outcome" }>
  | Readonly<{ readonly kind: "not-running"; readonly status: "pending" | "settled" }>;
```

`catalog` partitions all and only current pending Tasks: selectable IDs or one primary rejection. `validateSelection(taskId)` accepts arbitrary strings and may not build a catalog. Its false branch is intentionally narrower than a general transition rejection: it can only return `AdmissionSelectionValidationRejectionReason`, never `invalid-settlement-outcome` or `not-running`.

`validateSelection(taskId)` and `select(taskId)` use exactly the same resolution and reason precedence: first `state-complete`, then `unknown-task`, then `not-pending` with the current `running | settled` status, then the catalog selection-reason precedence `depends-on-pending` → `observes-pending` → `mutex-held` → `scope-capacity-reached` → `root-capacity-reached`. Thus, for every task ID, validation is semantically identical to whether `select` would accept and—when it would reject—the selection rejection it would return. Direct `dependsOn` whose upstream is binary unsatisfied never remains catalogued: canonical forced-block microsteps settle it before the next public boundary.

`settle` first exact-validates the JavaScript runtime outcome, then rejects complete/unknown/not-running in that order. `state-complete` has no caller action. `nextBoundary` is `select` whenever at least one Task is selectable, otherwise `wait` if any Task is running, otherwise `complete`; forced blocks execute before this field is published.

#### 3. Action semantics, scope lifecycle and real-settlement mapping

`select(taskId)` accepts only a catalog-selectable Task. The successor moves it from pending to running, applies its mutex/capacity facts and activates a scope if its activation Task starts it. It does not invoke preflight, execution, Task, Promise, signal, diagnostics, measurement or real policy.

`settle(taskId, "satisfied" | "unsatisfied")` accepts only a current running Task. It moves the Task to public binary settled, releases Task mutex/capacity, closes a scope if the Task is its terminal Task, and runs canonical forced-block microsteps to the next public boundary. Scope lifecycle is derived only from that core state: before any activation it is `inactive`; after an activation and before terminal settlement it is `active`; after its terminal Task settles it is `closed`.

The real shell maps its existing settlement facts to private core actions as follows:

| current shell fact | shared core operation | public consequence |
| --- | --- | --- |
| `completed` | `settle(..., "satisfied")` | task appears settled/satisfied |
| `prerequisite-unsatisfied` or `failed` | `settle(..., "unsatisfied")` | task appears settled/unsatisfied |
| `blocked` | canonical forced-block effect, not public `settle` input | direct downstream continues to block/settle before next boundary |
| `cancelled-before-start` / signal / policy fault | private cancel-pending transition and drain | no public cancellation action or control channel |

The current `isPrerequisiteSatisfied` mapping remains in the real shell before this table; public binary settlement does not alter it. The public API has no `cancel`, even though private cancellation uses the same reducer/effect owner.

#### 4. Canonical reducer effects and trace oracle

The private reducer returns `{ nextNode, effects }`. Effects are private frozen DTOs in a canonical sequence; only the shell consumes them. A public `select` emits one admission effect. A public/real settlement emits its direct settlement effect after state mutation, then repeatedly emits each forced block chosen by the current pending-queue rule: scan remaining pending Tasks from last to first; select the first whose direct `dependsOn` are all terminal and include one unsatisfied upstream; settle it; repeat until none. Private cancellation emits `cancelled-before-start` effects in current pending queue order, then enters drain. This preserves the current Scheduler's effect/settlement ordering rather than making a new public ordering promise.

A new scheduler-private trace test harness is the oracle, not a second reducer. Given one compiled graph, a seed (`initial` or a captured live-shell seed), and a deterministic sequence of public/private actions, it captures for each step:

```ts
interface AdmissionCoreTraceStep {
  readonly action: AdmissionTraceAction;
  readonly effects: readonly AdmissionCoreEffect[];
  readonly post: AdmissionTraceProjection;
  readonly pre: AdmissionTraceProjection;
  readonly result: AdmissionTraceResult;
}
```

`AdmissionTraceProjection` is a normalized snapshot of the exact public `inspection`, `catalog`, and `validateSelection` result for every known task ID plus one fixed unknown-task sentinel; it uses the public canonical output order. The trace has explicit running, settled and complete checkpoints, so it asserts the dedicated validation union (`unknown-task` / `not-pending` / `state-complete` plus catalog reasons) and that validation has the same rejection as `select`. `AdmissionTraceResult` is the accepted successor/rejection normalized without object identity. The harness drives the shared reducer directly for public state and drives the real shell through deterministic Task settlements, then compares each projection, accepted/rejected result and canonical effect sequence. It covers initial versus live seed, relation/mutex/root/scope capacity, scope lifecycle, forced block, wait/complete, failed/unsatisfied mapping, private cancellation, and a custom callback that performs lookahead but whose returned proposal is hard-revalidated after the callback.

#### 5. Representation decision and performance contract

The selected v1 private dynamic node is **parent+delta**: an immutable node points to its predecessor plus one changed Task/status/capacity/mutex/scope fact. Holding an existing predecessor is O(1); select/settle allocate only a new node and affected local facts, never a graph or full dynamic Map/Set clone. The compiled graph owns stable ID indexes, relations, mutex/scope indexes and public-order indexes. Public DTO construction remains lazy: no catalog/search representation is built in a real static/custom/learned run unless `admissionState` is read.

This is the simplest evidence-supported selection: it wins the branch-sensitive prototype operations, while the benchmark records its known catalog/validation chain cost. Catalog is an explicit O(P) public output. `validateSelection` must not construct catalog. No memo, global interning, cache, numeric budget, fixed delta depth or compaction is committed. A private bounded compaction or dense COW fallback requires a re-run of the same manifest and an implementation-specific profile that demonstrates the parent chain is the actual bottleneck; it must not change state identity/DTO/action semantics.

The benchmark timings and heap values are advisory for this host only. Structural constraints—compile once, frozen opaque successors, no full graph/full-state clone on select/settle, and unused-state shell laziness—are required acceptance. The implementation retains the lab command and adds implementation-path before/after observations to the same evidence directory.

#### 6. Compatibility and stable material

The factory and public types are new package exports. `AdmissionPolicyContext.admissionState` is additive to the custom callback context. No Definition input/normalization/fingerprint, simple/prepared grammar, `prepare`/`complete`, output schema or `RunResult` contract changes.

Implementation updates `src/project-definition/scheduler-policy.ts`, its exact validation and JSDoc; public root exports; Architecture, Configuration and API mechanics; package projections/examples; and installed-consumer acceptance. The stable docs distinguish hypothetical public state from the private reducer and real execution shell. Test Evidence cases are created/updated only once direct current Bun test entities exist.

### Resulting Impacts

- `src/project-run/task-scheduler/**` must be reorganized around private compiled graph, immutable node, reducer, effect application shell and trace harness. The implementation may move current logic, but it cannot retain independently authored legality/transition paths.
- `src/project-definition/scheduler-policy.ts`, `src/project-definition/project-definition.ts` and `src/index.ts` gain exact public state definitions/export and the context property. Existing scheduler input grammar/fingerprint remains byte-for-byte unaffected except for documented type addition.
- Scheduler unit/integration tests prove public contract, shared-core trace equivalence and real shell hard-guard behavior. Test Evidence must be checked before and after any test entity/body/Case change, then the narrow tests run.
- Package docs/projection/installed-consumer materials must prove both consumers, frozen DTO/opaque identity and non-control behavior. They are implementation artifacts, not substitutes for runtime trace tests.
- Benchmark evidence remains development-only under this Change. It does not create a Product runtime, CLI, feature flag, benchmark dependency or numeric release gate.

## Risks / Trade-offs

- Parent+delta can grow lookup depth under long linear branches. The selected representation does not hide this with unbounded cache/compaction; current evidence makes this a measured implementation risk, not a pre-optimized structure.
- The public contract is intentionally wider than a callback-only helper. The two distinct consumers justify that cost, but every new DTO/reason/order becomes public compatibility surface and must have direct tests/docs.
- Refactoring the current hot Scheduler can accidentally charge non-users for public inspection/catalog work. Real static/custom/learned unused-state baselines and lazy construction are required to detect it.
- Forced-block and cancellation include real-shell-only facts. The trace oracle must compare them without exposing effects or cancellation as public actions.
- Concurrent active changes may modify capacity/lifecycle. Implementation must rebase the precise reason/trace matrix on the then-current owner instead of merging rules by intuition.

## Open Questions

无阻塞性开放问题。当前 Plan deliberately does not freeze a cross-host numeric performance budget or a compaction threshold; those are implementation measurements, not missing API/architecture decisions. If fail-fast or named capacity becomes current before the final Change review, rebaseline/review is required rather than permission to silently extend this contract.
